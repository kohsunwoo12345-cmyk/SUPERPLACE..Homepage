-- SMS 템플릿 테이블
CREATE TABLE IF NOT EXISTS sms_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- SMS 발송 기록 테이블
CREATE TABLE IF NOT EXISTS sms_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  recipient_name TEXT,
  recipient_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at DATETIME,
  sent_at DATETIME,
  result_code TEXT,
  result_message TEXT,
  cost INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES sms_templates(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 학생 정보 테이블 (간단한 버전)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade TEXT,
  subject TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  academy_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  enrollment_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES users(id)
);

-- 학생 그룹 테이블 (학년별, 과목별 그룹)
CREATE TABLE IF NOT EXISTS student_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  academy_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES users(id)
);

-- 학생-그룹 연결 테이블
CREATE TABLE IF NOT EXISTS student_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES student_groups(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_is_active ON sms_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_history_status ON sms_history(status);
CREATE INDEX IF NOT EXISTS idx_sms_history_scheduled_at ON sms_history(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sms_history_created_by ON sms_history(created_by);
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_student_groups_academy_id ON student_groups(academy_id);

-- 기본 템플릿 삽입
INSERT INTO sms_templates (name, category, content, variables) VALUES 
('수업 공지', 'class', '[{academy_name}] {student_name} 학생 학부모님, {date} {subject} 수업이 있습니다. 시간: {time}', '["academy_name", "student_name", "date", "subject", "time"]'),
('결석 안내', 'absence', '[{academy_name}] {student_name} 학생이 오늘 수업에 결석하셨습니다. 확인 부탁드립니다.', '["academy_name", "student_name"]'),
('상담 요청', 'consultation', '[{academy_name}] {student_name} 학생 학부모님, 학습 상담이 필요합니다. 편하신 시간을 알려주세요. 연락처: {phone}', '["academy_name", "student_name", "phone"]'),
('성적 향상 축하', 'achievement', '[{academy_name}] 축하합니다! {student_name} 학생이 {subject} {score}점을 받았습니다! 🎉', '["academy_name", "student_name", "subject", "score"]'),
('이벤트 안내', 'event', '[{academy_name}] {event_name} 이벤트 진행중! {details} 자세한 내용: {url}', '["academy_name", "event_name", "details", "url"]'),
('재등록 안내', 'reenrollment', '[{academy_name}] {student_name} 학생의 수강 종료일이 {days}일 남았습니다. 재등록 시 {discount} 할인 혜택! 문의: {phone}', '["academy_name", "student_name", "days", "discount", "phone"]');
