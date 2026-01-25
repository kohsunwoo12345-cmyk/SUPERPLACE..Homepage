export async function onRequest(context: any) {
  const { env } = context;
  
  try {
    // 사용자 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        academy_name TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 반(Class) 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academy_id INTEGER DEFAULT 1,
        class_name TEXT NOT NULL,
        grade TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 과목(Course) 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academy_id INTEGER DEFAULT 1,
        course_name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 학생 정보 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academy_id INTEGER DEFAULT 1,
        class_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        parent_name TEXT NOT NULL,
        parent_phone TEXT NOT NULL,
        parent_email TEXT,
        grade TEXT NOT NULL,
        subjects TEXT NOT NULL,
        enrollment_date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      )
    `).run();
    
    // 일일 성과 기록 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS daily_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_id INTEGER,
        record_date DATE NOT NULL,
        attendance TEXT CHECK(attendance IN ('출석', '지각', '결석', '조퇴')),
        homework_status TEXT CHECK(homework_status IN ('완료', '미완료', '부분완료')),
        understanding_level INTEGER CHECK(understanding_level >= 1 AND understanding_level <= 5),
        participation_level INTEGER CHECK(participation_level >= 1 AND participation_level <= 5),
        achievement TEXT,
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
      )
    `).run();
    
    // 인덱스 생성
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_classes_academy_id ON classes(academy_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_courses_academy_id ON courses(academy_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_records_student_id ON daily_records(student_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date)`).run();
    
    // 교육비 납입 기록 테이블 생성
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tuition_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        academy_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'unpaid',
        paid_amount INTEGER DEFAULT 0,
        paid_date TEXT,
        memo TEXT,
        payment_method TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (academy_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `).run();
    
    // 월별 교육비 설정 테이블 생성
    await env.DB.prepare(`
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
      )
    `).run();
    
    // 교육비 테이블 인덱스
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_payments_student ON tuition_payments(student_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_payments_academy ON tuition_payments(academy_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_payments_year_month ON tuition_payments(year, month)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_payments_status ON tuition_payments(status)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_rates_student ON tuition_rates(student_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tuition_rates_academy ON tuition_rates(academy_id)`).run();
    
    // classes 테이블에 monthly_fee 컬럼 추가 (이미 존재할 경우 무시)
    try {
      await env.DB.prepare(`ALTER TABLE classes ADD COLUMN monthly_fee INTEGER DEFAULT 0`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    // users 테이블에 user_type 및 parent_user_id 추가
    try {
      await env.DB.prepare(`ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director'`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    try {
      await env.DB.prepare(`ALTER TABLE users ADD COLUMN parent_user_id INTEGER`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    // classes 테이블에 user_id 및 teacher_id 추가
    try {
      await env.DB.prepare(`ALTER TABLE classes ADD COLUMN user_id INTEGER`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    try {
      await env.DB.prepare(`ALTER TABLE classes ADD COLUMN teacher_id INTEGER`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    try {
      await env.DB.prepare(`ALTER TABLE classes ADD COLUMN name TEXT`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    // students 테이블에 user_id 추가
    try {
      await env.DB.prepare(`ALTER TABLE students ADD COLUMN user_id INTEGER`).run();
    } catch (e) {
      // Column already exists, ignore
    }
    
    // 관리자 계정 추가
    await env.DB.prepare(`
      INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'admin@superplace.co.kr',
      'admin1234!',
      '관리자',
      'admin',
      '슈퍼플레이스',
      '010-0000-0000'
    ).run();
    
    // 테스트 사용자 추가
    await env.DB.prepare(`
      INSERT OR IGNORE INTO users (email, password, name, role, academy_name, phone) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'test1@superplace.co.kr',
      'test1234!',
      '김학원',
      'user',
      '꾸메땅학원 분당점',
      '010-1234-5678'
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '데이터베이스 초기화 완료! (학생 관리 + 교육비 관리 테이블 포함)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
