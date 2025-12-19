-- 학생 관리 시스템 마이그레이션

-- 학생 정보 테이블
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  phone TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  grade TEXT NOT NULL,
  subjects TEXT NOT NULL,
  enrollment_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 출결 기록 테이블
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 성적 기록 테이블
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 상담 기록 테이블
CREATE TABLE IF NOT EXISTS counseling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  counselor_name TEXT NOT NULL,
  counseling_date DATETIME NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  action_items TEXT,
  next_followup DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 상담 예약 테이블
CREATE TABLE IF NOT EXISTS consultation_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  reminder_sent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 재등록 추적 테이블
CREATE TABLE IF NOT EXISTS reenrollment_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  current_end_date DATE NOT NULL,
  notification_sent_7days INTEGER DEFAULT 0,
  notification_sent_3days INTEGER DEFAULT 0,
  notification_sent_1day INTEGER DEFAULT 0,
  parent_contacted INTEGER DEFAULT 0,
  contact_date DATE,
  intention TEXT,
  reenrolled INTEGER DEFAULT 0,
  reenrollment_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_counseling_student_id ON counseling(student_id);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_date ON consultation_bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_status ON consultation_bookings(status);
CREATE INDEX IF NOT EXISTS idx_reenrollment_tracking_student ON reenrollment_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_reenrollment_tracking_end_date ON reenrollment_tracking(current_end_date);
