-- 소셜 로그인 필드 추가
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN kakao_id TEXT;
ALTER TABLE users ADD COLUMN profile_image TEXT;
ALTER TABLE users ADD COLUMN social_provider TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_social_provider ON users(social_provider);
