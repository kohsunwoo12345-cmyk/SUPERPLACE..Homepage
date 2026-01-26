-- 🚨 긴급: 꾸메땅학원 학생 데이터 복구 스크립트

-- Step 1: 꾸메땅학원 사용자 ID 확인
-- SELECT id, email, academy_name, academy_id FROM users WHERE academy_name LIKE '%꾸메땅%';

-- Step 2: 꾸메땅학원 학생들의 현재 academy_id 확인
-- SELECT id, name, academy_id, class_id FROM students WHERE name LIKE '%' OR 1=1 LIMIT 20;

-- Step 3: 반(classes)의 academy_id 확인
-- SELECT id, class_name, academy_id, user_id FROM classes LIMIT 20;

-- Step 4A: class_id를 기반으로 academy_id 수정 (classes 테이블의 academy_id 사용)
UPDATE students 
SET academy_id = (
  SELECT COALESCE(c.academy_id, c.user_id) 
  FROM classes c 
  WHERE c.id = students.class_id
  LIMIT 1
)
WHERE class_id IS NOT NULL 
  AND class_id IN (SELECT id FROM classes);

-- Step 4B: class_id가 없는 학생들 - 꾸메땅학원 ID로 설정 (꾸메땅학원 ID가 1이라고 가정)
-- UPDATE students SET academy_id = 1 WHERE class_id IS NULL AND academy_id != 1;

-- Step 5: 결과 확인
-- SELECT s.id, s.name, s.academy_id, c.class_name, c.academy_id as class_academy_id
-- FROM students s
-- LEFT JOIN classes c ON s.class_id = c.id
-- ORDER BY s.id DESC
-- LIMIT 30;

-- Step 6: academy_id별 학생 수 확인
-- SELECT academy_id, COUNT(*) as count FROM students GROUP BY academy_id;
