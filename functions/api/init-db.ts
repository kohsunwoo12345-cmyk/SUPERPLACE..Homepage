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
      message: '데이터베이스 초기화 완료!'
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
