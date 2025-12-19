-- 랜딩페이지 테이블에 QR 코드 URL 컬럼 추가
ALTER TABLE landing_pages ADD COLUMN qr_code_url TEXT;

-- 카카오톡 발송 기록 테이블
CREATE TABLE IF NOT EXISTS kakao_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  landing_page_id INTEGER,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id)
);

-- 랜딩페이지 조회 로그 테이블 (상세 통계용)
CREATE TABLE IF NOT EXISTS landing_page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landing_page_id INTEGER NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kakao_messages_user_id ON kakao_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_kakao_messages_status ON kakao_messages(status);
CREATE INDEX IF NOT EXISTS idx_kakao_messages_scheduled_at ON kakao_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_landing_page_views_page_id ON landing_page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_views_viewed_at ON landing_page_views(viewed_at);
