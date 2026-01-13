-- 검색량 조회 분석 로그 테이블
CREATE TABLE IF NOT EXISTS search_analysis_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  place_url TEXT NOT NULL,
  result_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_analysis_logs(created_at);
