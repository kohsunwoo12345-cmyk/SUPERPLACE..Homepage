-- 🚨 긴급 수정: D1 Console에서 실행

-- 1단계: 외래키 완전 비활성화
PRAGMA foreign_keys = OFF;

-- 2단계: 모든 student_id = 4 레코드 강제 삭제
DELETE FROM daily_records WHERE student_id = 4;
DELETE FROM attendance WHERE student_id = 4;
DELETE FROM grades WHERE student_id = 4;
DELETE FROM counseling WHERE student_id = 4;
DELETE FROM learning_reports WHERE student_id = 4;

-- 3단계: 학생 4 강제 삭제
DELETE FROM students WHERE id = 4;

-- 4단계: 확인
SELECT * FROM students WHERE id = 4;

-- 5단계: 외래키 다시 활성화
PRAGMA foreign_keys = ON;
