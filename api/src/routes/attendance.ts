import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/session/:sessionId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ar.*, 
        s.id as student_id, s.full_name as student_name,
        ar2.name as reason_name, ar2.code as reason_code
      FROM attendance_records ar
      LEFT JOIN students s ON ar.student_id = s.id
      LEFT JOIN absence_reasons ar2 ON ar.reason_id = ar2.id
      WHERE ar.session_id = ?`,
      [req.params.sessionId]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get attendance error:', error)
    res.status(500).json({ error: 'Ошибка при получении посещаемости' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { session_id, student_id, status, reason_id, note } = req.body
    if (!session_id || !student_id) {
      return res.status(400).json({ error: 'session_id и student_id обязательны' })
    }
    const recordId = randomUUID()
    await pool.execute(
      'INSERT INTO attendance_records (id, session_id, student_id, status, reason_id, note) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason_id = VALUES(reason_id), note = VALUES(note)',
      [recordId, session_id, student_id, status || 'present', reason_id || null, note || null]
    )
    const [rows] = await pool.execute('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?', [session_id, student_id]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create attendance error:', error)
    res.status(500).json({ error: 'Ошибка при создании записи посещаемости' })
  }
})

router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records должен быть массивом' })
    }
    const results = []
    for (const record of records) {
      const { session_id, student_id, status, reason_id, note } = record
      const recordId = randomUUID()
      try {
        await pool.execute(
          'INSERT INTO attendance_records (id, session_id, student_id, status, reason_id, note) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason_id = VALUES(reason_id), note = VALUES(note)',
          [recordId, session_id, student_id, status || 'present', reason_id || null, note || null]
        )
        const [rows] = await pool.execute('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?', [session_id, student_id]) as any[]
        results.push(rows[0])
      } catch (err) {
        console.error('Bulk insert error for record:', err)
      }
    }
    res.json(results)
  } catch (error) {
    console.error('Bulk attendance error:', error)
    res.status(500).json({ error: 'Ошибка при массовом создании записей' })
  }
})

router.get('/reasons', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM absence_reasons WHERE is_active = TRUE ORDER BY name')
    res.json(rows)
  } catch (error) {
    console.error('Get reasons error:', error)
    res.status(500).json({ error: 'Ошибка при получении причин отсутствия' })
  }
})

// Получить все причины отсутствия (включая неактивные)
router.get('/reasons/all', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM absence_reasons ORDER BY name')
    res.json(rows)
  } catch (error) {
    console.error('Get all reasons error:', error)
    res.status(500).json({ error: 'Ошибка при получении причин отсутствия' })
  }
})

// Создать причину отсутствия
router.post('/reasons', async (req, res) => {
  try {
    const { name, code, is_active } = req.body
    if (!name || !code) {
      return res.status(400).json({ error: 'name и code обязательны' })
    }
    const reasonId = randomUUID()
    await pool.execute(
      'INSERT INTO absence_reasons (id, name, code, is_active) VALUES (?, ?, ?, ?)',
      [reasonId, name, code, is_active !== false]
    )
    const [rows] = await pool.execute('SELECT * FROM absence_reasons WHERE id = ?', [reasonId]) as any[]
    res.status(201).json(rows[0])
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Причина с таким кодом уже существует' })
    }
    console.error('Create reason error:', error)
    res.status(500).json({ error: 'Ошибка при создании причины отсутствия' })
  }
})

// Обновить причину отсутствия
router.put('/reasons/:id', async (req, res) => {
  try {
    const { name, code, is_active } = req.body
    const [result] = await pool.execute(
      'UPDATE absence_reasons SET name = ?, code = ?, is_active = ? WHERE id = ?',
      [name, code, is_active !== false, req.params.id]
    ) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Причина отсутствия не найдена' })
    }
    const [rows] = await pool.execute('SELECT * FROM absence_reasons WHERE id = ?', [req.params.id]) as any[]
    res.json(rows[0])
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Причина с таким кодом уже существует' })
    }
    console.error('Update reason error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении причины отсутствия' })
  }
})

// Получить статистику посещаемости студента
router.get('/student/:studentId/stats', async (req, res) => {
  try {
    const { studentId } = req.params
    const { startDate, endDate } = req.query
    
    let query = `
      SELECT ar.*, 
        ss.date as session_date,
        ss.start_time,
        s2.name as subject_name,
        ar2.name as reason_name
      FROM attendance_records ar
      LEFT JOIN schedule_sessions ss ON ar.session_id = ss.id
      LEFT JOIN schedules s ON ss.schedule_id = s.id
      LEFT JOIN subjects s2 ON s.subject_id = s2.id
      LEFT JOIN absence_reasons ar2 ON ar.reason_id = ar2.id
      WHERE ar.student_id = ? AND ar.status != 'present'
    `
    const params: any[] = [studentId]
    
    if (startDate) {
      query += ' AND ss.date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND ss.date <= ?'
      params.push(endDate)
    }
    
    query += ' ORDER BY ss.date DESC, ss.start_time DESC'
    
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error('Get student stats error:', error)
    res.status(500).json({ error: 'Ошибка при получении статистики студента' })
  }
})

// Получить данные для графиков
router.get('/charts', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate и endDate обязательны' })
    }
    
    const [rows] = await pool.execute(
      `SELECT ar.*, 
        ss.date as session_date,
        s.full_name as student_name
      FROM attendance_records ar
      LEFT JOIN schedule_sessions ss ON ar.session_id = ss.id
      LEFT JOIN students s ON ar.student_id = s.id
      WHERE ss.date >= ? AND ss.date <= ? AND ar.status != 'present'
      ORDER BY ss.date`,
      [startDate, endDate]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get charts data error:', error)
    res.status(500).json({ error: 'Ошибка при получении данных для графиков' })
  }
})

export default router

