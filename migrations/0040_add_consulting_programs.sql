-- 컨설팅 프로그램 테이블
CREATE TABLE IF NOT EXISTS consulting_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price INTEGER NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 6,
  details TEXT NOT NULL,
  features TEXT NOT NULL, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 컨설팅 수강 신청 테이블
CREATE TABLE IF NOT EXISTS consulting_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  academy_id INTEGER NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  academy_name TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER,
  reject_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (program_id) REFERENCES consulting_programs(program_id)
);

CREATE INDEX IF NOT EXISTS idx_consulting_applications_status ON consulting_applications(status);
CREATE INDEX IF NOT EXISTS idx_consulting_applications_user ON consulting_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_consulting_applications_academy ON consulting_applications(academy_id);
CREATE INDEX IF NOT EXISTS idx_consulting_applications_program ON consulting_applications(program_id);

-- 기본 프로그램 데이터 삽입
INSERT INTO consulting_programs (program_id, name, description, image_url, price, sessions, details, features) VALUES 
(
  'naver-place-consulting',
  '네이버 플레이스 상위노출 컨설팅',
  '실제 포스팅의 집중 컨설팅 시작하실 마케팅!',
  '/static/images/naver-place-consulting.jpg',
  1210000,
  6,
  '네이버 플레이스 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 플레이스 등록부터 상위노출 전략, 리뷰 관리, 키워드 최적화까지 실전 노하우를 전수받으실 수 있습니다.',
  '["플레이스 최적화 전략", "리뷰 관리 노하우", "키워드 분석 및 타겟팅", "경쟁사 분석", "상위노출 실전 기법", "1:1 맞춤 컨설팅"]'
),
(
  'blog-consulting',
  '블로그 1:1 컨설팅',
  '실제 포스팅의 집중 컨설팅 시작하실 마케팅!',
  '/static/images/blog-consulting.jpg',
  1210000,
  6,
  '블로그 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 SEO 최적화, 콘텐츠 작성법, 키워드 전략, 유입 증대 방법까지 블로그 마케팅의 모든 것을 배우실 수 있습니다.',
  '["SEO 최적화 전략", "콘텐츠 기획 및 작성법", "키워드 리서치", "검색 상위노출 기법", "유입 분석 및 개선", "1:1 맞춤 컨설팅"]'
);
