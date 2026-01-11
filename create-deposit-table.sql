-- 입금 신청 테이블 생성
CREATE TABLE IF NOT EXISTS deposit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  depositor_name TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON deposit_requests(status);
