-- 카카오톡 알림톡 시스템 테이블 추가
-- Migration: 0022_add_kakao_alimtalk_system.sql

-- 카카오톡 채널 (발신 프로필) 관리
CREATE TABLE IF NOT EXISTS kakao_sender_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender_key TEXT NOT NULL,           -- 카카오톡 채널 발신 키 (예: @학원명)
  profile_name TEXT NOT NULL,         -- 채널 이름
  category_code TEXT,                 -- 카테고리 코드
  status TEXT DEFAULT 'pending',      -- pending, active, rejected
  verification_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_kakao_sender_profiles_user_id ON kakao_sender_profiles(user_id);
CREATE INDEX idx_kakao_sender_profiles_status ON kakao_sender_profiles(status);

-- 카카오톡 알림톡 템플릿 관리
CREATE TABLE IF NOT EXISTS kakao_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  template_code TEXT NOT NULL,        -- 템플릿 코드 (알리고에서 발급)
  template_name TEXT NOT NULL,        -- 템플릿 이름
  template_content TEXT NOT NULL,     -- 템플릿 내용
  template_emphasis_type TEXT,        -- 강조 유형 (NONE, TEXT, IMAGE)
  template_extra TEXT,                -- 부가 정보 (예: 채널추가, 배송조회)
  template_ad TEXT,                   -- 광고 표시 여부
  status TEXT DEFAULT 'pending',      -- pending, approved, rejected
  buttons_json TEXT,                  -- 버튼 정보 (JSON 형식)
  inspection_status TEXT,             -- 검수 상태
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_kakao_templates_user_id ON kakao_templates(user_id);
CREATE INDEX idx_kakao_templates_status ON kakao_templates(status);
CREATE INDEX idx_kakao_templates_code ON kakao_templates(template_code);

-- 카카오톡 알림톡 발송 로그
CREATE TABLE IF NOT EXISTS kakao_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender_key TEXT NOT NULL,           -- 발신 프로필 키
  template_code TEXT NOT NULL,        -- 사용한 템플릿 코드
  receiver_phone TEXT NOT NULL,       -- 수신자 전화번호
  receiver_name TEXT,                 -- 수신자 이름
  message TEXT NOT NULL,              -- 실제 발송 메시지
  buttons_json TEXT,                  -- 버튼 정보
  fail_over TEXT DEFAULT 'Y',         -- 실패 시 SMS 대체 발송 (Y/N)
  fail_over_sms TEXT,                 -- 대체 SMS 내용
  status TEXT DEFAULT 'pending',      -- pending, success, failed
  result_code INTEGER,                -- 알리고 결과 코드
  result_message TEXT,                -- 알리고 결과 메시지
  msg_id TEXT,                        -- 알리고 메시지 ID
  cost INTEGER DEFAULT 0,             -- 발송 비용 (포인트)
  reserved_date DATETIME,             -- 예약 발송 시간
  sent_at DATETIME,                   -- 실제 발송 시간
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_kakao_logs_user_id ON kakao_logs(user_id);
CREATE INDEX idx_kakao_logs_status ON kakao_logs(status);
CREATE INDEX idx_kakao_logs_created_at ON kakao_logs(created_at);
CREATE INDEX idx_kakao_logs_receiver_phone ON kakao_logs(receiver_phone);

-- 카카오톡 알림톡 수신자별 상세 내역
CREATE TABLE IF NOT EXISTS kakao_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_log_id INTEGER NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_name TEXT,
  status TEXT DEFAULT 'pending',      -- pending, success, failed
  result_code INTEGER,
  result_message TEXT,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kakao_log_id) REFERENCES kakao_logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_kakao_recipients_log_id ON kakao_recipients(kakao_log_id);
CREATE INDEX idx_kakao_recipients_phone ON kakao_recipients(receiver_phone);

-- 카카오톡 알림톡 요금표
CREATE TABLE IF NOT EXISTS kakao_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_type TEXT NOT NULL,         -- ALIMTALK, FRIENDTALK
  description TEXT,
  wholesale_price INTEGER NOT NULL,   -- 도매가
  retail_price INTEGER NOT NULL,      -- 소매가 (사용자에게 부과)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 요금표 데이터 삽입
INSERT OR IGNORE INTO kakao_pricing (message_type, description, wholesale_price, retail_price) VALUES
('ALIMTALK', '카카오 알림톡 (템플릿 사용)', 8, 15),
('FRIENDTALK', '카카오 친구톡 (광고)', 12, 25);
