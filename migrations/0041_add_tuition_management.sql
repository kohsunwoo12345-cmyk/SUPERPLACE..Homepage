-- 교육비 관리 시스템 추가
-- 선생님에게는 완전히 숨겨지는 원장님 전용 기능

-- 교육비 납입 기록 테이블
CREATE TABLE IF NOT EXISTS tuition_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  academy_id INTEGER NOT NULL,
  
  -- 납입 정보
  year INTEGER NOT NULL, -- 연도 (2024, 2025 등)
  month INTEGER NOT NULL, -- 월 (1~12)
  amount INTEGER NOT NULL, -- 납입 금액
  
  -- 납입 상태
  status TEXT DEFAULT 'unpaid', -- unpaid, paid, partial, overdue
  paid_amount INTEGER DEFAULT 0, -- 실제 납입된 금액
  paid_date TEXT, -- 납입 날짜
  
  -- 메모 및 관리
  memo TEXT, -- 관리자 메모
  payment_method TEXT, -- 납입 방법 (현금, 카드, 계좌이체 등)
  
  -- 메타 정보
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER, -- 등록한 사용자 ID
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academy_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 월별 교육비 설정 테이블 (학생별 다른 금액 가능)
CREATE TABLE IF NOT EXISTS tuition_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  academy_id INTEGER NOT NULL,
  
  -- 교육비 정보
  monthly_fee INTEGER NOT NULL, -- 월 교육비
  start_date TEXT NOT NULL, -- 시작일
  end_date TEXT, -- 종료일 (NULL이면 계속)
  
  -- 메타 정보
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academy_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_tuition_payments_student ON tuition_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_academy ON tuition_payments(academy_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_year_month ON tuition_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_status ON tuition_payments(status);
CREATE INDEX IF NOT EXISTS idx_tuition_rates_student ON tuition_rates(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_rates_academy ON tuition_rates(academy_id);
