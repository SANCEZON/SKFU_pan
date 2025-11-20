import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { logActivity } from '../utils/activityLogger.js'

const router = express.Router()

// Все маршруты требуют аутентификации
router.use(authenticateToken)

// Получить всех студентов
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM students ORDER BY full_name'
    )
    res.json(rows)
  } catch (error) {
    console.error('Get students error:', error)
    res.status(500).json({ error: 'Ошибка при получении студентов' })
  }
})

// Получить студента по ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.params.id]
    ) as any[]

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Студент не найден' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Get student error:', error)
    res.status(500).json({ error: 'Ошибка при получении студента' })
  }
})

// Создать студента
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { full_name, telegram, phone, status, group_id } = req.body

    if (!full_name) {
      return res.status(400).json({ error: 'Имя обязательно' })
    }

    // Генерируем UUID
    const { randomUUID } = await import('crypto')
    const studentId = randomUUID()

    await pool.execute(
      'INSERT INTO students (id, full_name, telegram, phone, status, group_id) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, full_name, telegram || null, phone || null, status || 'active', group_id || null]
    )

    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    ) as any[]

    const student = rows[0]

    await logActivity(req.userId!, {
      action: 'student_created',
      entityType: 'student',
      entityId: student.id,
      details: { студент: student.full_name },
    })

    res.status(201).json(student)
  } catch (error) {
    console.error('Create student error:', error)
    res.status(500).json({ error: 'Ошибка при создании студента' })
  }
})

// Обновить студента
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { full_name, telegram, phone, status, group_id } = req.body

    const [result] = await pool.execute(
      'UPDATE students SET full_name = ?, telegram = ?, phone = ?, status = ?, group_id = ? WHERE id = ?',
      [full_name, telegram || null, phone || null, status, group_id || null, req.params.id]
    ) as any

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Студент не найден' })
    }

    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.params.id]
    ) as any[]

    const student = rows[0]

    await logActivity(req.userId!, {
      action: 'student_updated',
      entityType: 'student',
      entityId: student.id,
      details: { студент: student.full_name },
    })

    res.json(student)
  } catch (error) {
    console.error('Update student error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении студента' })
  }
})

// Удалить студента
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM students WHERE id = ?',
      [req.params.id]
    ) as any

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Студент не найден' })
    }

    await logActivity(req.userId!, {
      action: 'student_deleted',
      entityType: 'student',
      entityId: req.params.id,
    })

    res.status(204).send()
  } catch (error) {
    console.error('Delete student error:', error)
    res.status(500).json({ error: 'Ошибка при удалении студента' })
  }
})

export default router

