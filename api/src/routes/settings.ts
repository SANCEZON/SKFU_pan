import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings')
    const settings: any = {}
    for (const row of rows as any[]) {
      if (row.type === 'number') {
        settings[row.key] = parseFloat(row.value)
      } else if (row.type === 'boolean') {
        settings[row.key] = row.value === 'true'
      } else if (row.type === 'json') {
        settings[row.key] = JSON.parse(row.value)
      } else {
        settings[row.key] = row.value
      }
    }
    res.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Ошибка при получении настроек' })
  }
})

router.get('/:key', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings WHERE `key` = ?', [req.params.key]) as any[]
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Настройка не найдена' })
    }
    const setting = rows[0]
    let value = setting.value
    if (setting.type === 'number') {
      value = parseFloat(value)
    } else if (setting.type === 'boolean') {
      value = value === 'true'
    } else if (setting.type === 'json') {
      value = JSON.parse(value)
    }
    res.json({ key: setting.key, value, type: setting.type })
  } catch (error) {
    console.error('Get setting error:', error)
    res.status(500).json({ error: 'Ошибка при получении настройки' })
  }
})

router.put('/:key', async (req, res) => {
  try {
    const { value, type } = req.body
    let stringValue = value
    if (type === 'json') {
      stringValue = JSON.stringify(value)
    } else {
      stringValue = String(value)
    }
    await pool.execute(
      'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, type = ?',
      [req.params.key, stringValue, type || 'string', stringValue, type || 'string']
    )
    const [rows] = await pool.execute('SELECT * FROM settings WHERE `key` = ?', [req.params.key]) as any[]
    res.json(rows[0])
  } catch (error) {
    console.error('Update setting error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении настройки' })
  }
})

export default router

