-- 학생 자동 학년 진급 시스템 추가
-- entry_year: 입학년도 (예: 2026)
-- entry_grade: 입학 당시 학년 (예: 초1, 중2, 고3 등)

-- students 테이블에 컬럼 추가
ALTER TABLE students ADD COLUMN entry_year INTEGER;
ALTER TABLE students ADD COLUMN entry_grade TEXT;

-- 기존 학생들의 entry_year와 entry_grade 설정
-- enrollment_date의 연도를 entry_year로 설정
UPDATE students 
SET entry_year = CAST(strftime('%Y', enrollment_date) AS INTEGER),
    entry_grade = grade
WHERE entry_year IS NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_students_entry_year ON students(entry_year);
