-- 프로그램 테이블에 HTML 컨텐츠 및 이미지 필드 추가

-- content_type 필드 추가 (text 또는 html)
ALTER TABLE programs ADD COLUMN content_type TEXT DEFAULT 'text';

-- html_content 필드 추가 (HTML 상세 페이지 내용)
ALTER TABLE programs ADD COLUMN html_content TEXT;

-- 기존 프로그램의 content_type을 'text'로 설정
UPDATE programs SET content_type = 'text' WHERE content_type IS NULL;
