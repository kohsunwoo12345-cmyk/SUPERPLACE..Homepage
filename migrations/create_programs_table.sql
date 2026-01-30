-- 교육 프로그램 테이블
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    detail_description TEXT,
    image_url TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    sessions INTEGER DEFAULT 1,
    duration_days INTEGER,
    features TEXT,
    type TEXT DEFAULT 'consulting',
    status TEXT DEFAULT 'active',
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(type);
CREATE INDEX IF NOT EXISTS idx_programs_display_order ON programs(display_order);

-- 기존 하드코딩된 프로그램 데이터 삽입
INSERT OR IGNORE INTO programs (program_id, name, description, detail_description, price, sessions, features, type, display_order) VALUES
('naver-place-consulting', '네이버 플레이스 상위노출 컨설팅', '실제 포스팅의 집중 컨설팅 시작하실 마케팅!', '네이버 플레이스 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 플레이스 등록부터 상위노출 전략, 리뷰 관리, 키워드 최적화까지 실전 노하우를 전수받으실 수 있습니다.', 1210000, 6, '["플레이스 최적화 전략", "리뷰 관리 노하우", "키워드 분석 및 타겟팅", "경쟁사 분석", "상위노출 실전 기법", "1:1 맞춤 컨설팅"]', 'consulting', 1),
('blog-consulting', '블로그 1:1 컨설팅', '실제 포스팅의 집중 컨설팅 시작하실 마케팅!', '블로그 상위노출을 위한 1:1 맞춤 컨설팅 프로그램입니다. 6회에 걸쳐 SEO 최적화, 콘텐츠 작성법, 키워드 전략, 유입 증대 방법까지 블로그 마케팅의 모든 것을 배우실 수 있습니다.', 1210000, 6, '["SEO 최적화 전략", "콘텐츠 기획 및 작성법", "키워드 리서치", "검색 상위노출 기법", "유입 분석 및 개선", "1:1 맞춤 컨설팅"]', 'consulting', 2),
('landing-page-max', '(Max) 랜딩페이지 제작', '전문가가 만드는 고퀄리티 랜딩페이지', '전문 디자이너와 개발자가 함께 제작하는 프리미엄 랜딩페이지입니다. 브랜드 분석부터 디자인, 개발, 배포까지 모든 과정을 관리해드립니다.', 2200000, 1, '["브랜드 분석", "커스텀 디자인", "반응형 웹", "SEO 최적화", "애니메이션 효과", "도메인 연결"]', 'service', 3),
('landing-page-basic', '(Basic) 랜딩페이지 제작', '합리적인 가격의 기본 랜딩페이지', '빠르고 효율적인 랜딩페이지 제작 서비스입니다. 템플릿 기반으로 제작되며, 필수 기능을 모두 갖추고 있습니다.', 550000, 1, '["템플릿 기반 디자인", "반응형 웹", "기본 SEO", "빠른 제작", "도메인 연결"]', 'service', 4);
