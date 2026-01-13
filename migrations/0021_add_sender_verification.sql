-- 발신번호 인증 신청 테이블
CREATE TABLE IF NOT EXISTS sender_verification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_registration_number TEXT NOT NULL,
  business_registration_image TEXT NOT NULL, -- imgbb URL
  request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_note TEXT,
  processed_by INTEGER, -- admin user_id
  processed_date DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sender_verification_user_id ON sender_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_verification_status ON sender_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_sender_verification_phone ON sender_verification_requests(phone_number);

-- sender_ids 테이블에 verification_request_id 추가
ALTER TABLE sender_ids ADD COLUMN verification_request_id INTEGER;
ALTER TABLE sender_ids ADD COLUMN business_name TEXT;
ALTER TABLE sender_ids ADD COLUMN business_registration_number TEXT;
