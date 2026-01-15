-- 반(Class) 테이블 추가
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER DEFAULT 1,
  class_name TEXT NOT NULL,
  grade TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 과목(Course) 테이블 추가
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER DEFAULT 1,
  course_name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 학생-과목 수강 관계 테이블
CREATE TABLE IF NOT EXISTS student_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 일일 성과 기록 테이블
CREATE TABLE IF NOT EXISTS daily_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER,
  record_date DATE NOT NULL,
  attendance TEXT CHECK(attendance IN ('출석', '지각', '결석', '조퇴')),
  homework_status TEXT CHECK(homework_status IN ('완료', '미완료', '부분완료')),
  understanding_level INTEGER CHECK(understanding_level >= 1 AND understanding_level <= 5),
  participation_level INTEGER CHECK(participation_level >= 1 AND participation_level <= 5),
  achievement TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- students 테이블에 class_id 컬럼 추가 (이미 있으면 무시)
ALTER TABLE students ADD COLUMN class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_classes_academy_id ON classes(academy_id);
CREATE INDEX IF NOT EXISTS idx_courses_academy_id ON courses(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_student_id ON daily_records(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
