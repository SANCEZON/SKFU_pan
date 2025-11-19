import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Главная', path: '/', icon: '🏠' },
  { name: 'Студенты', path: '/students', icon: '👥' },
  { name: 'Преподаватели', path: '/teachers', icon: '👨‍🏫' },
  { name: 'Расписание', path: '/schedule', icon: '📅' },
  { name: 'Посещаемость', path: '/attendance', icon: '✅' },
  { name: 'Отчёты', path: '/reports', icon: '📊' },
  { name: 'Недельный отчёт', path: '/weekly-report', icon: '🗓️' },
  { name: 'Приглашения', path: '/invitations', icon: '✉️' },
  { name: 'Графики', path: '/charts', icon: '📈' },
  { name: 'Заметки', path: '/notes', icon: '📝' },
  { name: 'Логи', path: '/logs', icon: '📋' },
  { name: 'Настройки', path: '/settings', icon: '⚙️' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">Панель учёта</h1>
            <p className="text-sm text-gray-500 mt-1">Посещаемость</p>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="mb-2 px-4 py-2 text-sm text-gray-600">
              {user?.email}
            </div>
            <button
              onClick={() => signOut()}
              className="w-full btn-secondary text-sm"
            >
              Выйти
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64">
          <div className="p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

