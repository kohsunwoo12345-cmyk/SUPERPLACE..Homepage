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
      message: '데이터베이스 초기화 완료! (학생 관리 테이블 포함)'
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
