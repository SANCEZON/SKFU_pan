import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    const [rows] = await pool.execute(
      `SELECT al.*, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?`,
      [limit]
    )
    res.json(rows)
  } catch (error) {
    console.error('Get logs error:', error)
    res.status(500).json({ error: 'Ошибка при получении логов' })
  }
})

export default router

