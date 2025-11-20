import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM teachers ORDER BY full_name')
    res.json(rows)
  } catch (error) {
    console.error('Get teachers error:', error)
    res.status(500).json({ error: 'Ошибка при получении преподавателей' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM teachers WHERE id = ?', [req.params.id]) as any[]
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' })
    }
    res.json(rows[0])
  } catch (error) {
    console.error('Get teacher error:', error)
    res.status(500).json({ error: 'Ошибка при получении преподавателя' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone } = req.body
    if (!full_name) {
      return res.status(400).json({ error: 'Имя обязательно' })
    }
    const teacherId = randomUUID()
    await pool.execute(
      'INSERT INTO teachers (id, full_name, email, phone) VALUES (?, ?, ?, ?)',
      [teacherId, full_name, email || null, phone || null]
    )
    const [rows] = await pool.execute('SELECT * FROM teachers WHERE id = ?', [teacherId]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create teacher error:', error)
    res.status(500).json({ error: 'Ошибка при создании преподавателя' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { full_name, email, phone } = req.body
    const [result] = await pool.execute(
      'UPDATE teachers SET full_name = ?, email = ?, phone = ? WHERE id = ?',
      [full_name, email || null, phone || null, req.params.id]
    ) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' })
    }
    const [rows] = await pool.execute('SELECT * FROM teachers WHERE id = ?', [req.params.id]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Update teacher error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении преподавателя' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM teachers WHERE id = ?', [req.params.id]) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Delete teacher error:', error)
    res.status(500).json({ error: 'Ошибка при удалении преподавателя' })
  }
})

export default router

