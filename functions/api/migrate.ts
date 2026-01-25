export const onRequest: PagesFunction = async (context) => {
  try {
    const { DB } = context.env as { DB: D1Database }
    
    const results = []
    
    // Migration 0041: 교육비 관리 시스템
    try {
      await DB.exec(`
        -- 교육비 납입 기록 테이블
        CREATE TABLE IF NOT EXISTS tuition_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          academy_id INTEGER NOT NULL,
          
          -- 납입 정보
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          
          -- 납입 상태
          status TEXT DEFAULT 'unpaid',
          paid_amount INTEGER DEFAULT 0,
          paid_date TEXT,
          
          -- 메모 및 관리
          memo TEXT,
          payment_method TEXT,
          
          -- 메타 정보
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (academy_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        );
        
        -- 월별 교육비 설정 테이블
        CREATE TABLE IF NOT EXISTS tuition_rates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          academy_id INTEGER NOT NULL,
          
          monthly_fee INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (academy_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_tuition_payments_student ON tuition_payments(student_id);
        CREATE INDEX IF NOT EXISTS idx_tuition_payments_academy ON tuition_payments(academy_id);
        CREATE INDEX IF NOT EXISTS idx_tuition_payments_year_month ON tuition_payments(year, month);
        CREATE INDEX IF NOT EXISTS idx_tuition_payments_status ON tuition_payments(status);
        CREATE INDEX IF NOT EXISTS idx_tuition_rates_student ON tuition_rates(student_id);
        CREATE INDEX IF NOT EXISTS idx_tuition_rates_academy ON tuition_rates(academy_id);
      `)
      results.push({ migration: '0041_add_tuition_management', status: 'success' })
    } catch (error) {
      results.push({ migration: '0041_add_tuition_management', status: 'error', error: error.message })
    }
    
    // Migration 0043: classes에 monthly_fee 추가
    try {
      await DB.exec(`
        ALTER TABLE classes ADD COLUMN monthly_fee INTEGER DEFAULT 0;
      `)
      results.push({ migration: '0043_add_class_fees', status: 'success' })
    } catch (error) {
      // 이미 컬럼이 존재할 수 있음
      results.push({ migration: '0043_add_class_fees', status: 'warning', error: error.message })
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Migrations completed',
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
