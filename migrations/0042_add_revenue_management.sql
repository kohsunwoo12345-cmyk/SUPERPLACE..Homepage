-- ========================================
-- 매출 관리 시스템
-- 학원 매출 분석 및 통계
-- 원장님/관리자 전용 - 선생님 100% 차단
-- ========================================

-- 수강 정보 테이블 (학생이 듣는 수업/반)
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER,
  program_name TEXT,  -- 프로그램/과목명
  monthly_fee INTEGER DEFAULT 0,  -- 월 수강료
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL이면 현재 수강 중
  status TEXT DEFAULT 'active',  -- active, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_dates ON enrollments(start_date, end_date);

-- 반(클래스) 비용 정보가 classes 테이블에 없으면 추가
-- ALTER TABLE classes ADD COLUMN monthly_fee INTEGER DEFAULT 0;
-- 이미 있을 수 있으므로 생략
