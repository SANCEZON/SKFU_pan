import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './config/database.js'

// Routes
import authRoutes from './routes/auth.js'
import studentsRoutes from './routes/students.js'
import teachersRoutes from './routes/teachers.js'
import subjectsRoutes from './routes/subjects.js'
import schedulesRoutes from './routes/schedules.js'
import attendanceRoutes from './routes/attendance.js'
import reportsRoutes from './routes/reports.js'
import notesRoutes from './routes/notes.js'
import logsRoutes from './routes/logs.js'
import settingsRoutes from './routes/settings.js'
import invitationsRoutes from './routes/invitations.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*', // По умолчанию разрешаем все (для разработки)
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection()
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/subjects', subjectsRoutes)
app.use('/api/schedules', schedulesRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/invitations', invitationsRoutes)

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера',
  })
})

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
  await testConnection()
})

