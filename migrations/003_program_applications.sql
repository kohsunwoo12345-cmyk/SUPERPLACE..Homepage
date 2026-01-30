-- 프로그램 신청 테이블 생성

CREATE TABLE IF NOT EXISTS program_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  program_name TEXT NOT NULL,
  
  -- 신청자 정보
  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  academy_name TEXT,
  
  -- 신청 내용
  message TEXT,
  
  -- 상태 관리
  status TEXT DEFAULT 'pending',  -- pending, contacted, completed, cancelled
  
  -- 관리자 메모
  admin_note TEXT,
  admin_id INTEGER,
  
  -- 타임스탬프
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_program_applications_program_id ON program_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_status ON program_applications(status);
CREATE INDEX IF NOT EXISTS idx_program_applications_created_at ON program_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_program_applications_phone ON program_applications(phone);
