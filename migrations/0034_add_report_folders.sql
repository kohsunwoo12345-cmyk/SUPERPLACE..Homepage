-- AI 학습 리포트 폴더 시스템 추가

-- 리포트 폴더 테이블
CREATE TABLE IF NOT EXISTS report_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER NOT NULL,
  folder_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- learning_reports 테이블에 folder_id 추가
ALTER TABLE learning_reports ADD COLUMN folder_id INTEGER;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_report_folders_academy ON report_folders(academy_id);
CREATE INDEX IF NOT EXISTS idx_learning_reports_folder ON learning_reports(folder_id);
