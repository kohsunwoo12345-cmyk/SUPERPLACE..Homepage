-- 관리자 계정 생성 (개발/테스트용)
-- 프로덕션에서는 반드시 비밀번호를 변경하세요!

INSERT OR REPLACE INTO users (email, password, name, role, phone, academy_name) 
VALUES ('admin@superplace.kr', 'admin1234', '슈퍼플레이스 관리자', 'admin', '010-1234-5678', '슈퍼플레이스 본사');

-- 확인
SELECT id, email, name, role, created_at FROM users WHERE role = 'admin';
