import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    let query = `
      SELECT r.*, 
        ss.id as session_id, ss.date, ss.start_time, ss.end_time,
        sub.name as subject_name,
        t.full_name as teacher_name
      FROM reports r
      LEFT JOIN schedule_sessions ss ON r.session_id = ss.id
      LEFT JOIN schedules s ON ss.schedule_id = s.id
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE 1=1
    `
    const params: any[] = []
    if (startDate) {
      query += ' AND r.created_at >= ?'
      params.push(`${startDate}T00:00:00`)
    }
    if (endDate) {
      query += ' AND r.created_at <= ?'
      params.push(`${endDate}T23:59:59`)
    }
    query += ' ORDER BY r.created_at DESC'
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error('Get reports error:', error)
    res.status(500).json({ error: 'Ошибка при получении отчётов' })
  }
})

router.get('/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate и endDate обязательны' })
    }
    const [rows] = await pool.execute(
      `SELECT ar.*, 
        s.id as student_id, s.full_name as student_name,
        ss.id as session_id, ss.date, ss.start_time, ss.end_time, ss.room,
        sub.name as subject_name,
        t.full_name as teacher_name,
        ar2.name as reason_name
      FROM attendance_records ar
      LEFT JOIN students s ON ar.student_id = s.id
      LEFT JOIN schedule_sessions ss ON ar.session_id = ss.id
      LEFT JOIN schedules sch ON ss.schedule_id = sch.id
      LEFT JOIN subjects sub ON sch.subject_id = sub.id
      LEFT JOIN teachers t ON sch.teacher_id = t.id
      LEFT JOIN absence_reasons ar2 ON ar.reason_id = ar2.id
      WHERE ss.date >= ? AND ss.date <= ? AND ar.status != 'present'
      ORDER BY ss.date, ss.start_time`,
      [startDate, endDate]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get weekly report error:', error)
    res.status(500).json({ error: 'Ошибка при получении недельного отчёта' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, 
        ss.*,
        sub.name as subject_name,
        t.full_name as teacher_name
      FROM reports r
      LEFT JOIN schedule_sessions ss ON r.session_id = ss.id
      LEFT JOIN schedules s ON ss.schedule_id = s.id
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE r.id = ?`,
      [req.params.id]
    ) as any[]
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Отчёт не найден' })
    }
    res.json(rows[0])
  } catch (error) {
    console.error('Get report error:', error)
    res.status(500).json({ error: 'Ошибка при получении отчёта' })
  }
})

router.post('/', async (req: any, res) => {
  try {
    const { session_id } = req.body
    if (!session_id) {
      return res.status(400).json({ error: 'session_id обязателен' })
    }
    // Проверяем существующий отчёт
    const [existing] = await pool.execute('SELECT id FROM reports WHERE session_id = ?', [session_id]) as any[]
    if (existing && existing.length > 0) {
      await pool.execute('UPDATE reports SET updated_at = ? WHERE id = ?', [new Date(), existing[0].id])
      const [rows] = await pool.execute('SELECT * FROM reports WHERE id = ?', [existing[0].id]) as any[]
      return res.json(rows[0])
    }
    const reportId = randomUUID()
    await pool.execute('INSERT INTO reports (id, session_id, created_by) VALUES (?, ?, ?)', [reportId, session_id, req.userId])
    const [rows] = await pool.execute('SELECT * FROM reports WHERE id = ?', [reportId]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create report error:', error)
    res.status(500).json({ error: 'Ошибка при создании отчёта' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM reports WHERE id = ?', [req.params.id]) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Отчёт не найден' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Delete report error:', error)
    res.status(500).json({ error: 'Ошибка при удалении отчёта' })
  }
})

export default router

