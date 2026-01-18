-- 폼 템플릿 테이블 생성
-- 각 랜딩페이지마다 다른 커스텀 폼을 생성하고 관리
CREATE TABLE IF NOT EXISTS form_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- 템플릿 이름 (예: "학원 설명회 신청서")
  description TEXT, -- 템플릿 설명
  user_id INTEGER NOT NULL, -- 생성한 사용자
  academy_id INTEGER, -- 학원 ID (선택사항)
  
  -- 폼 필드 설정 (JSON 형식)
  -- 예: [{"type":"text","name":"name","label":"이름","required":true,"placeholder":"이름을 입력하세요"}]
  fields TEXT NOT NULL, -- JSON array of field configurations
  
  -- 폼 스타일 설정
  submit_button_text TEXT DEFAULT '신청하기',
  success_message TEXT DEFAULT '신청이 완료되었습니다!',
  
  -- 알림 설정
  notification_email TEXT, -- 신청 시 알림받을 이메일
  notification_phone TEXT, -- 신청 시 알림받을 전화번호
  send_sms_notification INTEGER DEFAULT 0, -- SMS 알림 활성화 여부
  
  -- 메타 정보
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1, -- 활성화 여부
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 폼 제출 데이터 테이블
-- 사용자가 랜딩페이지에서 폼을 제출하면 저장
CREATE TABLE IF NOT EXISTS form_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_template_id INTEGER NOT NULL, -- 어떤 폼에서 제출되었는지
  landing_page_id INTEGER, -- 어떤 랜딩페이지에서 제출되었는지 (선택사항)
  
  -- 제출된 데이터 (JSON 형식)
  -- 예: {"name":"홍길동","phone":"010-1234-5678","email":"test@example.com"}
  submission_data TEXT NOT NULL, -- JSON object of submitted form data
  
  -- 제출자 정보
  ip_address TEXT, -- 제출자 IP
  user_agent TEXT, -- 제출자 브라우저 정보
  
  -- 처리 상태
  status TEXT DEFAULT 'new', -- new, contacted, completed, rejected
  notes TEXT, -- 관리자 메모
  
  -- 메타 정보
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  viewed_at TEXT, -- 관리자가 확인한 시간
  
  FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL
);

-- 랜딩페이지 테이블에 폼 템플릿 연결 컬럼 추가
ALTER TABLE landing_pages ADD COLUMN form_template_id INTEGER;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_form_templates_user_id ON form_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_academy_id ON form_templates(academy_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_template_id ON form_submissions(form_template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_landing_page_id ON form_submissions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);
