import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ========================================
// API Routes
// ========================================

// 문의 접수 API
app.post('/api/contact', async (c) => {
  try {
    const { name, email, phone, academy_name, message } = await c.req.json()
    
    // 유효성 검사
    if (!name || !email || !phone || !message) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // DB 저장
    const result = await c.env.DB.prepare(`
      INSERT INTO contacts (name, email, phone, academy_name, message)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, email, phone, academy_name || '', message).run()

    return c.json({ 
      success: true, 
      message: '문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Contact submission error:', error)
    return c.json({ success: false, error: '문의 접수 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원가입 API
app.post('/api/signup', async (c) => {
  try {
    const { email, password, name, phone, academy_name, academy_location } = await c.req.json()
    
    if (!email || !password || !name || !phone || !academy_name || !academy_location) {
      return c.json({ success: false, error: '모든 필수 항목을 입력해주세요.' }, 400)
    }

    // 이메일 중복 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()

    if (existing) {
      return c.json({ success: false, error: '이미 가입된 이메일입니다.' }, 400)
    }

    // 비밀번호 해싱 (실제로는 bcrypt 등 사용 권장)
    const hashedPassword = password // TODO: 실제 프로젝트에서는 해싱 필요

    // DB 저장
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password, name, phone, academy_name, academy_location, role)
      VALUES (?, ?, ?, ?, ?, ?, 'member')
    `).bind(email, hashedPassword, name, phone, academy_name, academy_location).run()

    return c.json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 로그인 API
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    // 사용자 조회
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role FROM users WHERE email = ? AND password = ?
    `).bind(email, password).first()

    if (!user) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401)
    }

    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 문의 목록 조회 API (관리자용)
app.get('/api/contacts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM contacts ORDER BY created_at DESC LIMIT 50
    `).all()

    return c.json({ success: true, contacts: results })
  } catch (error) {
    console.error('Fetch contacts error:', error)
    return c.json({ success: false, error: '문의 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 문의 상태 변경 및 답변 메모 업데이트
app.put('/api/admin/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { status, reply_memo, handled_by } = await c.req.json()
    
    let query = 'UPDATE contacts SET '
    const updates = []
    const bindings = []
    
    if (status) {
      updates.push('status = ?')
      bindings.push(status)
    }
    if (reply_memo !== undefined) {
      updates.push('reply_memo = ?')
      bindings.push(reply_memo)
    }
    if (handled_by) {
      updates.push('handled_by = ?, handled_at = CURRENT_TIMESTAMP')
      bindings.push(handled_by)
    }
    
    query += updates.join(', ') + ' WHERE id = ?'
    bindings.push(id)
    
    await c.env.DB.prepare(query).bind(...bindings).run()
    
    return c.json({ success: true, message: '문의가 업데이트되었습니다.' })
  } catch (error) {
    console.error('Update contact error:', error)
    return c.json({ success: false, error: '문의 업데이트 실패' }, 500)
  }
})

// ==================== 관리자 API ====================

// 관리자 - 사용자 목록
app.get('/api/admin/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, email, name, phone, academy_name, role, created_at FROM users ORDER BY created_at DESC').all()
    return c.json({ success: true, users: results })
  } catch (error) {
    return c.json({ success: false, error: '사용자 목록 조회 실패' }, 500)
  }
})

// 관리자 - 프로그램 목록
app.get('/api/admin/programs', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM programs ORDER BY created_at DESC').all()
    return c.json({ success: true, programs: results })
  } catch (error) {
    console.error('Programs error:', error)
    return c.json({ success: false, error: '프로그램 목록 조회 실패' }, 500)
  }
})

// 프로그램 추가
app.post('/api/admin/programs', async (c) => {
  try {
    const { name, description, price, duration_days, max_students } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO programs (name, description, price, duration_days, max_students, status, is_active)
      VALUES (?, ?, ?, ?, ?, 'active', 1)
    `).bind(name, description || '', price || 0, duration_days || 30, max_students || null).run()
    
    return c.json({ success: true, message: '프로그램이 추가되었습니다.', id: result.meta.last_row_id })
  } catch (error) {
    console.error('Add program error:', error)
    return c.json({ success: false, error: '프로그램 추가 실패' }, 500)
  }
})

// 프로그램 수정
app.put('/api/admin/programs/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name, description, price, duration_days, max_students, status } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE programs 
      SET name = ?, description = ?, price = ?, duration_days = ?, max_students = ?, status = ?
      WHERE id = ?
    `).bind(name, description, price, duration_days, max_students, status, id).run()
    
    return c.json({ success: true, message: '프로그램이 수정되었습니다.' })
  } catch (error) {
    console.error('Update program error:', error)
    return c.json({ success: false, error: '프로그램 수정 실패' }, 500)
  }
})

// 프로그램 삭제
app.delete('/api/admin/programs/:id', async (c) => {
  try {
    const id = c.req.param('id')
    // 소프트 삭제 (status를 inactive로 변경)
    await c.env.DB.prepare('UPDATE programs SET status = ?, is_active = 0 WHERE id = ?').bind('inactive', id).run()
    
    return c.json({ success: true, message: '프로그램이 삭제되었습니다.' })
  } catch (error) {
    console.error('Delete program error:', error)
    return c.json({ success: false, error: '프로그램 삭제 실패' }, 500)
  }
})


// 관리자 - 수강 현황
app.get('/api/admin/enrollments', async (c) => {
  try {
    const query = 'SELECT up.*, u.name as user_name, p.name as program_name FROM user_programs up JOIN users u ON up.user_id = u.id JOIN programs p ON up.program_id = p.id WHERE up.status = ? ORDER BY up.created_at DESC'
    const { results } = await c.env.DB.prepare(query).bind('active').all()
    return c.json({ success: true, enrollments: results })
  } catch (error) {
    return c.json({ success: false, error: '수강 현황 조회 실패' }, 500)
  }
})

// 통계 - 월별 가입자 추이 (최근 6개월)
app.get('/api/admin/stats/monthly-users', async (c) => {
  try {
    const query = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `
    const { results } = await c.env.DB.prepare(query).all()
    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Monthly users stats error:', error)
    return c.json({ success: false, error: '통계 조회 실패' }, 500)
  }
})

// 통계 - 프로그램별 수강생 수
app.get('/api/admin/stats/program-enrollments', async (c) => {
  try {
    const query = `
      SELECT 
        p.name as program_name,
        p.price,
        COUNT(up.id) as enrollment_count,
        SUM(p.price) as revenue
      FROM programs p
      LEFT JOIN user_programs up ON p.id = up.program_id AND up.status = 'active'
      WHERE p.status = 'active'
      GROUP BY p.id, p.name, p.price
      ORDER BY enrollment_count DESC
    `
    const { results } = await c.env.DB.prepare(query).all()
    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Program enrollments stats error:', error)
    return c.json({ success: false, error: '통계 조회 실패' }, 500)
  }
})

// 통계 - 대시보드 요약
app.get('/api/admin/stats/dashboard-summary', async (c) => {
  try {
    // 전체 사용자 수
    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
    
    // 활성 사용자 수 (최근 30일 로그인)
    const activeUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE updated_at >= date("now", "-30 days")').first()
    
    // 신규 문의 수 (대기중)
    const pendingContacts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM contacts WHERE status = ?').bind('pending').first()
    
    // 전체 문의 수
    const totalContacts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM contacts').first()
    
    // 활성 프로그램 수
    const activePrograms = await c.env.DB.prepare('SELECT COUNT(*) as count FROM programs WHERE status = ?').bind('active').first()
    
    // 전체 수강 수
    const totalEnrollments = await c.env.DB.prepare('SELECT COUNT(*) as count FROM user_programs WHERE status = ?').bind('active').first()
    
    // 총 매출 (예상)
    const totalRevenue = await c.env.DB.prepare(`
      SELECT SUM(p.price) as total
      FROM user_programs up
      JOIN programs p ON up.program_id = p.id
      WHERE up.status = 'active'
    `).first()
    
    return c.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        activeUsers: activeUsers?.count || 0,
        pendingContacts: pendingContacts?.count || 0,
        totalContacts: totalContacts?.count || 0,
        activePrograms: activePrograms?.count || 0,
        totalEnrollments: totalEnrollments?.count || 0,
        totalRevenue: totalRevenue?.total || 0
      }
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return c.json({ success: false, error: '통계 조회 실패' }, 500)
  }
})

// 관리자 - 사용자별 프로그램 조회
app.get('/api/admin/users/:id/programs', async (c) => {
  try {
    const userId = c.req.param('id')
    const query = 'SELECT up.*, p.name as program_name, p.duration_days FROM user_programs up JOIN programs p ON up.program_id = p.id WHERE up.user_id = ? AND up.status = ? ORDER BY up.created_at DESC'
    const { results } = await c.env.DB.prepare(query).bind(userId, 'active').all()
    return c.json({ success: true, programs: results })
  } catch (error) {
    return c.json({ success: false, error: '프로그램 조회 실패' }, 500)
  }
})

// 관리자 - 프로그램 부여
app.post('/api/admin/assign-program', async (c) => {
  try {
    const { user_id, program_id, end_date } = await c.req.json()
    const query = 'INSERT INTO user_programs (user_id, program_id, end_date, status) VALUES (?, ?, ?, ?)'
    await c.env.DB.prepare(query).bind(user_id, program_id, end_date || null, 'active').run()
    return c.json({ success: true, message: '프로그램이 부여되었습니다.' })
  } catch (error) {
    return c.json({ success: false, error: '프로그램 부여 실패' }, 500)
  }
})

// 관리자 - 프로그램 삭제
app.delete('/api/admin/remove-program/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM user_programs WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: '프로그램이 삭제되었습니다.' })
  } catch (error) {
    return c.json({ success: false, error: '프로그램 삭제 실패' }, 500)
  }
})

// 관리자 - 비밀번호 초기화
app.post('/api/admin/reset-password', async (c) => {
  try {
    const { user_id } = await c.req.json()
    const newPassword = 'academy1234' // 기본 초기화 비밀번호
    const query = 'UPDATE users SET password = ? WHERE id = ?'
    await c.env.DB.prepare(query).bind(newPassword, user_id).run()
    return c.json({ success: true, message: `비밀번호가 초기화되었습니다. (초기 비밀번호: ${newPassword})` })
  } catch (error) {
    return c.json({ success: false, error: '비밀번호 초기화 실패' }, 500)
  }
})

// 관리자 - 사용자 활성화/비활성화
app.post('/api/admin/toggle-user-status', async (c) => {
  try {
    const { user_id, is_active } = await c.req.json()
    const status = is_active ? 'active' : 'inactive'
    const query = 'UPDATE users SET status = ? WHERE id = ?'
    await c.env.DB.prepare(query).bind(status, user_id).run()
    return c.json({ success: true, message: `사용자가 ${is_active ? '활성화' : '비활성화'}되었습니다.` })
  } catch (error) {
    return c.json({ success: false, error: '상태 변경 실패' }, 500)
  }
})

// 관리자 - 문의 상태 변경
app.put('/api/admin/contacts/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    await c.env.DB.prepare('UPDATE contacts SET status = ? WHERE id = ?').bind(status, id).run()
    return c.json({ success: true, message: '상태가 변경되었습니다.' })
  } catch (error) {
    return c.json({ success: false, error: '상태 변경 실패' }, 500)
  }
})

// ========================================
// 랜딩페이지 생성기 API
// ========================================

// 랜딩페이지 생성
app.post('/api/landing/create', async (c) => {
  try {
    const { title, template_type, input_data } = await c.req.json()
    
    // Base64 인코딩된 사용자 데이터 디코딩
    const userHeaderBase64 = c.req.header('X-User-Data-Base64')
    let user = { id: 1 }
    if (userHeaderBase64) {
      try {
        const userDataStr = decodeURIComponent(escape(atob(userHeaderBase64)))
        user = JSON.parse(userDataStr)
      } catch (e) {
        console.warn('Failed to decode user data:', e)
      }
    }
    
    // 고유 slug 생성 (랜덤 8자리)
    const slug = Math.random().toString(36).substring(2, 10)
    
    // AI가 HTML 생성 (템플릿 기반)
    const htmlContent = generateLandingPageHTML(template_type, input_data)
    
    // QR 코드 URL 생성 (Google Charts API 사용)
    const landingUrl = `${c.req.header('origin') || 'https://example.com'}/landing/${slug}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingUrl)}`
    
    // DB 저장
    const query = `
      INSERT INTO landing_pages (user_id, slug, title, template_type, content_json, html_content, qr_code_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `
    const result = await c.env.DB.prepare(query)
      .bind(user.id, slug, title, template_type, JSON.stringify(input_data), htmlContent, qrCodeUrl)
      .run()
    
    return c.json({ 
      success: true, 
      message: '랜딩페이지가 생성되었습니다.',
      slug,
      url: `/landing/${slug}`,
      qrCodeUrl,
      id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Landing page creation error:', error)
    return c.json({ success: false, error: '랜딩페이지 생성 실패: ' + (error as Error).message }, 500)
  }
})

// 사용자 랜딩페이지 목록
app.get('/api/landing/my-pages', async (c) => {
  try {
    const user = JSON.parse(c.req.header('X-User-Data') || '{"id":1}')
    const query = 'SELECT id, slug, title, template_type, view_count, status, created_at FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC'
    const { results } = await c.env.DB.prepare(query).bind(user.id).all()
    return c.json({ success: true, pages: results })
  } catch (error) {
    return c.json({ success: false, error: '목록 조회 실패' }, 500)
  }
})

// 랜딩페이지 조회
app.get('/api/landing/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const query = 'SELECT * FROM landing_pages WHERE slug = ? AND status = ?'
    const result = await c.env.DB.prepare(query).bind(slug, 'active').first()
    
    if (!result) {
      return c.json({ success: false, error: '페이지를 찾을 수 없습니다.' }, 404)
    }
    
    // 조회수 증가
    await c.env.DB.prepare('UPDATE landing_pages SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run()
    
    // 상세 조회 로그 저장
    const viewQuery = 'INSERT INTO landing_page_views (landing_page_id, user_agent, referrer) VALUES (?, ?, ?)'
    await c.env.DB.prepare(viewQuery).bind(
      result.id,
      c.req.header('user-agent') || '',
      c.req.header('referer') || ''
    ).run()
    
    return c.json({ success: true, page: result })
  } catch (error) {
    return c.json({ success: false, error: '페이지 조회 실패' }, 500)
  }
})

// 랜딩페이지 통계
app.get('/api/landing/stats/summary', async (c) => {
  try {
    const userHeader = c.req.header('X-User-Data')
    const user = userHeader ? JSON.parse(userHeader) : { id: 1 }
    
    // 총 페이지 수
    const totalPages = await c.env.DB.prepare('SELECT COUNT(*) as count FROM landing_pages WHERE user_id = ?').bind(user.id).first()
    
    // 총 조회수
    const totalViews = await c.env.DB.prepare('SELECT SUM(view_count) as total FROM landing_pages WHERE user_id = ?').bind(user.id).first()
    
    // 가장 인기있는 페이지 top 5
    const topPages = await c.env.DB.prepare('SELECT id, title, slug, view_count FROM landing_pages WHERE user_id = ? ORDER BY view_count DESC LIMIT 5').bind(user.id).all()
    
    return c.json({
      success: true,
      stats: {
        totalPages: totalPages?.count || 0,
        totalViews: totalViews?.total || 0,
        topPages: topPages.results || []
      }
    })
  } catch (error) {
    return c.json({ success: false, error: '통계 조회 실패' }, 500)
  }
})

// 랜딩페이지 삭제
app.delete('/api/landing/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = JSON.parse(c.req.header('X-User-Data') || '{"id":1}')
    await c.env.DB.prepare('DELETE FROM landing_pages WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    return c.json({ success: false, error: '삭제 실패' }, 500)
  }
})

// 랜딩페이지 HTML 생성 함수
function generateLandingPageHTML(template_type: string, data: any): string {
  const templates: any = {
    'academy-intro': generateAcademyIntroHTML,
    'program-promo': generateProgramPromoHTML,
    'event-promo': generateEventPromoHTML,
    'student-report': generateStudentReportHTML,
    'admission-info': generateAdmissionInfoHTML,
    'academy-stats': generateAcademyStatsHTML,
    'teacher-intro': generateTeacherIntroHTML
  }
  
  const generator = templates[template_type] || templates['academy-intro']
  return generator(data)
}

// 학원 소개 페이지 템플릿
function generateAcademyIntroHTML(data: any): string {
  const { academyName, location, features, specialties, contact } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${academyName} - 학원 소개</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
      .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    </style>
</head>
<body class="bg-gray-50">
    <div class="gradient-bg text-white py-20 px-6">
        <div class="max-w-4xl mx-auto text-center">
            <h1 class="text-5xl font-bold mb-6">${academyName}</h1>
            <p class="text-2xl mb-4">📍 ${location}</p>
            <p class="text-xl opacity-90">${features || '우리 학원에서 꿈을 이루세요'}</p>
        </div>
    </div>
    
    <div class="max-w-4xl mx-auto px-6 py-16">
        <div class="bg-white rounded-2xl shadow-xl p-10 mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">✨ 특별한 강점</h2>
            <div class="grid md:grid-cols-2 gap-6">
                ${(specialties || []).map((s: string, i: number) => `
                    <div class="flex items-start gap-4 p-5 bg-purple-50 rounded-xl">
                        <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            ${i + 1}
                        </div>
                        <div class="flex-1">
                            <p class="text-gray-800 text-lg leading-relaxed">${s}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-xl p-10 text-white text-center">
            <h2 class="text-3xl font-bold mb-6">📞 상담 문의</h2>
            <p class="text-xl mb-8">${contact || '지금 바로 문의하세요!'}</p>
            <a href="tel:${contact}" class="inline-block bg-white text-purple-600 px-10 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition">
                📱 전화 상담하기
            </a>
        </div>
    </div>
</body>
</html>
  `
}

// 프로그램 홍보 페이지 템플릿
function generateProgramPromoHTML(data: any): string {
  const { programName, target, features, price, duration, cta } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${programName} - 프로그램 안내</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen py-12 px-6">
    <div class="max-w-3xl mx-auto">
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 text-center">
                <div class="inline-block bg-white/20 px-6 py-2 rounded-full text-sm font-medium mb-6">
                    ${target || '누구나 참여 가능'}
                </div>
                <h1 class="text-4xl md:text-5xl font-bold mb-4">${programName}</h1>
                <p class="text-xl opacity-90">${duration || '지금 바로 시작하세요'}</p>
            </div>
            
            <div class="p-10">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 이런 분들에게 추천합니다</h2>
                <div class="space-y-4 mb-10">
                    ${(features || []).map((f: string) => `
                        <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                            <span class="text-2xl">✅</span>
                            <span class="text-lg text-gray-800">${f}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 mb-10 border-2 border-yellow-200">
                    <div class="text-center">
                        <p class="text-gray-600 text-lg mb-2">특별 가격</p>
                        <p class="text-5xl font-bold text-gray-900 mb-2">${price}원</p>
                        <p class="text-gray-500">${duration}</p>
                    </div>
                </div>
                
                <a href="${cta || '#'}" class="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-5 rounded-xl text-xl font-bold hover:shadow-2xl transition transform hover:scale-105">
                    🚀 지금 바로 신청하기
                </a>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// 이벤트 프로모션 페이지 템플릿
function generateEventPromoHTML(data: any): string {
  const { eventName, period, benefits, urgency, cta } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${eventName} - 특별 이벤트</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
      @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      .pulse-animation { animation: pulse 2s infinite; }
    </style>
</head>
<body class="bg-black text-white min-h-screen">
    <div class="min-h-screen flex items-center justify-center px-6 py-12">
        <div class="max-w-2xl w-full">
            <div class="bg-gradient-to-br from-red-600 via-pink-600 to-purple-600 rounded-3xl p-1">
                <div class="bg-black rounded-3xl p-10">
                    <div class="text-center mb-10">
                        <div class="inline-block bg-red-600 px-6 py-2 rounded-full text-sm font-bold mb-6 pulse-animation">
                            ⚡ ${urgency || '한정 특가'}
                        </div>
                        <h1 class="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-red-300 bg-clip-text text-transparent">
                            ${eventName}
                        </h1>
                        <p class="text-2xl text-gray-300 mb-4">📅 ${period}</p>
                    </div>
                    
                    <div class="bg-gradient-to-br from-yellow-500/10 to-red-500/10 rounded-2xl p-8 mb-10 border border-yellow-500/30">
                        <h2 class="text-2xl font-bold mb-6 text-yellow-300">🎁 특별 혜택</h2>
                        <div class="space-y-4">
                            ${(benefits || []).map((b: string) => `
                                <div class="flex items-center gap-3">
                                    <span class="text-3xl">⭐</span>
                                    <span class="text-lg">${b}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <a href="${cta || '#'}" class="block w-full bg-gradient-to-r from-yellow-400 to-red-500 text-black text-center py-6 rounded-xl text-2xl font-bold hover:shadow-2xl transition transform hover:scale-105">
                        🔥 지금 바로 신청하기
                    </a>
                    
                    <p class="text-center text-gray-400 text-sm mt-6">⏰ 서두르세요! 조기 마감될 수 있습니다</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// 학생 성과 리포트 페이지 템플릿
function generateStudentReportHTML(data: any): string {
  const { studentName, month, achievements, improvements, nextGoals, teacherName } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${studentName} 학생 ${month} 학습 리포트</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 py-12 px-6">
    <div class="max-w-3xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white p-10 text-center">
                <h1 class="text-4xl font-bold mb-2">${month} 학습 리포트</h1>
                <p class="text-2xl font-medium">${studentName} 학생</p>
            </div>
            
            <div class="p-10">
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span class="text-3xl">🏆</span> 이달의 성과
                    </h2>
                    <div class="space-y-4">
                        ${(achievements || []).map((a: string) => `
                            <div class="bg-green-50 border-l-4 border-green-500 p-5 rounded-r-xl">
                                <p class="text-gray-800 text-lg">${a}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span class="text-3xl">📈</span> 개선이 필요한 부분
                    </h2>
                    <div class="space-y-4">
                        ${(improvements || []).map((i: string) => `
                            <div class="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                                <p class="text-gray-800 text-lg">${i}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span class="text-3xl">🎯</span> 다음 달 목표
                    </h2>
                    <div class="space-y-4">
                        ${(nextGoals || []).map((g: string) => `
                            <div class="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-xl">
                                <p class="text-gray-800 text-lg">${g}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8 text-center border border-gray-200">
                    <p class="text-gray-600 mb-2">담당 선생님</p>
                    <p class="text-2xl font-bold text-gray-900">${teacherName || '선생님'}</p>
                    <p class="text-gray-500 mt-4">항상 응원합니다! 💪</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// 입학 설명회 페이지 템플릿
function generateAdmissionInfoHTML(data: any): string {
  const { eventTitle, eventDate, eventTime, location, agenda, benefits, targetGrade, contact } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${eventTitle} - 입학 설명회</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
    </style>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen py-12 px-6">
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-12 text-center">
                <div class="inline-block bg-white/20 px-6 py-2 rounded-full text-sm font-bold mb-6">
                    🎓 ${targetGrade || '전체 학년'} 대상
                </div>
                <h1 class="text-4xl md:text-5xl font-bold mb-4">${eventTitle}</h1>
                <div class="flex flex-col md:flex-row justify-center items-center gap-4 text-xl mt-8">
                    <div class="flex items-center gap-2">
                        <span>📅</span>
                        <span>${eventDate}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span>🕐</span>
                        <span>${eventTime}</span>
                    </div>
                </div>
                <p class="text-lg mt-4 opacity-90">📍 ${location}</p>
            </div>
            
            <div class="p-10">
                <div class="mb-10">
                    <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">📋 설명회 안내</h2>
                    <div class="space-y-4">
                        ${(agenda || []).map((item: string, i: number) => `
                            <div class="flex items-start gap-4 p-5 bg-indigo-50 rounded-xl">
                                <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                    ${i + 1}
                                </div>
                                <div class="flex-1">
                                    <p class="text-gray-800 text-lg leading-relaxed">${item}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">🎁 참석 혜택</h2>
                    <div class="grid md:grid-cols-2 gap-4">
                        ${(benefits || []).map((benefit: string) => `
                            <div class="flex items-center gap-3 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                                <span class="text-3xl">⭐</span>
                                <span class="text-gray-800 font-medium">${benefit}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center">
                    <h3 class="text-2xl font-bold mb-4">참석 신청</h3>
                    <p class="text-lg mb-6">전화 또는 카카오톡으로 신청하세요</p>
                    <a href="tel:${contact}" class="inline-block bg-white text-purple-600 px-10 py-4 rounded-full text-xl font-bold hover:bg-gray-100 transition">
                        📞 ${contact}
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// 학원 성과 통계 페이지 템플릿
function generateAcademyStatsHTML(data: any): string {
  const { academyName, period, totalStudents, achievements, testimonials, gradeImprovement } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${academyName} - 성과 통계</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 py-12 px-6">
    <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
            <h1 class="text-5xl font-bold text-gray-900 mb-4">${academyName}</h1>
            <p class="text-2xl text-gray-600">${period} 성과 보고서</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6 mb-12">
            <div class="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 text-white text-center">
                <div class="text-5xl font-bold mb-2">${totalStudents || 0}</div>
                <div class="text-xl opacity-90">총 재학생</div>
            </div>
            <div class="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 text-white text-center">
                <div class="text-5xl font-bold mb-2">${gradeImprovement || '2'}등급</div>
                <div class="text-xl opacity-90">평균 성적 향상</div>
            </div>
            <div class="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-8 text-white text-center">
                <div class="text-5xl font-bold mb-2">95%</div>
                <div class="text-xl opacity-90">재등록률</div>
            </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-xl p-10 mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">🏆 주요 성과</h2>
            <div class="space-y-4">
                ${(achievements || []).map((ach: string) => `
                    <div class="flex items-start gap-4 p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-xl">
                        <span class="text-3xl">🎯</span>
                        <p class="text-gray-800 text-lg leading-relaxed flex-1">${ach}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-xl p-10">
            <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">💬 학부모 후기</h2>
            <div class="space-y-6">
                ${(testimonials || []).map((test: string) => `
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="flex text-yellow-400">
                                ${'⭐'.repeat(5)}
                            </div>
                        </div>
                        <p class="text-gray-700 leading-relaxed">"${test}"</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// 선생님 소개 페이지 템플릿
function generateTeacherIntroHTML(data: any): string {
  const { teacherName, subject, experience, education, specialty, achievements, teachingStyle, contact } = data
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${teacherName} 선생님 - 소개</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
    </style>
</head>
<body class="bg-gradient-to-br from-teal-50 to-cyan-50 min-h-screen py-12 px-6">
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-12 text-center">
                <div class="w-32 h-32 bg-white/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <span class="text-6xl">👨‍🏫</span>
                </div>
                <h1 class="text-4xl font-bold mb-3">${teacherName} 선생님</h1>
                <p class="text-2xl opacity-90">${subject} 전문</p>
                <div class="mt-6 inline-block bg-white/20 px-6 py-2 rounded-full">
                    <span class="text-lg font-medium">경력 ${experience}년</span>
                </div>
            </div>
            
            <div class="p-10">
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">🎓 학력</h2>
                    <div class="bg-teal-50 rounded-xl p-6">
                        <p class="text-gray-800 text-lg leading-relaxed">${education}</p>
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">💡 전문 분야</h2>
                    <div class="bg-cyan-50 rounded-xl p-6">
                        <p class="text-gray-800 text-lg leading-relaxed">${specialty}</p>
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">🏆 주요 실적</h2>
                    <div class="space-y-3">
                        ${(achievements || []).map((ach: string) => `
                            <div class="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                                <span class="text-2xl">🎯</span>
                                <span class="text-gray-800">${ach}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-10">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">📚 수업 방식</h2>
                    <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                        <p class="text-gray-700 text-lg leading-relaxed">${teachingStyle}</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white text-center">
                    <h3 class="text-2xl font-bold mb-4">수업 문의</h3>
                    <a href="tel:${contact}" class="inline-block bg-white text-teal-600 px-10 py-4 rounded-full text-xl font-bold hover:bg-gray-100 transition">
                        📞 ${contact || '문의하기'}
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

// AI 학부모 메시지 생성 API
app.post('/api/generate-parent-message', async (c) => {
  try {
    const { studentName, grade, subject, shortMessage } = await c.req.json()
    
    if (!studentName || !grade || !subject || !shortMessage) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 템플릿 기반 메시지 생성 (현재는 API 키 없이 작동)
    const templateMessage = generateTemplateMessage(studentName, grade, subject, shortMessage)
    return c.json({ 
      success: true, 
      message: templateMessage,
      metadata: {
        studentName,
        grade,
        subject,
        originalMessage: shortMessage,
        mode: 'template'
      }
    })

    // API 키가 있으면 실제 AI 호출
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: `당신은 학원 원장님입니다. 학부모님께 학생의 학습 현황을 따뜻하고 격려하는 말투로 전달하는 메시지를 작성합니다.

규칙:
1. 존댓말 사용 (학부모님께)
2. 따뜻하고 긍정적인 톤
3. 구체적인 칭찬 포함
4. 앞으로의 학습 방향 제시
5. 200-300자 정도의 적절한 길이
6. 이모지 2-3개 자연스럽게 사용
7. 학부모님이 안심하고 신뢰할 수 있는 내용`
            },
            {
              role: 'user',
              content: `학생 이름: ${studentName}
학년: ${grade}
과목: ${subject}
원장님의 짧은 메모: ${shortMessage}

위 정보를 바탕으로 학부모님께 보낼 따뜻한 메시지를 작성해주세요.`
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('OpenAI API error:', data)
        // API 오류 시 템플릿 메시지로 폴백
        const templateMessage = generateTemplateMessage(studentName, grade, subject, shortMessage)
        return c.json({ 
          success: true, 
          message: templateMessage,
          metadata: {
            studentName,
            grade,
            subject,
            originalMessage: shortMessage,
            mode: 'template_fallback'
          }
        })
      }

      const generatedMessage = data.choices[0]?.message?.content || ''

      return c.json({ 
        success: true, 
        message: generatedMessage,
        metadata: {
          studentName,
          grade,
          subject,
          originalMessage: shortMessage,
          mode: 'ai'
        }
      })
    } catch (apiError) {
      console.error('API call error:', apiError)
      // API 호출 실패 시 템플릿 메시지로 폴백
      const templateMessage = generateTemplateMessage(studentName, grade, subject, shortMessage)
      return c.json({ 
        success: true, 
        message: templateMessage,
        metadata: {
          studentName,
          grade,
          subject,
          originalMessage: shortMessage,
          mode: 'template_fallback'
        }
      })
    }
  } catch (error) {
    console.error('Generate message error:', error)
    return c.json({ success: false, error: '메시지 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 템플릿 기반 메시지 생성 함수
function generateTemplateMessage(studentName: string, grade: string, subject: string, shortMessage: string): string {
  const templates = [
    `안녕하세요, ${studentName} 학부모님! 😊

오늘 ${subject} 수업에서 ${studentName} 학생의 모습을 전해드립니다.

${shortMessage}

${studentName}의 성장 모습이 정말 보기 좋습니다. 앞으로도 이렇게 꾸준히 노력한다면 ${subject} 실력이 더욱 탄탄해질 것입니다! 💪

항상 응원하겠습니다. 감사합니다!`,
    
    `${studentName} 학부모님, 안녕하세요! 👋

${grade} ${subject} 수업 소식을 전해드립니다.

${shortMessage}

${studentName}의 이러한 모습이 정말 자랑스럽습니다. 계속해서 이런 긍정적인 자세로 학습에 임한다면 목표한 성과를 꼭 이룰 수 있을 거예요! 🎯

궁금하신 점 있으시면 언제든 연락 주세요!`,
    
    `학부모님, 안녕하세요! 😊

오늘 ${studentName} 학생의 ${subject} 수업 현황을 말씀드립니다.

${shortMessage}

${studentName}가 보여준 이런 모습들이 정말 인상 깊었습니다. 이대로만 꾸준히 노력한다면 ${subject} 과목에서 더 큰 발전을 기대할 수 있겠습니다! ✨

앞으로도 ${studentName}의 성장을 함께 응원하겠습니다!`
  ]
  
  // 랜덤하게 템플릿 선택
  const randomIndex = Math.floor(Math.random() * templates.length)
  return templates[randomIndex]
}

// AI 블로그 글 생성 API
app.post('/api/generate-blog-post', async (c) => {
  try {
    const { topic, keywords, tone } = await c.req.json()
    
    if (!topic) {
      return c.json({ success: false, error: '주제를 입력해주세요.' }, 400)
    }

    // 템플릿 기반 블로그 생성 (현재는 API 키 없이 작동)
    const templateBlog = generateTemplateBlog(topic, keywords, tone)
    return c.json({ 
      success: true, 
      content: templateBlog,
      metadata: {
        topic,
        keywords,
        tone,
        wordCount: templateBlog.length,
        mode: 'template'
      }
    })

    // API 키가 있으면 실제 AI 호출
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [
            {
              role: 'system',
              content: `당신은 학원 마케팅 전문 블로그 작가입니다. 네이버 블로그 SEO에 최적화된 글을 작성합니다.

글쓰기 원칙:
1. 제목: 검색 키워드를 포함한 매력적인 제목
2. 서론: 독자의 관심을 끄는 공감 내용
3. 본론: 구체적이고 실용적인 정보 (3-5가지 핵심 포인트)
4. 결론: 행동을 유도하는 마무리
5. 키워드: 자연스럽게 3-5회 반복
6. 길이: 1500-2000자
7. 톤: ${tone || '친근하고 전문적인'}
8. 문단: 3-4문장으로 구성, 가독성 높게
9. 이모지 적절히 사용`
            },
            {
              role: 'user',
              content: `블로그 주제: ${topic}
${keywords ? `포함할 키워드: ${keywords}` : ''}

위 주제로 네이버 블로그에 올릴 글을 작성해주세요.
제목, 서론, 본론, 결론을 명확히 구분해서 작성해주세요.`
            }
          ],
          temperature: 0.9,
          max_tokens: 2500
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('OpenAI API error:', data)
        // API 오류 시 템플릿으로 폴백
        const templateBlog = generateTemplateBlog(topic, keywords, tone)
        return c.json({ 
          success: true, 
          content: templateBlog,
          metadata: {
            topic,
            keywords,
            tone,
            wordCount: templateBlog.length,
            mode: 'template_fallback'
          }
        })
      }

      const generatedPost = data.choices[0]?.message?.content || ''

      return c.json({ 
        success: true, 
        content: generatedPost,
        metadata: {
          topic,
          keywords,
          tone,
          wordCount: generatedPost.length,
          mode: 'ai'
        }
      })
    } catch (apiError) {
      console.error('API call error:', apiError)
      // API 호출 실패 시 템플릿으로 폴백
      const templateBlog = generateTemplateBlog(topic, keywords, tone)
      return c.json({ 
        success: true, 
        content: templateBlog,
        metadata: {
          topic,
          keywords,
          tone,
          wordCount: templateBlog.length,
          mode: 'template_fallback'
        }
      })
    }
  } catch (error) {
    console.error('Generate blog post error:', error)
    return c.json({ success: false, error: '블로그 글 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 템플릿 기반 블로그 생성 함수
function generateTemplateBlog(topic: string, keywords: string | undefined, tone: string | undefined): string {
  const keywordList = keywords ? keywords.split(',').map(k => k.trim()) : [topic]
  const mainKeyword = keywordList[0]
  
  return `📌 ${topic} - 학원장이 알려드리는 실전 가이드

안녕하세요! 오늘은 많은 학부모님들이 궁금해하시는 "${topic}"에 대해 상세히 알려드리려고 합니다. 😊

실제 학원을 운영하면서 겪은 경험을 바탕으로 정말 도움이 되는 정보만 모았으니, 끝까지 읽어보시면 큰 도움이 되실 거예요!


🎯 왜 ${mainKeyword}이(가) 중요할까요?

요즘 학부모님들과 상담하다 보면 "${mainKeyword}"에 대한 고민이 정말 많으십니다. 그만큼 중요한 주제이기 때문이죠.

특히 초등학생부터 고등학생까지, 학년별로 접근 방법이 다르기 때문에 우리 아이에게 맞는 방법을 찾는 것이 핵심입니다.


✨ ${topic} - 핵심 포인트 3가지

1️⃣ 첫 번째 핵심 포인트

${mainKeyword}을(를) 시작할 때 가장 중요한 것은 기초를 탄탄히 하는 것입니다. 많은 학생들이 빨리 진도를 나가려고 하지만, 기초가 약하면 나중에 어려움을 겪게 됩니다.

실제로 저희 학원에서도 기초부터 체계적으로 학습한 학생들이 장기적으로 훨씬 좋은 성과를 내는 것을 확인했습니다.


2️⃣ 두 번째 핵심 포인트

꾸준함이 정말 중요합니다. ${mainKeyword}은(는) 단기간에 효과를 보기 어렵습니다. 최소 3개월 이상 꾸준히 학습해야 확실한 변화를 느낄 수 있어요.

하루 30분이라도 매일 꾸준히 하는 것이 주말에 3시간 몰아서 하는 것보다 훨씬 효과적입니다. 💪


3️⃣ 세 번째 핵심 포인트

전문가의 도움을 받는 것도 좋은 방법입니다. 혼자서 하다 보면 방향을 잃기 쉽고, 잘못된 습관이 생길 수 있습니다.

${keywords ? keywords.split(',').map(k => k.trim()).join(', ') : topic}과 관련해서 체계적인 커리큘럼을 갖춘 곳에서 학습하면 시간과 노력을 아낄 수 있습니다.


📚 실전 활용 팁

이론만 아는 것이 아니라 실제로 적용하는 것이 중요합니다. 

매일 작은 목표를 세우고, 그것을 달성하면서 성취감을 느끼게 해주세요. 이렇게 하면 자연스럽게 학습 동기가 생기고, ${mainKeyword}에 대한 흥미도 높아집니다.

특히 학부모님의 관심과 응원이 정말 중요합니다. 작은 발전이라도 칭찬해주시면, 아이들은 더 열심히 하게 됩니다! 🎉


💡 마무리하며

오늘은 ${topic}에 대해 자세히 알아보았습니다.

핵심은 기초를 탄탄히 하고, 꾸준히 학습하며, 필요하다면 전문가의 도움을 받는 것입니다.

우리 아이에게 맞는 방법을 찾아서 차근차근 진행하시면, 분명 좋은 결과가 있을 거예요! 😊

궁금하신 점이 있으시면 언제든 댓글로 남겨주세요. 성심성의껏 답변드리겠습니다!

#${mainKeyword} ${keywords ? keywords.split(',').map(k => '#' + k.trim()).join(' ') : ''} #학원 #학습법 #공부법 #교육정보`
}

// ========================================
// Page Routes
// ========================================

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>우리는 슈퍼플레이스다 - 학원 마케팅 전문</title>
        <meta name="description" content="네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅 전문 교육">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          
          :root {
            --primary: #7c3aed;
            --primary-dark: #5b21b6;
            --accent: #fb923c;
            --accent-dark: #f97316;
          }
          
          body {
            background: #ffffff;
            color: #1f2937;
          }
          
          .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px -8px rgba(124, 58, 237, 0.15);
          }
          
          .animate-fade-in {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .animate-fade-in.visible {
            opacity: 1;
            transform: translateY(0);
          }
          
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          
          .gradient-orange {
            background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          }
          
          .section-light {
            background: #fafafa;
          }
          
          .text-balance {
            text-wrap: balance;
          }
        </style>
    </head>
    <body>
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-10" onerror="this.style.display='none'">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </div>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        
                        <!-- 로그인 전 -->
                        <a href="/login" id="loginBtn" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium hover:shadow-lg transition-all">
                            로그인
                        </a>
                        
                        <!-- 로그인 후 -->
                        <div id="userMenu" class="hidden flex items-center space-x-4">
                            <a href="/dashboard" class="text-gray-700 hover:text-purple-600 font-medium">대시보드</a>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold" id="userAvatar"></div>
                                <span id="userName" class="text-gray-900 font-medium"></span>
                            </div>
                            <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                        </div>
                    </div>
                    <div class="md:hidden">
                        <button id="mobile-menu-btn" class="text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile menu -->
            <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100">
                <div class="px-6 py-4 space-y-2">
                    <a href="/" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">홈</a>
                    <a href="/programs" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">교육 프로그램</a>
                    <a href="/success" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">성공 사례</a>
                    <a href="/contact" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">문의하기</a>
                    <a href="/login" class="block px-4 py-3 gradient-purple text-white rounded-xl text-center font-medium">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="pt-32 pb-32 px-6 bg-white relative overflow-hidden">
            <div class="absolute inset-0 z-0">
                <div class="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-purple-100 to-transparent rounded-full blur-3xl opacity-30"></div>
                <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-orange-100 to-transparent rounded-full blur-3xl opacity-30"></div>
            </div>
            <div class="max-w-7xl mx-auto relative z-10">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <!-- Left: Text Content -->
                    <div class="animate-fade-in">
                        <div class="inline-block mb-6 px-5 py-2.5 bg-purple-50 rounded-full text-purple-700 text-sm font-medium border border-purple-100">
                            학원 마케팅의 새로운 기준
                        </div>
                        <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            학원장님의 성공,<br>
                            <span class="text-purple-600">우리가 함께합니다</span>
                        </h1>
                        <p class="text-xl text-gray-600 mb-10 leading-relaxed">
                            네이버 플레이스 1위, 블로그 상위노출, 퍼널 마케팅까지<br>
                            <span class="text-gray-900 font-medium">500개 학원이 검증</span>한 실전 마케팅 노하우
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 mb-12">
                            <a href="/contact" class="gradient-purple text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                                무료 상담 신청하기
                            </a>
                            <a href="/programs" class="bg-white text-purple-600 border-2 border-purple-200 px-10 py-4 rounded-full text-lg font-medium hover:border-purple-400 hover:bg-purple-50 transition-all text-center">
                                교육 프로그램 보기
                            </a>
                        </div>
                    </div>
                    
                    <!-- Right: Hero Image -->
                    <div class="animate-fade-in" style="transition-delay: 0.2s">
                        <div class="relative rounded-3xl overflow-hidden shadow-2xl">
                            <img src="/static/images/hero-main.png" 
                                 alt="학원 전문 마케팅 - 우리는 슈퍼플레이스다" 
                                 class="w-full h-auto object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-20">
                    
                    <!-- Stats -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-12 border-t border-gray-100">
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-purple-600 mb-2">500+</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">교육 수료 학원</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-orange-500 mb-2">95%</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">만족도</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-purple-600 mb-2">24/7</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">커뮤니티 운영</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-orange-500 mb-2">1:1</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">맞춤 컨설팅</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Services Section -->
        <section class="py-32 px-6 section-light">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-20 animate-fade-in">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        핵심 교육 프로그램
                    </h2>
                    <p class="text-xl text-gray-600">
                        실전에서 바로 적용 가능한 학원 마케팅 전략
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
                    <!-- Service 1 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.1s">
                        <div class="h-48 overflow-hidden">
                            <img src="/static/images/naver-place.png" 
                                 alt="네이버 플레이스 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">네이버 플레이스<br>상위노출</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                지역 검색 1위 달성을 위한 실전 노하우. 키워드 분석부터 리뷰 관리까지 완벽하게 마스터합니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>키워드 최적화 전략</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>리뷰 관리 시스템</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>지역 SEO 완벽 가이드</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Service 2 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.2s">
                        <div class="h-48 overflow-hidden">
                            <img src="/static/images/blog-marketing.jpg" 
                                 alt="블로그 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">블로그<br>상위노출</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                네이버 블로그 검색 최상위 진입 전략. SEO 최적화와 콘텐츠 기획의 모든 것을 배웁니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>검색 알고리즘 완벽 이해</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>효과적인 글쓰기 기법</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>콘텐츠 전략 수립</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Service 3 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.3s">
                        <div class="h-48 overflow-hidden">
                            <img src="/static/images/funnel-marketing.png" 
                                 alt="퍼널 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">퍼널<br>마케팅</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>고객 여정 완벽 설계</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>마케팅 자동화 도구</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>전환율 극대화 전략</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Us Section -->
        <section class="py-32 px-6 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-20 animate-fade-in">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        왜 우리를 선택해야 할까요?
                    </h2>
                    <p class="text-xl text-gray-600">
                        현업 학원장이 직접 가르치는 실전 마케팅 교육
                    </p>
                </div>

                <div class="grid lg:grid-cols-2 gap-8 mb-20">
                    <!-- Left: Image Grid -->\n                    <div class="grid grid-cols-2 gap-4 animate-fade-in">
                        <div class="col-span-2 rounded-2xl overflow-hidden">
                            <img src="/static/images/kumetang-classroom-1.jpg" 
                                 alt="꾸메땅학원 교실 내부" 
                                 class="w-full h-72 object-cover">
                        </div>
                        <div class="rounded-2xl overflow-hidden">
                            <img src="/static/images/kumetang-classroom-2.jpg" 
                                 alt="꾸메땅학원 학습 공간" 
                                 class="w-full h-48 object-cover">
                        </div>
                        <div class="rounded-2xl overflow-hidden bg-white flex items-center justify-center p-4">
                            <img src="/static/images/kumetang-logo.png" 
                                 alt="꾸메땅학원 로고" 
                                 class="w-full h-auto object-contain">
                        </div>
                    </div>
                    
                    <!-- Right: Features -->
                    <div class="space-y-6 animate-fade-in" style="transition-delay: 0.1s">
                        <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    01
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        현업 학원장의 살아있는 노하우
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        꾸메땅학원을 운영하며 직접 검증한 실전 전략. 이론이 아닌 경험에서 우러나온 진짜 노하우를 배웁니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-orange rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    02
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        24/7 커뮤니티 & 오프라인 모임
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        오픈채팅방에서 실시간 소통하고, 정기 오프라인 모임에서 전국 학원장님들과 네트워킹하세요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    03
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        500개 학원이 검증한 성과
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        500개 이상 학원의 실제 성공 사례와 95% 만족도가 증명하는 확실한 효과를 경험하세요.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Testimonial -->
                <div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-12 lg:p-16 max-w-5xl mx-auto animate-fade-in shadow-2xl">
                    <div class="flex items-start gap-6 mb-8">
                        <svg class="w-12 h-12 text-white/80 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                    </div>
                    <p class="text-2xl lg:text-3xl text-white leading-relaxed mb-10 font-medium">
                        플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 <span class="text-orange-300 font-bold">2배 이상</span> 늘었습니다. 실전 노하우가 정말 대단합니다!
                    </p>
                    <div class="flex items-center gap-5">
                        <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                            김
                        </div>
                        <div>
                            <div class="font-bold text-white text-xl">김OO 원장님</div>
                            <div class="text-white/80">서울 강남구 영어학원</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-32 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center animate-fade-in">
                <h2 class="text-4xl lg:text-6xl font-bold text-white mb-8 text-balance">
                    학원 성장의 시작,<br>
                    지금 바로 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-12 leading-relaxed">
                    무료 상담으로 우리 학원에 딱 맞는 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        무료 상담 신청하기
                    </a>
                    <a href="/programs" class="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-white hover:text-purple-600 transition-all">
                        교육 프로그램 보기
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-50 text-gray-600 py-20 px-6 border-t border-gray-100">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div class="flex items-center space-x-2 mb-4">
                            <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-8" onerror="this.style.display='none'">
                            <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                        </div>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            학원 마케팅의 새로운 기준
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">서비스</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/programs" class="hover:text-purple-600 transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-purple-600 transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-purple-600 transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">회사</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/about" class="hover:text-purple-600 transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">연락처</h4>
                        <ul class="space-y-3 text-sm">
                            <li>인천광역시 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용 가능</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
                    <p>&copy; 2024 우리는 슈퍼플레이스다. All rights reserved.</p>
                </div>
            </div>
        </footer>

        <script>
            // 로그인 상태 체크
            function checkLoginStatus() {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user) {
                    // 로그인된 상태
                    document.getElementById('loginBtn').classList.add('hidden');
                    document.getElementById('userMenu').classList.remove('hidden');
                    document.getElementById('userMenu').classList.add('flex');
                    document.getElementById('userName').textContent = user.name;
                    document.getElementById('userAvatar').textContent = user.name.charAt(0);
                } else {
                    // 로그아웃 상태
                    document.getElementById('loginBtn').classList.remove('hidden');
                    document.getElementById('userMenu').classList.add('hidden');
                }
            }

            function logout() {
                if (confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    location.reload();
                }
            }

            // Mobile menu toggle
            document.getElementById('mobile-menu-btn').addEventListener('click', function() {
                const menu = document.getElementById('mobile-menu');
                menu.classList.toggle('hidden');
            });

            // Smooth scroll animations
            const observeElements = () => {
                const elements = document.querySelectorAll('.animate-fade-in');
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: '0px 0px -60px 0px'
                });
                
                elements.forEach(element => observer.observe(element));
            };

            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
                checkLoginStatus(); // 로그인 상태 체크 추가
                observeElements();
                
                // Add visible class to hero immediately
                document.querySelector('section .animate-fade-in')?.classList.add('visible');
            });
        </script>
    </body>
    </html>
  `)
})

// 문의하기 페이지
app.get('/contact', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>문의하기 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-10" onerror="this.style.display='none'">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium hover:shadow-lg transition-all">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Contact Form Section -->
        <section class="pt-32 pb-24 px-6">
            <div class="max-w-3xl mx-auto">
                <div class="text-center mb-12">
                    <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">무료 상담 신청</h1>
                    <p class="text-xl text-gray-600">학원에 맞는 맞춤 마케팅 전략을 상담해드립니다</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8 lg:p-12">
                    <form id="contactForm" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이름 <span class="text-red-500">*</span></label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일 <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처 <span class="text-red-500">*</span></label>
                            <input type="tel" name="phone" required placeholder="010-0000-0000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명</label>
                            <input type="text" name="academy_name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">문의 내용 <span class="text-red-500">*</span></label>
                            <textarea name="message" required rows="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"></textarea>
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all">
                            문의 접수하기
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>
                </div>

                <div class="mt-12 grid md:grid-cols-3 gap-6">
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">이메일</div>
                        <div class="text-sm text-gray-600 mt-1">contact@superplace.kr</div>
                    </div>
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">위치</div>
                        <div class="text-sm text-gray-600 mt-1">인천광역시 서구</div>
                    </div>
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">상담 시간</div>
                        <div class="text-sm text-gray-600 mt-1">평일 10:00 - 18:00</div>
                    </div>
                </div>
            </div>
        </section>

        <script>
            document.getElementById('contactForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    academy_name: formData.get('academy_name'),
                    message: formData.get('message')
                }

                try {
                    const response = await fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        e.target.reset()
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '문의 접수 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 로그인 페이지
app.get('/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>로그인 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-6 py-12">
            <div class="max-w-md w-full">
                <div class="text-center mb-10">
                    <a href="/" class="inline-block mb-6">
                        <span class="text-2xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">로그인</h1>
                    <p class="text-gray-600">학원 마케팅 교육에 오신 것을 환영합니다</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8">
                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일</label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">비밀번호</label>
                            <input type="password" name="password" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all">
                            로그인
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>

                    <!-- 소셜 로그인 -->
                    <div class="mt-6">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-200"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-4 bg-white text-gray-500">또는 간편 로그인</span>
                            </div>
                        </div>

                        <div class="mt-6 space-y-3">
                            <button onclick="loginWithGoogle()" class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all">
                                <svg class="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span class="font-medium text-gray-700">구글로 계속하기</span>
                            </button>

                            <button onclick="loginWithKakao()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all" style="background-color: #FEE500;">
                                <svg class="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#000000" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.543l-1.514-2.155zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.696.696 0 0 0-.653.447l-1.661 4.075a.472.472 0 0 0 .874.357l.33-.813h2.07l.299.8a.472.472 0 1 0 .884-.33l-.345-.926zM8.294 9.302a.472.472 0 0 0-.471-.472H5.185a.472.472 0 1 0 0 .944h1.039v3.736a.472.472 0 0 0 .943 0V9.774h1.127a.472.472 0 0 0 .47-.472z"/>
                                </svg>
                                <span class="font-medium text-gray-900">카카오로 계속하기</span>
                            </button>
                        </div>
                    </div>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        계정이 없으신가요? <a href="/signup" class="text-purple-600 hover:text-purple-700 font-medium">회원가입</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // 구글 로그인
            function loginWithGoogle() {
                alert('구글 로그인은 Google OAuth 2.0 설정이 필요합니다.\\n\\n설정 방법:\\n1. Google Cloud Console에서 프로젝트 생성\\n2. OAuth 2.0 클라이언트 ID 생성\\n3. 승인된 리디렉션 URI 추가\\n4. 클라이언트 ID를 환경변수에 설정\\n\\n현재는 일반 로그인을 사용해주세요.')
            }

            // 카카오 로그인
            function loginWithKakao() {
                alert('카카오 로그인은 Kakao Developers 설정이 필요합니다.\\n\\n설정 방법:\\n1. Kakao Developers에서 앱 생성\\n2. JavaScript 키 발급\\n3. 플랫폼 설정에서 Web 플랫폼 추가\\n4. Redirect URI 등록\\n\\n현재는 일반 로그인을 사용해주세요.')
            }

            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    email: formData.get('email'),
                    password: formData.get('password')
                }

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        localStorage.setItem('user', JSON.stringify(result.user))
                        
                        // 역할에 따라 자동 리다이렉트
                        setTimeout(() => {
                            if (result.user.role === 'admin') {
                                window.location.href = '/admin/dashboard.html'
                            } else {
                                window.location.href = '/dashboard'
                            }
                        }, 1000)
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '로그인 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 회원가입 페이지
app.get('/signup', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회원가입 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-6 py-12">
            <div class="max-w-md w-full">
                <div class="text-center mb-10">
                    <a href="/" class="inline-block mb-6">
                        <span class="text-2xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
                    <p class="text-gray-600">학원 마케팅 교육을 시작해보세요</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8">
                    <form id="signupForm" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">원장님 성함 <span class="text-red-500">*</span></label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition" placeholder="홍길동">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일 <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition" placeholder="example@email.com">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">비밀번호 <span class="text-red-500">*</span></label>
                            <input type="password" name="password" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            <p class="text-xs text-gray-500 mt-1">최소 6자 이상</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처 <span class="text-red-500">*</span></label>
                            <input type="tel" name="phone" required placeholder="010-0000-0000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원 이름 <span class="text-red-500">*</span></label>
                            <input type="text" name="academy_name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition" placeholder="꾸메땅학원">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원 위치 <span class="text-red-500">*</span></label>
                            <input type="text" name="academy_location" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition" placeholder="인천 서구 검단동">
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all">
                            회원가입
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        이미 계정이 있으신가요? <a href="/login" class="text-purple-600 hover:text-purple-700 font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('signupForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    phone: formData.get('phone'),
                    academy_name: formData.get('academy_name'),
                    academy_location: formData.get('academy_location')
                }

                try {
                    const response = await fetch('/api/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        setTimeout(() => {
                            window.location.href = '/login'
                        }, 1500)
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '회원가입 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 교육 프로그램 페이지
app.get('/programs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>교육 프로그램 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .gradient-orange {
            background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-purple-600 font-medium">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <section class="pt-32 pb-20 px-6">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">교육 프로그램</h1>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    실전 경험을 바탕으로 한 체계적인 학원 마케팅 교육
                </p>
            </div>
        </section>

        <!-- Programs -->
        <section class="pb-24 px-6">
            <div class="max-w-7xl mx-auto space-y-20">
                <!-- Program 1 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">프로그램 01</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">네이버 플레이스 상위노출</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            지역 검색 1위를 차지하는 실전 노하우. 학원 위치 기반 최적화 전략으로 신규 학생 유입을 극대화합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">키워드 분석 및 최적화</div>
                                    <div class="text-gray-600 text-sm">학원에 맞는 최적의 키워드 발굴</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">리뷰 관리 전략</div>
                                    <div class="text-gray-600 text-sm">긍정적인 리뷰 확보 및 관리</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">지역 SEO 완벽 가이드</div>
                                    <div class="text-gray-600 text-sm">지역 기반 검색 최적화</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-purple text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-12 border border-purple-100">
                        <div class="text-6xl mb-6">📍</div>
                        <div class="space-y-3 text-gray-700">
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>교육 기간</span>
                                <span class="font-semibold">4주</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>수강 방식</span>
                                <span class="font-semibold">온라인 + 오프라인</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>난이도</span>
                                <span class="font-semibold">초급-중급</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Program 2 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div class="order-2 lg:order-1">
                        <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-12 border border-orange-100">
                            <div class="text-6xl mb-6">📝</div>
                            <div class="space-y-3 text-gray-700">
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>교육 기간</span>
                                    <span class="font-semibold">4주</span>
                                </div>
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>수강 방식</span>
                                    <span class="font-semibold">온라인</span>
                                </div>
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>난이도</span>
                                    <span class="font-semibold">초급-중급</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="order-1 lg:order-2">
                        <div class="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">프로그램 02</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">블로그 상위노출</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            네이버 블로그 검색 상위권 진입 전략. SEO 최적화부터 콘텐츠 기획까지 체계적으로 학습합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">검색 알고리즘 이해</div>
                                    <div class="text-gray-600 text-sm">네이버 검색 원리 완벽 마스터</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">콘텐츠 작성 기법</div>
                                    <div class="text-gray-600 text-sm">효과적인 블로그 글쓰기</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">효과적인 포스팅 전략</div>
                                    <div class="text-gray-600 text-sm">주기적인 콘텐츠 발행 전략</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-orange text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                </div>

                <!-- Program 3 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">프로그램 03</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">퍼널 마케팅</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">고객 여정 설계</div>
                                    <div class="text-gray-600 text-sm">상담-등록까지 프로세스 최적화</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">자동화 도구 활용</div>
                                    <div class="text-gray-600 text-sm">효율적인 마케팅 자동화</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">전환율 최적화</div>
                                    <div class="text-gray-600 text-sm">상담-등록 전환율 극대화</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-purple text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-12 border border-purple-100">
                        <div class="text-6xl mb-6">⚡</div>
                        <div class="space-y-3 text-gray-700">
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>교육 기간</span>
                                <span class="font-semibold">6주</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>수강 방식</span>
                                <span class="font-semibold">온라인 + 1:1 컨설팅</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>난이도</span>
                                <span class="font-semibold">중급-고급</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-24 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-6">
                    무료 상담으로 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-10">
                    우리 학원에 맞는 교육 프로그램을 추천해드립니다
                </p>
                <a href="/contact" class="inline-block bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:-translate-y-1 transition">
                    무료 상담 신청
                </a>
            </div>
        </section>
    </body>
    </html>
  `)
})

// 성공 사례 페이지
app.get('/success', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>성공 사례 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-purple-600 font-medium">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <section class="pt-32 pb-20 px-6">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">성공 사례</h1>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    500개 이상의 학원이 우리와 함께 성장했습니다
                </p>
            </div>
        </section>

        <!-- Success Stories -->
        <section class="pb-24 px-6">
            <div class="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Story 1 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">2배</div>
                            <div class="text-sm text-gray-600">신규 문의 증가</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 2배 이상 늘었습니다. 실전 노하우가 정말 대단합니다!
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">김</div>
                        <div>
                            <div class="font-bold text-gray-900">김OO 원장님</div>
                            <div class="text-sm text-gray-600">서울 강남구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 2 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">1위</div>
                            <div class="text-sm text-gray-600">네이버 플레이스</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        키워드 분석과 리뷰 관리 전략을 배운 후 우리 학원이 지역 검색 1위에 올랐어요. 등록 문의가 끊이지 않습니다.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">박</div>
                        <div>
                            <div class="font-bold text-gray-900">박OO 원장님</div>
                            <div class="text-sm text-gray-600">부산 해운대구 수학학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 3 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">3배</div>
                            <div class="text-sm text-gray-600">블로그 유입</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        블로그 마케팅 강의를 듣고 콘텐츠 전략을 바꿨더니 블로그 유입이 3배로 늘었습니다. 학부모님들의 신뢰도 높아졌어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">이</div>
                        <div>
                            <div class="font-bold text-gray-900">이OO 원장님</div>
                            <div class="text-sm text-gray-600">대전 유성구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 4 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">40%</div>
                            <div class="text-sm text-gray-600">전환율 상승</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        퍼널 마케팅 시스템을 구축한 후 상담-등록 전환율이 40% 상승했습니다. 자동화로 업무 효율도 크게 개선됐어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">최</div>
                        <div>
                            <div class="font-bold text-gray-900">최OO 원장님</div>
                            <div class="text-sm text-gray-600">인천 서구 종합학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 5 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">50명</div>
                            <div class="text-sm text-gray-600">신규 등록</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        교육 이수 후 6개월 만에 신규 등록 학생이 50명 늘었습니다. 학원 운영이 안정화되고 매출도 크게 증가했어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">정</div>
                        <div>
                            <div class="font-bold text-gray-900">정OO 원장님</div>
                            <div class="text-sm text-gray-600">광주 북구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 6 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">95%</div>
                            <div class="text-sm text-gray-600">재등록률</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        마케팅 자동화와 학부모 소통 전략을 배운 후 재등록률이 95%로 올랐습니다. 학생 관리도 훨씬 체계적이에요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">강</div>
                        <div>
                            <div class="font-bold text-gray-900">강OO 원장님</div>
                            <div class="text-sm text-gray-600">수원 영통구 수학학원</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Stats -->
        <section class="py-24 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">숫자로 보는 성과</h2>
                    <p class="text-xl text-gray-600">데이터가 증명하는 확실한 효과</p>
                </div>
                <div class="grid md:grid-cols-4 gap-8">
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">500+</div>
                        <div class="text-gray-600">교육 수료 학원</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">95%</div>
                        <div class="text-gray-600">만족도</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">2.5배</div>
                        <div class="text-gray-600">평균 문의 증가</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">85%</div>
                        <div class="text-gray-600">재수강률</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- FAQ Section -->
        <section class="py-24 px-6 bg-gray-50">
            <div class="max-w-4xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
                    <p class="text-xl text-gray-600">학원장님들이 가장 궁금해하시는 질문들입니다</p>
                </div>
                
                <div class="space-y-4">
                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>💰 교육 비용은 얼마인가요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-4">프로그램별로 상이하며, 무료 상담을 통해 학원 규모와 목표에 맞는 맞춤 견적을 제공해드립니다.</p>
                            <p class="text-sm text-purple-600">평균 ROI: 340% (투자 대비 3.4배 수익)</p>
                        </div>
                    </details>

                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>⏱️ 효과를 보기까지 얼마나 걸리나요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-2">• <strong>즉시 효과</strong>: 학부모 소통 개선 (1주일 내)</p>
                            <p class="mb-2">• <strong>단기 효과</strong>: 네이버 플레이스 문의 증가 (2~4주)</p>
                            <p>• <strong>장기 효과</strong>: 블로그 유입 증가, 브랜드 인지도 상승 (3개월~)</p>
                        </div>
                    </details>

                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>🎯 컴퓨터를 잘 못 다뤄도 괜찮나요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-4">네! 전혀 걱정하지 않으셔도 됩니다. 저희 교육은 초보자도 쉽게 따라할 수 있도록 설계되었습니다.</p>
                            <ul class="space-y-2 text-sm">
                                <li>✓ 1:1 맞춤 지도</li>
                                <li>✓ 단계별 영상 강의</li>
                                <li>✓ 24시간 카카오톡 지원</li>
                            </ul>
                        </div>
                    </details>

                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>🏫 어떤 학원에 적합한가요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-4">모든 규모의 학원에 적합합니다:</p>
                            <ul class="space-y-2">
                                <li>• 영어학원, 수학학원, 종합학원</li>
                                <li>• 소규모 개인학원 ~ 대형 프랜차이즈</li>
                                <li>• 온라인/오프라인 학원 모두 가능</li>
                            </ul>
                        </div>
                    </details>

                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>📱 오프라인 모임도 있나요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-4">네! 정기적으로 오프라인 워크샵과 네트워킹 모임을 진행합니다.</p>
                            <p class="text-sm text-purple-600">• 월 1회 오프라인 특강 (인천/서울)</p>
                            <p class="text-sm text-purple-600">• 연 2회 전국 학원장 컨퍼런스</p>
                        </div>
                    </details>

                    <details class="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                        <summary class="px-8 py-6 cursor-pointer font-bold text-lg text-gray-900 hover:text-purple-600 transition flex items-center justify-between">
                            <span>🔄 환불 정책은 어떻게 되나요?</span>
                            <svg class="w-6 h-6 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="px-8 pb-6 text-gray-600">
                            <p class="mb-4">교육 시작 후 7일 이내 100% 환불이 가능합니다.</p>
                            <p class="text-sm text-gray-500">만족도 95% 이상! 대부분의 학원장님들이 만족하시고 재구매하십니다.</p>
                        </div>
                    </details>
                </div>

                <div class="mt-12 text-center">
                    <p class="text-gray-600 mb-6">더 궁금한 점이 있으신가요?</p>
                    <a href="/contact" class="inline-block bg-purple-600 text-white px-8 py-4 rounded-full font-medium hover:bg-purple-700 transition">
                        1:1 무료 상담 신청하기
                    </a>
                </div>
            </div>
        </section>

        <!-- Customer Reviews Slider -->
        <section class="py-24 px-6 bg-white">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">실제 후기</h2>
                    <p class="text-xl text-gray-600">슈퍼플레이스와 함께한 학원장님들의 생생한 후기입니다</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Review 1 -->
                    <div class="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-xl transition">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">김</div>
                            <div class="ml-4">
                                <div class="font-bold text-gray-900">김지수 원장님</div>
                                <div class="text-sm text-gray-600">인천 부평구 영어학원</div>
                            </div>
                        </div>
                        <div class="text-yellow-500 mb-4">★★★★★</div>
                        <p class="text-gray-700 mb-4">"네이버 플레이스 교육 받고 한 달 만에 문의가 3배 늘었어요! 실제로 효과가 있는 마케팅을 배울 수 있었습니다."</p>
                        <div class="text-sm text-purple-600 font-medium">문의 수 3배 증가 ↑</div>
                    </div>

                    <!-- Review 2 -->
                    <div class="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-xl transition">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">박</div>
                            <div class="ml-4">
                                <div class="font-bold text-gray-900">박민준 원장님</div>
                                <div class="text-sm text-gray-600">서울 강남구 수학학원</div>
                            </div>
                        </div>
                        <div class="text-yellow-500 mb-4">★★★★★</div>
                        <p class="text-gray-700 mb-4">"블로그 상위노출 전략을 배우고 검색 유입이 폭발적으로 늘었습니다. 투자 대비 최고의 선택이었어요!"</p>
                        <div class="text-sm text-orange-600 font-medium">블로그 유입 500% 증가 ↑</div>
                    </div>

                    <!-- Review 3 -->
                    <div class="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-xl transition">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">이</div>
                            <div class="ml-4">
                                <div class="font-bold text-gray-900">이서연 원장님</div>
                                <div class="text-sm text-gray-600">인천 서구 종합학원</div>
                            </div>
                        </div>
                        <div class="text-yellow-500 mb-4">★★★★★</div>
                        <p class="text-gray-700 mb-4">"학부모 소통 시스템 덕분에 재수강률이 크게 올랐어요. 실전에서 바로 써먹을 수 있는 노하우가 최고입니다!"</p>
                        <div class="text-sm text-purple-600 font-medium">재수강률 20% 증가 ↑</div>
                    </div>
                </div>

                <div class="mt-12 text-center">
                    <a href="/success" class="inline-block text-purple-600 font-medium hover:underline">
                        더 많은 성공 사례 보기 →
                    </a>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-24 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-6">
                    다음 성공 사례의 주인공은 원장님입니다
                </h2>
                <p class="text-xl text-white/90 mb-10">
                    지금 바로 시작하세요
                </p>
                <a href="/contact" class="inline-block bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:-translate-y-1 transition">
                    무료 상담 신청
                </a>
            </div>
        </section>
    </body>
    </html>
  `)
})

// 학원장 전용 리소스 페이지
app.get('/resources', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마케팅 리소스 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .resource-card:hover {
            transform: translateY(-4px);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                    </a>
                    <div class="flex items-center space-x-6">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/resources" class="text-purple-600 font-medium">리소스</a>
                        <a href="/success" class="text-gray-600 hover:text-purple-600">성공사례</a>
                        <a href="/about" class="text-gray-600 hover:text-purple-600">회사소개</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <div class="pt-24 pb-12 px-6 gradient-purple">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-4xl lg:text-5xl font-bold text-white mb-4">학원 마케팅 리소스</h1>
                <p class="text-xl text-white/90">실전에서 바로 사용할 수 있는 체크리스트와 가이드</p>
            </div>
        </div>

        <!-- Resources Content -->
        <div class="py-12 px-6">
            <div class="max-w-7xl mx-auto">
                
                <!-- 네이버 플레이스 체크리스트 -->
                <section class="mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">📍 네이버 플레이스 최적화 체크리스트</h2>
                    <div class="bg-white rounded-2xl p-8 border border-gray-200 resource-card transition">
                        <div class="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 class="text-xl font-bold text-purple-600 mb-4">기본 정보 완성도</h3>
                                <ul class="space-y-3 text-gray-700">
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>학원명:</strong> 지역명 + 과목 포함 (예: 인천서구영어학원)</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>카테고리:</strong> 정확한 업종 분류 (학원 > 영어학원)</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>영업시간:</strong> 정확한 시간대 입력 (변동 시 즉시 업데이트)</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>전화번호:</strong> 클릭 통화 가능한 번호</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>주소:</strong> 정확한 주소 + 상세 위치 (건물명, 층수)</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-purple-600 mb-4">콘텐츠 & 이미지</h3>
                                <ul class="space-y-3 text-gray-700">
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>대표 사진:</strong> 밝고 깨끗한 학원 전경 (최소 10장)</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>강의실 사진:</strong> 학습 환경이 잘 보이는 사진</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>메뉴/가격:</strong> 강좌별 상세 가격표 등록</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>소개글:</strong> 500자 이상, 키워드 3회 이상 포함</span>
                                    </li>
                                    <li class="flex items-start">
                                        <span class="text-green-500 mr-2">✓</span>
                                        <span><strong>포스팅:</strong> 주 2회 이상 업데이트</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="mt-8 p-6 bg-purple-50 rounded-xl">
                            <h4 class="font-bold text-purple-900 mb-3">🎯 리뷰 관리 전략</h4>
                            <ul class="space-y-2 text-gray-700">
                                <li>• <strong>리뷰 요청:</strong> 수업 종료 후 만족도 높을 때 요청</li>
                                <li>• <strong>빠른 답변:</strong> 모든 리뷰에 24시간 내 답변</li>
                                <li>• <strong>부정 리뷰:</strong> 감정적 대응 금지, 개선 의지 표현</li>
                                <li>• <strong>목표:</strong> 월 5개 이상 신규 리뷰 확보</li>
                            </ul>
                        </div>

                        <div class="mt-6 text-center">
                            <button onclick="downloadChecklist('naver')" class="bg-purple-600 text-white px-8 py-3 rounded-full font-medium hover:bg-purple-700 transition">
                                체크리스트 다운로드 (PDF)
                            </button>
                        </div>
                    </div>
                </section>

                <!-- 블로그 키워드 -->
                <section class="mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">📝 블로그 포스팅 키워드 추천</h2>
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- 영어학원 키워드 -->
                        <div class="bg-white rounded-2xl p-8 border border-gray-200 resource-card transition">
                            <h3 class="text-xl font-bold text-orange-600 mb-4">영어학원 키워드</h3>
                            <div class="space-y-4">
                                <div>
                                    <div class="text-sm text-gray-600 mb-2">🔥 핫 키워드 (검색량 높음)</div>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">초등영어학원</span>
                                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">중등영어내신</span>
                                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">영어회화학원</span>
                                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">파닉스</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm text-gray-600 mb-2">💎 롱테일 키워드 (경쟁 낮음)</div>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">인천서구영어학원추천</span>
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">초등영어공부법</span>
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">영어학원선택기준</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 수학학원 키워드 -->
                        <div class="bg-white rounded-2xl p-8 border border-gray-200 resource-card transition">
                            <h3 class="text-xl font-bold text-purple-600 mb-4">수학학원 키워드</h3>
                            <div class="space-y-4">
                                <div>
                                    <div class="text-sm text-gray-600 mb-2">🔥 핫 키워드 (검색량 높음)</div>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">초등수학학원</span>
                                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">중등수학내신</span>
                                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">고등수학</span>
                                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">수학학원비교</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm text-gray-600 mb-2">💎 롱테일 키워드 (경쟁 낮음)</div>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">수학개념학원</span>
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">초등수학문제집추천</span>
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">수학선행학습</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 학부모 소통 예시 -->
                <section class="mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">💬 학부모 소통 예시 문구</h2>
                    <div class="bg-white rounded-2xl p-8 border border-gray-200 resource-card transition">
                        <div class="grid md:grid-cols-3 gap-6">
                            <div class="p-6 bg-green-50 rounded-xl">
                                <h4 class="font-bold text-green-900 mb-3">📈 성적 향상 시</h4>
                                <p class="text-sm text-gray-700">"학부모님, 이번 모의고사에서 수학 등급이 3등급에서 1등급으로 향상되었습니다! 꾸준히 노력한 결과가 드러나고 있습니다."</p>
                            </div>
                            <div class="p-6 bg-blue-50 rounded-xl">
                                <h4 class="font-bold text-blue-900 mb-3">🎯 학습 태도 개선</h4>
                                <p class="text-sm text-gray-700">"최근 수업 참여도가 눈에 띄게 좋아졌습니다. 질문도 적극적으로 하고, 과제 완성도도 높아졌어요. 이대로만 가면 다음 시험에서 좋은 결과 기대됩니다!"</p>
                            </div>
                            <div class="p-6 bg-purple-50 rounded-xl">
                                <h4 class="font-bold text-purple-900 mb-3">📚 추가 학습 제안</h4>
                                <p class="text-sm text-gray-700">"기초가 탄탄해져서 다음 단계로 넘어가도 좋을 것 같습니다. 심화 과정을 추천드리며, 자세한 내용은 상담 시 말씀드리겠습니다."</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 월별 마케팅 캘린더 -->
                <section class="mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">📅 월별 학원 마케팅 캘린더</h2>
                    <div class="bg-white rounded-2xl p-8 border border-gray-200 resource-card transition">
                        <div class="space-y-6">
                            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div class="w-20 text-center">
                                    <div class="text-2xl font-bold text-purple-600">1~2월</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-900 mb-2">겨울방학 특강 & 신학기 준비</h4>
                                    <p class="text-sm text-gray-700">• 겨울방학 특강 홍보<br>• 신학기 등록 조기 할인<br>• 학부모 설명회 개최</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div class="w-20 text-center">
                                    <div class="text-2xl font-bold text-orange-600">3~4월</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-900 mb-2">신학기 집중 마케팅</h4>
                                    <p class="text-sm text-gray-700">• 첫 중간고사 대비반 홍보<br>• 학부모 간담회<br>• 네이버 플레이스 리뷰 이벤트</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div class="w-20 text-center">
                                    <div class="text-2xl font-bold text-green-600">5~6월</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-900 mb-2">중간고사 후 재등록 집중</h4>
                                    <p class="text-sm text-gray-700">• 성적 향상 사례 블로그 포스팅<br>• 기말고사 대비반 예약<br>• 형제/자매 할인 프로모션</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div class="w-20 text-center">
                                    <div class="text-2xl font-bold text-blue-600">7~8월</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-900 mb-2">여름방학 특강 시즌</h4>
                                    <p class="text-sm text-gray-700">• 여름방학 집중 캠프<br>• 2학기 선행 학습반<br>• 추천 이벤트 (친구 데려오기)</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div class="w-20 text-center">
                                    <div class="text-2xl font-bold text-purple-600">11~12월</div>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-900 mb-2">수능 & 기말고사 마케팅</h4>
                                    <p class="text-sm text-gray-700">• 수능 대박 이벤트<br>• 연말 재등록 조기 할인<br>• 학부모 감사 이벤트</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>

        <script>
        function downloadChecklist(type) {
            if (type === 'naver') {
                alert('네이버 플레이스 체크리스트를 다운로드합니다.\\n\\n실제 서비스에서는 PDF 파일이 다운로드됩니다.');
                // 실제로는 PDF 파일 다운로드 로직 추가
            }
        }
        </script>
    </body>
    </html>
  `)
})

// 대시보드 페이지
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>대시보드 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">학원장 대시보드</span>
                    </div>
                    <div class="flex items-center space-x-6">
                        <span id="userName" class="text-gray-700"></span>
                        <a href="/profile" class="text-gray-600 hover:text-purple-600 transition">프로필</a>
                        <a id="adminDashboardBtn" href="/admin/dashboard.html" class="hidden bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium">
                            🔐 관리자 전용 대시보드
                        </a>
                        <button onclick="logout()" class="text-gray-600 hover:text-purple-600 transition">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-32 pb-24 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-2">안녕하세요, <span id="userNameDisplay"></span>님!</h1>
                    <p class="text-xl text-gray-600">학원 마케팅 현황을 확인하세요</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid md:grid-cols-4 gap-6 mb-12">
                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">수강 중인 프로그램</div>
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">3개</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">완료한 과제</div>
                            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">12/15</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">학습 진행률</div>
                            <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">80%</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">1:1 컨설팅</div>
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">2회</div>
                    </div>
                </div>

                <!-- Marketing Tools -->
                <div class="mb-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 마케팅 도구</h2>
                    <div class="grid md:grid-cols-2 gap-6">
                        <a href="/tools/parent-message" class="block bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">학부모 소통 시스템</h3>
                                    <p class="text-purple-100 text-sm">AI 메시지 자동 생성</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                간단한 메모만 작성하면 AI가 따뜻한 메시지로 변환해드립니다. 학부모님과의 소통이 더욱 편리해집니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/blog-writer" class="block bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">블로그 작성 도구</h3>
                                    <p class="text-orange-100 text-sm">SEO 최적화 글 생성</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                주제만 입력하면 네이버 SEO에 최적화된 블로그 글을 자동으로 생성합니다. 상위노출을 위한 필수 도구입니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/landing-builder" class="block bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">랜딩페이지 생성기</h3>
                                    <p class="text-blue-100 text-sm">AI 자동 페이지 제작</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                학원 소개, 프로그램 홍보, 학생 리포트 페이지를 간단한 입력만으로 자동 생성합니다. 카카오톡으로 바로 공유하세요.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/sms-sender" class="block bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">자동 문자 발송</h3>
                                    <p class="text-green-100 text-sm">학부모 일괄 문자 발송</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                수업 공지, 결석 안내, 상담 요청을 템플릿으로 간편하게 발송하세요. 예약 발송도 가능합니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/student-management" class="block bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">학생 관리</h3>
                                    <p class="text-indigo-100 text-sm">출결·성적·상담 기록</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                학생 정보, 출결 관리, 성적 기록, 상담 내역을 한 곳에서 체계적으로 관리하세요.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/consultation-booking" class="block bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">상담 예약 관리</h3>
                                    <p class="text-pink-100 text-sm">학부모 상담 일정 관리</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                학부모 상담 예약을 효율적으로 관리하고, 자동 알림으로 노쇼를 방지하세요.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/reenrollment-tracking" class="block bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">재등록 관리</h3>
                                    <p class="text-yellow-100 text-sm">만료 예정 학생 추적</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                수강 만료 예정 학생을 자동으로 추적하고, 재등록률을 높이세요.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/dashboard-analytics" class="block bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">통합 분석 대시보드</h3>
                                    <p class="text-teal-100 text-sm">매출·학생·마케팅 통계</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                학원 운영 현황을 한눈에 파악하고, 데이터 기반 의사결정을 하세요.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/ai-learning-report" class="block bg-gradient-to-br from-violet-500 to-fuchsia-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">AI 학습 분석 리포트</h3>
                                    <p class="text-violet-100 text-sm">개인별 맞춤 학습 분석</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                AI가 학생의 성적, 출석, 학습 태도를 종합 분석하여 맞춤형 리포트를 자동 생성합니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Content Grid -->
                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- My Programs -->
                    <div class="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">수강 중인 프로그램</h2>
                        <div class="space-y-4">
                            <div class="p-5 bg-purple-50 rounded-xl border border-purple-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">네이버 플레이스 상위노출</div>
                                        <div class="text-sm text-gray-600">진행률 90%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-purple-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: 90%"></div>
                                </div>
                            </div>

                            <div class="p-5 bg-orange-50 rounded-xl border border-orange-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">블로그 상위노출</div>
                                        <div class="text-sm text-gray-600">진행률 75%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-orange-500 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-orange-200 rounded-full h-2">
                                    <div class="bg-orange-500 h-2 rounded-full" style="width: 75%"></div>
                                </div>
                            </div>

                            <div class="p-5 bg-purple-50 rounded-xl border border-purple-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">퍼널 마케팅</div>
                                        <div class="text-sm text-gray-600">진행률 60%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-purple-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: 60%"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div class="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">바로가기</h2>
                        <div class="space-y-3">
                            <a href="/programs" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">교육 프로그램</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/success" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">성공 사례</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/resources" class="flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl hover:shadow-md transition border-2 border-purple-200">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    <div>
                                        <div class="font-bold text-gray-900">마케팅 리소스</div>
                                        <div class="text-xs text-gray-600">체크리스트 & 가이드</div>
                                    </div>
                                </div>
                                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/contact" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">1:1 상담 신청</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">메인 페이지</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Check authentication
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            const isImpersonating = localStorage.getItem('is_impersonating') === 'true'
            
            if (!user) {
                window.location.href = '/login'
            } else {
                document.getElementById('userName').textContent = user.name
                document.getElementById('userNameDisplay').textContent = user.name
                
                // 관리자일 경우 관리자 대시보드 버튼 표시
                if (user.role === 'admin') {
                    document.getElementById('adminDashboardBtn').classList.remove('hidden')
                }
                
                // Impersonating 중이면 복귀 버튼 표시
                if (isImpersonating) {
                    const nav = document.querySelector('nav .flex.items-center.space-x-4')
                    const returnBtn = document.createElement('button')
                    returnBtn.onclick = returnToAdmin
                    returnBtn.className = 'px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all'
                    returnBtn.innerHTML = '🔙 관리자로 돌아가기'
                    nav.insertBefore(returnBtn, nav.firstChild)
                }
            }

            function returnToAdmin() {
                const originalAdmin = JSON.parse(localStorage.getItem('original_admin'))
                if (originalAdmin) {
                    localStorage.setItem('user', JSON.stringify(originalAdmin))
                    localStorage.removeItem('original_admin')
                    localStorage.removeItem('is_impersonating')
                    alert('관리자 계정으로 복귀합니다.')
                    window.location.href = '/admin/users.html'
                }
            }

            function logout() {
                localStorage.removeItem('user')
                localStorage.removeItem('original_admin')
                localStorage.removeItem('is_impersonating')
                window.location.href = '/'
            }
        </script>
    </body>
    </html>
  `)
})

// SMS 발송 페이지
app.get('/tools/sms-sender', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>자동 문자 발송 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <span class="text-xl font-bold text-gray-900">자동 문자 발송</span>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-gray-900 mb-3">📱 자동 문자 발송 시스템</h1>
                    <p class="text-lg text-gray-600">템플릿을 선택하고 학부모님께 문자를 발송하세요</p>
                </div>

                <!-- 통계 -->
                <div class="grid md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white rounded-xl p-6 border border-gray-200">
                        <div class="text-sm text-gray-600 mb-2">오늘 발송</div>
                        <div class="text-3xl font-bold text-gray-900" id="statToday">0</div>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-gray-200">
                        <div class="text-sm text-gray-600 mb-2">이번 달 발송</div>
                        <div class="text-3xl font-bold text-gray-900" id="statMonth">0</div>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-gray-200">
                        <div class="text-sm text-gray-600 mb-2">대기중</div>
                        <div class="text-3xl font-bold text-orange-600" id="statPending">0</div>
                    </div>
                </div>

                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- 문자 발송 폼 -->
                    <div class="bg-white rounded-xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">문자 발송</h2>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">템플릿 선택</label>
                                <select id="templateSelect" class="w-full px-4 py-3 border border-gray-300 rounded-xl" onchange="loadTemplate()">
                                    <option value="">템플릿을 선택하세요</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">수신자 이름</label>
                                <input type="text" id="recipientName" placeholder="홍길동" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">수신자 전화번호</label>
                                <input type="tel" id="recipientPhone" placeholder="01012345678" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">메시지 내용</label>
                                <textarea id="messageContent" rows="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="메시지를 입력하세요"></textarea>
                                <div class="text-sm text-gray-500 mt-2">
                                    <span id="charCount">0</span>/90자 (한글 기준)
                                </div>
                            </div>

                            <div class="flex gap-3">
                                <button onclick="sendSMS()" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
                                    즉시 발송
                                </button>
                                <button onclick="scheduleSMS()" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
                                    예약 발송
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 발송 기록 -->
                    <div class="bg-white rounded-xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">최근 발송 기록</h2>
                        <div id="historyList" class="space-y-3 max-h-[600px] overflow-y-auto">
                            <div class="text-center text-gray-500 py-8">발송 기록이 없습니다</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
        let templates = [];
        let user = null;

        // 로그인 체크
        const userData = localStorage.getItem('user');
        if (userData) {
            user = JSON.parse(userData);
        } else {
            user = { id: 1, name: '게스트' };
        }

        function logout() {
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        // 페이지 로드 시 초기화
        async function init() {
            await loadTemplates();
            await loadStats();
            await loadHistory();
        }

        // 템플릿 로드
        async function loadTemplates() {
            try {
                const response = await fetch('/api/sms/templates');
                const data = await response.json();
                if (data.success) {
                    templates = data.templates;
                    const select = document.getElementById('templateSelect');
                    select.innerHTML = '<option value="">템플릿을 선택하세요</option>';
                    data.templates.forEach(t => {
                        select.innerHTML += \`<option value="\${t.id}">\${t.name} (\${t.category})</option>\`;
                    });
                }
            } catch (error) {
                console.error('템플릿 로드 오류:', error);
            }
        }

        // 템플릿 선택 시
        function loadTemplate() {
            const templateId = document.getElementById('templateSelect').value;
            if (!templateId) return;
            
            const template = templates.find(t => t.id == templateId);
            if (template) {
                document.getElementById('messageContent').value = template.content;
                updateCharCount();
            }
        }

        // 글자 수 카운트
        document.getElementById('messageContent').addEventListener('input', updateCharCount);
        function updateCharCount() {
            const text = document.getElementById('messageContent').value;
            document.getElementById('charCount').textContent = text.length;
        }

        // 통계 로드
        async function loadStats() {
            try {
                const response = await fetch('/api/sms/stats');
                const data = await response.json();
                if (data.success) {
                    document.getElementById('statToday').textContent = data.stats.today;
                    document.getElementById('statMonth').textContent = data.stats.thisMonth;
                    const pending = data.stats.byStatus.find(s => s.status === 'pending' || s.status === 'scheduled');
                    document.getElementById('statPending').textContent = pending?.count || 0;
                }
            } catch (error) {
                console.error('통계 로드 오류:', error);
            }
        }

        // 발송 기록 로드
        async function loadHistory() {
            try {
                const response = await fetch('/api/sms/history');
                const data = await response.json();
                if (data.success && data.history.length > 0) {
                    const list = document.getElementById('historyList');
                    list.innerHTML = data.history.slice(0, 10).map(h => \`
                        <div class="p-4 border border-gray-200 rounded-lg">
                            <div class="flex justify-between items-start mb-2">
                                <div class="font-medium text-gray-900">\${h.recipient_name || '이름없음'}</div>
                                <span class="px-2 py-1 text-xs rounded \${h.status === 'sent' ? 'bg-green-100 text-green-700' : h.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">\${h.status}</span>
                            </div>
                            <div class="text-sm text-gray-600 mb-2">\${h.recipient_phone}</div>
                            <div class="text-sm text-gray-800 line-clamp-2">\${h.message_content}</div>
                            <div class="text-xs text-gray-500 mt-2">\${new Date(h.created_at).toLocaleString('ko-KR')}</div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                console.error('기록 로드 오류:', error);
            }
        }

        // 즉시 발송
        async function sendSMS() {
            const name = document.getElementById('recipientName').value.trim();
            const phone = document.getElementById('recipientPhone').value.trim();
            const message = document.getElementById('messageContent').value.trim();
            const templateId = document.getElementById('templateSelect').value;

            if (!phone) {
                alert('수신자 전화번호를 입력하세요');
                return;
            }
            if (!message) {
                alert('메시지 내용을 입력하세요');
                return;
            }

            try {
                const userDataStr = JSON.stringify(user);
                const userDataBase64 = btoa(unescape(encodeURIComponent(userDataStr)));

                const response = await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Data-Base64': userDataBase64
                    },
                    body: JSON.stringify({
                        recipient_phone: phone,
                        recipient_name: name,
                        message_content: message,
                        template_id: templateId || null
                    })
                });

                const data = await response.json();
                if (data.success) {
                    alert('문자가 발송되었습니다!\\n' + (data.note || ''));
                    document.getElementById('recipientName').value = '';
                    document.getElementById('recipientPhone').value = '';
                    document.getElementById('messageContent').value = '';
                    document.getElementById('templateSelect').value = '';
                    await loadStats();
                    await loadHistory();
                } else {
                    alert('발송 실패: ' + data.error);
                }
            } catch (error) {
                console.error('발송 오류:', error);
                alert('발송 중 오류가 발생했습니다');
            }
        }

        // 예약 발송
        function scheduleSMS() {
            const scheduledTime = prompt('발송 시간을 입력하세요 (YYYY-MM-DD HH:MM 형식)\\n예: 2024-12-20 14:00');
            if (!scheduledTime) return;

            alert('예약 발송 기능은 준비중입니다');
        }

        init();
        </script>
    </body>
    </html>
  `)
})

// 학부모 소통 시스템 페이지
app.get('/tools/parent-message', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학부모 소통 시스템 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                    </a>
                    <div class="flex items-center space-x-6">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/parent-message" class="text-purple-600 font-medium">학부모 소통</a>
                        <a href="/tools/blog-writer" class="text-gray-600 hover:text-purple-600">블로그 작성</a>
                        <a href="/logout" class="text-gray-600 hover:text-purple-600">로그아웃</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="pt-24 pb-12 px-6">
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">📱 학부모 소통 시스템</h1>
                    <p class="text-xl text-gray-600">간단한 메모만 작성하면 AI가 따뜻한 메시지로 변환해드립니다</p>
                </div>

                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- 입력 폼 -->
                    <div class="bg-white rounded-2xl shadow-lg p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">학생 정보 입력</h2>
                        
                        <form id="messageForm" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학생 이름 *</label>
                                <input type="text" id="studentName" required 
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                       placeholder="예: 김민수">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학년 *</label>
                                <select id="grade" required
                                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                    <option value="">학년 선택</option>
                                    <option value="초등 1학년">초등 1학년</option>
                                    <option value="초등 2학년">초등 2학년</option>
                                    <option value="초등 3학년">초등 3학년</option>
                                    <option value="초등 4학년">초등 4학년</option>
                                    <option value="초등 5학년">초등 5학년</option>
                                    <option value="초등 6학년">초등 6학년</option>
                                    <option value="중등 1학년">중등 1학년</option>
                                    <option value="중등 2학년">중등 2학년</option>
                                    <option value="중등 3학년">중등 3학년</option>
                                    <option value="고등 1학년">고등 1학년</option>
                                    <option value="고등 2학년">고등 2학년</option>
                                    <option value="고등 3학년">고등 3학년</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">과목 *</label>
                                <select id="subject" required
                                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                    <option value="">과목 선택</option>
                                    <option value="영어">영어</option>
                                    <option value="수학">수학</option>
                                    <option value="국어">국어</option>
                                    <option value="과학">과학</option>
                                    <option value="사회">사회</option>
                                    <option value="논술">논술</option>
                                    <option value="코딩">코딩</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">간단한 메모 (2줄 정도) *</label>
                                <textarea id="shortMessage" required rows="4"
                                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                                          placeholder="예: 오늘 수업에서 적극적으로 발표했음. 영어 단어 암기력이 좋아지고 있음."></textarea>
                                <p class="text-sm text-gray-500 mt-2">💡 간단하게 작성하시면 AI가 학부모님께 전달할 따뜻한 메시지로 변환합니다</p>
                            </div>

                            <button type="submit" 
                                    class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    id="generateBtn">
                                <span id="btnText">✨ AI 메시지 생성하기</span>
                                <span id="btnLoading" class="hidden items-center justify-center">
                                    <span class="loading mr-2"></span>
                                    생성 중...
                                </span>
                            </button>
                        </form>
                    </div>

                    <!-- 생성된 메시지 -->
                    <div class="bg-white rounded-2xl shadow-lg p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">생성된 메시지</h2>
                        
                        <div id="resultArea" class="hidden">
                            <div class="bg-purple-50 border-l-4 border-purple-600 rounded-lg p-6 mb-6">
                                <div class="flex items-start gap-3 mb-4">
                                    <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                    </div>
                                    <div class="flex-1">
                                        <div class="font-bold text-gray-900 mb-1" id="studentInfo"></div>
                                        <div class="text-sm text-gray-600" id="subjectInfo"></div>
                                    </div>
                                </div>
                                
                                <div id="generatedMessage" class="text-gray-800 leading-relaxed whitespace-pre-wrap"></div>
                            </div>

                            <div class="flex gap-3">
                                <button onclick="copyMessage()" 
                                        class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition">
                                    📋 복사하기
                                </button>
                                <button onclick="resetForm()" 
                                        class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
                                    🔄 새로 작성
                                </button>
                            </div>
                        </div>

                        <div id="emptyState" class="text-center py-16">
                            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                </svg>
                            </div>
                            <p class="text-gray-500">왼쪽 폼을 작성하고<br>메시지를 생성해보세요</p>
                        </div>
                    </div>
                </div>

                <!-- 사용 가이드 -->
                <div class="mt-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">💡 사용 가이드</h3>
                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">1️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">학생 정보 입력</h4>
                            <p class="text-sm text-gray-600">이름, 학년, 과목을 선택하고 간단한 메모를 2줄 정도 작성하세요</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">2️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">AI가 자동 변환</h4>
                            <p class="text-sm text-gray-600">AI가 학부모님께 전달할 따뜻하고 격려하는 메시지로 변환합니다</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">3️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">복사해서 전송</h4>
                            <p class="text-sm text-gray-600">생성된 메시지를 복사해서 카톡이나 문자로 학부모님께 전송하세요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let generatedMessageText = '';

            document.getElementById('messageForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const studentName = document.getElementById('studentName').value;
                const grade = document.getElementById('grade').value;
                const subject = document.getElementById('subject').value;
                const shortMessage = document.getElementById('shortMessage').value;

                // 버튼 로딩 상태
                const btn = document.getElementById('generateBtn');
                const btnText = document.getElementById('btnText');
                const btnLoading = document.getElementById('btnLoading');
                
                btn.disabled = true;
                btnText.classList.add('hidden');
                btnLoading.classList.remove('hidden');
                btnLoading.classList.add('flex');

                try {
                    const response = await fetch('/api/generate-parent-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            studentName,
                            grade,
                            subject,
                            shortMessage
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        generatedMessageText = data.message;
                        
                        // 결과 표시
                        document.getElementById('studentInfo').textContent = studentName + ' 학생';
                        document.getElementById('subjectInfo').textContent = grade + ' · ' + subject;
                        document.getElementById('generatedMessage').textContent = data.message;
                        
                        document.getElementById('emptyState').classList.add('hidden');
                        document.getElementById('resultArea').classList.remove('hidden');
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('메시지 생성 중 오류가 발생했습니다.');
                } finally {
                    btn.disabled = false;
                    btnText.classList.remove('hidden');
                    btnLoading.classList.add('hidden');
                }
            });

            function copyMessage() {
                navigator.clipboard.writeText(generatedMessageText).then(() => {
                    alert('✅ 메시지가 복사되었습니다!\\n\\n카톡이나 문자로 학부모님께 전송하세요.');
                });
            }

            function resetForm() {
                document.getElementById('messageForm').reset();
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('resultArea').classList.add('hidden');
                generatedMessageText = '';
            }
        </script>
    </body>
    </html>
  `)
})

// 블로그 작성 도구 페이지
app.get('/tools/blog-writer', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>블로그 작성 도구 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                    </a>
                    <div class="flex items-center space-x-6">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/parent-message" class="text-gray-600 hover:text-purple-600">학부모 소통</a>
                        <a href="/tools/blog-writer" class="text-purple-600 font-medium">블로그 작성</a>
                        <a href="/logout" class="text-gray-600 hover:text-purple-600">로그아웃</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="pt-24 pb-12 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">✍️ AI 블로그 작성 도구</h1>
                    <p class="text-xl text-gray-600">주제만 입력하면 SEO 최적화된 블로그 글을 자동으로 생성합니다</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-8">
                    <!-- 입력 폼 -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
                            <h2 class="text-2xl font-bold text-gray-900 mb-6">글 정보 입력</h2>
                            
                            <form id="blogForm" class="space-y-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">주제 *</label>
                                    <input type="text" id="topic" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                           placeholder="예: 초등 영어 학습법">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">키워드 (선택)</label>
                                    <input type="text" id="keywords"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                           placeholder="예: 영어학원, 초등영어">
                                    <p class="text-xs text-gray-500 mt-1">쉼표로 구분</p>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">톤 앤 매너</label>
                                    <select id="tone"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                        <option value="친근하고 전문적인">친근하고 전문적인</option>
                                        <option value="따뜻하고 공감하는">따뜻하고 공감하는</option>
                                        <option value="전문적이고 신뢰감 있는">전문적이고 신뢰감 있는</option>
                                        <option value="유머러스하고 재미있는">유머러스하고 재미있는</option>
                                    </select>
                                </div>

                                <button type="submit" 
                                        class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        id="generateBtn">
                                    <span id="btnText">✨ 블로그 글 생성하기</span>
                                    <span id="btnLoading" class="hidden items-center justify-center">
                                        <span class="loading mr-2"></span>
                                        생성 중... (30초 소요)
                                    </span>
                                </button>

                                <div class="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                                    💡 AI가 제목, 서론, 본론, 결론을 포함한 완성된 블로그 글을 작성합니다
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- 생성된 블로그 글 -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-2xl shadow-lg p-8 min-h-[600px]">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-bold text-gray-900">생성된 블로그 글</h2>
                                <div id="wordCount" class="hidden text-sm text-gray-500"></div>
                            </div>
                            
                            <div id="resultArea" class="hidden">
                                <div id="generatedBlog" class="prose max-w-none">
                                    <!-- 생성된 블로그 내용 -->
                                </div>

                                <div class="mt-8 flex gap-3">
                                    <button onclick="copyBlog()" 
                                            class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition">
                                        📋 전체 복사하기
                                    </button>
                                    <button onclick="resetForm()" 
                                            class="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
                                        🔄 새로 작성
                                    </button>
                                </div>
                            </div>

                            <div id="emptyState" class="text-center py-24">
                                <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </div>
                                <p class="text-gray-500 text-lg">주제를 입력하고<br>블로그 글을 생성해보세요</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 블로그 작성 팁 -->
                <div class="mt-12 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">📝 블로그 SEO 팁</h3>
                    <div class="grid md:grid-cols-4 gap-6">
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">🎯</div>
                            <h4 class="font-bold text-gray-900 mb-2">키워드 선택</h4>
                            <p class="text-sm text-gray-600">검색량이 많은 키워드를 자연스럽게 3-5회 반복</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">📏</div>
                            <h4 class="font-bold text-gray-900 mb-2">적절한 길이</h4>
                            <p class="text-sm text-gray-600">1500-2000자가 SEO에 가장 효과적</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">🖼️</div>
                            <h4 class="font-bold text-gray-900 mb-2">이미지 추가</h4>
                            <p class="text-sm text-gray-600">2-3장의 관련 이미지로 가독성 향상</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">⏰</div>
                            <h4 class="font-bold text-gray-900 mb-2">꾸준한 포스팅</h4>
                            <p class="text-sm text-gray-600">주 2-3회 규칙적인 업로드가 중요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let generatedBlogText = '';

            document.getElementById('blogForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const topic = document.getElementById('topic').value;
                const keywords = document.getElementById('keywords').value;
                const tone = document.getElementById('tone').value;

                // 버튼 로딩 상태
                const btn = document.getElementById('generateBtn');
                const btnText = document.getElementById('btnText');
                const btnLoading = document.getElementById('btnLoading');
                
                btn.disabled = true;
                btnText.classList.add('hidden');
                btnLoading.classList.remove('hidden');
                btnLoading.classList.add('flex');

                try {
                    const response = await fetch('/api/generate-blog-post', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            topic,
                            keywords,
                            tone
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        generatedBlogText = data.content;
                        
                        // 결과 표시 (줄바꿈을 <br>로 변환)
                        const formattedContent = data.content
                            .replace(/\\n\\n/g, '</p><p class="mb-4">')
                            .replace(/\\n/g, '<br>');
                        
                        document.getElementById('generatedBlog').innerHTML = 
                            '<div class="text-gray-800 leading-relaxed"><p class="mb-4">' + 
                            formattedContent + 
                            '</p></div>';
                        
                        document.getElementById('wordCount').textContent = 
                            '총 ' + data.metadata.wordCount + '자';
                        document.getElementById('wordCount').classList.remove('hidden');
                        
                        document.getElementById('emptyState').classList.add('hidden');
                        document.getElementById('resultArea').classList.remove('hidden');

                        // 상단으로 스크롤
                        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('블로그 글 생성 중 오류가 발생했습니다.');
                } finally {
                    btn.disabled = false;
                    btnText.classList.remove('hidden');
                    btnLoading.classList.add('hidden');
                }
            });

            function copyBlog() {
                navigator.clipboard.writeText(generatedBlogText).then(() => {
                    alert('✅ 블로그 글이 복사되었습니다!\\n\\n네이버 블로그에 붙여넣기 하세요.');
                });
            }

            function resetForm() {
                document.getElementById('blogForm').reset();
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('resultArea').classList.add('hidden');
                document.getElementById('wordCount').classList.add('hidden');
                generatedBlogText = '';
            }
        </script>
    </body>
    </html>
  `)
})

// 랜딩페이지 생성 도구
app.get('/tools/landing-builder', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>랜딩페이지 생성기 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
          .gradient-purple { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <span class="text-xl font-bold text-gray-900">랜딩페이지 생성기</span>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/landing-manager" class="text-gray-600 hover:text-purple-600">내 랜딩페이지</a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-4xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-gray-900 mb-3">🎨 AI 랜딩페이지 생성기</h1>
                    <p class="text-lg text-gray-600">간단한 정보만 입력하면 완성된 랜딩페이지를 만들어드립니다</p>
                </div>

                <!-- 템플릿 선택 -->
                <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">1️⃣ 템플릿 선택</h2>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button onclick="selectTemplate('academy-intro')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🏫</div>
                            <div class="font-bold text-lg mb-2">학원 소개 페이지</div>
                            <p class="text-sm text-gray-600">학원의 강점과 특징을 효과적으로 홍보</p>
                        </button>
                        <button onclick="selectTemplate('program-promo')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📚</div>
                            <div class="font-bold text-lg mb-2">프로그램 홍보</div>
                            <p class="text-sm text-gray-600">특정 프로그램 등록을 유도하는 페이지</p>
                        </button>
                        <button onclick="selectTemplate('event-promo')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🎉</div>
                            <div class="font-bold text-lg mb-2">이벤트 프로모션</div>
                            <p class="text-sm text-gray-600">긴급감 있는 한정 이벤트 페이지</p>
                        </button>
                        <button onclick="selectTemplate('student-report')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📊</div>
                            <div class="font-bold text-lg mb-2">학생 성과 리포트</div>
                            <p class="text-sm text-gray-600">월간 학습 리포트 공유 페이지</p>
                        </button>
                        <button onclick="selectTemplate('admission-info')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🎓</div>
                            <div class="font-bold text-lg mb-2">입학 설명회</div>
                            <p class="text-sm text-gray-600">설명회 안내 및 참석 유도 페이지</p>
                        </button>
                        <button onclick="selectTemplate('academy-stats')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📈</div>
                            <div class="font-bold text-lg mb-2">학원 성과 통계</div>
                            <p class="text-sm text-gray-600">실적과 성과를 수치로 보여주는 페이지</p>
                        </button>
                        <button onclick="selectTemplate('teacher-intro')" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">👨‍🏫</div>
                            <div class="font-bold text-lg mb-2">선생님 소개</div>
                            <p class="text-sm text-gray-600">강사진의 경력과 전문성을 소개</p>
                        </button>
                    </div>
                </div>

                <!-- 입력 폼 영역 -->
                <div id="formArea" class="hidden">
                    <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">2️⃣ 정보 입력</h2>
                        <form id="landingForm" class="space-y-6"></form>
                    </div>

                    <button onclick="generateLanding()" class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-bold hover:shadow-xl transition">
                        🚀 랜딩페이지 생성하기
                    </button>
                </div>

                <!-- 결과 영역 -->
                <div id="resultArea" class="hidden">
                    <div class="bg-white rounded-xl p-8 border-2 border-green-500">
                        <h2 class="text-2xl font-bold text-green-600 mb-4">✅ 랜딩페이지 생성 완료!</h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">공유 링크</label>
                                <div class="flex gap-2">
                                    <input type="text" id="shareUrl" readonly class="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                                    <button onclick="copyUrl()" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                                        📋 복사
                                    </button>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <a id="previewBtn" href="#" target="_blank" class="flex-1 text-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                                    👁️ 미리보기
                                </a>
                                <a href="/tools/landing-manager" class="flex-1 text-center py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700">
                                    📁 관리 페이지
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
        let selectedTemplate = '';
        let user = null;

        // 로그인 체크 (선택적)
        const userData = localStorage.getItem('user');
        if (userData) {
            user = JSON.parse(userData);
        } else {
            // 로그인 없이도 테스트 가능하도록 기본 사용자 설정
            user = { id: 1, name: '게스트' };
            console.warn('로그인하지 않았습니다. 게스트 모드로 사용합니다.');
        }

        function logout() {
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        function selectTemplate(type) {
            selectedTemplate = type;
            document.querySelectorAll('.template-btn').forEach(btn => {
                btn.classList.remove('border-purple-600', 'bg-purple-50');
            });
            event.target.closest('.template-btn').classList.add('border-purple-600', 'bg-purple-50');
            
            showForm(type);
        }

        function showForm(type) {
            const forms = {
                'academy-intro': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명 *</label>
                            <input type="text" name="academyName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">위치 *</label>
                            <input type="text" name="location" placeholder="예: 인천 서구 청라동" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">한 줄 소개 *</label>
                            <input type="text" name="features" placeholder="예: 1:1 맞춤 교육으로 성적 향상을 책임집니다" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">특별한 강점 (1개당 한 줄, 최대 4개) *</label>
                            <textarea name="specialties" rows="4" placeholder="10년 경력의 전문 강사진&#10;소규모 그룹 수업으로 집중 케어&#10;입시 전문 컨설팅 무료 제공&#10;내신 평균 2등급 향상 실적" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처 *</label>
                            <input type="text" name="contact" placeholder="예: 010-1234-5678" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`,
                'program-promo': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">프로그램명 *</label>
                            <input type="text" name="programName" placeholder="예: 중등 영어 특강반" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">대상 *</label>
                            <input type="text" name="target" placeholder="예: 중1~중3" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">특징 (1개당 한 줄) *</label>
                            <textarea name="features" rows="3" placeholder="내신 대비 완벽 준비&#10;문법부터 독해까지 체계적 학습&#10;주 3회 소그룹 수업" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">가격 *</label>
                                <input type="text" name="price" placeholder="예: 350,000" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">기간 *</label>
                                <input type="text" name="duration" placeholder="예: 3개월 과정" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">신청 링크 또는 전화번호</label>
                            <input type="text" name="cta" placeholder="예: 010-1234-5678 또는 URL" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`,
                'event-promo': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이벤트명 *</label>
                            <input type="text" name="eventName" placeholder="예: 겨울방학 특강 조기등록 이벤트" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">기간 *</label>
                            <input type="text" name="period" placeholder="예: 12월 20일 ~ 12월 31일" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">긴급감 문구 *</label>
                            <input type="text" name="urgency" placeholder="예: 선착순 20명 한정" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">혜택 (1개당 한 줄) *</label>
                            <textarea name="benefits" rows="3" placeholder="등록비 50% 할인&#10;교재비 전액 무료&#10;1:1 레벨 테스트 무료 제공" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">신청 링크 또는 전화번호</label>
                            <input type="text" name="cta" placeholder="예: 010-1234-5678" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`,
                'student-report': \`
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학생 이름 *</label>
                                <input type="text" name="studentName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">월 *</label>
                                <input type="text" name="month" placeholder="예: 2024년 12월" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이달의 성과 (1개당 한 줄) *</label>
                            <textarea name="achievements" rows="3" placeholder="중간고사 영어 90점 달성&#10;단어 암기 500개 완료&#10;모의고사 3등급에서 2등급 향상" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">개선이 필요한 부분 (1개당 한 줄) *</label>
                            <textarea name="improvements" rows="2" placeholder="독해 속도 향상 필요&#10;문법 심화 학습 권장" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">다음 달 목표 (1개당 한 줄) *</label>
                            <textarea name="nextGoals" rows="2" placeholder="기말고사 95점 목표&#10;듣기 평가 만점 도전" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">담당 선생님</label>
                            <input type="text" name="teacherName" placeholder="예: 김영희 선생님" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`,
                'admission-info': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">설명회 제목 *</label>
                            <input type="text" name="eventTitle" placeholder="예: 2025학년도 신입생 모집 설명회" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">날짜 *</label>
                                <input type="text" name="eventDate" placeholder="예: 2024년 12월 28일" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">시간 *</label>
                                <input type="text" name="eventTime" placeholder="예: 오후 2시" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">장소 *</label>
                            <input type="text" name="location" placeholder="예: 꾸메땅학원 2층 세미나실" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">대상 학년</label>
                            <input type="text" name="targetGrade" placeholder="예: 예비 초1~초6" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">설명회 안내 (1개당 한 줄) *</label>
                            <textarea name="agenda" rows="4" placeholder="학원 교육 철학 소개&#10;강사진 소개 및 커리큘럼 안내&#10;입학 절차 및 등록 방법&#10;질의응답 시간" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">참석 혜택 (1개당 한 줄) *</label>
                            <textarea name="benefits" rows="3" placeholder="등록비 50% 할인 쿠폰&#10;교재비 전액 무료&#10;레벨 테스트 무료" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처 *</label>
                            <input type="text" name="contact" placeholder="예: 032-123-4567" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`,
                'academy-stats': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명 *</label>
                            <input type="text" name="academyName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">기간 *</label>
                            <input type="text" name="period" placeholder="예: 2024년 2학기" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">총 재학생 수</label>
                                <input type="text" name="totalStudents" placeholder="예: 150" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">평균 성적 향상</label>
                                <input type="text" name="gradeImprovement" placeholder="예: 2등급" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">주요 성과 (1개당 한 줄) *</label>
                            <textarea name="achievements" rows="4" placeholder="전국 모의고사 1등급 달성 10명&#10;내신 평균 2등급 이상 향상&#10;명문대 합격률 85%&#10;학부모 만족도 95%" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학부모 후기 (1개당 한 줄) *</label>
                            <textarea name="testimonials" rows="3" placeholder="아이 성적이 2등급이나 올랐어요!&#10;선생님들이 정말 친절하고 열정적입니다&#10;체계적인 관리 덕분에 안심하고 맡깁니다" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                    </div>
                \`,
                'teacher-intro': \`
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">선생님 이름 *</label>
                            <input type="text" name="teacherName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">전문 과목 *</label>
                                <input type="text" name="subject" placeholder="예: 영어" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">경력 (년) *</label>
                                <input type="text" name="experience" placeholder="예: 10" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학력 *</label>
                            <input type="text" name="education" placeholder="예: 서울대학교 영어교육과 졸업" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">전문 분야 *</label>
                            <input type="text" name="specialty" placeholder="예: 수능 영어, 내신 대비, 영문법 특화" required class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">주요 실적 (1개당 한 줄) *</label>
                            <textarea name="achievements" rows="3" placeholder="수능 1등급 학생 50명 이상 배출&#10;학생 평균 2등급 향상 달성&#10;학부모 만족도 98%" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">수업 방식 *</label>
                            <textarea name="teachingStyle" rows="3" placeholder="개인별 맞춤 진도, 체계적인 오답 관리, 실전 문제 풀이 중심" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처</label>
                            <input type="text" name="contact" placeholder="예: 032-123-4567" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                        </div>
                    </div>
                \`
            };

            document.getElementById('landingForm').innerHTML = forms[type];
            document.getElementById('formArea').classList.remove('hidden');
            document.getElementById('formArea').scrollIntoView({ behavior: 'smooth' });
        }

        async function generateLanding() {
            if (!selectedTemplate) {
                alert('템플릿을 선택해주세요.');
                return;
            }

            const formData = new FormData(document.getElementById('landingForm'));
            const data = Object.fromEntries(formData);

            // 배열로 변환이 필요한 필드들
            if (data.specialties) data.specialties = data.specialties.split('\\n').filter(s => s.trim());
            if (data.features) data.features = data.features.split('\\n').filter(s => s.trim());
            if (data.benefits) data.benefits = data.benefits.split('\\n').filter(s => s.trim());
            if (data.achievements) data.achievements = data.achievements.split('\\n').filter(s => s.trim());
            if (data.improvements) data.improvements = data.improvements.split('\\n').filter(s => s.trim());
            if (data.nextGoals) data.nextGoals = data.nextGoals.split('\\n').filter(s => s.trim());

            // 제목 생성
            let title = '';
            if (selectedTemplate === 'academy-intro') title = data.academyName + ' 소개';
            else if (selectedTemplate === 'program-promo') title = data.programName;
            else if (selectedTemplate === 'event-promo') title = data.eventName;
            else if (selectedTemplate === 'student-report') title = data.studentName + ' ' + data.month + ' 리포트';
            else if (selectedTemplate === 'admission-info') title = data.eventTitle;
            else if (selectedTemplate === 'academy-stats') title = data.academyName + ' ' + data.period + ' 성과';
            else if (selectedTemplate === 'teacher-intro') title = data.teacherName + ' 선생님';

            // 배열 필드 처리 - 새로운 템플릿 포함
            if (data.agenda) data.agenda = data.agenda.split('\\n').filter(s => s.trim());
            if (data.testimonials) data.testimonials = data.testimonials.split('\\n').filter(s => s.trim());

            try {
                // 한글 포함된 사용자 데이터를 Base64로 인코딩
                const userDataStr = JSON.stringify(user || {id: 1});
                const userDataBase64 = btoa(unescape(encodeURIComponent(userDataStr)));
                
                const response = await fetch('/api/landing/create', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Data-Base64': userDataBase64
                    },
                    body: JSON.stringify({
                        title,
                        template_type: selectedTemplate,
                        input_data: data
                    })
                });

                const result = await response.json();
                if (result.success) {
                    const fullUrl = window.location.origin + result.url;
                    document.getElementById('shareUrl').value = fullUrl;
                    document.getElementById('previewBtn').href = result.url;
                    document.getElementById('resultArea').classList.remove('hidden');
                    document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
                } else {
                    alert('오류: ' + result.error);
                }
            } catch (error) {
                console.error('랜딩페이지 생성 에러:', error);
                alert('랜딩페이지 생성 중 오류가 발생했습니다. 콘솔을 확인하세요: ' + error.message);
            }
        }

        function copyUrl() {
            const input = document.getElementById('shareUrl');
            input.select();
            document.execCommand('copy');
            alert('링크가 복사되었습니다!');
        }
        </script>
    </body>
    </html>
  `)
})

// 랜딩페이지 관리 페이지
app.get('/tools/landing-manager', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 랜딩페이지 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <span class="text-xl font-bold text-gray-900">내 랜딩페이지</span>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/landing-builder" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ 새로 만들기</a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-6xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">📁 내 랜딩페이지</h1>
                    <p class="text-gray-600">생성한 랜딩페이지를 관리하고 공유하세요</p>
                </div>

                <div id="pagesList" class="space-y-4">
                    <div class="text-center py-12 text-gray-500">로딩중...</div>
                </div>
            </div>
        </div>

        <script>
        let user = null;

        const userData = localStorage.getItem('user');
        if (!userData) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
        } else {
            user = JSON.parse(userData);
            loadPages();
        }

        function logout() {
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        async function loadPages() {
            try {
                const response = await fetch('/api/landing/my-pages', {
                    headers: { 'X-User-Data': JSON.stringify(user) }
                });
                const result = await response.json();
                
                if (result.success && result.pages.length > 0) {
                    const html = result.pages.map(p => {
                        const typeNames = {
                            'academy-intro': '🏫 학원 소개',
                            'program-promo': '📚 프로그램 홍보',
                            'event-promo': '🎉 이벤트',
                            'student-report': '📊 학생 리포트'
                        };
                        const url = window.location.origin + '/landing/' + p.slug;
                        return \`
                            <div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <span class="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                                \${typeNames[p.template_type]}
                                            </span>
                                            <span class="text-sm text-gray-500">조회수: \${p.view_count}</span>
                                        </div>
                                        <h3 class="text-xl font-bold text-gray-900 mb-3">\${p.title}</h3>
                                        <div class="flex items-center gap-2 mb-3">
                                            <input type="text" value="\${url}" readonly 
                                                   class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                                            <button onclick="copyUrl('\${url}')" 
                                                    class="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
                                                복사
                                            </button>
                                        </div>
                                        <p class="text-sm text-gray-500">생성일: \${new Date(p.created_at).toLocaleString('ko-KR')}</p>
                                    </div>
                                    <div class="flex gap-2 ml-4">
                                        <a href="/landing/\${p.slug}" target="_blank" 
                                           class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                                            미리보기
                                        </a>
                                        <button onclick="deletePage(\${p.id})" 
                                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    document.getElementById('pagesList').innerHTML = html;
                } else {
                    document.getElementById('pagesList').innerHTML = \`
                        <div class="text-center py-12">
                            <p class="text-gray-500 mb-4">아직 생성한 랜딩페이지가 없습니다.</p>
                            <a href="/tools/landing-builder" class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                첫 랜딩페이지 만들기
                            </a>
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('pagesList').innerHTML = '<div class="text-center py-12 text-red-500">로딩 실패</div>';
            }
        }

        function copyUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                alert('링크가 복사되었습니다!');
            });
        }

        async function deletePage(id) {
            if (!confirm('정말 삭제하시겠습니까?')) return;
            
            try {
                const response = await fetch('/api/landing/' + id, {
                    method: 'DELETE',
                    headers: { 'X-User-Data': JSON.stringify(user) }
                });
                const result = await response.json();
                if (result.success) {
                    alert('삭제되었습니다.');
                    loadPages();
                } else {
                    alert('삭제 실패: ' + result.error);
                }
            } catch (error) {
                alert('오류가 발생했습니다.');
            }
        }
        </script>
    </body>
    </html>
  `)
})

// 회사 소개 페이지
app.get('/about', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회사 소개 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium">성공 사례</a>
                        <a href="/about" class="text-purple-600 font-medium">회사 소개</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="pt-32 pb-20 px-6 bg-gradient-to-br from-purple-50 to-white">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                    우리는<br>
                    <span class="text-purple-600">슈퍼플레이스다</span>
                </h1>
                <p class="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    현업 학원장이 직접 운영하며<br>
                    전국 500개 학원의 성공을 함께한<br>
                    <span class="font-bold text-gray-900">학원 마케팅 전문 교육 기업</span>입니다
                </p>
            </div>
        </section>

        <!-- Story Section -->
        <section class="py-20 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">우리의 시작</h2>
                        <div class="space-y-4 text-lg text-gray-600 leading-relaxed">
                            <p>
                                인천 서구에서 <strong class="text-gray-900">꾸메땅학원</strong>을 운영하던 우리 부부는 
                                처음에는 학생 모집에 큰 어려움을 겪었습니다.
                            </p>
                            <p>
                                하지만 네이버 플레이스 최적화, 블로그 마케팅, 퍼널 시스템을 
                                직접 공부하고 적용하면서 <strong class="text-purple-600">놀라운 변화</strong>를 경험했습니다.
                            </p>
                            <p>
                                3개월 만에 신규 문의가 2배 증가했고,<br>
                                1년 만에 학원 규모가 3배로 성장했습니다.
                            </p>
                            <p class="text-gray-900 font-bold">
                                "이 노하우를 다른 학원장님들과 나누고 싶다"<br>
                                그렇게 '우리는 슈퍼플레이스다'가 시작되었습니다.
                            </p>
                        </div>
                    </div>
                    <div class="bg-purple-50 rounded-3xl p-12">
                        <div class="space-y-8">
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2015년</h3>
                                    <p class="text-gray-600">꾸메땅학원 개원, 학생 모집 어려움</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2020년</h3>
                                    <p class="text-gray-600">플레이스 마케팅 독학, 1위 달성</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2021년</h3>
                                    <p class="text-gray-600">오픈채팅방 시작, 노하우 공유</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2022년~현재</h3>
                                    <p class="text-gray-600">전국 500개 학원 교육 진행</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Values Section -->
        <section class="py-20 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">우리의 가치</h2>
                    <p class="text-xl text-gray-600">슈퍼플레이스를 만드는 3가지 원칙</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">실전 경험</h3>
                        <p class="text-gray-600 leading-relaxed">
                            이론이 아닌 우리가 직접 학원을 운영하며 검증한 
                            실전 마케팅 노하우만 전달합니다
                        </p>
                    </div>

                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">커뮤니티</h3>
                        <p class="text-gray-600 leading-relaxed">
                            오픈채팅방과 오프라인 모임을 통해 
                            전국 학원장님들과 함께 성장합니다
                        </p>
                    </div>

                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">지속 성장</h3>
                        <p class="text-gray-600 leading-relaxed">
                            일회성 교육이 아닌 지속적인 콘텐츠 업데이트와 
                            실시간 Q&A로 계속 함께합니다
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Achievements Section -->
        <section class="py-20 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">우리의 성과</h2>
                    <p class="text-xl text-gray-600">숫자로 증명하는 실전 노하우</p>
                </div>

                <div class="grid md:grid-cols-4 gap-8">
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-3">500+</div>
                        <div class="text-lg text-gray-700 font-medium">교육 수료 학원</div>
                        <div class="text-sm text-gray-500 mt-2">전국 각지의 학원</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-orange-500 mb-3">95%</div>
                        <div class="text-lg text-gray-700 font-medium">만족도</div>
                        <div class="text-sm text-gray-500 mt-2">실제 효과 체감</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-3">24/7</div>
                        <div class="text-lg text-gray-700 font-medium">커뮤니티 운영</div>
                        <div class="text-sm text-gray-500 mt-2">실시간 질의응답</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-orange-500 mb-3">4년+</div>
                        <div class="text-lg text-gray-700 font-medium">운영 경험</div>
                        <div class="text-sm text-gray-500 mt-2">축적된 노하우</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Team Section -->
        <section class="py-20 px-6 bg-gradient-to-br from-purple-50 to-blue-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">대표 소개</h2>
                    <p class="text-xl text-gray-600">현업 학원장이 직접 가르칩니다</p>
                </div>

                <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    <div class="bg-white rounded-3xl p-10">
                        <div class="w-64 h-64 mx-auto mb-6 rounded-3xl overflow-hidden">
                            <img src="/static/images/ceo-ko-heejun.jpg" 
                                 alt="고희준 대표이사" 
                                 class="w-full h-full object-cover">
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">고희준 대표이사</h3>
                        <p class="text-center text-purple-600 font-medium mb-6">CEO · 인문학 박사</p>
                        <div class="space-y-3 text-gray-600">
                            <p>✓ 2005~ 공부방 시작</p>
                            <p>✓ 2012~ 인문학 박사 취득</p>
                            <p>✓ 2015~ 꾸메땅학원 창립</p>
                            <p>✓ 2022~ (주)맘스온 대표이사</p>
                            <p>✓ 2022~ 킹클래스 학원장소통 오픈</p>
                            <p>✓ 2024~ 한국학원대학교 협업</p>
                            <p>✓ 2025~ (주)우리는 슈퍼플레이스다 대표이사</p>
                        </div>
                    </div>

                    <div class="bg-white rounded-3xl p-10">
                        <div class="w-64 h-64 mx-auto mb-6 rounded-3xl overflow-hidden">
                            <img src="/static/images/team-ko-sunwoo.jpg" 
                                 alt="고선우 마케팅 1팀장" 
                                 class="w-full h-full object-cover">
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">고선우 마케팅 1팀장</h3>
                        <p class="text-center text-orange-600 font-medium mb-6">Marketing Team Leader</p>
                        <div class="space-y-3 text-gray-600">
                            <p>✓ 자동화 퍼널 전문가</p>
                            <p>✓ 인스타그램 바이럴 영상 제작</p>
                            <p>✓ 네이버 플레이스 상위노출</p>
                            <p>✓ 랜딩페이지 제작 및 개발</p>
                            <p>✓ 블로그 상위노출 글 작성</p>
                            <p>✓ AI 컨설턴트 전문가</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-8">
                    함께 성장하는 학원을<br>
                    만들어가실 준비가 되셨나요?
                </h2>
                <p class="text-xl text-white/90 mb-12">
                    우리의 경험과 노하우가 여러분의 학원 성공에 도움이 되길 바랍니다
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        무료 상담 신청하기
                    </a>
                    <a href="/programs" class="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-white hover:text-purple-600 transition-all">
                        교육 프로그램 보기
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-50 text-gray-600 py-20 px-6 border-t border-gray-100">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div class="flex items-center space-x-2 mb-4">
                            <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                        </div>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            학원 마케팅의 새로운 기준
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">서비스</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/programs" class="hover:text-purple-600 transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-purple-600 transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-purple-600 transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">회사</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/about" class="hover:text-purple-600 transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">연락처</h4>
                        <ul class="space-y-3 text-sm">
                            <li>인천광역시 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용 가능</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
                    <p>&copy; 2024 우리는 슈퍼플레이스다. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </body>
    </html>
  `)
})

// 랜딩페이지 보기 라우트
app.get('/landing/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const query = 'SELECT * FROM landing_pages WHERE slug = ? AND status = ?'
    const page = await c.env.DB.prepare(query).bind(slug, 'active').first()
    
    if (!page) {
      return c.html('<h1>페이지를 찾을 수 없습니다.</h1>', 404)
    }
    
    // 조회수 증가
    await c.env.DB.prepare('UPDATE landing_pages SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run()
    
    // HTML 반환
    return c.html(page.html_content as string)
  } catch (error) {
    return c.html('<h1>오류가 발생했습니다.</h1>', 500)
  }
})

// 관리자 페이지 리다이렉트 (로컬 개발용)
// 프로덕션에서는 Cloudflare Pages가 자동으로 dist/admin/*.html을 서빙합니다
app.get('/admin/dashboard', (c) => {
  return c.redirect('/admin/dashboard.html')
})

app.get('/admin/users', (c) => {
  return c.redirect('/admin/users.html')
})

// ==================== SMS 발송 헬퍼 함수 ====================

// Aligo SMS API 발송 함수
// Aligo SMS API 발송 함수
async function sendSMSAligo(phone: string, message: string, apiKey: string, userId: string, sender: string, realMode: string): Promise<any> {
  const formData = new FormData()
  formData.append('key', apiKey)
  formData.append('user_id', userId)
  formData.append('sender', sender)
  formData.append('receiver', phone)
  formData.append('msg', message)
  formData.append('testmode_yn', realMode === 'Y' ? 'N' : 'Y') // realMode=Y면 실제발송
  
  try {
    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      body: formData
    })
    return await response.json()
  } catch (error) {
    console.error('Aligo SMS error:', error)
    return { result_code: -1, message: 'SMS 발송 실패' }
  }
}

// Solapi SMS API 발송 함수
async function sendSMSSolapi(phone: string, message: string, apiKey: string, apiSecret: string): Promise<any> {
  try {
    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        message: {
          to: phone,
          from: '01012345678', // 발신번호
          text: message
        }
      })
    })
    return await response.json()
  } catch (error) {
    console.error('Solapi SMS error:', error)
    return { statusCode: 500, message: 'SMS 발송 실패' }
  }
}

// ==================== SMS 관리 API ====================

// SMS 템플릿 목록
app.get('/api/sms/templates', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM sms_templates WHERE is_active = 1 ORDER BY category, name
    `).all()
    
    return c.json({ success: true, templates: results })
  } catch (error) {
    console.error('Get templates error:', error)
    return c.json({ success: false, error: '템플릿 조회 실패' }, 500)
  }
})

// SMS 템플릿 추가
app.post('/api/sms/templates', async (c) => {
  try {
    const { name, category, content, variables } = await c.req.json()
    const user = JSON.parse(c.req.header('X-User-Data-Base64') ? decodeURIComponent(escape(atob(c.req.header('X-User-Data-Base64') || ''))) : '{"id":1}')
    
    const result = await c.env.DB.prepare(`
      INSERT INTO sms_templates (name, category, content, variables, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, category, content, JSON.stringify(variables || []), user.id).run()
    
    return c.json({ success: true, message: '템플릿이 추가되었습니다.', id: result.meta.last_row_id })
  } catch (error) {
    console.error('Add template error:', error)
    return c.json({ success: false, error: '템플릿 추가 실패' }, 500)
  }
})

// SMS 즉시 발송
app.post('/api/sms/send', async (c) => {
  try {
    const { recipient_phone, recipient_name, message_content, template_id } = await c.req.json()
    const user = JSON.parse(c.req.header('X-User-Data-Base64') ? decodeURIComponent(escape(atob(c.req.header('X-User-Data-Base64') || ''))) : '{"id":1}')
    
    // 환경변수에서 API 키 가져오기
    const apiKey = c.env.ALIGO_API_KEY || ''
    const userId = c.env.ALIGO_USER_ID || ''
    const sender = c.env.ALIGO_SENDER || '01012345678'
    const realMode = c.env.SMS_REAL_MODE || 'N'
    
    let smsResult = null
    let status = 'sent'
    let resultCode = null
    let resultMessage = null
    
    // API 키가 있으면 실제 발송 시도
    if (apiKey && userId) {
      smsResult = await sendSMSAligo(recipient_phone, message_content, apiKey, userId, sender, realMode)
      resultCode = smsResult.result_code?.toString() || null
      resultMessage = smsResult.message || null
      
      // 발송 실패 시 status를 failed로
      if (smsResult.result_code !== 1) {
        status = 'failed'
      }
    }
    
    // DB에 기록
    const result = await c.env.DB.prepare(`
      INSERT INTO sms_history (template_id, recipient_name, recipient_phone, message_content, status, sent_at, result_code, result_message, created_by)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `).bind(template_id || null, recipient_name, recipient_phone, message_content, status, resultCode, resultMessage, user.id).run()
    
    return c.json({ 
      success: status !== 'failed', 
      message: status === 'failed' ? 'SMS 발송 실패: ' + resultMessage : 'SMS가 발송되었습니다.',
      id: result.meta.last_row_id,
      note: apiKey ? (realMode === 'Y' ? '실제 발송 완료' : '테스트 모드 (실제 발송 안됨)') : 'API 키를 설정하면 실제 발송됩니다.',
      smsResult: smsResult
    })
  } catch (error) {
    console.error('Send SMS error:', error)
    return c.json({ success: false, error: 'SMS 발송 실패' }, 500)
  }
})

// SMS 예약 발송
app.post('/api/sms/schedule', async (c) => {
  try {
    const { recipient_phone, recipient_name, message_content, template_id, scheduled_at } = await c.req.json()
    const user = JSON.parse(c.req.header('X-User-Data-Base64') ? decodeURIComponent(escape(atob(c.req.header('X-User-Data-Base64') || ''))) : '{"id":1}')
    
    const result = await c.env.DB.prepare(`
      INSERT INTO sms_history (template_id, recipient_name, recipient_phone, message_content, status, scheduled_at, created_by)
      VALUES (?, ?, ?, ?, 'scheduled', ?, ?)
    `).bind(template_id || null, recipient_name, recipient_phone, message_content, scheduled_at, user.id).run()
    
    return c.json({ 
      success: true, 
      message: 'SMS가 예약되었습니다.',
      id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Schedule SMS error:', error)
    return c.json({ success: false, error: 'SMS 예약 실패' }, 500)
  }
})

// SMS 발송 기록 조회
app.get('/api/sms/history', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        sh.*,
        st.name as template_name
      FROM sms_history sh
      LEFT JOIN sms_templates st ON sh.template_id = st.id
      ORDER BY sh.created_at DESC
      LIMIT 100
    `).all()
    
    return c.json({ success: true, history: results })
  } catch (error) {
    console.error('Get SMS history error:', error)
    return c.json({ success: false, error: '발송 기록 조회 실패' }, 500)
  }
})

// SMS 발송 통계
app.get('/api/sms/stats', async (c) => {
  try {
    // 오늘 발송 수
    const today = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM sms_history 
      WHERE DATE(created_at) = DATE('now')
    `).first()
    
    // 이번 달 발송 수
    const thisMonth = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM sms_history 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).first()
    
    // 상태별 통계
    const byStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count FROM sms_history 
      GROUP BY status
    `).all()
    
    return c.json({ 
      success: true, 
      stats: {
        today: today?.count || 0,
        thisMonth: thisMonth?.count || 0,
        byStatus: byStatus.results || []
      }
    })
  } catch (error) {
    console.error('Get SMS stats error:', error)
    return c.json({ success: false, error: '통계 조회 실패' }, 500)
  }
})

// 학생 관리 API
app.get('/api/students', async (c) => {
  try {
    const user = JSON.parse(c.req.header('X-User-Data-Base64') ? decodeURIComponent(escape(atob(c.req.header('X-User-Data-Base64') || ''))) : '{"id":1}')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM students WHERE academy_id = ? AND status = 'active' ORDER BY name
    `).bind(user.id).all()
    
    return c.json({ success: true, students: results })
  } catch (error) {
    console.error('Get students error:', error)
    return c.json({ success: false, error: '학생 목록 조회 실패' }, 500)
  }
})

// 학생 추가
app.post('/api/students', async (c) => {
  try {
    const { name, phone, grade, school, subjects, parent_name, parent_phone, notes } = await c.req.json()
    const user = JSON.parse(c.req.header('X-User-Data-Base64') ? decodeURIComponent(escape(atob(c.req.header('X-User-Data-Base64') || ''))) : '{"id":1}')
    
    // 필수 항목 확인
    if (!name || !grade || !parent_name || !parent_phone) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO students (name, phone, grade, school, subjects, parent_name, parent_phone, academy_id, enrollment_date, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), ?, 'active')
    `).bind(name, phone || null, grade, school || null, subjects || '', parent_name, parent_phone, user.id, notes || null).run()
    
    return c.json({ success: true, message: '학생이 추가되었습니다.', id: result.meta.last_row_id })
  } catch (error) {
    console.error('Add student error:', error)
    return c.json({ success: false, error: '학생 추가 실패' }, 500)
  }
})

// 학생 관리 페이지
app.get('/tools/student-management', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학생 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-indigo-50 to-purple-50 min-h-screen">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">📚 학생 관리</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <div class="grid md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-2xl p-6 border-2 border-indigo-200">
                    <div class="text-sm text-gray-600 mb-2">전체 학생</div>
                    <div id="totalStudents" class="text-3xl font-bold text-indigo-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <div class="text-sm text-gray-600 mb-2">수강 중</div>
                    <div id="activeStudents" class="text-3xl font-bold text-green-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-yellow-200">
                    <div class="text-sm text-gray-600 mb-2">일시정지</div>
                    <div id="pausedStudents" class="text-3xl font-bold text-yellow-600">0명</div>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">학생 추가</h2>
                    <button onclick="toggleAddForm()" id="toggleBtn" class="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                        + 학생 추가
                    </button>
                </div>

                <div id="addStudentForm" class="hidden">
                    <form onsubmit="addStudent(event)" class="space-y-6">
                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학생 이름 *</label>
                                <input type="text" id="studentName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="홍길동">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학생 연락처</label>
                                <input type="tel" id="studentPhone" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="010-1234-5678">
                            </div>
                        </div>

                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학년 *</label>
                                <select id="studentGrade" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                    <option value="">학년 선택</option>
                                    <option value="초1">초등 1학년</option>
                                    <option value="초2">초등 2학년</option>
                                    <option value="초3">초등 3학년</option>
                                    <option value="초4">초등 4학년</option>
                                    <option value="초5">초등 5학년</option>
                                    <option value="초6">초등 6학년</option>
                                    <option value="중1">중학 1학년</option>
                                    <option value="중2">중학 2학년</option>
                                    <option value="중3">중학 3학년</option>
                                    <option value="고1">고등 1학년</option>
                                    <option value="고2">고등 2학년</option>
                                    <option value="고3">고등 3학년</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학교</label>
                                <input type="text" id="studentSchool" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="검단초등학교">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">수강 과목</label>
                            <input type="text" id="studentSubjects" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="영어, 수학">
                        </div>

                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학부모 이름 *</label>
                                <input type="text" id="parentName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="홍부모">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">학부모 연락처 *</label>
                                <input type="tel" id="parentPhone" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="010-9876-5432">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">메모</label>
                            <textarea id="studentNotes" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="특이사항이나 중요한 정보를 입력하세요"></textarea>
                        </div>

                        <div class="flex gap-4">
                            <button type="submit" class="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                                ✅ 학생 추가
                            </button>
                            <button type="button" onclick="toggleAddForm()" class="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">
                                취소
                            </button>
                        </div>
                    </form>

                    <div id="addResult" class="mt-4"></div>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 class="text-2xl font-bold mb-6">학생 목록</h2>
                <div id="studentsList" class="space-y-4">
                    <p class="text-gray-500 text-center py-12">학생을 추가하면 여기에 목록이 표시됩니다.</p>
                </div>
            </div>
        </div>

        <script>
            let currentUser = null;

            // 로그인 체크
            window.addEventListener('DOMContentLoaded', () => {
                const userData = localStorage.getItem('user');
                if (!userData) {
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                    return;
                }
                currentUser = JSON.parse(userData);
                loadStudents();
            });

            // 학생 추가 폼 토글
            function toggleAddForm() {
                const form = document.getElementById('addStudentForm');
                const btn = document.getElementById('toggleBtn');
                if (form.classList.contains('hidden')) {
                    form.classList.remove('hidden');
                    btn.textContent = '− 폼 닫기';
                } else {
                    form.classList.add('hidden');
                    btn.textContent = '+ 학생 추가';
                    // 폼 초기화
                    document.querySelector('form').reset();
                    document.getElementById('addResult').innerHTML = '';
                }
            }

            // 학생 추가
            async function addStudent(event) {
                event.preventDefault();
                const resultDiv = document.getElementById('addResult');

                const data = {
                    name: document.getElementById('studentName').value,
                    phone: document.getElementById('studentPhone').value,
                    grade: document.getElementById('studentGrade').value,
                    school: document.getElementById('studentSchool').value,
                    subjects: document.getElementById('studentSubjects').value,
                    parent_name: document.getElementById('parentName').value,
                    parent_phone: document.getElementById('parentPhone').value,

                    notes: document.getElementById('studentNotes').value
                };

                resultDiv.innerHTML = '<div class="p-4 bg-blue-50 text-blue-600 rounded-xl">학생 정보를 저장하고 있습니다...</div>';

                try {
                    const userDataBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
                    const response = await fetch('/api/students', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Data-Base64': userDataBase64
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        resultDiv.innerHTML = '<div class="p-4 bg-green-50 text-green-600 rounded-xl font-bold">✅ ' + result.message + '</div>';
                        document.querySelector('form').reset();
                        setTimeout(() => {
                            toggleAddForm();
                            loadStudents();
                        }, 1500);
                    } else {
                        resultDiv.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl">' + result.error + '</div>';
                    }
                } catch (error) {
                    console.error('학생 추가 실패:', error);
                    resultDiv.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl">학생 추가 중 오류가 발생했습니다.</div>';
                }
            }

            // 학생 목록 로드
            async function loadStudents() {
                try {
                    const userDataBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
                    const response = await fetch('/api/students', {
                        headers: {
                            'X-User-Data-Base64': userDataBase64
                        }
                    });
                    const data = await response.json();

                    if (data.success && data.students) {
                        const students = data.students;
                        
                        // 통계 업데이트
                        document.getElementById('totalStudents').textContent = students.length + '명';
                        document.getElementById('activeStudents').textContent = students.filter(s => s.status === 'active').length + '명';
                        document.getElementById('pausedStudents').textContent = students.filter(s => s.status === 'paused').length + '명';

                        // 학생 목록 표시
                        const listDiv = document.getElementById('studentsList');
                        if (students.length === 0) {
                            listDiv.innerHTML = '<p class="text-gray-500 text-center py-12">학생을 추가하면 여기에 목록이 표시됩니다.</p>';
                        } else {
                            listDiv.innerHTML = students.map(student => {
                                const statusColors = {
                                    'active': 'bg-green-100 text-green-700',
                                    'paused': 'bg-yellow-100 text-yellow-700',
                                    'graduated': 'bg-blue-100 text-blue-700',
                                    'withdrawn': 'bg-gray-100 text-gray-700'
                                };
                                const statusTexts = {
                                    'active': '수강중',
                                    'paused': '일시정지',
                                    'graduated': '졸업',
                                    'withdrawn': '퇴원'
                                };
                                return '<div class="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-400 transition">' +
                                    '<div class="flex justify-between items-start mb-4">' +
                                        '<div class="flex-1">' +
                                            '<div class="flex items-center gap-3 mb-2">' +
                                                '<h3 class="text-xl font-bold text-gray-900">' + student.name + '</h3>' +
                                                '<span class="px-3 py-1 ' + statusColors[student.status] + ' rounded-full text-xs font-medium">' + statusTexts[student.status] + '</span>' +
                                            '</div>' +
                                            '<div class="text-sm text-gray-600">' + student.grade + (student.school ? ' · ' + student.school : '') + '</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="grid md:grid-cols-2 gap-4 text-sm">' +
                                        '<div>' +
                                            '<div class="text-gray-600 mb-1">👨‍🎓 학생 연락처</div>' +
                                            '<div class="font-medium text-gray-900">' + (student.phone || '-') + '</div>' +
                                        '</div>' +
                                        '<div>' +
                                            '<div class="text-gray-600 mb-1">📚 수강 과목</div>' +
                                            '<div class="font-medium text-gray-900">' + (student.subjects || '-') + '</div>' +
                                        '</div>' +
                                        '<div>' +
                                            '<div class="text-gray-600 mb-1">👪 학부모</div>' +
                                            '<div class="font-medium text-gray-900">' + student.parent_name + ' (' + student.parent_phone + ')</div>' +
                                        '</div>' +
                                        '<div>' +
                                            '<div class="text-gray-600 mb-1">📅 등록일</div>' +
                                            '<div class="font-medium text-gray-900">' + new Date(student.enrollment_date).toLocaleDateString('ko-KR') + '</div>' +
                                        '</div>' +
                                    '</div>' +
                                    (student.notes ? '<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">' +
                                        '<div class="font-medium mb-1">📝 메모</div>' +
                                        student.notes +
                                    '</div>' : '') +
                                '</div>';
                            }).join('');
                        }
                    }
                } catch (error) {
                    console.error('학생 목록 로드 실패:', error);
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 상담 예약 관리 페이지
app.get('/tools/consultation-booking', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>상담 예약 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-pink-50 to-red-50 min-h-screen">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">📅 상담 예약 관리</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <div class="grid md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-2xl p-6 border-2 border-blue-200">
                    <div class="text-sm text-gray-600 mb-2">대기중</div>
                    <div class="text-3xl font-bold text-blue-600">0건</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <div class="text-sm text-gray-600 mb-2">확정</div>
                    <div class="text-3xl font-bold text-green-600">0건</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-purple-200">
                    <div class="text-sm text-gray-600 mb-2">완료</div>
                    <div class="text-3xl font-bold text-purple-600">0건</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-gray-200">
                    <div class="text-sm text-gray-600 mb-2">노쇼</div>
                    <div class="text-3xl font-bold text-gray-600">0건</div>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 class="text-2xl font-bold mb-6">예약 캘린더</h2>
                <p class="text-gray-500 text-center py-12">상담 예약 캘린더 기능은 곧 제공됩니다.</p>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 재등록 관리 페이지
app.get('/tools/reenrollment-tracking', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>재등록 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-yellow-50 to-orange-50 min-h-screen">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">🔄 재등록 관리</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <div class="grid md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-2xl p-6 border-2 border-red-200">
                    <div class="text-sm text-gray-600 mb-2">7일 이내 만료</div>
                    <div class="text-3xl font-bold text-red-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-yellow-200">
                    <div class="text-sm text-gray-600 mb-2">30일 이내 만료</div>
                    <div class="text-3xl font-bold text-yellow-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <div class="text-sm text-gray-600 mb-2">재등록 확정</div>
                    <div class="text-3xl font-bold text-green-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-blue-200">
                    <div class="text-sm text-gray-600 mb-2">재등록률</div>
                    <div class="text-3xl font-bold text-blue-600">0%</div>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 class="text-2xl font-bold mb-6">만료 예정 학생</h2>
                <p class="text-gray-500 text-center py-12">만료 예정 학생 목록이 여기에 표시됩니다.</p>
            </div>
        </div>
    </body>
    </html>
  `)
})

// AI 학습 분석 리포트 페이지
app.get('/tools/ai-learning-report', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 학습 분석 리포트 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">🤖 AI 학습 분석 리포트</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <!-- 안내 카드 -->
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white mb-8">
                <h2 class="text-2xl font-bold mb-4">✨ AI가 자동으로 학습 분석 리포트를 생성합니다</h2>
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <div class="text-3xl mb-2">📊</div>
                        <div class="font-bold mb-1">성적 분석</div>
                        <div class="text-sm text-white/90">과목별 성적 추이와 강약점 파악</div>
                    </div>
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <div class="text-3xl mb-2">📈</div>
                        <div class="font-bold mb-1">학습 패턴</div>
                        <div class="text-sm text-white/90">출석률, 학습 태도 종합 분석</div>
                    </div>
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <div class="text-3xl mb-2">💡</div>
                        <div class="font-bold mb-1">맞춤 추천</div>
                        <div class="text-sm text-white/90">개인별 학습 전략 제시</div>
                    </div>
                </div>
            </div>

            <!-- 리포트 생성 섹션 -->
            <div class="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
                <h2 class="text-2xl font-bold mb-6">📝 리포트 생성</h2>
                
                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학생 선택</label>
                        <select id="studentSelect" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            <option value="">학생을 선택하세요</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">리포트 월</label>
                        <input type="month" id="reportMonth" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>
                </div>

                <button onclick="generateReport()" class="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all">
                    🤖 AI 리포트 자동 생성
                </button>

                <div id="generateResult" class="mt-4"></div>
            </div>

            <!-- 생성된 리포트 목록 -->
            <div class="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 class="text-2xl font-bold mb-6">📚 생성된 리포트</h2>
                <div id="reportsList" class="space-y-4">
                    <p class="text-gray-500 text-center py-12">리포트를 생성하면 여기에 표시됩니다.</p>
                </div>
            </div>

            <!-- 리포트 상세 모달 -->
            <div id="reportModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                        <h3 class="text-2xl font-bold">학습 분석 리포트</h3>
                        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="reportDetail" class="p-6"></div>
                </div>
            </div>
        </div>

        <script>
            let currentUser = null;

            // 로그인 체크
            window.addEventListener('DOMContentLoaded', () => {
                const userData = localStorage.getItem('user');
                if (!userData) {
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                    return;
                }
                currentUser = JSON.parse(userData);
                loadStudents();
                setDefaultMonth();
            });

            // 기본 월 설정 (이번 달)
            function setDefaultMonth() {
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                document.getElementById('reportMonth').value = \`\${year}-\${month}\`;
            }

            // 학생 목록 로드
            async function loadStudents() {
                try {
                    const userDataBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
                    const response = await fetch('/api/students', {
                        headers: {
                            'X-User-Data-Base64': userDataBase64
                        }
                    });
                    const data = await response.json();
                    
                    const select = document.getElementById('studentSelect');
                    select.innerHTML = '<option value="">학생을 선택하세요</option>';
                    
                    if (data.success && data.students) {
                        data.students.forEach(student => {
                            const option = document.createElement('option');
                            option.value = student.id;
                            option.textContent = \`\${student.name} (\${student.grade})\`;
                            select.appendChild(option);
                        });
                    }
                } catch (error) {
                    console.error('학생 목록 로드 실패:', error);
                }
            }

            // AI 리포트 생성
            async function generateReport() {
                const studentId = document.getElementById('studentSelect').value;
                const reportMonth = document.getElementById('reportMonth').value;
                const resultDiv = document.getElementById('generateResult');

                if (!studentId) {
                    resultDiv.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl">학생을 선택해주세요.</div>';
                    return;
                }

                if (!reportMonth) {
                    resultDiv.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl">리포트 월을 선택해주세요.</div>';
                    return;
                }

                resultDiv.innerHTML = '<div class="p-4 bg-blue-50 text-blue-600 rounded-xl">🤖 AI가 리포트를 생성하고 있습니다...</div>';

                try {
                    const response = await fetch('/api/learning-reports/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            student_id: studentId,
                            report_month: reportMonth
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        resultDiv.innerHTML = \`
                            <div class="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                                <div class="text-green-600 font-bold text-lg mb-3">✅ AI 리포트 생성 완료!</div>
                                <div class="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <div class="text-gray-600 mb-1">평균 점수</div>
                                        <div class="text-2xl font-bold text-green-600">\${data.preview.overall_score}점</div>
                                    </div>
                                    <div>
                                        <div class="text-gray-600 mb-1">출석률</div>
                                        <div class="text-2xl font-bold text-blue-600">\${data.preview.attendance_rate}%</div>
                                    </div>
                                    <div>
                                        <div class="text-gray-600 mb-1">학습 태도</div>
                                        <div class="text-2xl font-bold text-purple-600">\${data.preview.study_attitude}</div>
                                    </div>
                                </div>
                                <button onclick="viewReport(\${data.report_id})" class="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
                                    📄 리포트 자세히 보기
                                </button>
                            </div>
                        \`;
                        loadReportsForStudent(studentId);
                    } else {
                        resultDiv.innerHTML = \`<div class="p-4 bg-red-50 text-red-600 rounded-xl">\${data.error}</div>\`;
                    }
                } catch (error) {
                    console.error('리포트 생성 실패:', error);
                    resultDiv.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl">리포트 생성 중 오류가 발생했습니다.</div>';
                }
            }

            // 학생별 리포트 목록 로드
            async function loadReportsForStudent(studentId) {
                try {
                    const response = await fetch(\`/api/learning-reports/\${studentId}\`);
                    const data = await response.json();

                    const listDiv = document.getElementById('reportsList');
                    
                    if (data.success && data.reports && data.reports.length > 0) {
                        listDiv.innerHTML = data.reports.map(report => \`
                            <div class="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-400 transition cursor-pointer" onclick="viewReport(\${report.id})">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <div class="text-lg font-bold text-gray-900">\${report.report_month} 리포트</div>
                                        <div class="text-sm text-gray-600">\${new Date(report.created_at).toLocaleDateString('ko-KR')}</div>
                                    </div>
                                    <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">\${report.study_attitude}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div class="text-gray-600">평균 점수: <span class="font-bold text-gray-900">\${report.overall_score}점</span></div>
                                    <div class="text-gray-600">생성일: <span class="font-bold text-gray-900">\${new Date(report.created_at).toLocaleDateString('ko-KR')}</span></div>
                                </div>
                            </div>
                        \`).join('');
                    }
                } catch (error) {
                    console.error('리포트 목록 로드 실패:', error);
                }
            }

            // 리포트 상세 보기
            async function viewReport(reportId) {
                try {
                    const response = await fetch(\`/api/learning-reports/detail/\${reportId}\`);
                    const data = await response.json();

                    if (data.success && data.report) {
                        const report = data.report;
                        document.getElementById('reportDetail').innerHTML = \`
                            <div class="space-y-6">
                                <div class="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-xl">
                                    <div class="text-sm text-gray-600 mb-2">\${report.report_month}</div>
                                    <div class="text-2xl font-bold text-gray-900 mb-2">\${report.student_name} 학생 학습 분석 리포트</div>
                                    <div class="flex gap-4 text-sm">
                                        <span class="px-3 py-1 bg-purple-500 text-white rounded-full">\${report.study_attitude}</span>
                                        <span class="px-3 py-1 bg-pink-500 text-white rounded-full">평균 \${report.overall_score}점</span>
                                    </div>
                                </div>

                                <div class="border-l-4 border-green-500 pl-4">
                                    <div class="text-sm text-gray-600 mb-1">💪 강점</div>
                                    <div class="text-gray-900">\${report.strengths}</div>
                                </div>

                                <div class="border-l-4 border-yellow-500 pl-4">
                                    <div class="text-sm text-gray-600 mb-1">🎯 개선 필요</div>
                                    <div class="text-gray-900">\${report.weaknesses}</div>
                                </div>

                                <div class="border-l-4 border-blue-500 pl-4">
                                    <div class="text-sm text-gray-600 mb-1">📝 개선사항</div>
                                    <div class="text-gray-900">\${report.improvements}</div>
                                </div>

                                <div class="border-l-4 border-purple-500 pl-4">
                                    <div class="text-sm text-gray-600 mb-1">💡 선생님의 추천</div>
                                    <div class="text-gray-900">\${report.recommendations}</div>
                                </div>

                                <div class="border-l-4 border-pink-500 pl-4">
                                    <div class="text-sm text-gray-600 mb-1">🎯 다음 달 목표</div>
                                    <div class="text-gray-900">\${report.next_month_goals}</div>
                                </div>

                                <div class="bg-gray-50 p-6 rounded-xl">
                                    <div class="text-sm text-gray-600 mb-2">🤖 AI 종합 분석</div>
                                    <div class="text-gray-900 whitespace-pre-line">\${report.ai_analysis}</div>
                                </div>

                                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                                    <div class="text-sm text-gray-600 mb-2">💌 학부모님께 보낼 메시지</div>
                                    <div id="parentMessage\${report.id}" class="text-gray-900 whitespace-pre-line text-sm leading-relaxed">\${report.parent_message}</div>
                                    <button onclick="copyMessageById('parentMessage\${report.id}')" class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                                        📋 메시지 복사하기
                                    </button>
                                </div>
                            </div>
                        \`;
                        document.getElementById('reportModal').classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('리포트 상세 조회 실패:', error);
                    alert('리포트를 불러오는 중 오류가 발생했습니다.');
                }
            }

            // 모달 닫기
            function closeModal() {
                document.getElementById('reportModal').classList.add('hidden');
            }

            // 메시지 복사
            function copyMessageById(elementId) {
                const element = document.getElementById(elementId);
                if (element) {
                    const message = element.textContent;
                    navigator.clipboard.writeText(message).then(() => {
                        alert('메시지가 클립보드에 복사되었습니다!');
                    }).catch(err => {
                        console.error('복사 실패:', err);
                    });
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 통합 분석 대시보드 페이지
app.get('/tools/dashboard-analytics', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>통합 분석 대시보드 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-gradient-to-br from-teal-50 to-blue-50 min-h-screen">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">📊 통합 분석 대시보드</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <div class="grid md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <div class="text-sm text-gray-600 mb-2">이번 달 매출</div>
                    <div class="text-3xl font-bold text-green-600">₩0</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-blue-200">
                    <div class="text-sm text-gray-600 mb-2">신규 학생</div>
                    <div class="text-3xl font-bold text-blue-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-purple-200">
                    <div class="text-sm text-gray-600 mb-2">전체 학생</div>
                    <div class="text-3xl font-bold text-purple-600">0명</div>
                </div>
                <div class="bg-white rounded-2xl p-6 border-2 border-orange-200">
                    <div class="text-sm text-gray-600 mb-2">평균 출석률</div>
                    <div class="text-3xl font-bold text-orange-600">0%</div>
                </div>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white rounded-2xl p-8 border border-gray-200">
                    <h2 class="text-xl font-bold mb-4">월별 매출 추이</h2>
                    <canvas id="revenueChart" height="200"></canvas>
                </div>

                <div class="bg-white rounded-2xl p-8 border border-gray-200">
                    <h2 class="text-xl font-bold mb-4">학생 현황</h2>
                    <canvas id="studentChart" height="200"></canvas>
                </div>
            </div>
        </div>

        <script>
            // 매출 추이 차트
            const revenueCtx = document.getElementById('revenueChart').getContext('2d');
            new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
                    datasets: [{
                        label: '매출 (만원)',
                        data: [0, 0, 0, 0, 0, 0],
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });

            // 학생 현황 차트
            const studentCtx = document.getElementById('studentChart').getContext('2d');
            new Chart(studentCtx, {
                type: 'doughnut',
                data: {
                    labels: ['수강 중', '일시정지', '졸업'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgb(34, 197, 94)',
                            'rgb(234, 179, 8)',
                            'rgb(156, 163, 175)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        </script>
    </body>
    </html>
  `)
})

// AI 학습 분석 리포트 API

// 학생별 리포트 목록 조회
app.get('/api/learning-reports/:student_id', async (c) => {
  try {
    const studentId = c.req.param('student_id')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM learning_reports 
      WHERE student_id = ? 
      ORDER BY report_month DESC
    `).bind(studentId).all()
    
    return c.json({ success: true, reports: results })
  } catch (error) {
    console.error('Get learning reports error:', error)
    return c.json({ success: false, error: '리포트 조회 실패' }, 500)
  }
})

// AI 리포트 자동 생성
app.post('/api/learning-reports/generate', async (c) => {
  try {
    const { student_id, report_month } = await c.req.json()
    
    // 학생 정보 조회
    const student = await c.env.DB.prepare(`
      SELECT * FROM students WHERE id = ?
    `).bind(student_id).first()
    
    if (!student) {
      return c.json({ success: false, error: '학생을 찾을 수 없습니다.' }, 404)
    }
    
    // 해당 월의 성적 데이터 조회
    const { results: grades } = await c.env.DB.prepare(`
      SELECT * FROM grades 
      WHERE student_id = ? 
      AND strftime('%Y-%m', test_date) = ?
      ORDER BY test_date DESC
    `).bind(student_id, report_month).all()
    
    // 출석 데이터 조회
    const { results: attendance } = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM attendance 
      WHERE student_id = ? 
      AND strftime('%Y-%m', attendance_date) = ?
      GROUP BY status
    `).bind(student_id, report_month).all()
    
    // 상담 기록 조회
    const { results: counselings } = await c.env.DB.prepare(`
      SELECT * FROM counseling 
      WHERE student_id = ? 
      AND strftime('%Y-%m', counseling_date) = ?
      ORDER BY counseling_date DESC
      LIMIT 3
    `).bind(student_id, report_month).all()
    
    // AI 분석 생성 (템플릿 기반)
    const totalAttendance = attendance.reduce((sum, a) => sum + (a.count || 0), 0)
    const presentCount = attendance.find(a => a.status === 'present')?.count || 0
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance * 100).toFixed(1) : 0
    
    const avgScore = grades.length > 0 
      ? (grades.reduce((sum, g) => sum + (g.score / g.max_score * 100), 0) / grades.length).toFixed(1)
      : 0
    
    // 학습 태도 판단
    let studyAttitude = '양호'
    if (attendanceRate >= 95 && avgScore >= 85) studyAttitude = '매우 우수'
    else if (attendanceRate >= 90 && avgScore >= 80) studyAttitude = '우수'
    else if (attendanceRate < 85 || avgScore < 70) studyAttitude = '개선 필요'
    
    // 강점 분석
    const topSubject = grades.length > 0 
      ? grades.reduce((max, g) => (g.score / g.max_score) > (max.score / max.max_score) ? g : max)
      : null
    
    const strengths = topSubject 
      ? topSubject.subject + ' 과목에서 ' + (topSubject.score / topSubject.max_score * 100).toFixed(1) + '점으로 우수한 성적을 보였습니다. 꾸준한 노력이 돋보입니다.'
      : '기본기가 탄탄하며, 수업 참여도가 높습니다.'
    
    // 약점 분석
    const weakSubject = grades.length > 0 
      ? grades.reduce((min, g) => (g.score / g.max_score) < (min.score / min.max_score) ? g : min)
      : null
    
    const weaknesses = weakSubject && (weakSubject.score / weakSubject.max_score * 100) < 75
      ? weakSubject.subject + ' 과목에서 ' + (weakSubject.score / weakSubject.max_score * 100).toFixed(1) + '점으로 보완이 필요합니다.'
      : '전반적으로 균형잡힌 학습을 하고 있습니다.'
    
    // 개선사항
    const improvements = attendanceRate < 90 
      ? '출석률 개선이 필요합니다. 규칙적인 수업 참여가 성적 향상의 기본입니다.'
      : avgScore < 80
      ? '기본 개념 복습에 더 많은 시간을 투자하면 좋겠습니다.'
      : '현재 학습 패턴을 유지하면서 심화 학습으로 나아가면 좋겠습니다.'
    
    // 추천사항
    const recommendations = avgScore >= 85
      ? '상위권 유지를 위해 심화 문제 풀이를 추천합니다. 경시대회 준비도 고려해볼 만합니다.'
      : avgScore >= 75
      ? '기본기 강화와 함께 문제 풀이 속도를 높이는 연습이 필요합니다.'
      : '개념 이해를 위한 1:1 보충 수업을 추천합니다. 기초부터 차근차근 다져가면 충분히 성적이 오를 수 있습니다.'
    
    // 다음 달 목표
    const nextMonthGoals = avgScore >= 85
      ? '현재 평균 ' + avgScore + '점 수준을 유지하면서, ' + (weakSubject?.subject || '취약 과목') + '에서 5점 이상 향상 목표'
      : '평균 점수 ' + avgScore + '점에서 ' + Math.min(100, parseFloat(avgScore) + 10).toFixed(0) + '점으로 향상, 출석률 ' + attendanceRate + '%에서 95% 이상 달성'
    
    // AI 종합 분석
    const aiAnalysis = '[' + student.name + '] 학생은 이번 달 평균 ' + avgScore + '점의 성적을 기록했으며, 출석률은 ' + attendanceRate + '%입니다. ' +
      (studyAttitude === '매우 우수' || studyAttitude === '우수' 
        ? '전반적으로 성실하게 학업에 임하고 있으며, 지속적인 성장이 기대됩니다.' 
        : '학습 태도와 출석 관리에 더 많은 관심이 필요합니다.') +
      (topSubject ? ' 특히 ' + topSubject.subject + ' 과목에서 강점을 보이고 있습니다.' : '') +
      ' 꾸준한 노력으로 더욱 발전할 수 있습니다.'
    
    // 학부모 메시지
    const parentMessage = '학부모님, 안녕하세요.\\n\\n' +
      student.name + ' 학생의 ' + report_month + ' 학습 분석 리포트를 전달드립니다.\\n\\n' +
      '📊 이번 달 성과\\n' +
      '- 평균 점수: ' + avgScore + '점\\n' +
      '- 출석률: ' + attendanceRate + '%\\n' +
      '- 학습 태도: ' + studyAttitude + '\\n\\n' +
      '💪 강점\\n' + strengths + '\\n\\n' +
      '🎯 개선 필요 사항\\n' + weaknesses + '\\n\\n' +
      '📝 선생님의 추천\\n' + recommendations + '\\n\\n' +
      '다음 달 목표: ' + nextMonthGoals + '\\n\\n' +
      '앞으로도 ' + student.name + ' 학생이 더욱 성장할 수 있도록 최선을 다하겠습니다.\\n' +
      '궁금하신 점은 언제든 연락 주세요!\\n\\n' +
      '- 꾸메땅학원 ' + (counselings[0]?.counselor_name || '선생님')
    
    // 리포트 저장
    const result = await c.env.DB.prepare(`
      INSERT INTO learning_reports 
      (student_id, report_month, overall_score, study_attitude, strengths, weaknesses, improvements, recommendations, next_month_goals, ai_analysis, parent_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      student_id, 
      report_month, 
      avgScore, 
      studyAttitude, 
      strengths, 
      weaknesses, 
      improvements, 
      recommendations, 
      nextMonthGoals, 
      aiAnalysis, 
      parentMessage
    ).run()
    
    return c.json({ 
      success: true, 
      message: 'AI 학습 분석 리포트가 생성되었습니다.',
      report_id: result.meta.last_row_id,
      preview: {
        overall_score: avgScore,
        attendance_rate: attendanceRate,
        study_attitude: studyAttitude
      }
    })
  } catch (error) {
    console.error('Generate learning report error:', error)
    return c.json({ success: false, error: 'AI 리포트 생성 실패' }, 500)
  }
})

// 리포트 상세 조회
app.get('/api/learning-reports/detail/:report_id', async (c) => {
  try {
    const reportId = c.req.param('report_id')
    
    const report = await c.env.DB.prepare(`
      SELECT lr.*, s.name as student_name, s.parent_name, s.parent_phone
      FROM learning_reports lr
      JOIN students s ON lr.student_id = s.id
      WHERE lr.id = ?
    `).bind(reportId).first()
    
    if (!report) {
      return c.json({ success: false, error: '리포트를 찾을 수 없습니다.' }, 404)
    }
    
    return c.json({ success: true, report })
  } catch (error) {
    console.error('Get report detail error:', error)
    return c.json({ success: false, error: '리포트 조회 실패' }, 500)
  }
})

// 프로필 수정 페이지
app.get('/profile', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>프로필 수정 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <a href="/dashboard" class="text-xl font-bold text-purple-600">우리는 슈퍼플레이스다</a>
                    <div class="flex items-center space-x-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/profile" class="text-purple-600 font-medium">프로필</a>
                        <button onclick="logout()" class="text-red-600 hover:text-red-700">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-4xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">프로필 수정</h1>
                    <p class="text-gray-600">회원 정보를 수정하고 비밀번호를 변경할 수 있습니다</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 프로필 정보 수정 -->
                    <div class="bg-white rounded-2xl border border-gray-200 p-8">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">📝 기본 정보</h2>
                        <form id="profileForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">이메일</label>
                                <input type="email" id="email" readonly class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">원장님 성함 <span class="text-red-500">*</span></label>
                                <input type="text" id="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">연락처 <span class="text-red-500">*</span></label>
                                <input type="tel" id="phone" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학원 이름 <span class="text-red-500">*</span></label>
                                <input type="text" id="academy_name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학원 위치 <span class="text-red-500">*</span></label>
                                <input type="text" id="academy_location" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <button type="submit" class="w-full gradient-purple text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all">
                                프로필 저장
                            </button>
                            <div id="profileMessage" class="hidden mt-4 p-4 rounded-xl"></div>
                        </form>
                    </div>

                    <!-- 비밀번호 변경 -->
                    <div class="bg-white rounded-2xl border border-gray-200 p-8">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">🔐 비밀번호 변경</h2>
                        <form id="passwordForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">현재 비밀번호 <span class="text-red-500">*</span></label>
                                <input type="password" id="current_password" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">새 비밀번호 <span class="text-red-500">*</span></label>
                                <input type="password" id="new_password" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                                <p class="text-xs text-gray-500 mt-1">최소 6자 이상</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">새 비밀번호 확인 <span class="text-red-500">*</span></label>
                                <input type="password" id="new_password_confirm" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            </div>
                            <button type="submit" class="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-all">
                                비밀번호 변경
                            </button>
                            <div id="passwordMessage" class="hidden mt-4 p-4 rounded-xl"></div>
                        </form>
                    </div>
                </div>

                <!-- 가입 정보 -->
                <div class="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">ℹ️ 계정 정보</h2>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">가입일:</span>
                            <span id="created_at" class="ml-2 font-medium text-gray-900"></span>
                        </div>
                        <div>
                            <span class="text-gray-600">회원 등급:</span>
                            <span id="role" class="ml-2 font-medium text-purple-600"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
        const user = JSON.parse(localStorage.getItem('user') || 'null')
        if (!user) {
            alert('로그인이 필요합니다.')
            window.location.href = '/login'
        }

        function logout() {
            localStorage.removeItem('user')
            window.location.href = '/'
        }

        // 프로필 로드
        async function loadProfile() {
            try {
                const res = await fetch('/api/user/profile', {
                    headers: { 'X-User-Id': user.id }
                })
                const data = await res.json()
                if (data.success) {
                    document.getElementById('email').value = data.user.email
                    document.getElementById('name').value = data.user.name
                    document.getElementById('phone').value = data.user.phone || ''
                    document.getElementById('academy_name').value = data.user.academy_name || ''
                    document.getElementById('academy_location').value = data.user.academy_location || ''
                    document.getElementById('created_at').textContent = new Date(data.user.created_at).toLocaleDateString()
                    document.getElementById('role').textContent = data.user.role === 'admin' ? '관리자' : '일반 회원'
                }
            } catch (error) {
                console.error('프로필 로드 실패:', error)
            }
        }

        // 프로필 수정
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const data = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                academy_name: document.getElementById('academy_name').value,
                academy_location: document.getElementById('academy_location').value
            }

            try {
                const res = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Id': user.id
                    },
                    body: JSON.stringify(data)
                })
                const result = await res.json()
                const messageEl = document.getElementById('profileMessage')
                messageEl.classList.remove('hidden')

                if (result.success) {
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                    messageEl.textContent = result.message
                    
                    // localStorage 업데이트
                    user.name = data.name
                    user.academy_name = data.academy_name
                    localStorage.setItem('user', JSON.stringify(user))
                } else {
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = result.error
                }
            } catch (error) {
                const messageEl = document.getElementById('profileMessage')
                messageEl.classList.remove('hidden')
                messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                messageEl.textContent = '프로필 수정 중 오류가 발생했습니다.'
            }
        })

        // 비밀번호 변경
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const current_password = document.getElementById('current_password').value
            const new_password = document.getElementById('new_password').value
            const new_password_confirm = document.getElementById('new_password_confirm').value

            if (new_password !== new_password_confirm) {
                const messageEl = document.getElementById('passwordMessage')
                messageEl.classList.remove('hidden')
                messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                messageEl.textContent = '새 비밀번호가 일치하지 않습니다.'
                return
            }

            try {
                const res = await fetch('/api/user/change-password', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Id': user.id
                    },
                    body: JSON.stringify({ current_password, new_password })
                })
                const result = await res.json()
                const messageEl = document.getElementById('passwordMessage')
                messageEl.classList.remove('hidden')

                if (result.success) {
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                    messageEl.textContent = result.message
                    document.getElementById('passwordForm').reset()
                } else {
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = result.error
                }
            } catch (error) {
                const messageEl = document.getElementById('passwordMessage')
                messageEl.classList.remove('hidden')
                messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                messageEl.textContent = '비밀번호 변경 중 오류가 발생했습니다.'
            }
        })

        loadProfile()
        </script>
    </body>
    </html>
  `)
})

// 회원 프로필 조회 API
app.get('/api/user/profile', async (c) => {
  try {
    const userId = c.req.header('X-User-Id')
    if (!userId) {
      return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
    }

    const user = await c.env.DB.prepare(`
      SELECT id, email, name, phone, academy_name, academy_location, role, created_at
      FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ success: true, user })
  } catch (error) {
    console.error('Get profile error:', error)
    return c.json({ success: false, error: '프로필 조회 실패' }, 500)
  }
})

// 회원 프로필 수정 API
app.put('/api/user/profile', async (c) => {
  try {
    const userId = c.req.header('X-User-Id')
    if (!userId) {
      return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
    }

    const { name, phone, academy_name, academy_location } = await c.req.json()

    if (!name || !phone || !academy_name || !academy_location) {
      return c.json({ success: false, error: '모든 필드를 입력해주세요.' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, academy_name = ?, academy_location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, phone, academy_name, academy_location, userId).run()

    return c.json({ success: true, message: '프로필이 수정되었습니다.' })
  } catch (error) {
    console.error('Update profile error:', error)
    return c.json({ success: false, error: '프로필 수정 실패' }, 500)
  }
})

// 회원 비밀번호 변경 API
app.put('/api/user/change-password', async (c) => {
  try {
    const userId = c.req.header('X-User-Id')
    if (!userId) {
      return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
    }

    const { current_password, new_password } = await c.req.json()

    if (!current_password || !new_password) {
      return c.json({ success: false, error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, 400)
    }

    if (new_password.length < 6) {
      return c.json({ success: false, error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, 400)
    }

    // 현재 비밀번호 확인
    const user = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ? AND password = ?
    `).bind(userId, current_password).first()

    if (!user) {
      return c.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }, 400)
    }

    // 비밀번호 변경
    await c.env.DB.prepare(`
      UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(new_password, userId).run()

    return c.json({ success: true, message: '비밀번호가 변경되었습니다.' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ success: false, error: '비밀번호 변경 실패' }, 500)
  }
})

// 관리자 - 회원으로 로그인 (Impersonate)
app.post('/api/admin/impersonate', async (c) => {
  try {
    const adminId = c.req.header('X-User-Id')
    if (!adminId) {
      return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
    }

    // 관리자 권한 확인
    const admin = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ? AND role = 'admin'
    `).bind(adminId).first()

    if (!admin) {
      return c.json({ success: false, error: '관리자 권한이 필요합니다.' }, 403)
    }

    const { user_id } = await c.req.json()

    // 대상 사용자 조회
    const targetUser = await c.env.DB.prepare(`
      SELECT id, email, name, role, academy_name FROM users WHERE id = ?
    `).bind(user_id).first()

    if (!targetUser) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ 
      success: true, 
      message: '사용자로 로그인되었습니다.',
      user: targetUser,
      is_impersonating: true,
      original_admin_id: adminId
    })
  } catch (error) {
    console.error('Impersonate error:', error)
    return c.json({ success: false, error: '사용자 로그인 실패' }, 500)
  }
})

export default app
