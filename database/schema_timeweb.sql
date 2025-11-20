-- SQL схема для импорта в TimeWeb MySQL
-- ВАЖНО: База данных должна быть уже создана в панели TimeWeb
-- Выберите нужную базу данных в phpMyAdmin перед выполнением этого SQL

-- Таблица пользователей (заменяет auth.users)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица приглашений пользователей
CREATE TABLE IF NOT EXISTS user_invitations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('pending', 'accepted', 'rejected', 'revoked', 'expired') NOT NULL DEFAULT 'pending',
  created_by CHAR(36),
  approved_by CHAR(36),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  expires_at DATETIME,
  used_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id CHAR(36) PRIMARY KEY,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  invitation_id CHAR(36) REFERENCES user_invitations(id) ON DELETE SET NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица логов одобрений
CREATE TABLE IF NOT EXISTS approval_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  invitation_id CHAR(36),
  target_email VARCHAR(255) NOT NULL,
  action ENUM('invited', 'approved', 'rejected', 'revoked') NOT NULL,
  acted_by CHAR(36),
  FOREIGN KEY (invitation_id) REFERENCES user_invitations(id) ON DELETE SET NULL,
  FOREIGN KEY (acted_by) REFERENCES users(id) ON DELETE SET NULL,
  details TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invitation_id (invitation_id),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица студентов
CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255) NOT NULL,
  telegram VARCHAR(255),
  phone VARCHAR(50),
  status ENUM('active', 'expelled') NOT NULL DEFAULT 'active',
  group_id VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица преподавателей
CREATE TABLE IF NOT EXISTS teachers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица предметов
CREATE TABLE IF NOT EXISTS subjects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица связи преподавателей и предметов
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  teacher_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_teacher_subject (teacher_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица расписания
CREATE TABLE IF NOT EXISTS schedules (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  subject_id CHAR(36) NOT NULL,
  teacher_id CHAR(36),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(255),
  type ENUM('lecture', 'lab', 'practice') NOT NULL DEFAULT 'lecture',
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  week_number TINYINT DEFAULT 1 CHECK (week_number IN (1, 2)),
  schedule_start_date DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_week_number (week_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица сессий занятий
CREATE TABLE IF NOT EXISTS schedule_sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  schedule_id CHAR(36),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(255),
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_schedule_id (schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица причин отсутствия
CREATE TABLE IF NOT EXISTS absence_reasons (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица записей посещаемости
CREATE TABLE IF NOT EXISTS attendance_records (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  status ENUM('present', 'absent', 'late', 'vacation', 'sick') NOT NULL DEFAULT 'present',
  reason_id CHAR(36),
  FOREIGN KEY (session_id) REFERENCES schedule_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (reason_id) REFERENCES absence_reasons(id) ON DELETE SET NULL,
  note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_session_student (session_id, student_id),
  INDEX idx_session_id (session_id),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица отчётов
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  FOREIGN KEY (session_id) REFERENCES schedule_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица заметок
CREATE TABLE IF NOT EXISTS notes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица логов активности
CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id CHAR(36),
  details JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица настроек
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вставка начальных данных
INSERT INTO absence_reasons (name, code) VALUES
  ('Болезнь', 'sick'),
  ('Отпуск', 'vacation'),
  ('Уважительная причина', 'valid'),
  ('Неуважительная причина', 'invalid'),
  ('Опоздание', 'late')
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO settings (`key`, value, type) VALUES
  ('group_name', 'Группа', 'string'),
  ('timezone', 'Europe/Moscow', 'string'),
  ('csv_delimiter', ',', 'string')
ON DUPLICATE KEY UPDATE value=value;

