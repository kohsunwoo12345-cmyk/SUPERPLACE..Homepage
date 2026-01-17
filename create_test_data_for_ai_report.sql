-- AI 학습 리포트 테스트용 샘플 데이터 생성
-- 이 스크립트는 테스트 목적으로만 사용하세요

-- 1. learning_reports 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS learning_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  report_month TEXT NOT NULL,
  overall_score REAL,
  study_attitude TEXT,
  strengths TEXT,
  weaknesses TEXT,
  improvements TEXT,
  recommendations TEXT,
  next_month_goals TEXT,
  ai_analysis TEXT,
  parent_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. grades 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  test_date DATE NOT NULL,
  score REAL NOT NULL,
  max_score REAL NOT NULL DEFAULT 100,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. attendance 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. counseling 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS counseling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  counseling_date DATE NOT NULL,
  counselor_name TEXT,
  content TEXT,
  follow_up TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_learning_reports_student ON learning_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_reports_month ON learning_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(test_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_counseling_student ON counseling(student_id);

-- 5. 샘플 성적 데이터 삽입 (이번 달)
-- 학생 ID = 1 가정, 실제 학생 ID로 변경하세요
INSERT INTO grades (student_id, subject, test_date, score, max_score) VALUES
  (1, '수학', date('now'), 85, 100),
  (1, '영어', date('now'), 92, 100),
  (1, '과학', date('now', '-3 days'), 78, 100),
  (1, '국어', date('now', '-5 days'), 88, 100),
  (1, '사회', date('now', '-7 days'), 81, 100);

-- 6. 샘플 출석 데이터 삽입 (이번 달)
INSERT INTO attendance (student_id, attendance_date, status) VALUES
  (1, date('now'), 'present'),
  (1, date('now', '-1 day'), 'present'),
  (1, date('now', '-2 days'), 'present'),
  (1, date('now', '-3 days'), 'absent'),
  (1, date('now', '-4 days'), 'present'),
  (1, date('now', '-5 days'), 'present'),
  (1, date('now', '-6 days'), 'present'),
  (1, date('now', '-7 days'), 'present'),
  (1, date('now', '-8 days'), 'present'),
  (1, date('now', '-9 days'), 'present'),
  (1, date('now', '-10 days'), 'late'),
  (1, date('now', '-11 days'), 'present'),
  (1, date('now', '-12 days'), 'present'),
  (1, date('now', '-13 days'), 'present'),
  (1, date('now', '-14 days'), 'present');

-- 7. 샘플 상담 기록 삽입
INSERT INTO counseling (student_id, counseling_date, counselor_name, content) VALUES
  (1, date('now', '-3 days'), '김선생님', '수학 진도 상담, 기본기는 탄탄하나 응용력 향상 필요'),
  (1, date('now', '-10 days'), '이선생님', '학습 태도 우수, 집중력 매우 좋음');

-- 완료 메시지
SELECT 'AI 학습 리포트 테스트 데이터 생성 완료!' as message;
SELECT '학생 ID 1번에 대한 성적, 출석, 상담 데이터가 생성되었습니다.' as info;
SELECT '이제 AI 학습 리포트를 생성할 수 있습니다.' as next_step;
