-- SMS 발송 시스템 데이터베이스 설계

-- 1. users 테이블에 balance 컬럼 추가
ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN sms_sender_name TEXT;

-- 2. 발신번호 관리 테이블
CREATE TABLE IF NOT EXISTS sender_ids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  verification_method TEXT NOT NULL, -- 'mobile' 또는 'ars'
  verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  alligo_response TEXT, -- 알리고 API 응답 저장
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. SMS 발송 로그 테이블
CREATE TABLE IF NOT EXISTS sms_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  sender_number TEXT NOT NULL,
  receiver_number TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'SMS', 'LMS', 'MMS'
  message_content TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  point_cost INTEGER NOT NULL, -- 차감된 포인트
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  alligo_response TEXT, -- 알리고 API 응답
  alligo_msg_id TEXT, -- 알리고 메시지 ID
  reserve_time DATETIME, -- 예약 발송 시간
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES sender_ids(id)
);

-- 4. SMS 발송 상세 (수신자별)
CREATE TABLE IF NOT EXISTS sms_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sms_log_id INTEGER NOT NULL,
  receiver_number TEXT NOT NULL,
  receiver_name TEXT,
  message_content TEXT NOT NULL, -- 치환된 메시지
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  alligo_response TEXT,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sms_log_id) REFERENCES sms_logs(id)
);

-- 5. 포인트 거래 내역 테이블
CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'charge', 'refund', 'sms_cost', 'admin_adjust'
  amount INTEGER NOT NULL, -- 양수: 충전/환불, 음수: 차감
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  related_sms_log_id INTEGER, -- SMS 발송과 연관된 경우
  admin_id INTEGER, -- 관리자가 조정한 경우
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_sms_log_id) REFERENCES sms_logs(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 6. SMS 요금표 테이블
CREATE TABLE IF NOT EXISTS sms_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_type TEXT NOT NULL UNIQUE, -- 'SMS', 'LMS', 'MMS'
  wholesale_price INTEGER NOT NULL, -- 도매가 (알리고 기준)
  retail_price INTEGER NOT NULL, -- 소매가 (원장님 설정)
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 초기 요금표 데이터 삽입
INSERT OR REPLACE INTO sms_pricing (message_type, wholesale_price, retail_price, description) VALUES
  ('SMS', 8, 20, '단문 메시지 (90바이트)'),
  ('LMS', 25, 50, '장문 메시지 (2000바이트)'),
  ('MMS', 60, 150, '포토 메시지 (이미지 포함)');

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sender_ids_user_id ON sender_ids(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_ids_status ON sender_ids(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_sms_log_id ON sms_recipients(sms_log_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
