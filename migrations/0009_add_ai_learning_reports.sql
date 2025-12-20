-- AI 학습 분석 리포트 시스템 마이그레이션

-- AI 학습 분석 리포트 테이블
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

-- 학습 목표 테이블
CREATE TABLE IF NOT EXISTS learning_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  target_score INTEGER,
  current_score INTEGER,
  achievement_rate REAL,
  deadline DATE,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- 학습 패턴 분석 테이블
CREATE TABLE IF NOT EXISTS learning_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  analysis_date DATE NOT NULL,
  attendance_rate REAL,
  homework_completion_rate REAL,
  test_average REAL,
  concentration_level TEXT,
  participation_level TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_learning_reports_student ON learning_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_reports_month ON learning_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_learning_goals_student ON learning_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_status ON learning_goals(status);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_student ON learning_patterns(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_date ON learning_patterns(analysis_date);
