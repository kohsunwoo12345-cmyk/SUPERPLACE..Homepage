-- 원장님-선생님 계층 구조를 위한 마이그레이션
-- 2026-01-16

-- 1. users 테이블에 parent_user_id 컬럼 추가 (선생님이 소속된 원장님)
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director'; -- 'director' (원장), 'teacher' (선생님)

-- 2. 반(클래스) 테이블 생성
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- 반 이름 (예: 초등 1반, 중등 A반)
  description TEXT,
  user_id INTEGER NOT NULL, -- 원장님 ID
  teacher_id INTEGER, -- 담당 선생님 ID
  grade_level TEXT, -- 학년 수준 (초등, 중등, 고등)
  subject TEXT, -- 과목
  max_students INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 3. 학생 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  student_number TEXT, -- 학생 번호
  grade TEXT, -- 학년
  school TEXT, -- 학교명
  phone TEXT,
  parent_name TEXT,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  address TEXT,
  birth_date TEXT,
  gender TEXT,
  notes TEXT, -- 특이사항
  user_id INTEGER NOT NULL, -- 원장님 ID
  class_id INTEGER, -- 소속 반 ID
  status TEXT DEFAULT 'active', -- active, inactive, graduated
  enrollment_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 4. 출석 기록 테이블
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL, -- present(출석), absent(결석), late(지각), excused(조퇴)
  notes TEXT,
  recorded_by INTEGER NOT NULL, -- 기록한 사용자 (선생님 또는 원장님)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  UNIQUE(student_id, attendance_date)
);

-- 5. 성적 기록 테이블
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  exam_name TEXT NOT NULL, -- 시험명 (중간고사, 기말고사, 모의고사 등)
  exam_date DATE,
  score REAL, -- 점수
  max_score REAL DEFAULT 100,
  grade TEXT, -- 등급 (A, B, C 등)
  rank INTEGER, -- 등수
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- 6. 상담 기록 테이블
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  consultant_id INTEGER NOT NULL, -- 상담한 선생님/원장님
  consultation_date DATETIME NOT NULL,
  consultation_type TEXT, -- 학습상담, 진로상담, 생활상담 등
  content TEXT NOT NULL,
  parent_attended INTEGER DEFAULT 0, -- 학부모 참석 여부
  follow_up_needed INTEGER DEFAULT 0,
  follow_up_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (consultant_id) REFERENCES users(id)
);

-- 7. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_consultations_student ON consultations(student_id);

-- 8. 샘플 데이터 (테스트용)
-- A원장님 (이미 존재하는 사용자를 원장으로 업데이트)
UPDATE users SET user_type = 'director' WHERE email = 'test1@superplace.co.kr';

-- A선생님, B선생님 추가
INSERT OR IGNORE INTO users (email, password, name, role, user_type, parent_user_id, academy_name, phone) 
VALUES 
  ('teacher.a@superplace.co.kr', 'teacher123!', 'A선생님', 'user', 'teacher', 
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'), '꾸메땅학원 분당점', '010-1111-1111'),
  ('teacher.b@superplace.co.kr', 'teacher123!', 'B선생님', 'user', 'teacher', 
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'), '꾸메땅학원 분당점', '010-2222-2222');

-- 샘플 반 생성
INSERT OR IGNORE INTO classes (name, description, user_id, teacher_id, grade_level, subject) 
VALUES 
  ('초등 1반', '초등학교 저학년반', 
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'),
   (SELECT id FROM users WHERE email = 'teacher.a@superplace.co.kr'),
   '초등', '전과목'),
  ('중등 A반', '중학교 수학반',
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'),
   (SELECT id FROM users WHERE email = 'teacher.b@superplace.co.kr'),
   '중등', '수학');

-- 샘플 학생 추가
INSERT OR IGNORE INTO students (name, grade, parent_phone, user_id, class_id, status) 
VALUES 
  ('김철수', '초등 3학년', '010-3333-3333',
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'),
   (SELECT id FROM classes WHERE name = '초등 1반'),
   'active'),
  ('이영희', '초등 2학년', '010-4444-4444',
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'),
   (SELECT id FROM classes WHERE name = '초등 1반'),
   'active'),
  ('박민수', '중등 1학년', '010-5555-5555',
   (SELECT id FROM users WHERE email = 'test1@superplace.co.kr'),
   (SELECT id FROM classes WHERE name = '중등 A반'),
   'active');
