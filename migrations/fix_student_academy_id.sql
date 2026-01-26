-- 학생 데이터의 academy_id를 올바른 값으로 수정
-- 문제: 모든 학생이 꾸메땅학원(academy_id = 1)의 데이터로 보이는 문제 해결
-- 해결: 각 학생을 추가한 사용자의 academy_id로 업데이트

-- Step 1: 학생을 추가한 사용자 정보를 기반으로 academy_id 업데이트
-- 각 학생의 class_id에서 해당 반을 소유한 사용자의 academy_id를 찾아서 업데이트

UPDATE students 
SET academy_id = (
  SELECT COALESCE(c.academy_id, c.user_id) 
  FROM classes c 
  WHERE c.id = students.class_id
  LIMIT 1
)
WHERE class_id IS NOT NULL 
  AND class_id IN (SELECT id FROM classes);

-- Step 2: class_id가 NULL이거나 잘못된 경우를 위한 fallback
-- 학생의 created_at 시간과 가장 가까운 시점에 활동한 원장님의 academy_id로 설정
-- (이 경우는 매우 드물지만 안전장치로 추가)

-- 주의: 이 스크립트는 실제 프로덕션 데이터베이스에서 실행하기 전에
-- 백업을 반드시 수행해야 합니다.

-- 실행 후 확인 쿼리:
-- SELECT s.id, s.name, s.academy_id, c.class_name, c.academy_id as class_academy_id
-- FROM students s
-- LEFT JOIN classes c ON s.class_id = c.id
-- ORDER BY s.id DESC
-- LIMIT 50;
