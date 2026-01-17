-- ✅ 100% 확실한 인증 코드 생성 (academy_name 컬럼 없이)

-- 1. 기존 비활성 코드 정리
DELETE FROM academy_verification_codes WHERE is_active = 0;

-- 2. director@test.com 계정에 ABC123 코드 생성
DELETE FROM academy_verification_codes 
WHERE user_id = (SELECT id FROM users WHERE email = 'director@test.com');

INSERT INTO academy_verification_codes (user_id, verification_code, is_active, created_at)
SELECT 
  id,
  'ABC123',
  1,
  datetime('now')
FROM users 
WHERE email = 'director@test.com';

-- 3. 확인
SELECT 
  u.id as 'user_id',
  u.email,
  u.name,
  u.academy_name,
  avc.verification_code,
  avc.is_active,
  avc.created_at
FROM users u
LEFT JOIN academy_verification_codes avc ON u.id = avc.user_id AND avc.is_active = 1
WHERE u.email = 'director@test.com';

-- 4. 모든 활성 인증 코드 확인
SELECT 
  avc.id,
  avc.user_id,
  u.email,
  u.name,
  u.academy_name,
  avc.verification_code,
  avc.is_active
FROM academy_verification_codes avc
JOIN users u ON avc.user_id = u.id
WHERE avc.is_active = 1;
