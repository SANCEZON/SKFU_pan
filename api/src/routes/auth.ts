import express from 'express'
import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = express.Router()

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, inviteToken } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }

    if (!inviteToken) {
      return res.status(400).json({ error: 'Необходимо ввести код приглашения' })
    }

    // Проверяем приглашение
    const [invitations] = await pool.execute(
      'SELECT * FROM user_invitations WHERE token = ? AND status = ?',
      [inviteToken, 'pending']
    ) as any[]

    if (!invitations || invitations.length === 0) {
      return res.status(400).json({ error: 'Неверный или уже использованный код приглашения' })
    }

    const invitation = invitations[0]

    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Этот код приглашения предназначен для другого email' })
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Срок действия приглашения истёк' })
    }

    // Проверяем, существует ли пользователь
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    ) as any[]

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' })
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10)

    // Генерируем UUID
    const { randomUUID } = await import('crypto')
    const userId = randomUUID()

    // Создаём пользователя
    await pool.execute(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email.toLowerCase(), passwordHash]
    )

    // Получаем созданного пользователя
    const [users] = await pool.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    ) as any[]

    const user = users[0]

    // Обновляем приглашение
    await pool.execute(
      'UPDATE user_invitations SET status = ?, used_at = ? WHERE id = ?',
      ['accepted', new Date(), invitation.id]
    )

    // Создаём профиль
    await pool.execute(
      'INSERT INTO user_profiles (user_id, status, invitation_id) VALUES (?, ?, ?)',
      [user.id, 'pending', invitation.id]
    )

    // Генерируем токен
    const token = generateToken(user.id, user.email)

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    })
  } catch (error: any) {
    console.error('Register error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' })
    }
    res.status(500).json({ error: 'Ошибка при регистрации' })
  }
})

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' })
    }

    // Находим пользователя
    const [users] = await pool.execute(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [email.toLowerCase()]
    ) as any[]

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    const user = users[0]

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    // Получаем профиль
    const [profiles] = await pool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [user.id]
    ) as any[]

    const profile = profiles && profiles.length > 0 ? profiles[0] : null

    // Генерируем токен
    const token = generateToken(user.id, user.email)

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Ошибка при входе' })
  }
})

// Получение текущего пользователя
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [req.userId]
    ) as any[]

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }

    const user = users[0]

    // Получаем профиль
    const [profiles] = await pool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [user.id]
    ) as any[]

    const profile = profiles && profiles.length > 0 ? profiles[0] : null

    res.json({
      user,
      profile,
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' })
  }
})

export default router

