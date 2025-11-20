import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC',
      [req.userId]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get notes error:', error)
    res.status(500).json({ error: 'Ошибка при получении заметок' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, content, is_pinned } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' })
    }
    const noteId = randomUUID()
    await pool.execute(
      'INSERT INTO notes (id, user_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?)',
      [noteId, req.userId, title, content, is_pinned || false]
    )
    const [rows] = await pool.execute('SELECT * FROM notes WHERE id = ?', [noteId]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create note error:', error)
    res.status(500).json({ error: 'Ошибка при создании заметки' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { title, content, is_pinned } = req.body
    const [result] = await pool.execute(
      'UPDATE notes SET title = ?, content = ?, is_pinned = ? WHERE id = ? AND user_id = ?',
      [title, content, is_pinned || false, req.params.id, req.userId]
    ) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' })
    }
    const [rows] = await pool.execute('SELECT * FROM notes WHERE id = ?', [req.params.id]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Update note error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении заметки' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]) as any
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Delete note error:', error)
    res.status(500).json({ error: 'Ошибка при удалении заметки' })
  }
})

export default router

