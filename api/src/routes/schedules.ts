import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { randomUUID } from 'crypto'
import { logActivity } from '../utils/activityLogger.js'
import { RowDataPacket } from 'mysql2'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const { weekNumber } = req.query
    let query = `
      SELECT s.*, 
        sub.name as subject_name, sub.code as subject_code,
        t.full_name as teacher_name, t.email as teacher_email
      FROM schedules s
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
    `
    const params: any[] = []
    if (weekNumber) {
      query += ' WHERE s.week_number = ?'
      params.push(weekNumber)
    }
    query += ' ORDER BY s.day_of_week, s.start_time'
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error('Get schedules error:', error)
    res.status(500).json({ error: 'Ошибка при получении расписания' })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate и endDate обязательны' })
    }
    const [rows] = await pool.execute(
      `SELECT ss.*, 
        s.subject_id, s.teacher_id,
        sub.name as subject_name,
        t.full_name as teacher_name
      FROM schedule_sessions ss
      LEFT JOIN schedules s ON ss.schedule_id = s.id
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE ss.date >= ? AND ss.date <= ? AND ss.is_cancelled = FALSE
      ORDER BY ss.date, ss.start_time`,
      [startDate, endDate]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({ error: 'Ошибка при получении сессий' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { subject_id, teacher_id, day_of_week, start_time, end_time, room, type, is_recurring, start_date, end_date, week_number, schedule_start_date } = req.body
    if (!subject_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'Обязательные поля: subject_id, day_of_week, start_time, end_time' })
    }
    const scheduleId = randomUUID()
    await pool.execute(
      'INSERT INTO schedules (id, subject_id, teacher_id, day_of_week, start_time, end_time, room, type, is_recurring, start_date, end_date, week_number, schedule_start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [scheduleId, subject_id, teacher_id || null, day_of_week, start_time, end_time, room || null, type || 'lecture', is_recurring !== false, start_date || null, end_date || null, week_number || 1, schedule_start_date || new Date().toISOString().split('T')[0]]
    )
    const [rows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [scheduleId]) as any[]
    await logActivity(req.userId!, {
      action: 'schedule_created',
      entityType: 'schedule',
      entityId: scheduleId,
      details: { день: day_of_week, время: `${start_time} - ${end_time}` },
    })
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create schedule error:', error)
    res.status(500).json({ error: 'Ошибка при создании расписания' })
  }
})

router.post('/sessions', async (req: AuthRequest, res) => {
  try {
    const { schedule_id, date, start_time, end_time, room, is_cancelled } = req.body
    if (!schedule_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Обязательные поля: schedule_id, date, start_time, end_time' })
    }

    const [schedules] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [schedule_id]) as any[]
    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ error: 'Расписание не найдено' })
    }

    const sessionId = randomUUID()
    await pool.execute(
      'INSERT INTO schedule_sessions (id, schedule_id, date, start_time, end_time, room, is_cancelled) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, schedule_id, date, start_time, end_time, room || null, is_cancelled ?? false]
    )

    const [rows] = await pool.execute(
      `SELECT ss.*, 
        s.subject_id, s.teacher_id,
        sub.name as subject_name,
        t.full_name as teacher_name
      FROM schedule_sessions ss
      LEFT JOIN schedules s ON ss.schedule_id = s.id
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE ss.id = ?`,
      [sessionId]
    ) as [RowDataPacket[], any]

    await logActivity(req.userId!, {
      action: 'schedule_session_created',
      entityType: 'schedule_session',
      entityId: sessionId,
      details: { schedule_id, date, start_time, end_time },
    })

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ error: 'Ошибка при создании сессии' })
  }
})

router.post('/:id/generate-sessions', async (req, res) => {
  try {
    const { startDate, endDate } = req.body
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate и endDate обязательны' })
    }
    const [schedules] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [req.params.id]) as any[]
    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ error: 'Расписание не найдено' })
    }
    const schedule = schedules[0]
    const sessions: any[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    let current = new Date(start)
    while (current <= end) {
      if (schedule.week_number) {
        // Логика для 2-недельного цикла
        const scheduleStart = new Date(schedule.schedule_start_date)
        const daysDiff = Math.floor((current.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24))
        const weekInCycle = Math.floor(daysDiff / 14) % 2
        const currentWeek = weekInCycle === 0 ? 1 : 2
        if (currentWeek !== schedule.week_number) {
          current.setDate(current.getDate() + 1)
          continue
        }
      }
      if (current.getDay() === schedule.day_of_week) {
        sessions.push({
          id: randomUUID(),
          schedule_id: schedule.id,
          date: current.toISOString().split('T')[0],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room: schedule.room,
          is_cancelled: false,
        })
      }
      current.setDate(current.getDate() + 1)
    }
    if (sessions.length > 0) {
      for (const session of sessions) {
        await pool.execute(
          'INSERT INTO schedule_sessions (id, schedule_id, date, start_time, end_time, room, is_cancelled) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [session.id, session.schedule_id, session.date, session.start_time, session.end_time, session.room || null, false]
        )
      }
    }
    res.json(sessions)
  } catch (error) {
    console.error('Generate sessions error:', error)
    res.status(500).json({ error: 'Ошибка при генерации сессий' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const updates = req.body
    const fields = Object.keys(updates).filter(k => k !== 'id')
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' })
    }
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => updates[f])
    values.push(req.params.id)
    const [result] = await pool.execute(`UPDATE schedules SET ${setClause} WHERE id = ?`, values) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Расписание не найдено' })
    }
    const [rows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [req.params.id]) as any[]
    await logActivity(req.userId!, {
      action: 'schedule_updated',
      entityType: 'schedule',
      entityId: req.params.id,
      details: { изменения: updates },
    })
    res.json(rows[0])
  } catch (error) {
    console.error('Update schedule error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении расписания' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM schedules WHERE id = ?', [req.params.id]) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Расписание не найдено' })
    }
    await logActivity(req.userId!, {
      action: 'schedule_deleted',
      entityType: 'schedule',
      entityId: req.params.id,
    })
    res.status(204).send()
  } catch (error) {
    console.error('Delete schedule error:', error)
    res.status(500).json({ error: 'Ошибка при удалении расписания' })
  }
})

export default router

