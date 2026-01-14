-- 발신번호 인증 서류 확장 마이그레이션
-- 통신사 가입증명원, 재직증명서, 이용계약서 컬럼 추가

-- sender_verification_requests 테이블에 추가 서류 컬럼 추가
ALTER TABLE sender_verification_requests ADD COLUMN certificate_image TEXT;
ALTER TABLE sender_verification_requests ADD COLUMN employment_cert_image TEXT;
ALTER TABLE sender_verification_requests ADD COLUMN contract_image TEXT;

-- 승인/거절 사유 컬럼 추가
ALTER TABLE sender_verification_requests ADD COLUMN rejection_reason TEXT;

-- sender_verification_requests 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sender_verification_status ON sender_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_sender_verification_user_id ON sender_verification_requests(user_id);
