import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM subjects ORDER BY name')
    res.json(rows)
  } catch (error) {
    console.error('Get subjects error:', error)
    res.status(500).json({ error: 'Ошибка при получении предметов' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, code } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Название обязательно' })
    }
    const subjectId = randomUUID()
    await pool.execute('INSERT INTO subjects (id, name, code) VALUES (?, ?, ?)', [subjectId, name, code || null])
    const [rows] = await pool.execute('SELECT * FROM subjects WHERE id = ?', [subjectId]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create subject error:', error)
    res.status(500).json({ error: 'Ошибка при создании предмета' })
  }
})

export default router

