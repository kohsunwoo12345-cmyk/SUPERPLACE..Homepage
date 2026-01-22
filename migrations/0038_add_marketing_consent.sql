-- Migration: Add marketing consent columns to users table
-- Date: 2026-01-23
-- Description: Add columns for marketing information consent (SMS, Email, KakaoTalk)

-- Add marketing consent columns
ALTER TABLE users ADD COLUMN marketing_sms_consent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN marketing_email_consent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN marketing_kakao_consent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN marketing_consent_date DATETIME;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users(marketing_sms_consent, marketing_email_consent, marketing_kakao_consent);
