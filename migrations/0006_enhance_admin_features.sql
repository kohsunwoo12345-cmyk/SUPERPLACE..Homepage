-- 문의 테이블에 답변 메모 및 처리자 추가
ALTER TABLE contacts ADD COLUMN reply_memo TEXT;
ALTER TABLE contacts ADD COLUMN handled_by INTEGER;
ALTER TABLE contacts ADD COLUMN handled_at DATETIME;

-- 프로그램 테이블에 상세 정보 추가 (price, duration_days는 이미 존재)
ALTER TABLE programs ADD COLUMN max_students INTEGER;
ALTER TABLE programs ADD COLUMN is_active INTEGER DEFAULT 1;

-- 이메일 알림 로그 테이블
CREATE TABLE IF NOT EXISTS email_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 시스템 통계 스냅샷 테이블 (일별 집계)
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_programs INTEGER DEFAULT 0,
  active_enrollments INTEGER DEFAULT 0,
  new_enrollments INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  pending_contacts INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contacts_handled_by ON contacts(handled_by);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);
