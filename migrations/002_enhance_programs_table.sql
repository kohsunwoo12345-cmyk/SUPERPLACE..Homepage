-- 프로그램 테이블 개선: 더 많은 정보 저장

-- 기존 테이블 백업
CREATE TABLE IF NOT EXISTS programs_backup AS SELECT * FROM programs;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS programs;

-- 새로운 programs 테이블 생성
CREATE TABLE programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  details TEXT,
  image_url TEXT DEFAULT '/thumbnail.jpg',
  price INTEGER DEFAULT NULL,
  sessions INTEGER DEFAULT NULL,
  type TEXT DEFAULT 'consulting',
  features TEXT,
  status TEXT DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 프로그램 데이터 삽입
INSERT INTO programs (program_id, name, description, details, image_url, price, sessions, type, features) VALUES 
('naver-place-consulting', 
 '네이버 플레이스 상위노출 컨설팅', 
 '실제 포스팅의 집중 컨설팅 시작하실 마케팅!',
 '네이버 플레이스 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 플레이스 등록부터 상위노출 전략, 리뷰 관리, 키워드 최적화까지 실전 노하우를 전수받으실 수 있습니다.',
 '/thumbnail.jpg',
 1210000,
 6,
 'consulting',
 '["플레이스 최적화 전략", "리뷰 관리 노하우", "키워드 분석 및 타겟팅", "경쟁사 분석", "상위노출 실전 기법", "1:1 맞춤 컨설팅"]'),

('blog-consulting',
 '블로그 1:1 컨설팅',
 '실제 포스팅의 집중 컨설팅 시작하실 마케팅!',
 '블로그 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 SEO 최적화, 콘텐츠 작성법, 키워드 전략, 유입 증대 방법까지 블로그 마케팅의 모든 것을 배우실 수 있습니다.',
 '/thumbnail.jpg',
 1210000,
 6,
 'consulting',
 '["SEO 최적화 전략", "콘텐츠 기획 및 작성법", "키워드 리서치", "검색 상위노출 기법", "유입 분석 및 개선", "1:1 맞춤 컨설팅"]'),

('landing-page-max',
 '(Max) 랜딩페이지 제작',
 '전문가가 만드는 고퀄리티 랜딩페이지',
 '학원 전문 마케팅 경험을 바탕으로 제작하는 프리미엄 랜딩페이지 서비스입니다. 반응형 디자인, SEO 최적화, 고객 전환율을 극대화한 페이지를 제공합니다.',
 '/landing-page-service.jpg',
 NULL,
 NULL,
 'inquiry',
 '["반응형 웹 디자인", "SEO 최적화 적용", "고객 전환율 극대화", "빠른 로딩 속도", "모바일 최적화", "관리자 페이지 제공", "무제한 수정 지원", "호스팅 1년 무료"]'),

('marketing-agency',
 '학원 마케팅 대행',
 '학원 전문 마케팅 대행 서비스',
 '네이버 플레이스, 블로그, SNS 등 다양한 채널을 통한 종합 마케팅 대행 서비스입니다. 학원에 최적화된 마케팅 전략으로 학생 모집을 도와드립니다.',
 '/marketing-agency.jpg',
 NULL,
 NULL,
 'inquiry',
 '["네이버 플레이스 관리", "블로그 콘텐츠 작성", "SNS 마케팅 대행", "키워드 광고 운영", "월간 리포트 제공", "실시간 상담 지원", "경쟁사 분석 리포트", "맞춤형 마케팅 전략"]');
