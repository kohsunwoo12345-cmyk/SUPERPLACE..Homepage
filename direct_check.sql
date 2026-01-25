-- 1. kumetang@gmail.com 사용자 정보
SELECT 
  id as user_id, 
  email, 
  name, 
  academy_id, 
  user_type 
FROM users 
WHERE email = 'kumetang@gmail.com';

-- 2. 이 사용자가 만든 랜딩페이지 개수
SELECT COUNT(*) as total_landing_pages
FROM landing_pages 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
);

-- 3. 이 사용자의 활성 구독
SELECT 
  id as subscription_id,
  academy_id,
  plan_name,
  subscription_start_date,
  subscription_end_date,
  status,
  landing_page_limit
FROM subscriptions
WHERE academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
AND status = 'active';

-- 4. 현재 플랜 기간 내 랜딩페이지 개수
SELECT COUNT(*) as pages_in_current_plan
FROM landing_pages 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
AND created_at >= (
  SELECT subscription_start_date 
  FROM subscriptions 
  WHERE academy_id IN (SELECT id FROM users WHERE email = 'kumetang@gmail.com')
  AND status = 'active'
  LIMIT 1
);

-- 5. usage_tracking 현황
SELECT 
  ut.*
FROM usage_tracking ut
WHERE ut.academy_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
);

-- 6. 실제 랜딩페이지 목록 (최근 10개)
SELECT 
  id,
  slug,
  title,
  user_id,
  created_at,
  status
FROM landing_pages
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'kumetang@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;
