-- 프로그램 테이블
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자-프로그램 연결 테이블
CREATE TABLE IF NOT EXISTS user_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_date DATETIME,
  progress INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 기본 프로그램 데이터 삽입
INSERT INTO programs (name, description, price, duration_days) VALUES 
('네이버 플레이스 상위노출', '네이버 플레이스 검색 최적화 및 리뷰 관리 전략', 300000, 90),
('블로그 상위노출', '네이버 블로그 SEO 최적화 및 콘텐츠 마케팅', 350000, 90),
('퍼널 마케팅', '상담-등록 전환율 극대화 시스템 구축', 400000, 120),
('학부모 소통 시스템', '자동화된 학부모 커뮤니케이션 도구 활용', 200000, 60),
('종합 마케팅 패키지', '네이버 플레이스 + 블로그 + 퍼널 통합', 800000, 180);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_programs_user_id ON user_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_programs_program_id ON user_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_user_programs_status ON user_programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
