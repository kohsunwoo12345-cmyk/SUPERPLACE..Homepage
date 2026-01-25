-- ========================================
-- 반(클래스) 교육비 설정
-- ========================================

-- classes 테이블에 월 교육비 컬럼 추가
ALTER TABLE classes ADD COLUMN monthly_fee INTEGER DEFAULT 0;

-- 학생-반 연결 테이블 (students 테이블의 class_id 컬럼이 이미 있지만, 다중 반 수강을 위해)
CREATE TABLE IF NOT EXISTS student_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  monthly_fee INTEGER, -- NULL이면 반의 기본 요금 사용
  start_date DATE DEFAULT (date('now')),
  end_date DATE, -- NULL이면 현재 수강 중
  status TEXT DEFAULT 'active', -- active, completed, dropped
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_classes_student ON student_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class ON student_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_status ON student_classes(status);
