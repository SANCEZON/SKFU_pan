import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM user_invitations ORDER BY created_at DESC')
    res.json(rows)
  } catch (error) {
    console.error('Get invitations error:', error)
    res.status(500).json({ error: 'Ошибка при получении приглашений' })
  }
})

router.get('/pending-profiles', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT up.*, u.email as user_email
       FROM user_profiles up
       LEFT JOIN users u ON up.user_id = u.id
       WHERE up.status = ? 
       ORDER BY up.created_at ASC`,
      ['pending']
    ) as any[]
    console.log(`Found ${rows.length} pending profiles`)
    res.json(rows)
  } catch (error) {
    console.error('Get pending profiles error:', error)
    res.status(500).json({ error: 'Ошибка при получении профилей на одобрение' })
  }
})

router.get('/approval-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const [rows] = await pool.execute('SELECT * FROM approval_logs ORDER BY created_at DESC LIMIT ?', [limit])
    res.json(rows)
  } catch (error) {
    console.error('Get approval logs error:', error)
    res.status(500).json({ error: 'Ошибка при получении логов одобрений' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, expires_at, note } = req.body
    if (!email) {
      return res.status(400).json({ error: 'email обязателен' })
    }
    const token = randomUUID()
    const invitationId = randomUUID()
    const expiresAtValue = expires_at
      ? new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ')
      : null

    await pool.execute(
      'INSERT INTO user_invitations (id, email, token, expires_at, note, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [invitationId, email.toLowerCase(), token, expiresAtValue, note || null, req.userId]
    )
    const [rows] = await pool.execute('SELECT * FROM user_invitations WHERE id = ?', [invitationId]) as any[]
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('Create invitation error:', error)
    res.status(500).json({ error: 'Ошибка при создании приглашения' })
  }
})

router.put('/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    await pool.execute('UPDATE user_invitations SET status = ?, approved_by = ? WHERE id = ?', ['accepted', req.userId, id])
    const [rows] = await pool.execute('SELECT * FROM user_invitations WHERE id = ?', [id]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Approve invitation error:', error)
    res.status(500).json({ error: 'Ошибка при одобрении приглашения' })
  }
})

router.put('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!status || !['pending', 'accepted', 'rejected', 'revoked', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' })
    }
    await pool.execute('UPDATE user_invitations SET status = ? WHERE id = ?', [status, id])
    const [rows] = await pool.execute('SELECT * FROM user_invitations WHERE id = ?', [id]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Update invitation status error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении статуса приглашения' })
  }
})

router.put('/profile/:userId/approve', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    await pool.execute('UPDATE user_profiles SET status = ? WHERE user_id = ?', ['approved', userId])
    const [rows] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ?', [userId]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Approve profile error:', error)
    res.status(500).json({ error: 'Ошибка при одобрении профиля' })
  }
})

router.put('/profile/:userId/reject', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    await pool.execute('UPDATE user_profiles SET status = ? WHERE user_id = ?', ['rejected', userId])
    const [rows] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ?', [userId]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Reject profile error:', error)
    res.status(500).json({ error: 'Ошибка при отклонении профиля' })
  }
})

export default router

