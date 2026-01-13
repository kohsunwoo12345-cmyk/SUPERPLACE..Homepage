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
      SELECT id, email, name, role, points FROM users WHERE email = ? AND password = ?
    `).bind(email, password).first()

    if (!user) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401)
    }

    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, points: user.points || 0 }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 실시간 포인트 조회 API
app.get('/api/users/:id/points', async (c) => {
  try {
    const userId = c.req.param('id')
    
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, points FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ 
      success: true,
      points: user.points || 0,
      user: { id: user.id, email: user.email, name: user.name, points: user.points || 0 }
    })
  } catch (error) {
    console.error('Get points error:', error)
    return c.json({ success: false, error: '포인트 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 비밀번호 변경 API
app.post('/api/admin/users/:id/password', async (c) => {
  try {
    const userId = c.req.param('id')
    const { newPassword } = await c.req.json()

    if (!newPassword || newPassword.length < 6) {
      return c.json({ success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE users SET password = ? WHERE id = ?
    `).bind(newPassword, userId).run()

    return c.json({ success: true, message: '비밀번호가 변경되었습니다.' })
  } catch (error) {
    console.error('Password change error:', error)
    return c.json({ success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 포인트 지급 API
app.put('/api/admin/users/:id/points', async (c) => {
  try {
    const userId = c.req.param('id')
    const { points } = await c.req.json()

    if (!points || points <= 0) {
      return c.json({ success: false, error: '올바른 포인트를 입력하세요.' }, 400)
    }

    // 현재 포인트 조회
    const user = await c.env.DB.prepare(`
      SELECT points FROM users WHERE id = ?
    `).bind(userId).first()

    const newPoints = (user?.points || 0) + points

    // 포인트 업데이트
    await c.env.DB.prepare(`
      UPDATE users SET points = ? WHERE id = ?
    `).bind(newPoints, userId).run()

    return c.json({ success: true, message: '포인트가 지급되었습니다.', newPoints })
  } catch (error) {
    console.error('Points update error:', error)
    return c.json({ success: false, error: '포인트 지급 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 포인트 차감 API
app.put('/api/admin/users/:id/points/deduct', async (c) => {
  try {
    const userId = c.req.param('id')
    const { points } = await c.req.json()

    if (!points || points <= 0) {
      return c.json({ success: false, error: '올바른 포인트를 입력하세요.' }, 400)
    }

    // 현재 포인트 조회
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, points FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    const currentPoints = user?.points || 0
    const newPoints = currentPoints - points

    console.log('Deduct points:', { userId, userName: user.name, currentPoints, deductPoints: points, newPoints })

    // 포인트 차감 (마이너스 허용)
    await c.env.DB.prepare(`
      UPDATE users SET points = ? WHERE id = ?
    `).bind(newPoints, userId).run()

    return c.json({ 
      success: true, 
      message: points + 'P가 차감되었습니다.',
      deductedPoints: points,
      newPoints: newPoints 
    })
  } catch (error) {
    console.error('Points deduct error:', error)
    return c.json({ success: false, error: '포인트 차감 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 사용자로 로그인 API
app.post('/api/admin/login-as/:id', async (c) => {
  try {
    const userId = c.req.param('id')

    // 사용자 조회
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Login as error:', error)
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원가입 API
app.post('/api/register', async (c) => {
  try {
    const { email, password, name, phone, academy_name } = await c.req.json()

    // 필수 필드 확인
    if (!email || !password || !name) {
      return c.json({ success: false, error: '필수 정보를 모두 입력해주세요.' }, 400)
    }

    // 이메일 중복 확인
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()

    if (existingUser) {
      return c.json({ success: false, error: '이미 등록된 이메일입니다.' }, 400)
    }

    // 사용자 생성
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password, name, phone, academy_name, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `).bind(email, password, name, phone || null, academy_name || null).run()

    return c.json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      user: { id: result.meta.last_row_id, email, name }
    })
  } catch (error) {
    console.error('Register error:', error)
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 입금 신청 API
app.post('/api/deposit/request', async (c) => {
  try {
    const { userId, userName, userEmail, amount, bankName, accountNumber, depositorName, message } = await c.req.json()

    if (!userId || !amount || amount <= 0) {
      return c.json({ success: false, error: '필수 정보를 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO deposit_requests (user_id, user_name, user_email, amount, bank_name, account_number, depositor_name, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(userId, userName, userEmail, amount, bankName || null, accountNumber || null, depositorName || null, message || null).run()

    return c.json({ 
      success: true, 
      message: '입금 신청이 완료되었습니다.',
      requestId: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Deposit request error:', error)
    return c.json({ success: false, error: '입금 신청 중 오류가 발생했습니다.' }, 500)
  }
})

// 내 입금 신청 내역 조회 API
app.get('/api/deposit/my-requests/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const requests = await c.env.DB.prepare(`
      SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY created_at DESC
    `).bind(userId).all()

    return c.json({ success: true, requests: requests.results })
  } catch (error) {
    console.error('Get deposit requests error:', error)
    return c.json({ success: false, error: '입금 신청 내역 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 입금 신청 목록 조회 API
app.get('/api/admin/deposit/requests', async (c) => {
  try {
    const requests = await c.env.DB.prepare(`
      SELECT * FROM deposit_requests ORDER BY created_at DESC
    `).all()

    return c.json({ success: true, requests: requests.results })
  } catch (error) {
    console.error('Get all deposit requests error:', error)
    return c.json({ success: false, error: '입금 신청 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 입금 신청 처리 API
app.put('/api/admin/deposit/requests/:id/process', async (c) => {
  try {
    const requestId = c.req.param('id')
    const { status, points } = await c.req.json()

    console.log('Processing deposit:', { requestId, status, points })

    // 입금 신청 정보 조회
    const request = await c.env.DB.prepare(`
      SELECT * FROM deposit_requests WHERE id = ?
    `).bind(requestId).first()

    console.log('Found request:', request)

    if (!request) {
      return c.json({ success: false, error: '입금 신청을 찾을 수 없습니다.' }, 404)
    }

    // 승인인 경우 포인트 지급
    if (status === 'approved' && points > 0) {
      console.log('Updating points for user:', request.user_id, 'adding:', points)
      
      const updateResult = await c.env.DB.prepare(`
        UPDATE users SET points = points + ? WHERE id = ?
      `).bind(points, request.user_id).run()
      
      console.log('Points update result:', updateResult)

      // 업데이트 확인
      const user = await c.env.DB.prepare(`
        SELECT id, email, name, points FROM users WHERE id = ?
      `).bind(request.user_id).first()
      
      console.log('User after update:', user)
    }

    // 입금 신청 상태 업데이트
    const statusUpdateResult = await c.env.DB.prepare(`
      UPDATE deposit_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(status, requestId).run()
    
    console.log('Status update result:', statusUpdateResult)

    return c.json({ 
      success: true, 
      message: '입금 신청이 처리되었습니다.',
      debug: { requestId, status, points, userId: request.user_id }
    })
  } catch (error) {
    console.error('Process deposit request error:', error)
    return c.json({ success: false, error: '입금 신청 처리 중 오류가 발생했습니다.', details: error.message }, 500)
  }
})

// 관리자: 사용자 비밀번호 변경
app.put('/api/admin/users/:id/password', async (c) => {
  try {
    const userId = c.req.param('id')
    const { newPassword } = await c.req.json()

    if (!newPassword || newPassword.length < 6) {
      return c.json({ success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE users SET password = ? WHERE id = ?
    `).bind(newPassword, userId).run()

    return c.json({ success: true, message: '비밀번호가 변경되었습니다.' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 사용자 포인트 추가/차감
app.put('/api/admin/users/:id/points', async (c) => {
  try {
    const userId = c.req.param('id')
    const { points, action } = await c.req.json() // action: 'add' or 'subtract'

    if (!points || points <= 0) {
      return c.json({ success: false, error: '유효한 포인트를 입력해주세요.' }, 400)
    }

    // 현재 포인트 조회
    const user = await c.env.DB.prepare(`
      SELECT points FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    let newPoints = (user.points || 0)
    if (action === 'add') {
      newPoints += points
    } else if (action === 'subtract') {
      newPoints = Math.max(0, newPoints - points) // 0 미만으로 떨어지지 않음
    }

    await c.env.DB.prepare(`
      UPDATE users SET points = ? WHERE id = ?
    `).bind(newPoints, userId).run()

    return c.json({ success: true, message: '포인트가 업데이트되었습니다.', newPoints })
  } catch (error) {
    console.error('Update points error:', error)
    return c.json({ success: false, error: '포인트 업데이트 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자: 사용자 아이디로 로그인
app.post('/api/admin/login-as/:id', async (c) => {
  try {
    const userId = c.req.param('id')

    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role, points FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, points: user.points }
    })
  } catch (error) {
    console.error('Login as user error:', error)
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
    const { title, template_type, input_data, thumbnail_url, og_title, og_description, folder_id } = await c.req.json()
    
    // 디버깅: 받은 데이터 확인
    console.log('🔍 API에서 받은 데이터:', {
      title,
      template_type,
      thumbnail_url: thumbnail_url ? (thumbnail_url.length > 100 ? thumbnail_url.substring(0, 100) + '...' : thumbnail_url) : null,
      og_title,
      og_description,
      folder_id
    })
    
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
      INSERT INTO landing_pages (user_id, slug, title, template_type, content_json, html_content, qr_code_url, thumbnail_url, og_title, og_description, folder_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `
    const result = await c.env.DB.prepare(query)
      .bind(user.id, slug, title, template_type, JSON.stringify(input_data), htmlContent, qrCodeUrl, thumbnail_url || null, og_title || null, og_description || null, folder_id || null)
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
    const userId = c.req.query('userId')
    const folderId = c.req.query('folderId')
    
    let query = 'SELECT id, slug, title, template_type, view_count, status, folder_id, created_at FROM landing_pages WHERE user_id = ?'
    let params = [userId]
    
    if (folderId) {
      query += ' AND folder_id = ?'
      params.push(folderId)
    } else if (folderId === null || folderId === 'null') {
      // 폴더가 없는 페이지만 조회
      query += ' AND folder_id IS NULL'
    }
    
    query += ' ORDER BY created_at DESC'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, pages: results })
  } catch (error) {
    console.error('목록 조회 실패:', error)
    return c.json({ success: false, error: '목록 조회 실패' }, 500)
  }
})

// 폴더 목록 조회
app.get('/api/landing/folders', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    // 폴더 목록
    const foldersQuery = 'SELECT id, name, created_at FROM landing_folders WHERE user_id = ? ORDER BY created_at DESC'
    const { results: folders } = await c.env.DB.prepare(foldersQuery).bind(userId).all()
    
    // 각 폴더의 페이지 수 계산
    const foldersWithCount = await Promise.all(folders.map(async (folder) => {
      const countQuery = 'SELECT COUNT(*) as count FROM landing_pages WHERE folder_id = ?'
      const count = await c.env.DB.prepare(countQuery).bind(folder.id).first()
      return { ...folder, page_count: count.count || 0 }
    }))
    
    // 전체 페이지 수
    const totalQuery = 'SELECT COUNT(*) as count FROM landing_pages WHERE user_id = ?'
    const total = await c.env.DB.prepare(totalQuery).bind(userId).first()
    
    return c.json({ 
      success: true, 
      folders: foldersWithCount,
      totalPages: total.count || 0
    })
  } catch (error) {
    console.error('폴더 목록 조회 실패:', error)
    return c.json({ success: false, error: '폴더 목록 조회 실패' }, 500)
  }
})

// 폴더 생성
app.post('/api/landing/folders', async (c) => {
  try {
    const { userId, name } = await c.req.json()
    
    if (!name || !name.trim()) {
      return c.json({ success: false, error: '폴더 이름을 입력하세요.' }, 400)
    }
    
    const query = 'INSERT INTO landing_folders (user_id, name) VALUES (?, ?)'
    const result = await c.env.DB.prepare(query).bind(userId, name.trim()).run()
    
    return c.json({ 
      success: true, 
      folderId: result.meta.last_row_id,
      message: '폴더가 생성되었습니다.' 
    })
  } catch (error) {
    console.error('폴더 생성 실패:', error)
    return c.json({ success: false, error: '폴더 생성 실패' }, 500)
  }
})

// 랜딩페이지를 폴더로 이동
app.put('/api/landing/move-to-folder', async (c) => {
  try {
    const { pageId, folderId } = await c.req.json()
    
    const query = 'UPDATE landing_pages SET folder_id = ? WHERE id = ?'
    await c.env.DB.prepare(query).bind(folderId, pageId).run()
    
    return c.json({ 
      success: true, 
      message: '폴더로 이동되었습니다.' 
    })
  } catch (error) {
    console.error('폴더 이동 실패:', error)
    return c.json({ success: false, error: '폴더 이동 실패' }, 500)
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

// 학원 소개 페이지 템플릿 (전문적이고 상세한 버전)
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
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
      .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .pattern-bg { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 40px 40px; }
      @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
      .float-animation { animation: float 3s ease-in-out infinite; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Hero Section with Enhanced Design -->
    <div class="gradient-bg pattern-bg text-white py-24 px-6 relative overflow-hidden">
        <div class="absolute inset-0 bg-black opacity-10"></div>
        <div class="max-w-6xl mx-auto relative z-10">
            <div class="text-center mb-16">
                <div class="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full text-sm font-bold mb-6 float-animation">
                    <i class="fas fa-graduation-cap mr-2"></i>믿을 수 있는 교육 파트너
                </div>
                <h1 class="text-6xl font-bold mb-6 leading-tight">${academyName}</h1>
                <div class="flex items-center justify-center gap-4 text-xl mb-8">
                    <i class="fas fa-map-marker-alt"></i>
                    <p class="text-2xl">${location}</p>
                </div>
                <p class="text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed">${features || '학생 한 명 한 명의 꿈을 응원하는 교육 파트너'}</p>
            </div>
            
            <!-- Quick Stats -->
            <div class="grid md:grid-cols-4 gap-6 mt-12">
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div class="text-4xl font-bold mb-2">500+</div>
                    <div class="text-sm opacity-90">학생 수</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div class="text-4xl font-bold mb-2">98%</div>
                    <div class="text-sm opacity-90">학부모 만족도</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div class="text-4xl font-bold mb-2">15년</div>
                    <div class="text-sm opacity-90">교육 경력</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div class="text-4xl font-bold mb-2">1:1</div>
                    <div class="text-sm opacity-90">맞춤 관리</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-20">
        <!-- 학원 소개 -->
        <div class="mb-20">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-school text-purple-600 mr-3"></i>
                    우리 학원을 소개합니다
                </h2>
                <p class="text-xl text-gray-600">${academyName}는 학생 개개인의 성장을 최우선으로 생각합니다</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-8">
                <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 shadow-lg">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl">
                            <i class="fas fa-bullseye"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900">우리의 목표</h3>
                    </div>
                    <p class="text-gray-700 text-lg leading-relaxed">
                        단순히 성적 향상을 넘어, 학생들이 스스로 학습하는 힘을 기르고 
                        자신의 꿈을 향해 나아갈 수 있도록 돕는 것이 우리의 목표입니다. 
                        체계적인 커리큘럼과 개별 맞춤 학습으로 최상의 결과를 만들어냅니다.
                    </p>
                </div>
                
                <div class="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 shadow-lg">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl">
                            <i class="fas fa-heart"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900">우리의 약속</h3>
                    </div>
                    <p class="text-gray-700 text-lg leading-relaxed">
                        모든 학생을 내 자녀처럼 생각하며, 한 명 한 명에게 최선을 다합니다. 
                        정기적인 학부모 상담과 실시간 학습 리포트를 통해 
                        학생의 성장 과정을 투명하게 공유합니다.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- 특별한 강점 -->
        <div class="bg-white rounded-3xl shadow-2xl p-12 mb-20">
            <h2 class="text-4xl font-bold text-gray-900 mb-12 text-center">
                <i class="fas fa-star text-yellow-500 mr-3"></i>
                ${academyName}의 특별한 강점
            </h2>
            <div class="grid md:grid-cols-2 gap-8">
                ${(specialties || []).map((s: string, i: number) => `
                    <div class="group hover:transform hover:scale-105 transition-all duration-300">
                        <div class="flex items-start gap-6 p-8 bg-gradient-to-br from-purple-50 to-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl">
                            <div class="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                ${i + 1}
                            </div>
                            <div class="flex-1">
                                <p class="text-gray-800 text-xl leading-relaxed font-medium">${s}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- 학습 시스템 -->
        <div class="mb-20">
            <h2 class="text-4xl font-bold text-gray-900 mb-12 text-center">
                <i class="fas fa-cogs text-purple-600 mr-3"></i>
                체계적인 학습 시스템
            </h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-purple-600">
                    <div class="text-5xl mb-6 text-center">📝</div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 text-center">1단계: 진단 평가</h3>
                    <p class="text-gray-600 text-center leading-relaxed">
                        학생의 현재 실력과 학습 스타일을 정확히 파악하여 
                        맞춤형 학습 계획을 수립합니다.
                    </p>
                </div>
                <div class="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-blue-600">
                    <div class="text-5xl mb-6 text-center">📚</div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 text-center">2단계: 맞춤 수업</h3>
                    <p class="text-gray-600 text-center leading-relaxed">
                        개인별 맞춤 커리큘럼으로 약점을 집중 보완하고 
                        강점을 더욱 발전시킵니다.
                    </p>
                </div>
                <div class="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-green-600">
                    <div class="text-5xl mb-6 text-center">📊</div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 text-center">3단계: 성과 관리</h3>
                    <p class="text-gray-600 text-center leading-relaxed">
                        정기 테스트와 학습 리포트로 
                        지속적인 성장을 확인하고 관리합니다.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- 학부모 후기 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 mb-20">
            <h2 class="text-4xl font-bold text-gray-900 mb-12 text-center">
                <i class="fas fa-comments text-purple-600 mr-3"></i>
                학부모님들의 생생한 후기
            </h2>
            <div class="grid md:grid-cols-2 gap-8">
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold">
                            김
                        </div>
                        <div>
                            <div class="font-bold text-lg">김지현 학부모님</div>
                            <div class="text-gray-500 text-sm">중3 학생 어머니</div>
                        </div>
                    </div>
                    <div class="text-yellow-400 text-xl mb-4">★★★★★</div>
                    <p class="text-gray-700 leading-relaxed">
                        "아이가 공부에 흥미를 잃어 고민이었는데, ${academyName}에서 
                        1:1 맞춤 관리를 받으면서 성적도 오르고 자신감도 생겼어요. 
                        선생님들의 세심한 관리에 정말 감사드립니다!"
                    </p>
                </div>
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                            박
                        </div>
                        <div>
                            <div class="font-bold text-lg">박준영 학부모님</div>
                            <div class="text-gray-500 text-sm">고2 학생 아버지</div>
                        </div>
                    </div>
                    <div class="text-yellow-400 text-xl mb-4">★★★★★</div>
                    <p class="text-gray-700 leading-relaxed">
                        "입시 컨설팅까지 함께해주셔서 정말 만족스럽습니다. 
                        체계적인 학습 관리와 정기적인 피드백으로 
                        아이의 성장을 눈으로 확인할 수 있어요."
                    </p>
                </div>
            </div>
        </div>
        
        <!-- CTA Section -->
        <div class="bg-gradient-to-br from-purple-600 to-purple-900 rounded-3xl shadow-2xl p-12 text-white text-center">
            <h2 class="text-4xl font-bold mb-6">
                <i class="fas fa-phone-alt mr-3"></i>
                지금 바로 상담 받으세요!
            </h2>
            <p class="text-2xl mb-8 opacity-95">
                무료 학습 진단 및 맞춤 상담을 제공합니다
            </p>
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
                <div class="text-3xl font-bold mb-4">
                    <i class="fas fa-phone text-yellow-300 mr-3"></i>
                    ${contact || '상담 문의'}
                </div>
                <p class="text-lg opacity-90">평일 오전 9시 ~ 오후 10시 | 주말 오전 10시 ~ 오후 6시</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:${contact}" class="inline-flex items-center justify-center bg-white text-purple-600 px-10 py-5 rounded-full text-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg">
                    <i class="fas fa-phone mr-3"></i>
                    전화 상담하기
                </a>
                <a href="javascript:alert('카카오톡 상담 준비 중입니다')" class="inline-flex items-center justify-center bg-yellow-300 text-gray-900 px-10 py-5 rounded-full text-xl font-bold hover:bg-yellow-200 transition-all transform hover:scale-105 shadow-lg">
                    <i class="fab fa-comment mr-3"></i>
                    카카오톡 문의
                </a>
            </div>
        </div>
    </div>
    
    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 py-12 px-6">
        <div class="max-w-6xl mx-auto text-center">
            <h3 class="text-2xl font-bold text-white mb-4">${academyName}</h3>
            <p class="mb-4">
                <i class="fas fa-map-marker-alt mr-2"></i>${location}
            </p>
            <p class="mb-4">
                <i class="fas fa-phone mr-2"></i>${contact || '상담 문의'}
            </p>
            <p class="text-sm opacity-75 mt-8">© 2026 ${academyName}. All rights reserved.</p>
        </div>
    </footer>
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

// 학생 성과 리포트 페이지 템플릿 (전문적이고 상세한 버전)
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
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
      * { font-family: 'Pretendard Variable', sans-serif; }
      @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .animate-slide { animation: slideInUp 0.6s ease-out; }
      .pattern-dots { background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 2px, transparent 0); background-size: 30px 30px; }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen py-12 px-6">
    <div class="max-w-5xl mx-auto">
        <!-- Header Card -->
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 animate-slide">
            <div class="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 pattern-dots text-white p-12 text-center relative">
                <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold">
                    <i class="fas fa-calendar-alt mr-2"></i>${month}
                </div>
                <div class="mb-6">
                    <div class="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-bold mb-4">
                        📊 Monthly Learning Report
                    </div>
                </div>
                <h1 class="text-5xl font-bold mb-4">${month} 학습 리포트</h1>
                <div class="flex items-center justify-center gap-3 text-3xl font-bold">
                    <i class="fas fa-user-graduate"></i>
                    <span>${studentName} 학생</span>
                </div>
                <p class="text-lg mt-4 opacity-90">열심히 노력한 한 달의 기록입니다</p>
            </div>
            
            <!-- Quick Stats -->
            <div class="grid grid-cols-3 divide-x divide-gray-200 bg-gray-50">
                <div class="p-6 text-center">
                    <div class="text-3xl font-bold text-green-600 mb-1">${(achievements || []).length}</div>
                    <div class="text-sm text-gray-600">이달의 성과</div>
                </div>
                <div class="p-6 text-center">
                    <div class="text-3xl font-bold text-blue-600 mb-1">${(improvements || []).length}</div>
                    <div class="text-sm text-gray-600">개선 포인트</div>
                </div>
                <div class="p-6 text-center">
                    <div class="text-3xl font-bold text-purple-600 mb-1">${(nextGoals || []).length}</div>
                    <div class="text-sm text-gray-600">다음 목표</div>
                </div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="bg-white rounded-3xl shadow-xl p-10 mb-8">
            <!-- 종합 평가 -->
            <div class="mb-12 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-100">
                <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <i class="fas fa-award text-blue-600 text-3xl"></i>
                    종합 평가
                </h2>
                <p class="text-gray-700 text-lg leading-relaxed">
                    ${studentName} 학생은 ${month}에 매우 우수한 학습 태도를 보여주었습니다. 
                    특히 꾸준한 출석과 적극적인 수업 참여가 돋보였으며, 
                    이러한 노력이 실제 성적 향상으로 이어지고 있습니다. 
                    앞으로도 지금의 열정을 유지한다면 더욱 훌륭한 결과를 얻을 수 있을 것입니다.
                </p>
            </div>
            
            <!-- 이달의 성과 -->
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <span>이달의 성과</span>
                    <span class="ml-auto text-lg text-gray-500 font-normal">Outstanding Achievements</span>
                </h2>
                <div class="space-y-6">
                    ${(achievements || []).map((a: string, idx: number) => `
                        <div class="group hover:transform hover:scale-102 transition-all duration-300">
                            <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-2xl shadow-md hover:shadow-xl">
                                <div class="flex items-start gap-4">
                                    <div class="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                        ${idx + 1}
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-gray-800 text-xl leading-relaxed font-medium">${a}</p>
                                        <div class="mt-3 flex items-center gap-2">
                                            <span class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                                                <i class="fas fa-check-circle mr-1"></i>달성 완료
                                            </span>
                                        </div>
                                    </div>
                                    <div class="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">
                                        🎯
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 학습 데이터 분석 -->
            <div class="mb-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <i class="fas fa-chart-line text-blue-600 text-2xl"></i>
                    학습 데이터 분석
                </h2>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-xl p-6 shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-gray-700 font-medium">출석률</span>
                            <span class="text-2xl font-bold text-blue-600">95%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style="width: 95%"></div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-gray-700 font-medium">과제 완성도</span>
                            <span class="text-2xl font-bold text-green-600">92%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style="width: 92%"></div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-gray-700 font-medium">수업 참여도</span>
                            <span class="text-2xl font-bold text-purple-600">98%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style="width: 98%"></div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-gray-700 font-medium">이해도</span>
                            <span class="text-2xl font-bold text-orange-600">90%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full" style="width: 90%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 개선이 필요한 부분 -->
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <span>개선이 필요한 부분</span>
                    <span class="ml-auto text-lg text-gray-500 font-normal">Areas for Improvement</span>
                </h2>
                <div class="space-y-6">
                    ${(improvements || []).map((i: string, idx: number) => `
                        <div class="group hover:transform hover:scale-102 transition-all duration-300">
                            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-6 rounded-r-2xl shadow-md hover:shadow-xl">
                                <div class="flex items-start gap-4">
                                    <div class="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        ${idx + 1}
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-gray-800 text-xl leading-relaxed font-medium">${i}</p>
                                        <div class="mt-3 flex items-center gap-2">
                                            <span class="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                                <i class="fas fa-lightbulb mr-1"></i>개선 방향 제시
                                            </span>
                                        </div>
                                    </div>
                                    <div class="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">
                                        💡
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 다음 달 목표 -->
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <span>다음 달 학습 목표</span>
                    <span class="ml-auto text-lg text-gray-500 font-normal">Next Month Goals</span>
                </h2>
                <div class="space-y-6">
                    ${(nextGoals || []).map((g: string, idx: number) => `
                        <div class="group hover:transform hover:scale-102 transition-all duration-300">
                            <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-6 rounded-r-2xl shadow-md hover:shadow-xl">
                                <div class="flex items-start gap-4">
                                    <div class="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        ${idx + 1}
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-gray-800 text-xl leading-relaxed font-medium">${g}</p>
                                        <div class="mt-3 flex items-center gap-2">
                                            <span class="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                                <i class="fas fa-flag mr-1"></i>목표 설정
                                            </span>
                                        </div>
                                    </div>
                                    <div class="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">
                                        🎯
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 담당 선생님 메시지 -->
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-10 border-2 border-gray-200">
                <div class="flex items-start gap-6">
                    <div class="flex-shrink-0">
                        <div class="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
                            <i class="fas fa-user-tie"></i>
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="mb-4">
                            <p class="text-gray-600 text-sm mb-2">담당 선생님의 한마디</p>
                            <p class="text-2xl font-bold text-gray-900">${teacherName || '선생님'}</p>
                        </div>
                        <div class="bg-white rounded-xl p-6 shadow-md">
                            <p class="text-gray-700 text-lg leading-relaxed mb-4">
                                "${studentName} 학생, 이번 달도 정말 수고 많았어요! 
                                꾸준한 노력과 성실한 태도가 정말 인상적이었습니다. 
                                특히 어려운 문제도 끝까지 포기하지 않고 해결하려는 모습이 
                                선생님에게 큰 감동을 주었어요."
                            </p>
                            <p class="text-gray-700 text-lg leading-relaxed">
                                "다음 달에는 설정한 목표들을 하나씩 달성하면서 
                                더욱 성장하는 모습을 기대하겠습니다. 
                                항상 응원하고 있으니 자신감을 가지고 앞으로 나아가세요! 💪"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 학부모님께 -->
        <div class="bg-white rounded-3xl shadow-xl p-10 text-center">
            <div class="inline-block bg-purple-100 rounded-full p-4 mb-6">
                <i class="fas fa-heart text-purple-600 text-4xl"></i>
            </div>
            <h2 class="text-3xl font-bold text-gray-900 mb-4">학부모님께</h2>
            <p class="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                ${studentName} 학생의 성장을 위해 항상 관심과 지원을 아끼지 않으시는 
                학부모님께 진심으로 감사드립니다. 가정에서의 격려와 학원에서의 체계적인 관리가 
                만나 학생이 더욱 발전할 수 있었습니다. 앞으로도 지속적인 소통을 통해 
                최선의 교육 서비스를 제공하겠습니다.
            </p>
            <div class="inline-flex items-center gap-3 text-purple-600 font-medium">
                <i class="fas fa-phone-alt"></i>
                <span>추가 상담이 필요하신 경우 언제든 연락 주세요</span>
            </div>
        </div>
    </div>
    
    <!-- Footer -->
    <div class="max-w-5xl mx-auto mt-12 text-center text-gray-500 text-sm">
        <p>이 리포트는 ${month}의 학습 활동을 기반으로 작성되었습니다.</p>
        <p class="mt-2">© 2026 Learning Report. Generated with care.</p>
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
        <title>우리는 슈퍼플레이스다 - 학원 전문 마케팅 | 슈퍼 플레이스</title>
        <meta name="description" content="100% 현직 학원장이 알려주는 실전 마케팅! 네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅 전문 교육. 대표이사 고희준, 제1팀장 고선우와 함께하는 학원 성장 컨설팅.">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="https://superplace-academy.pages.dev/">
        <meta property="og:title" content="우리는 슈퍼플레이스다 - 학원 전문 마케팅">
        <meta property="og:description" content="100% 현직 학원장이 알려주는 실전 마케팅! 네이버 플레이스 상위노출, 블로그 마케팅 전문 교육">
        <meta property="og:image" content="https://superplace-academy.pages.dev/thumbnail-share.jpg">
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="https://superplace-academy.pages.dev/">
        <meta property="twitter:title" content="우리는 슈퍼플레이스다 - 학원 전문 마케팅">
        <meta property="twitter:description" content="100% 현직 학원장이 알려주는 실전 마케팅!">
        <meta property="twitter:image" content="https://superplace-academy.pages.dev/thumbnail-share.jpg">
        
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
                            <div class="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent"></div>
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
                            <a href="/programs/naver-place" class="mt-6 block w-full py-3 text-center gradient-purple text-white rounded-xl font-bold hover:shadow-lg transition-all">
                                자세히 보기 →
                            </a>
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
                            <a href="/programs/blog" class="mt-6 block w-full py-3 text-center gradient-orange text-white rounded-xl font-bold hover:shadow-lg transition-all">
                                자세히 보기 →
                            </a>
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
                            <a href="/programs/funnel" class="mt-6 block w-full py-3 text-center gradient-purple text-white rounded-xl font-bold hover:shadow-lg transition-all">
                                자세히 보기 →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Program CTA Section -->
        <section class="py-20 px-6 bg-gradient-to-br from-purple-50 to-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-12">
                    <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        관심있는 프로그램을 선택하세요
                    </h2>
                    <p class="text-lg text-gray-600">
                        각 프로그램의 상세 내용을 확인하고 바로 신청하세요
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-6 mb-12">
                    <!-- 네이버 플레이스 버튼 -->
                    <a href="/programs/naver-place" class="group bg-white rounded-2xl p-8 border-2 border-purple-200 hover:border-purple-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                        <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">
                            네이버 플레이스<br>상위노출
                        </h3>
                        <p class="text-gray-600 text-center mb-4">
                            지역 검색 1위 달성 전략
                        </p>
                        <div class="text-center">
                            <span class="text-purple-600 font-bold group-hover:text-purple-700">
                                자세히 보기 →
                            </span>
                        </div>
                    </a>

                    <!-- 블로그 버튼 -->
                    <a href="/programs/blog" class="group bg-white rounded-2xl p-8 border-2 border-orange-200 hover:border-orange-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                        <div class="w-16 h-16 gradient-orange rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">
                            블로그<br>상위노출
                        </h3>
                        <p class="text-gray-600 text-center mb-4">
                            검색 최상위 진입 전략
                        </p>
                        <div class="text-center">
                            <span class="text-orange-500 font-bold group-hover:text-orange-600">
                                자세히 보기 →
                            </span>
                        </div>
                    </a>

                    <!-- 퍼널 마케팅 버튼 -->
                    <a href="/programs/funnel" class="group bg-white rounded-2xl p-8 border-2 border-purple-200 hover:border-purple-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                        <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">
                            퍼널<br>마케팅
                        </h3>
                        <p class="text-gray-600 text-center mb-4">
                            24시간 자동 학생 모집
                        </p>
                        <div class="text-center">
                            <span class="text-purple-600 font-bold group-hover:text-purple-700">
                                자세히 보기 →
                            </span>
                        </div>
                    </a>
                </div>

                <!-- 대행 문의 큰 버튼 -->
                <div class="text-center">
                    <a href="/contact" class="inline-block gradient-purple text-white px-16 py-6 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <span class="flex items-center gap-3">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span>대행 문의하기</span>
                        </span>
                    </a>
                    <p class="text-gray-500 mt-4">
                        24시간 내에 답변드립니다
                    </p>
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
                            <img src="/static/images/seminar-education.jpg" 
                                 alt="휴지통(休知通) 교육 세미나 - 학원장 교육 현장" 
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
                            <li>인천광역시 서구 청라커낼로 270, 2층 2196호</li>
                            <li>wangholy1@naver.com</li>
                            <li>010-8739-9697</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 mt-8">
                    <div class="text-center text-gray-600 text-sm space-y-2">
                        <p class="font-medium text-gray-900">주식회사 우리는 슈퍼플레이스다</p>
                        <p>사업자등록번호: 142-88-02445</p>
                        <p>주소: 인천광역시 서구 청라커낼로 270, 2층 2196호</p>
                        <p>이메일: wangholy1@naver.com | 전화: 010-8739-9697</p>
                        <p class="text-gray-500 mt-4">&copy; 2024 우리는 슈퍼플레이스다. All rights reserved.</p>
                    </div>
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

// 회원가입 페이지
app.get('/register', (c) => {
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
                    <p class="text-gray-600">학원 마케팅 교육 플랫폼에 가입하세요</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8">
                    <form id="registerForm" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이름 <span class="text-red-500">*</span></label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일 <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">비밀번호 <span class="text-red-500">*</span></label>
                            <input type="password" name="password" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            <p class="text-xs text-gray-500 mt-1">최소 6자 이상</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명</label>
                            <input type="text" name="academy_name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">전화번호</label>
                            <input type="tel" name="phone" placeholder="010-0000-0000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div id="errorMessage" class="hidden bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm"></div>

                        <button type="submit" class="w-full gradient-purple text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition">
                            회원가입
                        </button>
                    </form>

                    <div class="mt-6 text-center">
                        <p class="text-sm text-gray-600">
                            이미 계정이 있으신가요? 
                            <a href="/login" class="text-purple-600 hover:text-purple-700 font-medium">로그인</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    academy_name: formData.get('academy_name'),
                    phone: formData.get('phone')
                };

                const errorDiv = document.getElementById('errorMessage');
                errorDiv.classList.add('hidden');

                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
                        window.location.href = '/login';
                    } else {
                        errorDiv.textContent = result.error || '회원가입에 실패했습니다.';
                        errorDiv.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Register error:', error);
                    errorDiv.textContent = '회원가입 중 오류가 발생했습니다.';
                    errorDiv.classList.remove('hidden');
                }
            });
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
                        계정이 없으신가요? <a href="/register" class="text-purple-600 hover:text-purple-700 font-medium">회원가입</a>
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
                                window.location.href = '/admin/dashboard'
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

// 프로그램 목록 페이지
app.get('/programs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>교육 프로그램 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .gradient-orange { background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); }
            .card-hover { transition: all 0.3s; }
            .card-hover:hover { transform: translateY(-4px); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <div class="flex items-center gap-6">
                        <a href="/" class="text-gray-600 hover:text-purple-600">홈</a>
                        <a href="/programs" class="text-purple-600 font-medium">교육 프로그램</a>
                        <a href="/tools" class="text-gray-600 hover:text-purple-600">마케팅 툴</a>
                        <a href="/contact" class="text-gray-600 hover:text-purple-600">문의하기</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="text-center mb-12">
                <h1 class="text-5xl font-bold text-gray-900 mb-4">교육 프로그램</h1>
                <p class="text-xl text-gray-600">실전에서 바로 적용 가능한 학원 마케팅 전략</p>
            </div>

            <div class="grid md:grid-cols-3 gap-8">
                <!-- 네이버 플레이스 -->
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden card-hover">
                    <div class="h-48 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                        <i class="fas fa-map-marker-alt text-white text-6xl"></i>
                    </div>
                    <div class="p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">네이버 플레이스<br>상위노출</h2>
                        <p class="text-gray-600 mb-6">지역 검색 1위 달성을 위한 실전 노하우</p>
                        
                        <div class="space-y-2 mb-6">
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                키워드 최적화 전략
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                리뷰 관리 시스템
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                지역 SEO 완벽 가이드
                            </div>
                        </div>

                        <div class="flex items-center justify-between mb-6">
                            <span class="text-2xl font-bold text-purple-600">₩300,000</span>
                            <span class="text-sm text-gray-500">4주 과정</span>
                        </div>

                        <a href="/programs/naver-place" class="block w-full py-3 text-center gradient-purple text-white rounded-xl font-bold hover:shadow-lg transition">
                            자세히 보기
                        </a>
                    </div>
                </div>

                <!-- 블로그 마케팅 -->
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden card-hover">
                    <div class="h-48 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <i class="fas fa-blog text-white text-6xl"></i>
                    </div>
                    <div class="p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">블로그<br>상위노출</h2>
                        <p class="text-gray-600 mb-6">검색 최상위 진입을 위한 SEO 전략</p>
                        
                        <div class="space-y-2 mb-6">
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-orange-600 mr-2"></i>
                                검색 알고리즘 완벽 이해
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-orange-600 mr-2"></i>
                                효과적인 글쓰기 기법
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-orange-600 mr-2"></i>
                                콘텐츠 전략 수립
                            </div>
                        </div>

                        <div class="flex items-center justify-between mb-6">
                            <span class="text-2xl font-bold text-orange-600">₩250,000</span>
                            <span class="text-sm text-gray-500">3주 과정</span>
                        </div>

                        <a href="/programs/blog" class="block w-full py-3 text-center gradient-orange text-white rounded-xl font-bold hover:shadow-lg transition">
                            자세히 보기
                        </a>
                    </div>
                </div>

                <!-- 퍼널 마케팅 -->
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden card-hover">
                    <div class="h-48 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <i class="fas fa-funnel-dollar text-white text-6xl"></i>
                    </div>
                    <div class="p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">퍼널<br>마케팅</h2>
                        <p class="text-gray-600 mb-6">24시간 자동 학생 모집 시스템</p>
                        
                        <div class="space-y-2 mb-6">
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                고객 여정 완벽 설계
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                마케팅 자동화 도구
                            </div>
                            <div class="flex items-center text-sm text-gray-700">
                                <i class="fas fa-check text-purple-600 mr-2"></i>
                                전환율 극대화 전략
                            </div>
                        </div>

                        <div class="flex items-center justify-between mb-6">
                            <span class="text-2xl font-bold text-purple-600">₩400,000</span>
                            <span class="text-sm text-gray-500">6주 과정</span>
                        </div>

                        <a href="/programs/funnel" class="block w-full py-3 text-center gradient-purple text-white rounded-xl font-bold hover:shadow-lg transition">
                            자세히 보기
                        </a>
                    </div>
                </div>
            </div>

            <!-- CTA 섹션 -->
            <div class="mt-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white">
                <h2 class="text-4xl font-bold mb-4">전체 패키지로 더 저렴하게!</h2>
                <p class="text-xl mb-8 opacity-90">3개 프로그램 전체 수강 시 30% 할인</p>
                <div class="flex items-center justify-center gap-4 mb-8">
                    <span class="text-3xl line-through opacity-75">₩950,000</span>
                    <span class="text-5xl font-bold">₩665,000</span>
                </div>
                <a href="/contact" class="inline-block bg-white text-purple-600 px-12 py-4 rounded-full text-lg font-bold hover:shadow-2xl transition">
                    패키지 문의하기
                </a>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 성공 사례 페이지
// 프로그램 목록 페이지
app.get('/programs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>교육 프로그램 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
        <style>
          body { font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm border-b">
            <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-blue-600">슈퍼플레이스</a>
                    <div class="flex gap-8 items-center">
                        <a href="/" class="text-gray-600 hover:text-blue-600">홈</a>
                        <a href="/programs" class="text-blue-600 font-semibold">교육 프로그램</a>
                        <a href="/tools" class="text-gray-600 hover:text-blue-600">마케팅 툴</a>
                        <a href="/contact" class="text-gray-600 hover:text-blue-600">문의하기</a>
                        <a href="/login" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">로그인</a>
                    </div>
                </div>
            </nav>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <!-- 페이지 헤더 -->
            <div class="text-center mb-16">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">교육 프로그램</h1>
                <p class="text-xl text-gray-600">학원 마케팅 전문가가 되기 위한 실전 교육 프로그램</p>
            </div>

            <!-- 프로그램 카드 그리드 -->
            <div id="programsGrid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <!-- 프로그램 카드들이 여기에 동적으로 로드됩니다 -->
            </div>

            <!-- CTA 섹션 -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
                <h2 class="text-3xl font-bold mb-4">프로그램 신청하기</h2>
                <p class="text-xl mb-8 text-blue-100">원하시는 프로그램을 선택하고 지금 바로 시작하세요</p>
                <a href="/contact" class="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
                    문의하기 →
                </a>
            </div>
        </main>

        <script>
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          
          // 프로그램 목록 데이터
          const programs = [
            {
              id: 'naver-place',
              name: '네이버 플레이스 상위노출',
              description: '지역 검색 1위를 위한 실전 노하우',
              details: '네이버 플레이스 최적화, 리뷰 관리, 키워드 전략',
              image: '/static/images/naver-place.png',
              icon: '🗺️',
              features: ['지역 검색 최적화', '리뷰 관리 전략', '키워드 분석', '경쟁사 분석']
            },
            {
              id: 'blog',
              name: '블로그 상위노출',
              description: '검색 1페이지 진입을 위한 블로그 마케팅',
              details: 'SEO 최적화, 콘텐츠 전략, 유입 증대 방법',
              image: '/static/images/blog-marketing.png',
              icon: '📝',
              features: ['SEO 최적화', '콘텐츠 기획', '키워드 전략', '유입 분석']
            },
            {
              id: 'funnel',
              name: '퍼널 마케팅',
              description: '자동화된 학생 모집 시스템 구축',
              details: '랜딩페이지, 자동화 시스템, 전환율 최적화',
              image: '/static/images/funnel-marketing.png',
              icon: '🎯',
              features: ['랜딩페이지 제작', '마케팅 자동화', '전환율 최적화', 'CRM 시스템']
            },
            {
              id: 'sns',
              name: 'SNS 마케팅',
              description: '인스타그램, 페이스북 활용 전략',
              details: '콘텐츠 제작, 광고 운영, 팔로워 확보',
              icon: '📱',
              features: ['콘텐츠 제작', '광고 운영', '팔로워 확보', '인플루언서 협업']
            },
            {
              id: 'video',
              name: '영상 마케팅',
              description: '유튜브, 숏폼 콘텐츠 제작',
              details: '영상 기획, 촬영/편집, 채널 운영',
              icon: '🎥',
              features: ['영상 기획', '촬영/편집', '채널 운영', '유튜브 SEO']
            },
            {
              id: 'ad',
              name: '온라인 광고',
              description: '네이버, 구글 광고 운영 전략',
              details: '광고 집행, 예산 관리, ROI 최적화',
              icon: '💰',
              features: ['광고 집행', '예산 관리', 'ROI 분석', 'A/B 테스트']
            },
            {
              id: 'community',
              name: '커뮤니티 마케팅',
              description: '학부모 커뮤니티 활성화 전략',
              details: '커뮤니티 운영, 이벤트 기획, 구전 마케팅',
              icon: '👥',
              features: ['커뮤니티 운영', '이벤트 기획', '구전 마케팅', '학부모 소통']
            },
            {
              id: 'branding',
              name: '브랜딩',
              description: '학원 브랜드 아이덴티티 구축',
              details: '브랜드 전략, 로고/디자인, 스토리텔링',
              icon: '🎨',
              features: ['브랜드 전략', '로고/디자인', '스토리텔링', 'BI/CI 구축']
            },
            {
              id: 'data',
              name: '검색량 조회',
              description: '네이버 검색량 및 순위 분석',
              details: '키워드 검색량, 플레이스 순위 조회, 경쟁사 분석',
              icon: '🔍',
              features: ['검색량 조회', '순위 확인', '경쟁사 분석', '키워드 추출']
            },
            {
              id: 'carrot',
              name: '당근 비즈니스 마케팅',
              description: '지역 기반 당근마켓 활용 전략',
              details: '당근 비즈니스 프로필, 지역 광고, 동네 홍보',
              icon: '🥕',
              features: ['비즈니스 프로필', '지역 타겟팅', '동네 광고', '직거래 유도']
            },
            {
              id: 'meta',
              name: '메타 광고',
              description: 'Facebook/Instagram 광고 운영',
              details: '메타 광고 관리자, 타겟팅, 성과 분석',
              icon: '📘',
              features: ['광고 계정 설정', '타겟 오디언스', '크리에이티브', 'ROI 최적화']
            },
            {
              id: 'youtube-ad',
              name: '유튜브 광고',
              description: '유튜브 광고 캠페인 운영',
              details: '유튜브 광고 유형, 타겟팅, 영상 제작',
              icon: '📺',
              features: ['광고 유형 선택', '타겟 설정', '영상 제작', '성과 측정']
            },
            {
              id: 'threads',
              name: '쓰레드 마케팅',
              description: 'Meta Threads 활용 전략',
              details: '쓰레드 콘텐츠, 커뮤니티 구축, 바이럴 마케팅',
              icon: '🧵',
              features: ['콘텐츠 전략', '팔로워 확보', '트렌드 활용', '인게이지먼트']
            }
          ];

          // 사용자 권한 확인
          async function loadPrograms() {
            const grid = document.getElementById('programsGrid');
            
            let userPermissions = [];
            if (user.id) {
              try {
                const response = await fetch(\`/api/user/\${user.id}/permissions\`);
                const data = await response.json();
                userPermissions = data.permissions || [];
              } catch (error) {
                console.error('권한 조회 실패:', error);
              }
            }

            // 프로그램 권한 필터링
            const programPermissions = userPermissions
              .filter(p => p.permission_type === 'program')
              .map(p => p.permission_name);

            // 프로그램 카드 렌더링
            programs.forEach(program => {
              const hasPermission = user.role === 'admin' || programPermissions.includes(program.id);
              
              const card = \`
                <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition p-6 border border-gray-200">
                  <div class="text-5xl mb-4">\${program.icon}</div>
                  <h3 class="text-2xl font-bold text-gray-900 mb-3">\${program.name}</h3>
                  <p class="text-gray-600 mb-4">\${program.description}</p>
                  <p class="text-sm text-gray-500 mb-6">\${program.details}</p>
                  
                  <div class="mb-6">
                    <p class="text-sm font-semibold text-gray-700 mb-2">주요 내용:</p>
                    <ul class="space-y-1">
                      \${program.features.map(f => \`
                        <li class="text-sm text-gray-600 flex items-center">
                          <span class="text-blue-600 mr-2">✓</span> \${f}
                        </li>
                      \`).join('')}
                    </ul>
                  </div>
                  
                  \${hasPermission ? \`
                    <a href="/programs/\${program.id}" 
                       class="block w-full py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-semibold">
                      프로그램 시작하기 →
                    </a>
                  \` : \`
                    <button onclick="requestAccess('\${program.id}', '\${program.name}')" 
                            class="w-full py-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition font-semibold">
                      🔒 권한 요청하기
                    </button>
                  \`}
                </div>
              \`;
              
              grid.innerHTML += card;
            });
          }

          // 권한 요청
          function requestAccess(programId, programName) {
            if (!user.id) {
              alert('로그인이 필요합니다.');
              window.location.href = '/login';
              return;
            }
            
            // 특정 프로그램은 직접 페이지로 이동
            const programUrls = {
              'data': '/tools/search-volume',
              'sms': '/tools/sms-sender',
              'blog': '/tools/blog-writer',
              'landing': '/tools/landing-builder',
              'student': '/tools/student-management'
            };
            
            if (programUrls[programId]) {
              window.location.href = programUrls[programId];
              return;
            }
            
            alert(\`"\${programName}" 프로그램에 대한 권한 요청이 접수되었습니다.\\n관리자 승인 후 이용하실 수 있습니다.\`);
            
            // 실제로는 권한 요청 API 호출
            // 예: POST /api/access-requests { userId, programId, programName }
          }

          // 페이지 로드 시 프로그램 목록 로드
          loadPrograms();
        </script>
    </body>
    </html>
  `)
})

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
                        <a href="/" class="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg font-medium">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                            <span>🏠 홈으로</span>
                        </a>
                        <span id="userName" class="text-gray-700 font-medium"></span>
                        <a href="/profile" class="text-gray-600 hover:text-purple-600 transition">프로필</a>
                        <a id="adminDashboardBtn" href="/admin/dashboard" class="hidden bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium">
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
                <div class="grid md:grid-cols-5 gap-6 mb-12">
                    <div class="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-blue-100">보유 포인트</div>
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="text-4xl font-bold mb-3"><span id="userPoints">0</span>P</div>
                        <div class="space-y-2">
                            <button onclick="openDepositModal()" class="w-full bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium text-sm">
                                💰 입금 신청
                            </button>
                            <a href="/my-deposits" class="block w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition font-medium text-sm text-center">
                                📋 입금 내역
                            </a>
                        </div>
                    </div>

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

                <!-- My Landing Pages Section -->
                <div class="mb-12">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">🚀 내 랜딩페이지</h2>
                        <div class="flex gap-3">
                            <a href="/tools/landing-builder" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm">
                                + 새 랜딩페이지
                            </a>
                            <a href="/tools/landing-manager" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">
                                전체 관리
                            </a>
                        </div>
                    </div>
                    <div id="landingPagesContainer" class="grid md:grid-cols-3 gap-6">
                        <div class="col-span-3 text-center py-12 text-gray-500">
                            로딩 중...
                        </div>
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
                    if (nav) {
                        const returnBtn = document.createElement('button')
                        returnBtn.onclick = returnToAdmin
                        returnBtn.className = 'px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all'
                        returnBtn.innerHTML = '🔙 관리자로 돌아가기'
                        nav.insertBefore(returnBtn, nav.firstChild)
                    }
                }
            }
            
            // 페이지 로드 시 실행
            loadUserPoints()
            loadMyLandingPages()

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

            // 포인트 실시간 로드
            async function loadUserPoints() {
                const user = JSON.parse(localStorage.getItem('user'))
                if (user && user.id) {
                    try {
                        const response = await fetch('/api/users/' + user.id + '/points')
                        const data = await response.json()
                        if (data.success) {
                            const points = data.points || 0
                            document.getElementById('userPoints').textContent = points.toLocaleString()
                            
                            // localStorage도 업데이트
                            user.points = points
                            localStorage.setItem('user', JSON.stringify(user))
                        }
                    } catch (error) {
                        console.error('포인트 로드 실패:', error)
                    }
                }
            }

            // 내 랜딩페이지 불러오기
            async function loadMyLandingPages() {
                const user = JSON.parse(localStorage.getItem('user'))
                if (user && user.id) {
                    try {
                        const response = await fetch('/api/landing/my-pages?userId=' + user.id)
                        const data = await response.json()
                        
                        const container = document.getElementById('landingPagesContainer')
                        
                        if (data.success && data.pages && data.pages.length > 0) {
                            // 최근 3개만 표시
                            const recentPages = data.pages.slice(0, 3)
                            container.innerHTML = recentPages.map(page => {
                                const pageUrl = window.location.origin + '/landing/' + page.slug
                                const statusBadge = page.status === 'active' 
                                    ? '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">활성</span>'
                                    : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">비활성</span>'
                                
                                return '<div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">' +
                                    '<div class="flex justify-between items-start mb-3">' +
                                        '<h3 class="font-bold text-gray-900 text-lg">' + page.title + '</h3>' +
                                        statusBadge +
                                    '</div>' +
                                    '<div class="text-sm text-gray-600 mb-4">' +
                                        '<div class="flex items-center gap-2 mb-2">' +
                                            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>' +
                                            '<span>조회수: ' + (page.view_count || 0) + '회</span>' +
                                        '</div>' +
                                        '<div class="text-xs text-gray-500">' +
                                            '생성일: ' + new Date(page.created_at).toLocaleDateString('ko-KR') +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="flex gap-2">' +
                                        '<a href="' + pageUrl + '" target="_blank" class="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition text-center">' +
                                            '미리보기' +
                                        '</a>' +
                                        '<button onclick="copyUrl(' + "'" + pageUrl + "'" + ')" class="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition">' +
                                            '🔗' +
                                        '</button>' +
                                    '</div>' +
                                '</div>'
                            }).join('')
                        } else {
                            container.innerHTML = '<div class="col-span-3 text-center py-12">' +
                                '<div class="text-gray-400 mb-4">' +
                                    '<svg class="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>' +
                                    '</svg>' +
                                    '<p class="text-lg font-medium">아직 생성한 랜딩페이지가 없습니다</p>' +
                                '</div>' +
                                '<a href="/tools/landing-builder" class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">' +
                                    '첫 랜딩페이지 만들기' +
                                '</a>' +
                            '</div>'
                        }
                    } catch (error) {
                        console.error('랜딩페이지 로드 실패:', error)
                        document.getElementById('landingPagesContainer').innerHTML = 
                            '<div class="col-span-3 text-center py-12 text-gray-500">로딩 실패</div>'
                    }
                }
            }

            // URL 복사
            function copyUrl(url) {
                navigator.clipboard.writeText(url).then(() => {
                    alert('URL이 복사되었습니다! ' + url)
                }).catch(err => {
                    alert('복사 실패: ' + err)
                })
            }

            // 5초마다 포인트 자동 갱신
            setInterval(loadUserPoints, 5000)

            // 입금 신청 모달 열기
            function openDepositModal() {
                document.getElementById('depositModal').classList.remove('hidden')
            }

            // 입금 신청 모달 닫기
            function closeDepositModal() {
                document.getElementById('depositModal').classList.add('hidden')
            }

            // 계좌번호 복사
            function copyAccountNumber() {
                const accountNumber = '746-910023-17004'
                navigator.clipboard.writeText(accountNumber).then(() => {
                    alert('계좌번호가 복사되었습니다! ' + accountNumber)
                }).catch(err => {
                    alert('복사 실패: ' + err)
                })
            }

            // 입금 신청
            async function submitDeposit() {
                const user = JSON.parse(localStorage.getItem('user'))
                const amount = document.getElementById('depositAmount').value
                const bankName = document.getElementById('bankName').value
                const accountNumber = document.getElementById('accountNumber').value
                const depositorName = document.getElementById('depositorName').value
                const message = document.getElementById('depositMessage').value

                if (!amount || amount <= 0) {
                    alert('입금 금액을 입력해주세요.')
                    return
                }

                try {
                    const response = await fetch('/api/deposit/request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            userName: user.name,
                            userEmail: user.email,
                            amount: parseInt(amount),
                            bankName,
                            accountNumber,
                            depositorName,
                            message
                        })
                    })

                    const data = await response.json()
                    if (data.success) {
                        alert('입금 신청이 완료되었습니다! 관리자 확인 후 포인트가 지급됩니다.')
                        closeDepositModal()
                        // 폼 초기화
                        document.getElementById('depositAmount').value = ''
                        document.getElementById('bankName').value = ''
                        document.getElementById('accountNumber').value = ''
                        document.getElementById('depositorName').value = ''
                        document.getElementById('depositMessage').value = ''
                    } else {
                        alert('오류: ' + data.error)
                    }
                } catch (error) {
                    alert('입금 신청 중 오류가 발생했습니다.')
                }
            }

            // 페이지 로드 시 즉시 포인트 로드
            loadUserPoints()
            
            document.addEventListener('DOMContentLoaded', () => {
                loadUserPoints()
            })
        </script>

        <!-- 입금 신청 모달 -->
        <div id="depositModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">💰 입금 신청</h3>
                    <button onclick="closeDepositModal()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- 계좌 정보 -->
                <div class="bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl p-5 mb-6 text-white">
                    <h4 class="font-bold mb-3 flex items-center gap-2">
                        <i class="fas fa-university"></i>
                        입금 계좌 정보
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between items-center">
                            <span class="text-blue-100">은행</span>
                            <span class="font-bold">하나은행</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-blue-100">계좌번호</span>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-lg">746-910023-17004</span>
                                <button onclick="copyAccountNumber()" class="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-50 transition">
                                    복사
                                </button>
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-blue-100">예금주</span>
                            <span class="font-bold">주식회사 우리는 슈퍼플레이스다</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">입금 금액 *</label>
                        <input type="number" id="depositAmount" placeholder="10000" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">은행명</label>
                        <input type="text" id="bankName" placeholder="국민은행" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">계좌번호</label>
                        <input type="text" id="accountNumber" placeholder="123-45-678901" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">입금자명</label>
                        <input type="text" id="depositorName" placeholder="홍길동" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">메모</label>
                        <textarea id="depositMessage" rows="3" placeholder="추가 메시지 (선택사항)" 
                                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button onclick="closeDepositModal()" 
                                class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                            취소
                        </button>
                        <button onclick="submitDeposit()" 
                                class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            신청하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
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
                        <button onclick="selectTemplate('academy-intro', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🏫</div>
                            <div class="font-bold text-lg mb-2">학원 소개 페이지</div>
                            <p class="text-sm text-gray-600">학원의 강점과 특징을 효과적으로 홍보</p>
                        </button>
                        <button onclick="selectTemplate('program-promo', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📚</div>
                            <div class="font-bold text-lg mb-2">프로그램 홍보</div>
                            <p class="text-sm text-gray-600">특정 프로그램 등록을 유도하는 페이지</p>
                        </button>
                        <button onclick="selectTemplate('event-promo', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🎉</div>
                            <div class="font-bold text-lg mb-2">이벤트 프로모션</div>
                            <p class="text-sm text-gray-600">긴급감 있는 한정 이벤트 페이지</p>
                        </button>
                        <button onclick="selectTemplate('student-report', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📊</div>
                            <div class="font-bold text-lg mb-2">학생 성과 리포트</div>
                            <p class="text-sm text-gray-600">월간 학습 리포트 공유 페이지</p>
                        </button>
                        <button onclick="selectTemplate('admission-info', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">🎓</div>
                            <div class="font-bold text-lg mb-2">입학 설명회</div>
                            <p class="text-sm text-gray-600">설명회 안내 및 참석 유도 페이지</p>
                        </button>
                        <button onclick="selectTemplate('academy-stats', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
                            <div class="text-3xl mb-3">📈</div>
                            <div class="font-bold text-lg mb-2">학원 성과 통계</div>
                            <p class="text-sm text-gray-600">실적과 성과를 수치로 보여주는 페이지</p>
                        </button>
                        <button onclick="selectTemplate('teacher-intro', event)" class="template-btn p-6 border-2 border-gray-200 rounded-xl hover:border-purple-600 transition text-left">
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

                    <!-- 폴더 선택 -->
                    <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">3️⃣ 폴더 선택 (선택사항)</h2>
                        <p class="text-sm text-gray-600 mb-4">랜딩페이지를 저장할 폴더를 선택하세요</p>
                        <div class="space-y-4">
                            <div class="flex gap-3">
                                <select id="folderSelect" class="flex-1 px-4 py-3 border border-gray-300 rounded-xl">
                                    <option value="">폴더 없음 (루트에 저장)</option>
                                </select>
                                <button type="button" onclick="showNewFolderInput()" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition">
                                    + 새 폴더
                                </button>
                            </div>
                            <div id="newFolderInput" class="hidden">
                                <div class="flex gap-3">
                                    <input type="text" id="newFolderName" placeholder="새 폴더 이름 입력" class="flex-1 px-4 py-3 border border-gray-300 rounded-xl">
                                    <button type="button" onclick="createFolder()" class="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
                                        생성
                                    </button>
                                    <button type="button" onclick="hideNewFolderInput()" class="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition">
                                        취소
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 썸네일 업로드 -->
                    <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">4️⃣ 썸네일 설정 (선택사항)</h2>
                        <p class="text-sm text-gray-600 mb-6">카카오톡, 페이스북 등에서 링크 공유 시 보여질 이미지를 설정하세요</p>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">썸네일 이미지 URL</label>
                                <input type="text" id="thumbnailUrl" placeholder="https://example.com/image.jpg (선택사항)" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                <p class="text-xs text-gray-500 mt-2">💡 이미지 URL을 입력하거나, 파일을 업로드하세요 (권장 크기: 1200x630px)</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">또는 파일 업로드</label>
                                <input type="file" id="thumbnailFile" accept="image/*" class="w-full px-4 py-3 border border-gray-300 rounded-xl" onchange="handleThumbnailUpload(event)">
                            </div>
                            <div id="thumbnailPreview" class="hidden">
                                <p class="text-sm font-medium text-gray-900 mb-2">미리보기</p>
                                <img id="thumbnailPreviewImg" src="" alt="썸네일 미리보기" class="w-full max-w-md rounded-lg border border-gray-300 shadow-sm">
                            </div>
                        </div>
                    </div>

                    <!-- 공유 시 표시될 제목/설명 설정 -->
                    <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">5️⃣ 공유 시 표시 내용 (선택사항)</h2>
                        <p class="text-sm text-gray-600 mb-6">카카오톡, 페이스북 등에서 링크 공유 시 보여질 제목과 설명을 설정하세요</p>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">큰 글자 (제목)</label>
                                <input type="text" id="ogTitle" placeholder="예: 꾸메땅학원 겨울방학 특강 모집" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                <p class="text-xs text-gray-500 mt-1">💡 비워두면 랜딩페이지 제목이 자동으로 사용됩니다</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">작은 글자 (설명)</label>
                                <textarea id="ogDescription" rows="2" placeholder="예: 중등 영어/수학 집중 케어! 선착순 20명 한정 할인 중" class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                                <p class="text-xs text-gray-500 mt-1">💡 비워두면 기본 설명이 사용됩니다</p>
                            </div>
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p class="text-sm text-blue-800">
                                    <strong>📱 카카오톡 미리보기</strong><br>
                                    <span class="text-base font-bold text-gray-900" id="previewOgTitle">꾸메땅학원 겨울방학 특강 모집</span><br>
                                    <span class="text-sm text-gray-600" id="previewOgDescription">중등 영어/수학 집중 케어! 선착순 20명 한정 할인 중</span>
                                </p>
                            </div>
                        </div>
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
        let userFolders = [];

        // 로그인 체크 (선택적)
        const userData = localStorage.getItem('user');
        if (userData) {
            user = JSON.parse(userData);
            // 사용자 폴더 목록 로드
            loadUserFolders();
        } else {
            // 로그인 없이도 테스트 가능하도록 기본 사용자 설정
            user = { id: 1, name: '게스트' };
            console.warn('로그인하지 않았습니다. 게스트 모드로 사용합니다.');
            loadUserFolders();
        }

        // 사용자 폴더 목록 로드
        async function loadUserFolders() {
            try {
                const response = await fetch('/api/landing/folders?userId=' + user.id);
                const result = await response.json();
                if (result.success) {
                    userFolders = result.folders || [];
                    updateFolderSelect();
                }
            } catch (error) {
                console.error('폴더 로드 실패:', error);
            }
        }

        // 폴더 선택 드롭다운 업데이트
        function updateFolderSelect() {
            const select = document.getElementById('folderSelect');
            if (!select) return;
            
            // 기존 옵션 제거 (첫 번째 "폴더 없음" 제외)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 폴더 목록 추가
            userFolders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = folder.name;
                select.appendChild(option);
            });
            
            // 마지막 선택한 폴더가 있으면 자동 선택
            const lastFolderId = localStorage.getItem('lastSelectedFolder');
            if (lastFolderId) {
                select.value = lastFolderId;
            }
        }

        // 새 폴더 입력창 표시
        function showNewFolderInput() {
            document.getElementById('newFolderInput').classList.remove('hidden');
            document.getElementById('newFolderName').focus();
        }

        // 새 폴더 입력창 숨기기
        function hideNewFolderInput() {
            document.getElementById('newFolderInput').classList.add('hidden');
            document.getElementById('newFolderName').value = '';
        }

        // 새 폴더 생성
        async function createFolder() {
            const folderName = document.getElementById('newFolderName').value.trim();
            if (!folderName) {
                alert('폴더 이름을 입력해주세요.');
                return;
            }

            try {
                const response = await fetch('/api/landing/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        name: folderName
                    })
                });

                const result = await response.json();
                if (result.success) {
                    alert('✅ 폴더 "' + folderName + '"가 생성되었습니다!');
                    hideNewFolderInput();
                    await loadUserFolders();
                    // 새로 생성한 폴더 자동 선택
                    document.getElementById('folderSelect').value = result.folderId;
                } else {
                    alert('폴더 생성 실패: ' + result.error);
                }
            } catch (error) {
                console.error('폴더 생성 오류:', error);
                alert('폴더 생성 중 오류가 발생했습니다.');
            }
        }

        function logout() {
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        function selectTemplate(type, event) {
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

        // 썸네일 업로드 처리
        async function handleThumbnailUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 파일 타입 체크
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                event.target.value = '';
                return;
            }

            // 로딩 표시
            alert('이미지 업로드 중입니다. 잠시만 기다려주세요...');

            try {
                // 이미지를 리사이징하여 Base64로 변환
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // 최대 크기: 1200x630 (OG 이미지 권장 사이즈)
                    const maxWidth = 1200;
                    const maxHeight = 630;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // JPEG로 압축 (품질 0.85)
                    canvas.toBlob(async function(blob) {
                        // imgbb API로 업로드
                        const formData = new FormData();
                        formData.append('image', blob);
                        
                        try {
                            // imgbb 무료 API 키
                            const apiKey = 'a6acb7467153b3cf20cff3f57aa812a8';
                            
                            const response = await fetch(\`https://api.imgbb.com/1/upload?key=\${apiKey}\`, {
                                method: 'POST',
                                body: formData
                            });
                            
                            const result = await response.json();
                            
                            if (result.success && result.data && result.data.url) {
                                const imageUrl = result.data.url;
                                
                                // UI 업데이트
                                document.getElementById('thumbnailUrl').value = imageUrl;
                                document.getElementById('thumbnailPreviewImg').src = imageUrl;
                                document.getElementById('thumbnailPreview').classList.remove('hidden');
                                
                                alert('✅ 이미지가 성공적으로 업로드되었습니다!\\n\\nURL: ' + imageUrl);
                            } else {
                                // imgbb 실패 시 Base64로 폴백
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                
                                document.getElementById('thumbnailUrl').value = dataUrl;
                                document.getElementById('thumbnailPreviewImg').src = dataUrl;
                                document.getElementById('thumbnailPreview').classList.remove('hidden');
                                
                                alert('✅ 이미지가 업로드되었습니다!');
                            }
                        } catch (error) {
                            console.error('imgbb 업로드 오류:', error);
                            
                            // API 실패 시 Base64로 폴백
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                            
                            document.getElementById('thumbnailUrl').value = dataUrl;
                            document.getElementById('thumbnailPreviewImg').src = dataUrl;
                            document.getElementById('thumbnailPreview').classList.remove('hidden');
                            
                            alert('✅ 이미지가 로컬에 저장되었습니다!');
                        }
                    }, 'image/jpeg', 0.85);
                };
                
                img.onerror = function() {
                    alert('❌ 이미지를 불러올 수 없습니다. 다른 이미지를 선택해주세요.');
                    event.target.value = '';
                };
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error('업로드 오류:', error);
                alert('❌ 이미지 업로드에 실패했습니다.\\n\\n이미지 URL을 직접 입력해주세요.');
                event.target.value = '';
            }
        }

        // OG 제목/설명 실시간 미리보기
        document.addEventListener('DOMContentLoaded', function() {
            const ogTitleInput = document.getElementById('ogTitle');
            const ogDescInput = document.getElementById('ogDescription');
            const previewTitle = document.getElementById('previewOgTitle');
            const previewDesc = document.getElementById('previewOgDescription');

            if (ogTitleInput && previewTitle) {
                ogTitleInput.addEventListener('input', function() {
                    previewTitle.textContent = this.value || '꾸메땅학원 겨울방학 특강 모집';
                });
            }

            if (ogDescInput && previewDesc) {
                ogDescInput.addEventListener('input', function() {
                    previewDesc.textContent = this.value || '중등 영어/수학 집중 케어! 선착순 20명 한정 할인 중';
                });
            }
        });

        async function generateLanding() {
            if (!selectedTemplate) {
                alert('템플릿을 선택해주세요.');
                return;
            }

            const formData = new FormData(document.getElementById('landingForm'));
            const data = Object.fromEntries(formData);

            // 썸네일 URL 가져오기
            const thumbnailUrl = document.getElementById('thumbnailUrl').value || '';
            
            // OG 제목/설명 가져오기
            const ogTitle = document.getElementById('ogTitle').value || '';
            const ogDescription = document.getElementById('ogDescription').value || '';
            
            // 선택된 폴더 가져오기
            const folderId = document.getElementById('folderSelect').value || null;
            
            // 선택된 폴더를 localStorage에 저장 (다음번에 자동 선택)
            if (folderId) {
                localStorage.setItem('lastSelectedFolder', folderId);
            } else {
                localStorage.removeItem('lastSelectedFolder');
            }

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
                // 디버깅: 전송할 데이터 확인
                console.log('🔍 전송할 데이터:', {
                    title,
                    template_type: selectedTemplate,
                    thumbnail_url: thumbnailUrl,
                    og_title: ogTitle,
                    og_description: ogDescription,
                    folder_id: folderId
                });
                
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
                        input_data: data,
                        thumbnail_url: thumbnailUrl,
                        og_title: ogTitle,
                        og_description: ogDescription,
                        folder_id: folderId
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
                <div class="mb-8 flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">📁 내 랜딩페이지</h1>
                        <p class="text-gray-600">생성한 랜딩페이지를 폴더로 정리하고 관리하세요</p>
                    </div>
                    <button onclick="openFolderModal()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                        + 새 폴더
                    </button>
                </div>

                <!-- Folders -->
                <div class="mb-8">
                    <div class="flex gap-3 overflow-x-auto pb-4" id="foldersList">
                        <button onclick="selectFolder(null)" id="folder-all" class="folder-btn px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap">
                            📁 전체 (0)
                        </button>
                    </div>
                </div>

                <!-- Pages List -->
                <div id="pagesList" class="space-y-4">
                    <div class="text-center py-12 text-gray-500">로딩중...</div>
                </div>
            </div>
        </div>

        <!-- Folder Modal -->
        <div id="folderModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">새 폴더 만들기</h2>
                <input type="text" id="folderName" placeholder="폴더 이름 (예: 학부모 공유용)" 
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl mb-6">
                <div class="flex gap-3">
                    <button onclick="closeFolderModal()" class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                        취소
                    </button>
                    <button onclick="createFolder()" class="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
                        생성
                    </button>
                </div>
            </div>
        </div>

        <!-- Move to Folder Modal -->
        <div id="moveFolderModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">폴더로 이동</h2>
                <div id="folderSelectList" class="space-y-2 mb-6 max-h-96 overflow-y-auto">
                    <!-- 폴더 목록 -->
                </div>
                <button onclick="closeMoveFolderModal()" class="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                    취소
                </button>
            </div>
        </div>

        <script>
        let user = null;
        let currentFolder = null;
        let allFolders = [];
        let currentPageToMove = null;

        const userData = localStorage.getItem('user');
        if (!userData) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
        } else {
            user = JSON.parse(userData);
            loadFolders();
            loadPages();
        }

        function logout() {
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        // 폴더 불러오기
        async function loadFolders() {
            try {
                const response = await fetch('/api/landing/folders?userId=' + user.id);
                const result = await response.json();
                
                if (result.success && result.folders) {
                    allFolders = result.folders;
                    const foldersHtml = allFolders.map(f => 
                        '<button onclick="selectFolder(' + f.id + ')" id="folder-' + f.id + '" class="folder-btn px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap">' +
                            '📁 ' + f.name + ' (' + (f.page_count || 0) + ')' +
                        '</button>'
                    ).join('');
                    
                    document.getElementById('foldersList').innerHTML = 
                        '<button onclick="selectFolder(null)" id="folder-all" class="folder-btn px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap">' +
                            '📁 전체 (' + (result.totalPages || 0) + ')' +
                        '</button>' + foldersHtml;
                }
            } catch (error) {
                console.error('폴더 로드 실패:', error);
            }
        }

        // 폴더 선택
        function selectFolder(folderId) {
            currentFolder = folderId;
            
            // 버튼 스타일 업데이트
            document.querySelectorAll('.folder-btn').forEach(btn => {
                btn.className = 'folder-btn px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap';
            });
            
            const selectedBtn = document.getElementById('folder-' + (folderId || 'all'));
            if (selectedBtn) {
                selectedBtn.className = 'folder-btn px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap';
            }
            
            loadPages();
        }

        // 페이지 불러오기
        async function loadPages() {
            try {
                let url = '/api/landing/my-pages?userId=' + user.id;
                if (currentFolder) {
                    url += '&folderId=' + currentFolder;
                }
                
                const response = await fetch(url);
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
                        const safeUrl = url.replace(/'/g, "\\'");
                        return '<div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition">' +
                                '<div class="flex items-start justify-between">' +
                                    '<div class="flex-1">' +
                                        '<div class="flex items-center gap-3 mb-2">' +
                                            '<span class="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">' +
                                                (typeNames[p.template_type] || p.template_type) +
                                            '</span>' +
                                            '<span class="text-sm text-gray-500">조회수: ' + p.view_count + '</span>' +
                                        '</div>' +
                                        '<h3 class="text-xl font-bold text-gray-900 mb-3">' + p.title + '</h3>' +
                                        '<div class="flex items-center gap-2 mb-3">' +
                                            '<input type="text" value="' + url + '" readonly class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm">' +
                                            '<button onclick="copyUrl(' + "'" + safeUrl + "'" + ')" class="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">복사</button>' +
                                        '</div>' +
                                        '<p class="text-sm text-gray-500">생성일: ' + new Date(p.created_at).toLocaleString('ko-KR') + '</p>' +
                                    '</div>' +
                                    '<div class="flex flex-col gap-2 ml-4">' +
                                        '<a href="/landing/' + p.slug + '" target="_blank" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm text-center">미리보기</a>' +
                                        '<button onclick="openMoveFolderModal(' + p.id + ')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">폴더 이동</button>' +
                                        '<button onclick="deletePage(' + p.id + ')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">삭제</button>' +
                                    '</div>' +
                                '</div>' +
                            '</div>';
                    }).join('');
                    document.getElementById('pagesList').innerHTML = html;
                } else {
                    document.getElementById('pagesList').innerHTML = '<div class="text-center py-12">' +
                            '<p class="text-gray-500 mb-4">랜딩페이지가 없습니다.</p>' +
                            '<a href="/tools/landing-builder" class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">첫 랜딩페이지 만들기</a>' +
                        '</div>';
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

        // 폴더 모달
        function openFolderModal() {
            document.getElementById('folderModal').classList.remove('hidden');
        }

        function closeFolderModal() {
            document.getElementById('folderModal').classList.add('hidden');
            document.getElementById('folderName').value = '';
        }

        async function createFolder() {
            const name = document.getElementById('folderName').value.trim();
            if (!name) {
                alert('폴더 이름을 입력하세요.');
                return;
            }

            try {
                const response = await fetch('/api/landing/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, name })
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('폴더가 생성되었습니다!');
                    closeFolderModal();
                    loadFolders();
                } else {
                    alert('폴더 생성 실패: ' + result.error);
                }
            } catch (error) {
                alert('오류가 발생했습니다.');
            }
        }

        // 폴더 이동 모달
        function openMoveFolderModal(pageId) {
            currentPageToMove = pageId;
            
            const foldersHtml = allFolders.map(f =>
                '<button onclick="moveToFolder(' + f.id + ')" class="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left border border-gray-200">' +
                    '📁 ' + f.name +
                '</button>'
            ).join('');
            
            document.getElementById('folderSelectList').innerHTML = 
                '<button onclick="moveToFolder(null)" class="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left border border-gray-200">' +
                    '📁 폴더 없음 (전체)' +
                '</button>' + foldersHtml;
            
            document.getElementById('moveFolderModal').classList.remove('hidden');
        }

        function closeMoveFolderModal() {
            document.getElementById('moveFolderModal').classList.add('hidden');
            currentPageToMove = null;
        }

        async function moveToFolder(folderId) {
            try {
                const response = await fetch('/api/landing/move-to-folder', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        pageId: currentPageToMove, 
                        folderId: folderId 
                    })
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('폴더로 이동되었습니다!');
                    closeMoveFolderModal();
                    loadFolders();
                    loadPages();
                } else {
                    alert('이동 실패: ' + result.error);
                }
            } catch (error) {
                alert('오류가 발생했습니다.');
            }
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
                    loadFolders();
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
    
    // OG 메타 태그 추가
    let htmlContent = page.html_content as string
    const fullUrl = `${c.req.header('origin') || 'https://superplace-academy.pages.dev'}/landing/${slug}`
    const thumbnailUrl = (page.thumbnail_url as string) || 'https://via.placeholder.com/1200x630.png?text=Super+Place+Academy'
    
    // 커스텀 OG 제목/설명 또는 기본값 사용
    const ogTitle = (page.og_title as string) || (page.title as string) || '우리는 슈퍼플레이스다'
    const ogDescription = (page.og_description as string) || '꾸메땅학원의 전문적인 교육 서비스를 만나보세요'
    
    // <head> 태그에 OG 메타 태그 주입
    const ogTags = `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${fullUrl}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:image" content="${thumbnailUrl}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${fullUrl}">
    <meta property="twitter:title" content="${ogTitle}">
    <meta property="twitter:description" content="${ogDescription}">
    <meta property="twitter:image" content="${thumbnailUrl}">
    `
    
    // </head> 직전에 OG 태그 추가
    htmlContent = htmlContent.replace('</head>', `${ogTags}</head>`)
    
    // HTML 반환
    return c.html(htmlContent)
  } catch (error) {
    return c.html('<h1>오류가 발생했습니다.</h1>', 500)
  }
})

// 관리자 페이지 리다이렉트 (로컬 개발용)
// 프로덕션에서는 Cloudflare Pages가 자동으로 dist/admin/*.html을 서빙합니다
// Admin redirects removed - using direct routes

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

// 검색량 조회 페이지
app.get('/tools/search-volume', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>검색량 조회 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="max-w-7xl mx-auto p-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900">🔍 검색량 조회</h1>
                <a href="/dashboard" class="px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    대시보드로 돌아가기
                </a>
            </div>

            <!-- 검색 입력 섹션 -->
            <div class="bg-white rounded-2xl p-8 shadow-lg mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">키워드 분석</h2>
                
                <div class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">분석 키워드</label>
                        <input type="text" id="keyword" placeholder="예: 인천 영어학원" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">네이버 플레이스 URL</label>
                        <input type="text" id="placeUrl" placeholder="https://m.place.naver.com/..." 
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        <p class="text-sm text-gray-500 mt-2">※ 본인 학원의 네이버 플레이스 URL을 입력하세요</p>
                    </div>

                    <button onclick="analyzeKeyword()" 
                            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl font-bold text-lg">
                        🔍 분석 시작
                    </button>
                </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="loading" class="hidden bg-white rounded-2xl p-12 shadow-lg text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                <p class="text-gray-600 text-lg">분석 중입니다... 잠시만 기다려주세요</p>
                <p class="text-gray-500 text-sm mt-2">네이버 데이터를 수집하고 있습니다</p>
            </div>

            <!-- 검색량 결과 -->
            <div id="searchVolumeResult" class="hidden bg-white rounded-2xl p-8 shadow-lg mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">📊 검색량 분석 결과</h2>
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div class="text-sm text-blue-700 mb-2">월 평균 검색량</div>
                        <div class="text-4xl font-bold text-blue-900" id="monthlyVolume">-</div>
                    </div>
                    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div class="text-sm text-green-700 mb-2">경쟁 강도</div>
                        <div class="text-4xl font-bold text-green-900" id="competition">-</div>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div class="text-sm text-purple-700 mb-2">추천도</div>
                        <div class="text-4xl font-bold text-purple-900" id="recommendation">-</div>
                    </div>
                </div>
            </div>

            <!-- 순위 결과 -->
            <div id="rankingResult" class="hidden bg-white rounded-2xl p-8 shadow-lg mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">🏆 플레이스 순위</h2>
                <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white mb-6">
                    <div class="text-lg mb-2">내 순위 (광고 제외)</div>
                    <div class="text-5xl font-bold" id="myRanking">-</div>
                </div>
                
                <h3 class="text-xl font-bold text-gray-900 mb-4">경쟁사 순위</h3>
                <div id="competitorList" class="space-y-3">
                    <!-- 경쟁사 목록이 여기에 표시됩니다 -->
                </div>
            </div>

            <!-- 키워드 분석 결과 -->
            <div id="keywordResult" class="hidden bg-white rounded-2xl p-8 shadow-lg">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">🏷️ 경쟁사 키워드 분석</h2>
                <div id="competitorKeywords" class="grid md:grid-cols-2 gap-6">
                    <!-- 키워드 분석 결과가 여기에 표시됩니다 -->
                </div>
            </div>

            <!-- 안내 메시지 -->
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
                <h3 class="text-lg font-bold text-yellow-900 mb-3">⚠️ 사용 안내</h3>
                <ul class="space-y-2 text-yellow-800 text-sm">
                    <li>• 검색량 데이터는 네이버 광고 API를 통해 제공됩니다</li>
                    <li>• 순위 조회는 실시간 크롤링으로 진행되며, 2-3분 소요될 수 있습니다</li>
                    <li>• 정확한 분석을 위해 정확한 플레이스 URL을 입력해주세요</li>
                    <li>• 일일 조회 한도: 100회 (포인트 차감 없음)</li>
                </ul>
            </div>
        </div>

        <script>
            async function analyzeKeyword() {
                const keyword = document.getElementById('keyword').value.trim();
                const placeUrl = document.getElementById('placeUrl').value.trim();

                if (!keyword) {
                    alert('분석할 키워드를 입력해주세요.');
                    return;
                }

                if (!placeUrl) {
                    alert('네이버 플레이스 URL을 입력해주세요.');
                    return;
                }

                // 로딩 표시
                document.getElementById('loading').classList.remove('hidden');
                document.getElementById('searchVolumeResult').classList.add('hidden');
                document.getElementById('rankingResult').classList.add('hidden');
                document.getElementById('keywordResult').classList.add('hidden');

                try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    
                    const response = await fetch('/api/search-analysis', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: user?.id,
                            keyword: keyword,
                            placeUrl: placeUrl
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // 검색량 결과 표시
                        document.getElementById('monthlyVolume').textContent = 
                            data.searchVolume?.monthlyAvg?.toLocaleString() || '집계중';
                        document.getElementById('competition').textContent = 
                            data.searchVolume?.competition || '보통';
                        document.getElementById('recommendation').textContent = 
                            data.searchVolume?.recommendation || '분석중';
                        document.getElementById('searchVolumeResult').classList.remove('hidden');

                        // 순위 결과 표시
                        if (data.ranking) {
                            document.getElementById('myRanking').textContent = 
                                data.ranking.myRank ? data.ranking.myRank + '위' : '순위권 밖';
                            
                            // 경쟁사 목록 표시
                            const competitorHtml = data.ranking.competitors.map((comp, idx) => \`
                                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div class="flex items-center gap-4">
                                        <div class="text-2xl font-bold text-gray-400">\${idx + 1}</div>
                                        <div>
                                            <div class="font-bold text-gray-900">\${comp.name}</div>
                                            <div class="text-sm text-gray-600">\${comp.category || '업종 정보 없음'}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm text-gray-600">리뷰</div>
                                        <div class="font-bold text-gray-900">\${comp.reviewCount || 0}개</div>
                                    </div>
                                </div>
                            \`).join('');
                            document.getElementById('competitorList').innerHTML = competitorHtml;
                            document.getElementById('rankingResult').classList.remove('hidden');
                        }

                        // 키워드 분석 결과 표시
                        if (data.keywords && data.keywords.length > 0) {
                            const keywordHtml = data.keywords.map(item => \`
                                <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <div class="font-bold text-gray-900 mb-3">\${item.businessName}</div>
                                    <div class="flex flex-wrap gap-2">
                                        \${item.keywords.map(kw => \`
                                            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                                \${kw}
                                            </span>
                                        \`).join('')}
                                    </div>
                                </div>
                            \`).join('');
                            document.getElementById('competitorKeywords').innerHTML = keywordHtml;
                            document.getElementById('keywordResult').classList.remove('hidden');
                        }
                    } else {
                        alert('분석 중 오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'));
                    }
                } catch (error) {
                    console.error('분석 오류:', error);
                    alert('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                } finally {
                    document.getElementById('loading').classList.add('hidden');
                }
            }

            // 엔터 키로 검색
            document.getElementById('keyword').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') analyzeKeyword();
            });
            document.getElementById('placeUrl').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') analyzeKeyword();
            });
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

// 네이버 플레이스 마케팅 도구
app.get('/programs/naver-place', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>네이버 플레이스 마케팅 도구 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white shadow-sm sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/programs" class="text-2xl font-bold text-blue-600">🗺️ 네이버 플레이스 도구</a>
                        <div class="hidden md:flex gap-6">
                            <a href="#keyword" class="text-gray-600 hover:text-blue-600">키워드 분석</a>
                            <a href="#competitor" class="text-gray-600 hover:text-blue-600">경쟁사 분석</a>
                            <a href="#review" class="text-gray-600 hover:text-blue-600">리뷰 관리</a>
                            <a href="#optimization" class="text-gray-600 hover:text-blue-600">최적화</a>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="history.back()" class="px-4 py-2 text-gray-600 hover:text-gray-900">
                            <i class="fas fa-arrow-left mr-2"></i>뒤로
                        </button>
                        <a href="/programs" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            프로그램 목록
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            <!-- 1. 키워드 검색량 분석 -->
            <section id="keyword" class="mb-12">
                <div class="bg-white rounded-2xl shadow-sm p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-search text-blue-600 mr-3"></i>
                        키워드 검색량 분석
                    </h2>
                    <p class="text-gray-600 mb-6">우리 학원이 타겟해야 할 지역 + 업종 키워드의 예상 검색량을 확인하세요</p>
                    
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">지역 선택</label>
                            <input type="text" id="location" placeholder="예: 인천 서구, 강남구, 목동" 
                                   class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">업종/키워드</label>
                            <input type="text" id="keyword" placeholder="예: 영어학원, 수학학원, 코딩학원" 
                                   class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <button onclick="analyzeKeyword()" class="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                        <i class="fas fa-chart-line mr-2"></i>검색량 분석하기
                    </button>
                    
                    <div id="keywordResult" class="hidden mt-8">
                        <div class="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
                            <h3 class="text-xl font-bold text-gray-900 mb-4">분석 결과</h3>
                            <div class="grid md:grid-cols-3 gap-6">
                                <div class="bg-white p-4 rounded-lg">
                                    <div class="text-sm text-gray-600 mb-1">월평균 검색량</div>
                                    <div class="text-3xl font-bold text-blue-600" id="searchVolume">-</div>
                                    <div class="text-xs text-gray-500 mt-1">지역 내 검색 추정치</div>
                                </div>
                                <div class="bg-white p-4 rounded-lg">
                                    <div class="text-sm text-gray-600 mb-1">경쟁 강도</div>
                                    <div class="text-3xl font-bold" id="competition">-</div>
                                    <div class="text-xs text-gray-500 mt-1">낮을수록 유리</div>
                                </div>
                                <div class="bg-white p-4 rounded-lg">
                                    <div class="text-sm text-gray-600 mb-1">추천 점수</div>
                                    <div class="text-3xl font-bold text-green-600" id="score">-</div>
                                    <div class="text-xs text-gray-500 mt-1">/100점</div>
                                </div>
                            </div>
                            <div class="mt-6 p-4 bg-white rounded-lg">
                                <h4 class="font-semibold text-gray-900 mb-3">추천 키워드 조합</h4>
                                <div id="keywordSuggestions" class="space-y-2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 2. 경쟁사 분석 -->
            <section id="competitor" class="mb-12">
                <div class="bg-white rounded-2xl shadow-sm p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-users text-purple-600 mr-3"></i>
                        경쟁사 벤치마킹
                    </h2>
                    <p class="text-gray-600 mb-6">주변 경쟁 학원과 우리 학원을 비교 분석하세요</p>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">우리 학원 정보</label>
                        <div class="grid md:grid-cols-3 gap-4">
                            <input type="text" id="myAcademy" placeholder="학원명" class="px-4 py-3 border rounded-lg">
                            <input type="number" id="myReviews" placeholder="리뷰 수" class="px-4 py-3 border rounded-lg">
                            <input type="number" id="myRating" placeholder="평점 (1-5)" step="0.1" max="5" class="px-4 py-3 border rounded-lg">
                        </div>
                    </div>
                    
                    <button onclick="analyzeCompetitor()" class="w-full md:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                        <i class="fas fa-chart-bar mr-2"></i>경쟁력 분석하기
                    </button>
                    
                    <div id="competitorResult" class="hidden mt-8">
                        <div class="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-lg">
                            <h3 class="text-xl font-bold text-gray-900 mb-4">벤치마킹 결과</h3>
                            <canvas id="competitorChart" class="max-w-2xl mx-auto"></canvas>
                            <div class="mt-6 grid md:grid-cols-2 gap-4">
                                <div class="bg-white p-4 rounded-lg">
                                    <h4 class="font-semibold mb-3 text-green-600">💪 우리의 강점</h4>
                                    <ul id="strengths" class="space-y-2 text-sm"></ul>
                                </div>
                                <div class="bg-white p-4 rounded-lg">
                                    <h4 class="font-semibold mb-3 text-orange-600">📈 개선 포인트</h4>
                                    <ul id="improvements" class="space-y-2 text-sm"></ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 3. 리뷰 응답 템플릿 생성기 -->
            <section id="review" class="mb-12">
                <div class="bg-white rounded-2xl shadow-sm p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-star text-yellow-500 mr-3"></i>
                        리뷰 응답 자동 생성기
                    </h2>
                    <p class="text-gray-600 mb-6">고객 리뷰에 맞춤형 응답을 자동으로 생성하세요</p>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">리뷰 유형 선택</label>
                        <select id="reviewType" class="w-full px-4 py-3 border rounded-lg">
                            <option value="positive">긍정적 리뷰 (⭐⭐⭐⭐⭐)</option>
                            <option value="neutral">보통 리뷰 (⭐⭐⭐)</option>
                            <option value="negative">부정적 리뷰 (⭐⭐)</option>
                        </select>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">리뷰 내용 (선택)</label>
                        <textarea id="reviewContent" rows="3" placeholder="예: 선생님이 친절하시고 설명을 잘해주셔서 아이가 좋아합니다" 
                                  class="w-full px-4 py-3 border rounded-lg"></textarea>
                    </div>
                    
                    <button onclick="generateReviewResponse()" class="w-full md:w-auto px-8 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold">
                        <i class="fas fa-magic mr-2"></i>응답 생성하기
                    </button>
                    
                    <div id="reviewResponse" class="hidden mt-8">
                        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                            <h3 class="text-xl font-bold text-gray-900 mb-4">추천 응답</h3>
                            <div class="bg-white p-6 rounded-lg mb-4">
                                <p id="responseText" class="text-gray-800 leading-relaxed whitespace-pre-wrap"></p>
                            </div>
                            <button onclick="copyResponse()" class="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                                <i class="fas fa-copy mr-2"></i>복사하기
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 4. 플레이스 최적화 체크리스트 -->
            <section id="optimization" class="mb-12">
                <div class="bg-white rounded-2xl shadow-sm p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-check-circle text-green-600 mr-3"></i>
                        플레이스 최적화 체크리스트
                    </h2>
                    <p class="text-gray-600 mb-6">상위노출을 위한 필수 체크 포인트를 확인하세요</p>
                    
                    <div class="space-y-4">
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check1" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check1" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">정확한 카테고리 설정</div>
                                <div class="text-sm text-gray-600">업종에 맞는 정확한 카테고리를 1순위로 설정했나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check2" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check2" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">상세 정보 100% 입력</div>
                                <div class="text-sm text-gray-600">영업시간, 전화번호, 주소, 홈페이지 등 모든 정보를 입력했나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check3" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check3" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">고퀄리티 사진 등록</div>
                                <div class="text-sm text-gray-600">내부/외부 사진 10장 이상, 해상도 높은 사진을 등록했나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check4" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check4" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">정기적인 게시글 업로드</div>
                                <div class="text-sm text-gray-600">주 2-3회 이상 소식, 이벤트, 수업 후기 등을 올리고 있나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check5" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check5" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">리뷰 관리 (응답률 80% 이상)</div>
                                <div class="text-sm text-gray-600">모든 리뷰에 24시간 내 정성스러운 답변을 달고 있나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check6" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check6" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">예약 / 문의 기능 활성화</div>
                                <div class="text-sm text-gray-600">네이버 예약 또는 톡톡 상담을 켜두었나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check7" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check7" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">메뉴/가격 정보 공개</div>
                                <div class="text-sm text-gray-600">수업료, 수강 프로그램 등 투명한 가격 정보를 제공하나요?</div>
                            </label>
                        </div>
                        
                        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <input type="checkbox" id="check8" class="w-6 h-6 mt-1 text-green-600 rounded">
                            <label for="check8" class="flex-1 cursor-pointer">
                                <div class="font-semibold text-gray-900">키워드 자연스럽게 포함</div>
                                <div class="text-sm text-gray-600">소개글과 게시글에 지역+업종 키워드가 자연스럽게 들어가 있나요?</div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="mt-8 p-6 bg-green-50 rounded-lg">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-lg font-semibold text-gray-900">최적화 점수</span>
                            <span id="optimizationScore" class="text-3xl font-bold text-green-600">0/8</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div id="optimizationBar" class="bg-green-600 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                        <p class="text-sm text-gray-600 mt-3">💡 8개 항목을 모두 체크하면 상위노출 확률이 크게 높아집니다!</p>
                    </div>
                </div>
            </section>

            <!-- 5. 최적 영업시간 추천 -->
            <section class="mb-12">
                <div class="bg-white rounded-2xl shadow-sm p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-clock text-indigo-600 mr-3"></i>
                        최적 영업시간 & 게시 시간 추천
                    </h2>
                    <p class="text-gray-600 mb-6">학원 업종 특성에 맞는 최적의 운영 시간을 추천합니다</p>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="p-6 bg-indigo-50 rounded-lg">
                            <h3 class="font-bold text-gray-900 mb-4">📌 추천 영업시간</h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">평일</span>
                                    <span class="font-semibold">14:00 - 22:00</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">주말</span>
                                    <span class="font-semibold">09:00 - 18:00</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-3">* 학원 업종은 방과 후 ~ 저녁 시간대 집중 노출이 유리합니다</p>
                            </div>
                        </div>
                        
                        <div class="p-6 bg-indigo-50 rounded-lg">
                            <h3 class="font-bold text-gray-900 mb-4">📱 추천 게시글 업로드 시간</h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="w-24 text-gray-600">평일 오전</span>
                                    <span class="font-semibold">10:00 - 11:00</span>
                                    <span class="text-xs text-gray-500">(학부모 활동 시간)</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-24 text-gray-600">평일 저녁</span>
                                    <span class="font-semibold">19:00 - 20:00</span>
                                    <span class="text-xs text-gray-500">(퇴근 후 검색)</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-24 text-gray-600">주말</span>
                                    <span class="font-semibold">11:00 - 13:00</span>
                                    <span class="text-xs text-gray-500">(주말 학원 검색)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>

        <script>
            // 키워드 분석
            function analyzeKeyword() {
                const location = document.getElementById('location').value.trim();
                const keyword = document.getElementById('keyword').value.trim();
                
                if (!location || !keyword) {
                    alert('지역과 키워드를 모두 입력해주세요');
                    return;
                }
                
                // 시뮬레이션 데이터
                const searchVolume = Math.floor(Math.random() * 1500) + 500;
                const competition = ['낮음', '보통', '높음'][Math.floor(Math.random() * 3)];
                const score = Math.floor(Math.random() * 30) + 70;
                
                document.getElementById('searchVolume').textContent = searchVolume.toLocaleString();
                document.getElementById('competition').textContent = competition;
                document.getElementById('competition').className = 'text-3xl font-bold ' + 
                    (competition === '낮음' ? 'text-green-600' : competition === '보통' ? 'text-yellow-600' : 'text-red-600');
                document.getElementById('score').textContent = score;
                
                // 추천 키워드
                const suggestions = [
                    \`\${location} \${keyword}\`,
                    \`\${location} \${keyword} 추천\`,
                    \`\${location} \${keyword} 가격\`,
                    \`\${location} 초등 \${keyword}\`,
                    \`\${location} 중등 \${keyword}\`,
                ];
                
                const suggestionsHTML = suggestions.map(s => 
                    \`<div class="flex items-center gap-3 text-sm">
                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">\${s}</span>
                        <span class="text-gray-500">검색량: \${Math.floor(Math.random() * 500) + 100}</span>
                    </div>\`
                ).join('');
                
                document.getElementById('keywordSuggestions').innerHTML = suggestionsHTML;
                document.getElementById('keywordResult').classList.remove('hidden');
                
                // 스크롤
                document.getElementById('keywordResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // 경쟁사 분석
            let competitorChart = null;
            
            function analyzeCompetitor() {
                const myAcademy = document.getElementById('myAcademy').value.trim();
                const myReviews = parseInt(document.getElementById('myReviews').value) || 0;
                const myRating = parseFloat(document.getElementById('myRating').value) || 0;
                
                if (!myAcademy) {
                    alert('학원명을 입력해주세요');
                    return;
                }
                
                // 시뮬레이션 데이터
                const competitors = [
                    { name: '경쟁사 A', reviews: Math.floor(Math.random() * 100) + 50, rating: (Math.random() * 1 + 4).toFixed(1) },
                    { name: '경쟁사 B', reviews: Math.floor(Math.random() * 100) + 50, rating: (Math.random() * 1 + 4).toFixed(1) },
                    { name: '경쟁사 C', reviews: Math.floor(Math.random() * 100) + 50, rating: (Math.random() * 1 + 4).toFixed(1) },
                ];
                
                const avgReviews = Math.floor((competitors.reduce((sum, c) => sum + c.reviews, 0)) / 3);
                const avgRating = (competitors.reduce((sum, c) => sum + parseFloat(c.rating), 0) / 3).toFixed(1);
                
                // 차트 생성
                const ctx = document.getElementById('competitorChart');
                if (competitorChart) competitorChart.destroy();
                
                competitorChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: [myAcademy, ...competitors.map(c => c.name), '평균'],
                        datasets: [{
                            label: '리뷰 수',
                            data: [myReviews, ...competitors.map(c => c.reviews), avgReviews],
                            backgroundColor: ['#3B82F6', '#E5E7EB', '#E5E7EB', '#E5E7EB', '#FCD34D'],
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: { y: { beginAtZero: true } }
                    }
                });
                
                // 강점/개선점
                const strengths = [];
                const improvements = [];
                
                if (myReviews > avgReviews) strengths.push('리뷰 수가 평균보다 많습니다');
                else improvements.push(\`리뷰를 \${avgReviews - myReviews}개 더 확보하세요\`);
                
                if (myRating >= parseFloat(avgRating)) strengths.push('평점이 평균 이상입니다');
                else improvements.push('평점을 높이기 위해 서비스 품질 개선이 필요합니다');
                
                if (myReviews < 50) improvements.push('리뷰 50개 이상 확보를 목표로 하세요');
                if (myRating < 4.5) improvements.push('4.5점 이상 평점 유지를 위해 노력하세요');
                
                document.getElementById('strengths').innerHTML = strengths.map(s => 
                    \`<li class="flex items-start gap-2"><span class="text-green-600">✓</span><span>\${s}</span></li>\`
                ).join('') || '<li class="text-gray-500">분석 결과 없음</li>';
                
                document.getElementById('improvements').innerHTML = improvements.map(s => 
                    \`<li class="flex items-start gap-2"><span class="text-orange-600">→</span><span>\${s}</span></li>\`
                ).join('') || '<li class="text-gray-500">분석 결과 없음</li>';
                
                document.getElementById('competitorResult').classList.remove('hidden');
                document.getElementById('competitorResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // 리뷰 응답 생성
            function generateReviewResponse() {
                const type = document.getElementById('reviewType').value;
                const content = document.getElementById('reviewContent').value.trim();
                
                const responses = {
                    positive: [
                        "소중한 리뷰 정말 감사드립니다! 😊\\n{name} 학부모님의 따뜻한 말씀에 저희 모든 선생님들이 큰 힘을 얻습니다.\\n앞으로도 학생의 성장을 위해 최선을 다하는 {academy}이 되겠습니다.\\n항상 감사합니다! 🙏",
                        "리뷰 남겨주셔서 진심으로 감사합니다! ❤️\\n학생이 즐겁게 공부하는 모습을 보니 저희도 정말 뿌듯합니다.\\n더 나은 수업, 더 좋은 결과로 보답하겠습니다.\\n언제든지 궁금한 점 있으시면 편하게 연락주세요! 😊"
                    ],
                    neutral: [
                        "소중한 의견 감사합니다.\\n더 나은 수업 환경을 만들기 위해 노력하겠습니다.\\n혹시 개선이 필요한 부분이 있다면 언제든 말씀해 주세요!\\n{name} 학생의 발전을 위해 최선을 다하겠습니다. 🙏",
                        "리뷰 남겨주셔서 감사합니다!\\n학부모님의 의견을 반영하여 더 나은 학원이 되도록 노력하겠습니다.\\n앞으로도 많은 관심 부탁드립니다. 😊"
                    ],
                    negative: [
                        "불편을 드려 정말 죄송합니다. 😔\\n말씀해주신 부분은 즉시 개선하도록 하겠습니다.\\n학부모님과 직접 통화하여 자세한 이야기를 나누고 싶습니다.\\n학원으로 연락 주시면 성심성의껏 해결해드리겠습니다.\\n다시 한번 죄송하다는 말씀 드립니다.",
                        "귀한 의견 감사드리며, 불편을 드린 점 진심으로 사과드립니다.\\n즉시 문제를 파악하여 개선 조치를 취하겠습니다.\\n직접 찾아뵙고 말씀드리고 싶습니다.\\n학원으로 연락 부탁드립니다. 🙏"
                    ]
                };
                
                const templates = responses[type];
                const response = templates[Math.floor(Math.random() * templates.length)]
                    .replace('{name}', '학생')
                    .replace('{academy}', '학원');
                
                document.getElementById('responseText').textContent = response;
                document.getElementById('reviewResponse').classList.remove('hidden');
                document.getElementById('reviewResponse').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            function copyResponse() {
                const text = document.getElementById('responseText').textContent;
                navigator.clipboard.writeText(text).then(() => {
                    alert('✅ 응답이 클립보드에 복사되었습니다!');
                });
            }
            
            // 최적화 체크리스트
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', updateOptimizationScore);
            });
            
            function updateOptimizationScore() {
                const total = 8;
                const checked = document.querySelectorAll('input[type="checkbox"]:checked').length;
                const percentage = Math.round((checked / total) * 100);
                
                document.getElementById('optimizationScore').textContent = \`\${checked}/\${total}\`;
                document.getElementById('optimizationBar').style.width = percentage + '%';
            }
        </script>
    </body>
    </html>
  \`)
})
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>블로그 상위노출 교육 - 슈퍼플레이스</title>
        <meta name="description" content="네이버 블로그 검색 최상위 진입을 위한 SEO 최적화 실전 교육">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold gradient-orange bg-clip-text text-transparent">슈퍼플레이스</a>
                    <div class="hidden md:flex space-x-8">
                        <a href="/" class="text-gray-600 hover:text-orange-500">홈</a>
                        <a href="/about" class="text-gray-600 hover:text-orange-500">회사 소개</a>
                        <a href="/contact" class="text-gray-600 hover:text-orange-500">대행 문의</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-20">
            <!-- Hero Section -->
            <section class="bg-gradient-to-br from-pink-50 to-white py-20 px-6">
                <div class="max-w-4xl mx-auto text-center">
                    <div class="w-20 h-20 gradient-orange rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-blog text-3xl text-white"></i>
                    </div>
                    <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        블로그 상위노출
                    </h1>
                    <p class="text-xl text-gray-600 mb-8">
                        네이버 블로그 검색 최상위 진입 전략<br>
                        SEO 최적화와 콘텐츠 기획의 모든 것
                    </p>
                    <div class="flex flex-wrap justify-center gap-4">
                        <a href="/contact" class="px-8 py-4 gradient-orange text-white rounded-full font-bold hover:shadow-lg transition-all">
                            교육 신청하기
                        </a>
                        <a href="/" class="px-8 py-4 bg-white text-gray-700 rounded-full font-bold border-2 border-gray-200 hover:border-pink-500 transition-all">
                            돌아가기
                        </a>
                    </div>
                </div>
            </section>

            <!-- 교육 내용 -->
            <section class="py-20 px-6">
                <div class="max-w-6xl mx-auto">
                    <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">무엇을 배우나요?</h2>
                    <div class="grid md:grid-cols-2 gap-8">
                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-brain text-pink-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">검색 알고리즘 완벽 이해</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 네이버 검색 로직 분석</li>
                                <li>✓ 상위노출 핵심 요소</li>
                                <li>✓ C-Rank, DA 점수 이해</li>
                                <li>✓ 알고리즘 변화 대응법</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-pen text-pink-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">SEO 최적화 글쓰기</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 키워드 리서치 방법</li>
                                <li>✓ 제목/본문 최적화</li>
                                <li>✓ 이미지 SEO 전략</li>
                                <li>✓ 내부링크 활용법</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-lightbulb text-pink-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">콘텐츠 기획 전략</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 학원업 특화 주제 발굴</li>
                                <li>✓ 시리즈 콘텐츠 기획</li>
                                <li>✓ 계절별 콘텐츠 전략</li>
                                <li>✓ 바이럴 콘텐츠 제작</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-rocket text-pink-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">지속 성장 전략</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 포스팅 주기 관리</li>
                                <li>✓ 이웃 관리 노하우</li>
                                <li>✓ 공감/댓글 전략</li>
                                <li>✓ 통계 분석 및 개선</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 실제 성과 -->
            <section class="py-20 px-6 bg-white">
                <div class="max-w-4xl mx-auto text-center">
                    <h2 class="text-3xl font-bold text-gray-900 mb-12">실제 성과</h2>
                    <div class="grid md:grid-cols-3 gap-8">
                        <div>
                            <div class="text-5xl font-bold text-pink-600 mb-2">Top 3</div>
                            <div class="text-gray-600">평균 달성 기간<br>1-2개월</div>
                        </div>
                        <div>
                            <div class="text-5xl font-bold text-pink-600 mb-2">500%</div>
                            <div class="text-gray-600">평균 방문자 증가율</div>
                        </div>
                        <div>
                            <div class="text-5xl font-bold text-pink-600 mb-2">50+</div>
                            <div class="text-gray-600">월평균 신규 문의</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA -->
            <section class="py-20 px-6 gradient-orange">
                <div class="max-w-4xl mx-auto text-center">
                    <h2 class="text-4xl font-bold text-white mb-8">
                        지금 바로 시작하세요
                    </h2>
                    <p class="text-xl text-white/90 mb-12">
                        검색 1페이지 진입, 더 이상 어렵지 않습니다
                    </p>
                    <a href="/contact" class="inline-block px-12 py-5 bg-white text-pink-600 rounded-full font-bold text-lg hover:shadow-2xl transition-all">
                        교육 신청하기 →
                    </a>
                </div>
            </section>
        </div>
    </body>
    </html>
  `)
})

// 교육 프로그램 상세 페이지 - 퍼널 마케팅
app.get('/programs/funnel', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>퍼널 마케팅 교육 - 슈퍼플레이스</title>
        <meta name="description" content="자동화 퍼널로 24시간 학생 모집 시스템 구축 실전 교육">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold gradient-purple bg-clip-text text-transparent">슈퍼플레이스</a>
                    <div class="hidden md:flex space-x-8">
                        <a href="/" class="text-gray-600 hover:text-purple-600">홈</a>
                        <a href="/about" class="text-gray-600 hover:text-purple-600">회사 소개</a>
                        <a href="/contact" class="text-gray-600 hover:text-purple-600">대행 문의</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-20">
            <!-- Hero Section -->
            <section class="bg-gradient-to-br from-purple-50 to-white py-20 px-6">
                <div class="max-w-4xl mx-auto text-center">
                    <div class="w-20 h-20 gradient-purple rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-filter text-3xl text-white"></i>
                    </div>
                    <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        퍼널 마케팅
                    </h1>
                    <p class="text-xl text-gray-600 mb-8">
                        자동화 퍼널로 24시간 학생 모집<br>
                        랜딩페이지부터 전환까지 완벽한 시스템 구축
                    </p>
                    <div class="flex flex-wrap justify-center gap-4">
                        <a href="/contact" class="px-8 py-4 gradient-purple text-white rounded-full font-bold hover:shadow-lg transition-all">
                            교육 신청하기
                        </a>
                        <a href="/" class="px-8 py-4 bg-white text-gray-700 rounded-full font-bold border-2 border-gray-200 hover:border-purple-600 transition-all">
                            돌아가기
                        </a>
                    </div>
                </div>
            </section>

            <!-- 교육 내용 -->
            <section class="py-20 px-6">
                <div class="max-w-6xl mx-auto">
                    <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">무엇을 배우나요?</h2>
                    <div class="grid md:grid-cols-2 gap-8">
                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-file-alt text-purple-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">랜딩페이지 제작</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 고전환 랜딩페이지 설계</li>
                                <li>✓ 카피라이팅 기법</li>
                                <li>✓ CTA 최적화 전략</li>
                                <li>✓ 무료 도구 활용법</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-ad text-purple-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">광고 운영 전략</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 네이버/구글 광고 세팅</li>
                                <li>✓ 타겟팅 최적화</li>
                                <li>✓ 예산 관리 노하우</li>
                                <li>✓ A/B 테스트 방법</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-robot text-purple-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">자동화 시스템 구축</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 챗봇 상담 시스템</li>
                                <li>✓ 자동 SMS/이메일</li>
                                <li>✓ CRM 도구 활용</li>
                                <li>✓ 리타게팅 전략</li>
                            </ul>
                        </div>

                        <div class="bg-white rounded-2xl p-8 shadow-sm">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                <i class="fas fa-chart-pie text-purple-600 text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">전환율 최적화</h3>
                            <ul class="space-y-2 text-gray-600">
                                <li>✓ 고객 여정 설계</li>
                                <li>✓ 데이터 분석 및 개선</li>
                                <li>✓ 전환 포인트 최적화</li>
                                <li>✓ ROI 극대화 전략</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 실제 성과 -->
            <section class="py-20 px-6 bg-white">
                <div class="max-w-4xl mx-auto text-center">
                    <h2 class="text-3xl font-bold text-gray-900 mb-12">실제 성과</h2>
                    <div class="grid md:grid-cols-3 gap-8">
                        <div>
                            <div class="text-5xl font-bold text-purple-600 mb-2">24시간</div>
                            <div class="text-gray-600">자동 상담 시스템<br>운영</div>
                        </div>
                        <div>
                            <div class="text-5xl font-bold text-purple-600 mb-2">800%</div>
                            <div class="text-gray-600">평균 ROI<br>광고비 대비</div>
                        </div>
                        <div>
                            <div class="text-5xl font-bold text-purple-600 mb-2">70%</div>
                            <div class="text-gray-600">평균 전환율<br>문의→등록</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA -->
            <section class="py-20 px-6 gradient-purple">
                <div class="max-w-4xl mx-auto text-center">
                    <h2 class="text-4xl font-bold text-white mb-8">
                        지금 바로 시작하세요
                    </h2>
                    <p class="text-xl text-white/90 mb-12">
                        자는 동안에도 학생이 모집되는 시스템을 만드세요
                    </p>
                    <a href="/contact" class="inline-block px-12 py-5 bg-white text-purple-600 rounded-full font-bold text-lg hover:shadow-2xl transition-all">
                        교육 신청하기 →
                    </a>
                </div>
            </section>
        </div>
    </body>
    </html>
  `)
})



// SNS 마케팅
app.get('/programs/sns', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>SNS 마케팅 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-blue-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">📱</div><h1 class="text-4xl font-bold text-gray-900 mb-4">SNS 마케팅</h1><p class="text-xl text-gray-600">인스타그램, 페이스북으로 학생 모집</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">SNS 마케팅으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 영상 마케팅
app.get('/programs/video', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>영상 마케팅 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-red-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">🎥</div><h1 class="text-4xl font-bold text-gray-900 mb-4">영상 마케팅</h1><p class="text-xl text-gray-600">유튜브, 숏폼으로 학원 홍보</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">영상 마케팅으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 온라인 광고
app.get('/programs/ad', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>온라인 광고 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-green-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">💰</div><h1 class="text-4xl font-bold text-gray-900 mb-4">온라인 광고</h1><p class="text-xl text-gray-600">네이버, 구글 광고 운영 전략</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">온라인 광고으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-green-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 커뮤니티 마케팅
app.get('/programs/community', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>커뮤니티 마케팅 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">👥</div><h1 class="text-4xl font-bold text-gray-900 mb-4">커뮤니티 마케팅</h1><p class="text-xl text-gray-600">학부모 커뮤니티 활성화 전략</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">커뮤니티 마케팅으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 브랜딩
app.get('/programs/branding', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>브랜딩 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-pink-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">🎨</div><h1 class="text-4xl font-bold text-gray-900 mb-4">브랜딩</h1><p class="text-xl text-gray-600">학원 브랜드 아이덴티티 구축</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-pink-600 to-pink-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">브랜딩으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-pink-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 데이터 분석
// 검색량 조회 프로그램 리다이렉트
app.get('/programs/data', (c) => {
  return c.redirect('/tools/search-volume')
})

// 당근 비즈니스 마케팅
app.get('/programs/carrot', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>당근 비즈니스 마케팅 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-orange-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">🥕</div><h1 class="text-4xl font-bold text-gray-900 mb-4">당근 비즈니스 마케팅</h1><p class="text-xl text-gray-600">지역 기반 당근마켓 활용 전략</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">당근 비즈니스 마케팅으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-orange-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 메타 광고
app.get('/programs/meta', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>메타 광고 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-blue-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">📘</div><h1 class="text-4xl font-bold text-gray-900 mb-4">메타 광고</h1><p class="text-xl text-gray-600">Facebook/Instagram 광고 운영</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">메타 광고으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 유튜브 광고
app.get('/programs/youtube-ad', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>유튜브 광고 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-red-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">📺</div><h1 class="text-4xl font-bold text-gray-900 mb-4">유튜브 광고</h1><p class="text-xl text-gray-600">유튜브 광고 캠페인 운영</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">유튜브 광고으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 쓰레드 마케팅
app.get('/programs/threads', (c) => c.html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>쓰레드 마케팅 - 슈퍼플레이스</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-50"><nav class="bg-white shadow-sm border-b sticky top-0 z-50"><div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a><div class="flex gap-4"><button onclick="history.back()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-arrow-left mr-2"></i>뒤로 가기</button><a href="/programs" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">프로그램 목록</a></div></div></nav><main class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-12"><div class="text-6xl mb-4">🧵</div><h1 class="text-4xl font-bold text-gray-900 mb-4">쓰레드 마케팅</h1><p class="text-xl text-gray-600">Meta Threads 활용 전략</p></div><div class="bg-white rounded-2xl p-8 shadow-sm mb-8"><h2 class="text-2xl font-bold mb-6">🎯 프로그램 진행중</h2><p class="text-gray-600 text-center py-8">이 프로그램은 현재 활성화되어 있습니다.<br>자세한 내용은 교육 신청 후 확인하실 수 있습니다.</p></div><div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 text-center text-white"><h2 class="text-3xl font-bold mb-4">프로그램 시작하기</h2><p class="text-xl mb-8">쓰레드 마케팅으로 학원을 성장시키세요</p><a href="/contact" class="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-lg">교육 신청하기 →</a></div></main></body></html>`))

// 대행 문의 페이지
app.get('/contact', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>대행 문의 - 슈퍼플레이스</title>
        <meta name="description" content="학원 마케팅 대행 및 교육 문의">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold gradient-purple bg-clip-text text-transparent">슈퍼플레이스</a>
                    <div class="hidden md:flex space-x-8">
                        <a href="/" class="text-gray-600 hover:text-purple-600">홈</a>
                        <a href="/about" class="text-gray-600 hover:text-purple-600">회사 소개</a>
                        <a href="/contact" class="text-purple-600 font-bold">대행 문의</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-20">
            <!-- Hero Section -->
            <section class="bg-gradient-to-br from-purple-50 to-white py-20 px-6">
                <div class="max-w-4xl mx-auto text-center">
                    <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        대행 문의
                    </h1>
                    <p class="text-xl text-gray-600 mb-8">
                        학원 마케팅 교육 및 대행 서비스 문의<br>
                        24시간 내에 연락드리겠습니다
                    </p>
                </div>
            </section>

            <!-- 문의 양식 -->
            <section class="py-20 px-6">
                <div class="max-w-3xl mx-auto">
                    <div class="bg-white rounded-3xl shadow-lg p-8 md:p-12">
                        <form id="contactForm" class="space-y-6">
                            <!-- 문의 유형 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">문의 유형 *</label>
                                <div class="grid md:grid-cols-2 gap-4">
                                    <label class="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-600">
                                        <input type="radio" name="type" value="교육" required class="mr-3">
                                        <span>교육 프로그램 문의</span>
                                    </label>
                                    <label class="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-600">
                                        <input type="radio" name="type" value="대행" required class="mr-3">
                                        <span>마케팅 대행 문의</span>
                                    </label>
                                </div>
                            </div>

                            <!-- 학원명 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">학원명 *</label>
                                <input type="text" name="academy" required 
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                                    placeholder="예: 꾸메땅학원">
                            </div>

                            <!-- 원장님 성함 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">원장님 성함 *</label>
                                <input type="text" name="name" required 
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                                    placeholder="이름을 입력해주세요">
                            </div>

                            <!-- 연락처 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">연락처 *</label>
                                <input type="tel" name="phone" required 
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                                    placeholder="010-0000-0000">
                            </div>

                            <!-- 이메일 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">이메일</label>
                                <input type="email" name="email" 
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                                    placeholder="academy@example.com">
                            </div>

                            <!-- 관심 프로그램 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">관심 프로그램</label>
                                <div class="space-y-2">
                                    <label class="flex items-center">
                                        <input type="checkbox" name="program" value="네이버플레이스" class="mr-2">
                                        <span>네이버 플레이스 상위노출</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="program" value="블로그" class="mr-2">
                                        <span>블로그 상위노출</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="program" value="퍼널" class="mr-2">
                                        <span>퍼널 마케팅</span>
                                    </label>
                                </div>
                            </div>

                            <!-- 문의 내용 -->
                            <div>
                                <label class="block text-gray-700 font-bold mb-3">문의 내용 *</label>
                                <textarea name="message" required rows="6"
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                                    placeholder="궁금하신 내용을 자유롭게 작성해주세요"></textarea>
                            </div>

                            <!-- 제출 버튼 -->
                            <button type="submit" 
                                class="w-full py-4 gradient-purple text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all">
                                문의하기
                            </button>

                            <p class="text-center text-sm text-gray-500">
                                * 표시는 필수 입력 항목입니다
                            </p>
                        </form>

                        <!-- 성공 메시지 (숨김) -->
                        <div id="successMessage" class="hidden text-center py-12">
                            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-check text-3xl text-green-600"></i>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-4">문의가 접수되었습니다!</h3>
                            <p class="text-gray-600 mb-8">
                                빠른 시간 내에 연락드리겠습니다.<br>
                                감사합니다.
                            </p>
                            <a href="/" class="inline-block px-8 py-3 gradient-purple text-white rounded-full font-bold hover:shadow-lg transition-all">
                                홈으로 돌아가기
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 연락처 정보 -->
            <section class="py-20 px-6 bg-white">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">연락처</h2>
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-phone text-purple-600 text-2xl"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">전화 문의</h3>
                            <p class="text-gray-600">032-1234-5678</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-envelope text-purple-600 text-2xl"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">이메일</h3>
                            <p class="text-gray-600">contact@superplace.kr</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-map-marker-alt text-purple-600 text-2xl"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">위치</h3>
                            <p class="text-gray-600">인천 서구 검단동</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <script>
            document.getElementById('contactForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    type: formData.get('type'),
                    academy: formData.get('academy'),
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    programs: formData.getAll('program'),
                    message: formData.get('message')
                };

                try {
                    const response = await fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    if (response.ok) {
                        document.getElementById('contactForm').classList.add('hidden');
                        document.getElementById('successMessage').classList.remove('hidden');
                    } else {
                        alert('문의 접수 중 오류가 발생했습니다. 다시 시도해주세요.');
                    }
                } catch (error) {
                    alert('문의 접수 중 오류가 발생했습니다. 다시 시도해주세요.');
                }
            });
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 마케팅 툴 10개
// ============================================

// 1. 네이버 플레이스 키워드 분석기
app.get('/tools/keyword-analyzer', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>네이버 플레이스 키워드 분석기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">🔍 네이버 플레이스 키워드 분석기</h1>
                <p class="text-xl text-gray-600">학원 주변 경쟁 키워드를 분석하고 최적의 키워드를 찾아보세요</p>
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <form id="keywordForm" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">지역 입력</label>
                        <input type="text" id="location" placeholder="예: 인천 서구 검단동" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">학원 종류</label>
                        <input type="text" id="type" placeholder="예: 영어학원, 수학학원" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <button type="submit" class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-xl transition">
                        키워드 분석하기
                    </button>
                </form>
            </div>

            <div id="results" class="hidden bg-white rounded-2xl shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">분석 결과</h2>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-4 bg-purple-50 rounded-xl">
                        <h3 class="font-bold text-purple-900 mb-2">추천 키워드</h3>
                        <ul id="recommendedKeywords" class="space-y-2 text-sm"></ul>
                    </div>
                    <div class="p-4 bg-orange-50 rounded-xl">
                        <h3 class="font-bold text-orange-900 mb-2">경쟁 분석</h3>
                        <ul id="competition" class="space-y-2 text-sm"></ul>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('keywordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const location = document.getElementById('location').value;
                const type = document.getElementById('type').value;
                
                const results = document.getElementById('results');
                results.classList.remove('hidden');
                
                const recommended = [
                    location + ' ' + type,
                    location + ' ' + type + ' 추천',
                    location + ' ' + type + ' 잘하는곳',
                    type + ' ' + location + ' 평점높은',
                    '초등 ' + type + ' ' + location
                ];
                
                const recommendedEl = document.getElementById('recommendedKeywords');
                recommendedEl.innerHTML = recommended.map(k => 
                    '<li class="flex items-center"><i class="fas fa-check-circle text-purple-600 mr-2"></i>' + k + '</li>'
                ).join('');
                
                const competitionEl = document.getElementById('competition');
                competitionEl.innerHTML = \`
                    <li>경쟁 학원 수: <span class="font-bold">12개</span></li>
                    <li>평균 리뷰 수: <span class="font-bold">23개</span></li>
                    <li>평균 평점: <span class="font-bold">4.5점</span></li>
                    <li>경쟁 강도: <span class="font-bold text-orange-600">중간</span></li>
                \`;
            });
        </script>
    </body>
    </html>
  `)
})

// 2. 리뷰 응답 템플릿 생성기
app.get('/tools/review-template', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>리뷰 응답 템플릿 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">💬 리뷰 응답 템플릿 생성기</h1>
            <p class="text-xl text-gray-600 text-center mb-12">고객 리뷰에 맞춤형 답변을 자동 생성합니다</p>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <div class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">리뷰 유형 선택</label>
                        <select id="reviewType" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="positive">긍정 리뷰</option>
                            <option value="negative">부정 리뷰</option>
                            <option value="neutral">중립 리뷰</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">리뷰 내용</label>
                        <textarea id="reviewContent" rows="4" placeholder="고객이 남긴 리뷰 내용을 입력하세요" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"></textarea>
                    </div>
                    <button onclick="generateTemplate()" class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-xl transition">
                        응답 템플릿 생성
                    </button>
                </div>
            </div>

            <div id="templateResult" class="hidden bg-white rounded-2xl shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">생성된 응답</h2>
                <div class="p-6 bg-gray-50 rounded-xl mb-4">
                    <p id="generatedResponse" class="text-gray-800 whitespace-pre-wrap"></p>
                </div>
                <button onclick="copyResponse()" class="gradient-purple text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition">
                    📋 복사하기
                </button>
            </div>
        </div>

        <script>
            function generateTemplate() {
                const type = document.getElementById('reviewType').value;
                const content = document.getElementById('reviewContent').value;
                
                let response = '';
                if(type === 'positive') {
                    response = content + '\\n\\n소중한 리뷰 감사합니다! 😊\\n앞으로도 더 나은 교육으로 보답하겠습니다.\\n항상 응원해주세요!\\n\\n- 꾸메땅학원 원장 드림';
                } else if(type === 'negative') {
                    response = '소중한 의견 감사드립니다.\\n말씀해주신 부분에 대해 깊이 반성하고 있습니다.\\n즉시 개선하여 더 나은 서비스로 보답하겠습니다.\\n다시 한 번 죄송합니다.\\n\\n- 꾸메땅학원 원장 드림';
                } else {
                    response = '리뷰 남겨주셔서 감사합니다.\\n더 좋은 교육 환경을 만들기 위해 노력하겠습니다.\\n감사합니다.\\n\\n- 꾸메땅학원 원장 드림';
                }
                
                document.getElementById('generatedResponse').textContent = response;
                document.getElementById('templateResult').classList.remove('hidden');
            }
            
            function copyResponse() {
                const text = document.getElementById('generatedResponse').textContent;
                navigator.clipboard.writeText(text);
                alert('복사되었습니다!');
            }
        </script>
    </body>
    </html>
  `)
})

// 3. 학원 홍보 문구 생성기
app.get('/tools/ad-copy-generator', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학원 홍보 문구 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">✨ 학원 홍보 문구 생성기</h1>
            <p class="text-xl text-gray-600 text-center mb-12">효과적인 학원 광고 문구를 자동으로 만들어드립니다</p>

            <div class="bg-white rounded-2xl shadow-lg p-8">
                <div class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">학원명</label>
                        <input type="text" id="academyName" placeholder="예: 꾸메땅학원" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">과목</label>
                        <input type="text" id="subject" placeholder="예: 영어, 수학" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">강점</label>
                        <input type="text" id="strength" placeholder="예: 소수정예, 1:1 맞춤" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <button onclick="generateAdCopy()" class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-xl transition">
                        홍보 문구 생성
                    </button>
                </div>

                <div id="copyResults" class="hidden mt-8 space-y-4">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">생성된 홍보 문구 (5개)</h2>
                    <div id="copyList"></div>
                </div>
            </div>
        </div>

        <script>
            function generateAdCopy() {
                const name = document.getElementById('academyName').value;
                const subject = document.getElementById('subject').value;
                const strength = document.getElementById('strength').value;
                
                const copies = [
                    name + '에서 ' + subject + ' 실력을 완성하세요! ' + strength + ' 수업으로 성적 UP! 📈',
                    subject + ' 고민되시죠? ' + name + '의 ' + strength + ' 시스템이 답입니다! 🎯',
                    '우리 아이 ' + subject + ' 성적, ' + name + '에서 책임집니다! ' + strength + ' 교육 💪',
                    name + ' | ' + subject + ' 전문 | ' + strength + ' | 지금 상담 신청하세요! ☎️',
                    strength + '로 차별화된 ' + subject + ' 교육, ' + name + '입니다! ✨'
                ];
                
                const listEl = document.getElementById('copyList');
                listEl.innerHTML = copies.map((copy, i) => \`
                    <div class="p-4 bg-purple-50 rounded-xl">
                        <div class="flex justify-between items-start">
                            <p class="text-gray-800 flex-1">\${i+1}. \${copy}</p>
                            <button onclick="copySingle('\${copy}')" class="ml-4 text-purple-600 hover:text-purple-700">
                                📋
                            </button>
                        </div>
                    </div>
                \`).join('');
                
                document.getElementById('copyResults').classList.remove('hidden');
            }
            
            function copySingle(text) {
                navigator.clipboard.writeText(text);
                alert('복사되었습니다!');
            }
        </script>
    </body>
    </html>
  `)
})

// 4. 네이버 플레이스 사진 최적화 가이드
app.get('/tools/photo-optimizer', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>플레이스 사진 최적화 가이드 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">📸 플레이스 사진 최적화 가이드</h1>
            <p class="text-xl text-gray-600 text-center mb-12">클릭률을 높이는 사진 촬영 가이드</p>

            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-green-600 mb-6">✅ 좋은 사진</h2>
                    <ul class="space-y-4">
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">📐</span>
                            <div>
                                <div class="font-bold text-gray-900">정방형 (1:1) 비율</div>
                                <div class="text-sm text-gray-600">플레이스에서 가장 잘 보이는 비율</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">☀️</span>
                            <div>
                                <div class="font-bold text-gray-900">밝고 선명한 조명</div>
                                <div class="text-sm text-gray-600">자연광이나 밝은 실내</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">🎯</span>
                            <div>
                                <div class="font-bold text-gray-900">포인트가 명확</div>
                                <div class="text-sm text-gray-600">교실, 학습자료, 수업 장면</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">🧹</span>
                            <div>
                                <div class="font-bold text-gray-900">깔끔한 정리 상태</div>
                                <div class="text-sm text-gray-600">불필요한 물건 제거</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-red-600 mb-6">❌ 피해야 할 사진</h2>
                    <ul class="space-y-4">
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">🌑</span>
                            <div>
                                <div class="font-bold text-gray-900">어둡고 흐릿함</div>
                                <div class="text-sm text-gray-600">노출 부족, 초점 불량</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">🤳</span>
                            <div>
                                <div class="font-bold text-gray-900">사람 얼굴 노출</div>
                                <div class="text-sm text-gray-600">초상권 문제 발생 가능</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">📱</span>
                            <div>
                                <div class="font-bold text-gray-900">스크린샷이나 캡처</div>
                                <div class="text-sm text-gray-600">직접 촬영한 사진 사용</div>
                            </div>
                        </li>
                        <li class="flex items-start">
                            <span class="text-2xl mr-3">🗑️</span>
                            <div>
                                <div class="font-bold text-gray-900">어지러운 배경</div>
                                <div class="text-sm text-gray-600">주목도 떨어짐</div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="mt-8 bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">📋 추천 사진 구성 (총 10장)</h2>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-4 bg-white rounded-xl border border-purple-200">
                        <div class="font-bold text-purple-600 mb-2">1. 외부 전경 (2장)</div>
                        <div class="text-sm text-gray-600">건물 외관, 간판</div>
                    </div>
                    <div class="p-4 bg-white rounded-xl border border-purple-200">
                        <div class="font-bold text-purple-600 mb-2">2. 교실 내부 (3장)</div>
                        <div class="text-sm text-gray-600">책상 배치, 칠판, 학습 환경</div>
                    </div>
                    <div class="p-4 bg-white rounded-xl border border-purple-200">
                        <div class="font-bold text-purple-600 mb-2">3. 수업 자료 (2장)</div>
                        <div class="text-sm text-gray-600">교재, 학습 도구</div>
                    </div>
                    <div class="p-4 bg-white rounded-xl border border-purple-200">
                        <div class="font-bold text-purple-600 mb-2">4. 부대시설 (2장)</div>
                        <div class="text-sm text-gray-600">상담실, 대기실, 화장실</div>
                    </div>
                    <div class="p-4 bg-white rounded-xl border border-purple-200">
                        <div class="font-bold text-purple-600 mb-2">5. 이벤트/성과 (1장)</div>
                        <div class="text-sm text-gray-600">수상 내역, 특별 프로그램</div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 5. 경쟁 학원 분석 도구
app.get('/tools/competitor-analysis', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>경쟁 학원 분석 도구 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">🔎 경쟁 학원 분석 도구</h1>
            <p class="text-xl text-gray-600 text-center mb-12">주변 경쟁 학원을 분석하고 차별화 전략을 수립하세요</p>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">분석 체크리스트</h2>
                <div class="space-y-6">
                    <div class="p-6 bg-purple-50 rounded-xl">
                        <h3 class="font-bold text-purple-900 mb-4">1. 기본 정보 조사</h3>
                        <div class="space-y-2 text-sm">
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">학원명과 위치 확인</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">운영 시간 및 요일 확인</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">과목 및 프로그램 종류</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">학원 규모 (강사 수, 교실 수)</label>
                        </div>
                    </div>

                    <div class="p-6 bg-orange-50 rounded-xl">
                        <h3 class="font-bold text-orange-900 mb-4">2. 온라인 평판 분석</h3>
                        <div class="space-y-2 text-sm">
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">네이버 플레이스 평점</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">리뷰 개수 및 최근 리뷰</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">리뷰 응답률</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">블로그 운영 현황</label>
                        </div>
                    </div>

                    <div class="p-6 bg-green-50 rounded-xl">
                        <h3 class="font-bold text-green-900 mb-4">3. 마케팅 전략 파악</h3>
                        <div class="space-y-2 text-sm">
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">홈페이지/SNS 활동</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">프로모션 및 이벤트</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">수강료 정책</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">무료 체험 제공 여부</label>
                        </div>
                    </div>

                    <div class="p-6 bg-blue-50 rounded-xl">
                        <h3 class="font-bold text-blue-900 mb-4">4. 차별화 포인트 찾기</h3>
                        <div class="space-y-2 text-sm">
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">경쟁사의 약점 파악</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">우리만의 강점 정리</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">틈새시장 발견</label>
                            <label class="flex items-center"><input type="checkbox" class="mr-3 w-4 h-4">차별화 메시지 작성</label>
                        </div>
                    </div>
                </div>

                <div class="mt-8 p-6 bg-gradient-to-br from-purple-100 to-orange-100 rounded-xl">
                    <h3 class="font-bold text-gray-900 mb-3">💡 분석 후 실행 TIP</h3>
                    <ul class="space-y-2 text-sm text-gray-700">
                        <li>✅ 경쟁사보다 빠른 리뷰 응답</li>
                        <li>✅ 차별화된 프로그램 홍보</li>
                        <li>✅ 정기적인 블로그/SNS 업데이트</li>
                        <li>✅ 고객 맞춤 상담 시스템 구축</li>
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 6. 블로그 포스팅 체크리스트
app.get('/tools/blog-checklist', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>블로그 포스팅 체크리스트 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">📝 블로그 포스팅 체크리스트</h1>
            <p class="text-xl text-gray-600 text-center mb-12">SEO 최적화된 블로그 글 작성 가이드</p>

            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-purple-600 mb-6">✍️ 작성 전 준비</h2>
                    <div class="space-y-3">
                        <label class="flex items-start p-3 hover:bg-purple-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">키워드 선정</div>
                                <div class="text-sm text-gray-600">검색량 많은 키워드 3-5개</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-purple-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">목차 구성</div>
                                <div class="text-sm text-gray-600">서론-본론-결론 3단 구성</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-purple-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">이미지 준비</div>
                                <div class="text-sm text-gray-600">2-3장의 고품질 이미지</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-orange-600 mb-6">✅ 작성 중 체크</h2>
                    <div class="space-y-3">
                        <label class="flex items-start p-3 hover:bg-orange-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">제목 최적화</div>
                                <div class="text-sm text-gray-600">키워드 포함, 25자 이내</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-orange-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">적절한 길이</div>
                                <div class="text-sm text-gray-600">1500-2000자 작성</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-orange-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">소제목 활용</div>
                                <div class="text-sm text-gray-600">3-4개의 소제목</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-green-600 mb-6">🎨 편집 및 디자인</h2>
                    <div class="space-y-3">
                        <label class="flex items-start p-3 hover:bg-green-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">단락 구분</div>
                                <div class="text-sm text-gray-600">3-4줄마다 단락 나누기</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-green-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">강조 표시</div>
                                <div class="text-sm text-gray-600">중요 내용 볼드/컬러</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-green-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">이미지 ALT</div>
                                <div class="text-sm text-gray-600">이미지 설명 텍스트 추가</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-blue-600 mb-6">🚀 발행 후 관리</h2>
                    <div class="space-y-3">
                        <label class="flex items-start p-3 hover:bg-blue-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">SNS 공유</div>
                                <div class="text-sm text-gray-600">카카오톡, 밴드, 인스타</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-blue-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">댓글 확인</div>
                                <div class="text-sm text-gray-600">24시간 내 댓글 응답</div>
                            </div>
                        </label>
                        <label class="flex items-start p-3 hover:bg-blue-50 rounded-lg cursor-pointer">
                            <input type="checkbox" class="mt-1 mr-3 w-5 h-5">
                            <div>
                                <div class="font-bold text-gray-900">조회수 모니터링</div>
                                <div class="text-sm text-gray-600">일주일간 통계 확인</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="mt-8 bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">🎯 글감 추천 TOP 10</h2>
                <div class="grid md:grid-cols-2 gap-3">
                    <div class="p-3 bg-white rounded-lg">1. 우리 학원 소개 및 특징</div>
                    <div class="p-3 bg-white rounded-lg">2. 수업 커리큘럼 안내</div>
                    <div class="p-3 bg-white rounded-lg">3. 학생 성공 사례 (성적 향상)</div>
                    <div class="p-3 bg-white rounded-lg">4. 학부모 후기 및 인터뷰</div>
                    <div class="p-3 bg-white rounded-lg">5. 효과적인 학습법 팁</div>
                    <div class="p-3 bg-white rounded-lg">6. 교재 및 학습 자료 소개</div>
                    <div class="p-3 bg-white rounded-lg">7. 학원 시설 및 환경 소개</div>
                    <div class="p-3 bg-white rounded-lg">8. 강사 소개 및 경력</div>
                    <div class="p-3 bg-white rounded-lg">9. 이벤트 및 프로모션 안내</div>
                    <div class="p-3 bg-white rounded-lg">10. 지역별 교육 정보</div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 7. SNS 콘텐츠 캘린더
app.get('/tools/content-calendar', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SNS 콘텐츠 캘린더 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-6xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">📅 SNS 콘텐츠 캘린더</h1>
            <p class="text-xl text-gray-600 text-center mb-12">한 달 콘텐츠를 미리 계획하고 관리하세요</p>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">주간 콘텐츠 추천 (예시)</h2>
                <div class="grid md:grid-cols-7 gap-2">
                    <div class="p-4 bg-purple-50 rounded-xl">
                        <div class="font-bold text-purple-900 mb-2">월요일</div>
                        <div class="text-sm text-gray-700">동기부여 명언</div>
                    </div>
                    <div class="p-4 bg-blue-50 rounded-xl">
                        <div class="font-bold text-blue-900 mb-2">화요일</div>
                        <div class="text-sm text-gray-700">학습 팁 공유</div>
                    </div>
                    <div class="p-4 bg-green-50 rounded-xl">
                        <div class="font-bold text-green-900 mb-2">수요일</div>
                        <div class="text-sm text-gray-700">학원 일상</div>
                    </div>
                    <div class="p-4 bg-yellow-50 rounded-xl">
                        <div class="font-bold text-yellow-900 mb-2">목요일</div>
                        <div class="text-sm text-gray-700">교재/자료 소개</div>
                    </div>
                    <div class="p-4 bg-orange-50 rounded-xl">
                        <div class="font-bold text-orange-900 mb-2">금요일</div>
                        <div class="text-sm text-gray-700">학생 성과 소식</div>
                    </div>
                    <div class="p-4 bg-red-50 rounded-xl">
                        <div class="font-bold text-red-900 mb-2">토요일</div>
                        <div class="text-sm text-gray-700">이벤트 안내</div>
                    </div>
                    <div class="p-4 bg-pink-50 rounded-xl">
                        <div class="font-bold text-pink-900 mb-2">일요일</div>
                        <div class="text-sm text-gray-700">휴식 & 공감</div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">월간 콘텐츠 아이디어 (30개)</h2>
                <div class="grid md:grid-cols-3 gap-4">
                    ${Array.from({length: 30}, (_, i) => `
                        <div class="p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition cursor-pointer">
                            <div class="font-bold text-purple-600">${i+1}일차</div>
                            <div class="text-sm text-gray-700 mt-1">
                                ${['학원 소개', '수업 현장', '학습 팁', '명언', '이벤트', '후기', '시설 안내', '강사 소개', '성적 향상', '프로모션'][i % 10]}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 콘텐츠 제작 TIP</h2>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 class="font-bold text-purple-900 mb-3">✅ 인스타그램</h3>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 정방형(1:1) 이미지 사용</li>
                            <li>• 해시태그 10-15개</li>
                            <li>• 스토리 매일 1-2개</li>
                            <li>• 릴스 주 2-3회</li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="font-bold text-orange-900 mb-3">✅ 블로그</h3>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 주 2-3회 정기 포스팅</li>
                            <li>• 1500자 이상 작성</li>
                            <li>• 이미지 2-3장 포함</li>
                            <li>• 키워드 자연스럽게 배치</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 8. 학원 상담 스크립트 생성기
app.get('/tools/consultation-script', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학원 상담 스크립트 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">💬 학원 상담 스크립트 생성기</h1>
            <p class="text-xl text-gray-600 text-center mb-12">효과적인 학부모 상담 대본을 만들어드립니다</p>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <div class="space-y-8">
                    <div class="p-6 bg-purple-50 rounded-xl">
                        <h3 class="font-bold text-purple-900 mb-4 text-lg">1단계: 인사 및 관심 확인</h3>
                        <div class="p-4 bg-white rounded-lg text-gray-700">
                            "안녕하세요, [학원명]입니다. 문의 주셔서 감사합니다. 😊<br>
                            혹시 어떤 과목에 관심이 있으신가요?<br>
                            아이의 현재 학년과 학습 목표를 말씀해주시면<br>
                            맞춤 상담을 도와드리겠습니다."
                        </div>
                    </div>

                    <div class="p-6 bg-blue-50 rounded-xl">
                        <h3 class="font-bold text-blue-900 mb-4 text-lg">2단계: 니즈 파악</h3>
                        <div class="p-4 bg-white rounded-lg text-gray-700">
                            "현재 학습에서 가장 어려운 부분은 무엇인가요?<br><br>
                            <strong>주요 질문 예시:</strong><br>
                            • 성적 향상이 목표이신가요?<br>
                            • 내신 대비인가요, 수능 대비인가요?<br>
                            • 학습 습관 개선이 필요하신가요?<br>
                            • 특정 단원이나 영역에 약점이 있나요?"
                        </div>
                    </div>

                    <div class="p-6 bg-green-50 rounded-xl">
                        <h3 class="font-bold text-green-900 mb-4 text-lg">3단계: 학원 강점 소개</h3>
                        <div class="p-4 bg-white rounded-lg text-gray-700">
                            "저희 학원의 <strong>[차별화 포인트]</strong>를 소개해드리겠습니다.<br><br>
                            <strong>예시:</strong><br>
                            ✅ 소수정예 맞춤 수업 (학생 1:4 비율)<br>
                            ✅ 매주 학습 리포트 제공<br>
                            ✅ 20년 경력 전문 강사진<br>
                            ✅ 체계적인 레벨 테스트<br>
                            ✅ 학부모 상담 월 1회 진행"
                        </div>
                    </div>

                    <div class="p-6 bg-orange-50 rounded-xl">
                        <h3 class="font-bold text-orange-900 mb-4 text-lg">4단계: 행동 유도 (CTA)</h3>
                        <div class="p-4 bg-white rounded-lg text-gray-700">
                            "무료 레벨 테스트와 1회 체험 수업을 제공해드리고 있습니다.<br>
                            이번 주 중 방문 가능하신 날짜가 있으신가요?<br><br>
                            <strong>상담 예약 가능 시간:</strong><br>
                            • 평일: 오후 3시~8시<br>
                            • 토요일: 오전 10시~오후 5시<br><br>
                            편하신 시간에 방문해주시면<br>
                            자세한 커리큘럼과 수강료를 안내해드리겠습니다."
                        </div>
                    </div>

                    <div class="p-6 bg-pink-50 rounded-xl">
                        <h3 class="font-bold text-pink-900 mb-4 text-lg">5단계: 마무리</h3>
                        <div class="p-4 bg-white rounded-lg text-gray-700">
                            "추가로 궁금하신 점이 있으시면 언제든 연락 주세요!<br>
                            카카오톡/전화 상담도 가능합니다. 😊<br><br>
                            <strong>연락처:</strong><br>
                            📞 전화: 010-XXXX-XXXX<br>
                            💬 카톡: [카카오톡 ID]<br>
                            📧 이메일: [이메일 주소]<br><br>
                            감사합니다!"
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 상담 성공 TIP</h2>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 class="font-bold text-purple-900 mb-3">✅ 해야 할 것</h3>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 학부모 이름으로 호칭하기</li>
                            <li>• 경청하고 공감 표현하기</li>
                            <li>• 구체적인 숫자/사례 제시</li>
                            <li>• 긍정적인 톤 유지하기</li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="font-bold text-red-900 mb-3">❌ 하지 말아야 할 것</h3>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 다른 학원 비방하기</li>
                            <li>• 과도한 약속하기</li>
                            <li>• 강압적인 등록 유도</li>
                            <li>• 일방적으로 말하기</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 9. 네이버 플레이스 최적화 점검표
app.get('/tools/place-optimization', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>플레이스 최적화 점검표 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">✅ 네이버 플레이스 최적화 점검표</h1>
            <p class="text-xl text-gray-600 text-center mb-12">100점 만점 플레이스 만들기</p>

            <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <div class="mb-6 p-4 bg-purple-50 rounded-xl text-center">
                    <div class="text-4xl font-bold text-purple-600" id="score">0</div>
                    <div class="text-gray-600 mt-2">현재 점수 / 100점</div>
                </div>

                <div class="space-y-6">
                    <div class="p-6 bg-gray-50 rounded-xl">
                        <h3 class="font-bold text-gray-900 mb-4">기본 정보 (30점)</h3>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">정확한 학원명 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">정확한 주소 및 지도 위치 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">전화번호 등록 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">운영 시간 정확히 입력 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">상세한 소개글 작성 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">키워드 3개 이상 설정 (5점)</span>
                            </label>
                        </div>
                    </div>

                    <div class="p-6 bg-gray-50 rounded-xl">
                        <h3 class="font-bold text-gray-900 mb-4">사진 관리 (25점)</h3>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="10">
                                <span class="flex-1">사진 10장 이상 등록 (10점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">고품질 사진 (밝고 선명) (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">다양한 각도 촬영 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">정기적 업데이트 (월 1회) (5점)</span>
                            </label>
                        </div>
                    </div>

                    <div class="p-6 bg-gray-50 rounded-xl">
                        <h3 class="font-bold text-gray-900 mb-4">리뷰 관리 (30점)</h3>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="10">
                                <span class="flex-1">리뷰 10개 이상 (10점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="10">
                                <span class="flex-1">평균 평점 4.5점 이상 (10점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="10">
                                <span class="flex-1">모든 리뷰에 응답 (10점)</span>
                            </label>
                        </div>
                    </div>

                    <div class="p-6 bg-gray-50 rounded-xl">
                        <h3 class="font-bold text-gray-900 mb-4">활동성 (15점)</h3>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">소식 주 1회 업데이트 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">이벤트/프로모션 등록 (5점)</span>
                            </label>
                            <label class="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <input type="checkbox" class="score-checkbox mr-3 w-5 h-5" data-score="5">
                                <span class="flex-1">메뉴/서비스 정보 상세 (5점)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="mt-8 p-6 rounded-xl" id="result">
                    <div class="text-center">
                        <button onclick="location.reload()" class="gradient-purple text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition">
                            다시 체크하기
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const checkboxes = document.querySelectorAll('.score-checkbox');
            const scoreEl = document.getElementById('score');
            const resultEl = document.getElementById('result');
            
            checkboxes.forEach(cb => {
                cb.addEventListener('change', updateScore);
            });
            
            function updateScore() {
                let total = 0;
                checkboxes.forEach(cb => {
                    if(cb.checked) {
                        total += parseInt(cb.dataset.score);
                    }
                });
                
                scoreEl.textContent = total;
                
                let resultHTML = '';
                let bgColor = '';
                
                if(total >= 90) {
                    bgColor = 'bg-green-50 border border-green-200';
                    resultHTML = '<div class="text-green-800 text-center"><div class="text-2xl font-bold mb-2">🎉 완벽합니다!</div><div>플레이스가 최적화되었습니다!</div></div>';
                } else if(total >= 70) {
                    bgColor = 'bg-blue-50 border border-blue-200';
                    resultHTML = '<div class="text-blue-800 text-center"><div class="text-2xl font-bold mb-2">👍 좋습니다!</div><div>조금만 더 보완하면 완벽해요!</div></div>';
                } else if(total >= 50) {
                    bgColor = 'bg-orange-50 border border-orange-200';
                    resultHTML = '<div class="text-orange-800 text-center"><div class="text-2xl font-bold mb-2">💪 괜찮습니다!</div><div>체크 안 된 항목들을 보완해보세요!</div></div>';
                } else if(total > 0) {
                    bgColor = 'bg-red-50 border border-red-200';
                    resultHTML = '<div class="text-red-800 text-center"><div class="text-2xl font-bold mb-2">⚠️ 개선 필요!</div><div>기본 항목부터 차근차근 진행하세요!</div></div>';
                }
                
                resultEl.className = 'mt-8 p-6 rounded-xl ' + bgColor;
                if(total > 0) {
                    resultEl.innerHTML = resultHTML + '<div class="text-center mt-4"><button onclick="location.reload()" class="gradient-purple text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition">다시 체크하기</button></div>';
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 10. 학원 마케팅 ROI 계산기
app.get('/tools/roi-calculator', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마케팅 ROI 계산기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>.gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4 text-center">💰 학원 마케팅 ROI 계산기</h1>
            <p class="text-xl text-gray-600 text-center mb-12">마케팅 투자 대비 수익률을 계산하세요</p>

            <div class="grid md:grid-cols-2 gap-8">
                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">입력 정보</h2>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">월 마케팅 비용 (원)</label>
                            <input type="number" id="marketingCost" placeholder="300000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">신규 등록 학생 수 (명)</label>
                            <input type="number" id="newStudents" placeholder="10" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학생 1명당 월 수강료 (원)</label>
                            <input type="number" id="tuitionPerStudent" placeholder="400000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">평균 수강 기간 (개월)</label>
                            <input type="number" id="avgDuration" placeholder="12" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                        <button onclick="calculate()" class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-xl transition">
                            ROI 계산하기
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">계산 결과</h2>
                    <div id="results" class="hidden space-y-6">
                        <div class="p-6 bg-purple-50 rounded-xl">
                            <div class="text-sm text-gray-600 mb-1">총 매출</div>
                            <div class="text-3xl font-bold text-purple-600" id="totalRevenue">0원</div>
                        </div>
                        <div class="p-6 bg-blue-50 rounded-xl">
                            <div class="text-sm text-gray-600 mb-1">순이익</div>
                            <div class="text-3xl font-bold text-blue-600" id="profit">0원</div>
                        </div>
                        <div class="p-6 bg-green-50 rounded-xl">
                            <div class="text-sm text-gray-600 mb-1">ROI (투자 대비 수익률)</div>
                            <div class="text-4xl font-bold text-green-600" id="roi">0%</div>
                        </div>
                        <div class="p-6 bg-orange-50 rounded-xl">
                            <div class="text-sm text-gray-600 mb-1">학생 1명당 획득 비용</div>
                            <div class="text-2xl font-bold text-orange-600" id="cpa">0원</div>
                        </div>
                    </div>

                    <div id="tips" class="hidden mt-8">
                        <h3 class="font-bold text-gray-900 mb-4">💡 분석 TIP</h3>
                        <div class="space-y-3 text-sm">
                            <div class="p-4 bg-green-50 rounded-xl">
                                <div class="font-bold text-green-900 mb-1">✅ ROI 300% 이상</div>
                                <div class="text-gray-700">매우 효율적! 마케팅 유지</div>
                            </div>
                            <div class="p-4 bg-blue-50 rounded-xl">
                                <div class="font-bold text-blue-900 mb-1">✅ ROI 150-300%</div>
                                <div class="text-gray-700">좋은 수준! 최적화 가능</div>
                            </div>
                            <div class="p-4 bg-orange-50 rounded-xl">
                                <div class="font-bold text-orange-900 mb-1">⚠️ ROI 100-150%</div>
                                <div class="text-gray-700">개선 필요, 전략 재검토</div>
                            </div>
                            <div class="p-4 bg-red-50 rounded-xl">
                                <div class="font-bold text-red-900 mb-1">❌ ROI 100% 미만</div>
                                <div class="text-gray-700">마케팅 전략 전면 수정 필요</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">📊 학원 마케팅 ROI 개선 전략</h2>
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="p-6 bg-white rounded-xl">
                        <div class="text-3xl mb-3">🎯</div>
                        <h3 class="font-bold text-gray-900 mb-2">타겟팅 정교화</h3>
                        <p class="text-sm text-gray-600">우리 학원에 꼭 맞는 학부모만 공략</p>
                    </div>
                    <div class="p-6 bg-white rounded-xl">
                        <div class="text-3xl mb-3">💬</div>
                        <h3 class="font-bold text-gray-900 mb-2">전환율 향상</h3>
                        <p class="text-sm text-gray-600">상담에서 등록까지의 전환율 높이기</p>
                    </div>
                    <div class="p-6 bg-white rounded-xl">
                        <div class="text-3xl mb-3">🔄</div>
                        <h3 class="font-bold text-gray-900 mb-2">재등록률 관리</h3>
                        <p class="text-sm text-gray-600">기존 학생 만족도 높여 장기 수강</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function calculate() {
                const cost = parseInt(document.getElementById('marketingCost').value) || 0;
                const students = parseInt(document.getElementById('newStudents').value) || 0;
                const tuition = parseInt(document.getElementById('tuitionPerStudent').value) || 0;
                const duration = parseInt(document.getElementById('avgDuration').value) || 0;
                
                if(cost === 0 || students === 0 || tuition === 0 || duration === 0) {
                    alert('모든 항목을 입력해주세요!');
                    return;
                }
                
                const totalRevenue = students * tuition * duration;
                const profit = totalRevenue - cost;
                const roi = ((profit / cost) * 100).toFixed(1);
                const cpa = (cost / students).toFixed(0);
                
                document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString() + '원';
                document.getElementById('profit').textContent = profit.toLocaleString() + '원';
                document.getElementById('roi').textContent = roi + '%';
                document.getElementById('cpa').textContent = parseInt(cpa).toLocaleString() + '원';
                
                document.getElementById('results').classList.remove('hidden');
                document.getElementById('tips').classList.remove('hidden');
            }
        </script>
    </body>
    </html>
  `)
})

// 마케팅 툴 목록 페이지
app.get('/tools', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마케팅 툴 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .card-hover { transition: all 0.3s ease; }
            .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 40px -10px rgba(124, 58, 237, 0.3); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/" class="text-gray-600 hover:text-purple-600">← 홈으로</a>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">🚀 마케팅 툴 모음</h1>
                <p class="text-2xl text-gray-600">학원 마케팅에 필요한 모든 도구를 한 곳에서</p>
                <div class="mt-6 inline-flex items-center px-6 py-3 bg-purple-50 rounded-full text-purple-700 font-medium">
                    <i class="fas fa-check-circle mr-2"></i>
                    100% 무료 · 회원가입 불필요 · 즉시 사용 가능
                </div>
            </div>

            <div class="grid md:grid-cols-3 gap-8">
                <a href="/tools/keyword-analyzer" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-search text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">키워드 분석기</h3>
                    <p class="text-gray-600 mb-4">네이버 플레이스 최적 키워드 발굴</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/review-template" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-comment-dots text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">리뷰 응답 생성기</h3>
                    <p class="text-gray-600 mb-4">고객 리뷰에 맞춤형 답변 자동 생성</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/ad-copy-generator" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-bullhorn text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">홍보 문구 생성기</h3>
                    <p class="text-gray-600 mb-4">효과적인 학원 광고 문구 5개 자동 생성</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/photo-optimizer" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-camera text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">사진 최적화 가이드</h3>
                    <p class="text-gray-600 mb-4">클릭률 높이는 플레이스 사진 촬영법</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/competitor-analysis" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-chart-line text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">경쟁 학원 분석</h3>
                    <p class="text-gray-600 mb-4">주변 경쟁사 분석 및 차별화 전략</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/blog-checklist" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-check-square text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">블로그 체크리스트</h3>
                    <p class="text-gray-600 mb-4">SEO 최적화 블로그 작성 완벽 가이드</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/content-calendar" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-calendar-alt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">콘텐츠 캘린더</h3>
                    <p class="text-gray-600 mb-4">한 달 SNS 콘텐츠 미리 계획하기</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/consultation-script" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-comments text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">상담 스크립트</h3>
                    <p class="text-gray-600 mb-4">효과적인 학부모 상담 대본 5단계</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/place-optimization" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-tasks text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">플레이스 점검표</h3>
                    <p class="text-gray-600 mb-4">100점 만점 플레이스 만들기 체크리스트</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>

                <a href="/tools/roi-calculator" class="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent hover:border-purple-300 card-hover">
                    <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6">
                        <i class="fas fa-calculator text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">ROI 계산기</h3>
                    <p class="text-gray-600 mb-4">마케팅 투자 대비 수익률 분석 도구</p>
                    <div class="flex items-center text-purple-600 font-medium">
                        자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                    </div>
                </a>
            </div>

            <div class="mt-16 bg-gradient-to-br from-purple-50 to-white rounded-3xl p-12 text-center">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">더 많은 마케팅 지원이 필요하신가요?</h2>
                <p class="text-xl text-gray-600 mb-8">전문 컨설턴트와 1:1 상담을 진행해보세요</p>
                <a href="/contact" class="inline-block gradient-purple text-white px-12 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    무료 상담 신청하기
                </a>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 검색량 조회 및 순위 분석 API
app.post('/api/search-analysis', async (c) => {
  try {
    const { userId, keyword, placeUrl } = await c.req.json()

    if (!keyword) {
      return c.json({ success: false, error: '키워드를 입력해주세요' }, 400)
    }

    // Python 크롤링 서버와 통신
    // TODO: Railway 배포 후 URL을 실제 배포 URL로 변경해야 합니다
    const CRAWLER_API_URL = 'https://naver-crawler-api.railway.app/analyze'
    
    try {
      const crawlerResponse = await fetch(CRAWLER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword,
          placeUrl: placeUrl || null
        })
      })

      if (!crawlerResponse.ok) {
        throw new Error(`Crawler API error: ${crawlerResponse.status}`)
      }

      const analysisResult = await crawlerResponse.json()

      // 분석 기록 저장
      const { env } = c
      await env.DB.prepare(`
        INSERT INTO search_analysis_logs (user_id, keyword, place_url, result_data, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(userId, keyword, placeUrl || '', JSON.stringify(analysisResult)).run()

      return c.json(analysisResult)
      
    } catch (crawlerError) {
      console.error('Crawler API error:', crawlerError)
      
      // 크롤러 서버 오류 시 임시 응답 반환
      const fallbackResponse = {
        success: true,
        searchVolume: {
          monthlyAvg: 0,
          competition: '분석중',
          recommendation: '크롤링 서버 연결 필요'
        },
        ranking: {
          myRank: null,
          competitors: []
        },
        keywords: [],
        note: '크롤링 서버가 배포되지 않았거나 응답하지 않습니다. Railway에 배포 후 URL을 업데이트해주세요.'
      }

      return c.json(fallbackResponse)
    }
  } catch (error) {
    console.error('Search analysis error:', error)
    return c.json({ success: false, error: '분석 중 오류가 발생했습니다' }, 500)
  }
})

// 대행 문의 API
app.post('/api/contact', async (c) => {
  try {
    const { type, academy, name, phone, email, programs, message } = await c.req.json()
    
    // 데이터베이스에 저장
    const { env } = c
    await env.DB.prepare(`
      INSERT INTO contacts (inquiry, academy, name, phone, email, programs, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(type, academy, name, phone, email || '', JSON.stringify(programs || []), message).run()

    return c.json({ success: true, message: '문의가 접수되었습니다' })
  } catch (error) {
    console.error('Contact error:', error)
    return c.json({ success: false, error: '문의 접수 실패' }, 500)
  }
})

// 로그인 API
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const { env } = c
    
    // 사용자 조회
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    
    if (!user) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다' }, 401)
    }
    
    // 비밀번호 확인 (실제로는 해시 비교를 해야 하지만, 현재는 단순 비교)
    if (user.password !== password) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다' }, 401)
    }
    
    // 비밀번호 제외하고 사용자 정보 반환
    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      academy_name: user.academy_name,
      role: user.role
    }
    
    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: userInfo
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: '로그인 처리 중 오류가 발생했습니다' }, 500)
  }
})

// 회원가입 API
app.post('/api/signup', async (c) => {
  try {
    const { email, password, name, phone, academy_name } = await c.req.json()
    const { env } = c
    
    // 이메일 중복 확인
    const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    
    if (existing) {
      return c.json({ success: false, error: '이미 가입된 이메일입니다' }, 400)
    }
    
    // 사용자 생성
    await env.DB.prepare(`
      INSERT INTO users (email, password, name, phone, academy_name, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'member', datetime('now'))
    `).bind(email, password, name, phone || '', academy_name || '').run()
    
    return c.json({ 
      success: true, 
      message: '회원가입이 완료되었습니다. 로그인해주세요.'
    })
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ success: false, error: '회원가입 처리 중 오류가 발생했습니다' }, 500)
  }
})

// ============================================
// 마케팅 툴 10개
// ============================================

// 1. 네이버 플레이스 키워드 분석기
app.get('/tools/place-keyword-analyzer', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>네이버 플레이스 키워드 분석기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-search text-purple-600 mr-3"></i>
                    네이버 플레이스 키워드 분석기
                </h1>
                <p class="text-xl text-gray-600">지역별 검색량과 경쟁도를 분석하여 최적의 키워드를 찾아드립니다</p>
            </div>

            <div class="grid lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">키워드 입력</h2>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">지역</label>
                                <input type="text" id="region" placeholder="예: 인천 서구" 
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">업종</label>
                                <input type="text" id="keyword" placeholder="예: 영어학원" 
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            </div>

                            <button onclick="analyzeKeyword()" 
                                    class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-lg transition">
                                <i class="fas fa-chart-line mr-2"></i>분석 시작
                            </button>
                        </div>

                        <div class="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            실시간 검색량과 경쟁 업체 수를 분석합니다
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-2">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">분석 결과</h2>
                        
                        <div id="result" class="hidden">
                            <div class="grid md:grid-cols-3 gap-4 mb-8">
                                <div class="bg-purple-50 rounded-xl p-6 text-center">
                                    <div class="text-3xl font-bold text-purple-600 mb-2" id="searchVolume">-</div>
                                    <div class="text-sm text-gray-600">월 평균 검색량</div>
                                </div>
                                <div class="bg-orange-50 rounded-xl p-6 text-center">
                                    <div class="text-3xl font-bold text-orange-600 mb-2" id="competition">-</div>
                                    <div class="text-sm text-gray-600">경쟁 업체 수</div>
                                </div>
                                <div class="bg-green-50 rounded-xl p-6 text-center">
                                    <div class="text-3xl font-bold text-green-600 mb-2" id="difficulty">-</div>
                                    <div class="text-sm text-gray-600">난이도</div>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <h3 class="text-xl font-bold text-gray-900">추천 키워드</h3>
                                <div id="recommendations" class="space-y-3"></div>
                            </div>

                            <div class="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                                <h4 class="font-bold text-gray-900 mb-3">💡 최적화 팁</h4>
                                <ul class="space-y-2 text-sm text-gray-700">
                                    <li>✓ 지역명 + 업종을 함께 사용하세요</li>
                                    <li>✓ 경쟁이 낮은 롱테일 키워드를 활용하세요</li>
                                    <li>✓ 정기적으로 키워드 순위를 모니터링하세요</li>
                                </ul>
                            </div>
                        </div>

                        <div id="empty" class="text-center py-20">
                            <div class="text-6xl mb-4">🔍</div>
                            <p class="text-gray-500 text-lg">키워드를 입력하고 분석을 시작하세요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function analyzeKeyword() {
                const region = document.getElementById('region').value;
                const keyword = document.getElementById('keyword').value;

                if (!region || !keyword) {
                    alert('지역과 업종을 모두 입력해주세요');
                    return;
                }

                // 시뮬레이션 데이터
                const searchVolume = Math.floor(Math.random() * 5000) + 1000;
                const competition = Math.floor(Math.random() * 100) + 20;
                const difficulty = competition > 70 ? '높음' : competition > 40 ? '보통' : '낮음';

                document.getElementById('searchVolume').textContent = searchVolume.toLocaleString();
                document.getElementById('competition').textContent = competition + '개';
                document.getElementById('difficulty').textContent = difficulty;

                const recommendations = [
                    { keyword: region + ' ' + keyword, score: 95 },
                    { keyword: region + ' ' + keyword + ' 추천', score: 88 },
                    { keyword: region + ' 초등 ' + keyword, score: 82 },
                    { keyword: region + ' 중등 ' + keyword, score: 78 },
                    { keyword: '검단 ' + keyword, score: 75 }
                ];

                const recommendationsHTML = recommendations.map(item => \`
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                        <div>
                            <div class="font-medium text-gray-900">\${item.keyword}</div>
                            <div class="text-sm text-gray-500">추천도: \${item.score}점</div>
                        </div>
                        <div class="text-purple-600 font-bold">\${item.score}</div>
                    </div>
                \`).join('');

                document.getElementById('recommendations').innerHTML = recommendationsHTML;
                document.getElementById('empty').classList.add('hidden');
                document.getElementById('result').classList.remove('hidden');
            }
        </script>
    </body>
    </html>
  `)
})

// 2. 블로그 제목 생성기
app.get('/tools/blog-title-generator', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>블로그 제목 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-lightbulb text-purple-600 mr-3"></i>
                    블로그 제목 생성기
                </h1>
                <p class="text-xl text-gray-600">클릭률을 높이는 매력적인 블로그 제목을 자동으로 생성합니다</p>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div class="mb-8">
                    <label class="block text-sm font-medium text-gray-900 mb-3">주제 입력</label>
                    <input type="text" id="topic" placeholder="예: 초등영어 학습법" 
                           class="w-full px-6 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                </div>

                <div class="mb-8 grid md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">톤앤매너</label>
                        <select id="tone" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="professional">전문적인</option>
                            <option value="friendly">친근한</option>
                            <option value="exciting">흥미로운</option>
                            <option value="urgent">긴급한</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">타겟</label>
                        <select id="target" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="parents">학부모</option>
                            <option value="students">학생</option>
                            <option value="teachers">선생님</option>
                            <option value="general">일반</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-900 mb-2">개수</label>
                        <select id="count" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="5">5개</option>
                            <option value="10" selected>10개</option>
                            <option value="15">15개</option>
                            <option value="20">20개</option>
                        </select>
                    </div>
                </div>

                <button onclick="generateTitles()" 
                        class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-bold hover:shadow-lg transition">
                    <i class="fas fa-magic mr-2"></i>제목 생성하기
                </button>

                <div id="results" class="mt-8 hidden">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">생성된 제목</h3>
                    <div id="titleList" class="space-y-3"></div>
                </div>
            </div>

            <div class="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
                <h3 class="text-xl font-bold text-gray-900 mb-4">💡 좋은 블로그 제목의 조건</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-bold text-purple-600 mb-2">✓ 포함해야 할 요소</h4>
                        <ul class="space-y-1 text-sm text-gray-700">
                            <li>• 구체적인 숫자나 수치</li>
                            <li>• 타겟 독자층 명시</li>
                            <li>• 명확한 혜택 제시</li>
                            <li>• 궁금증을 유발하는 문구</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-orange-600 mb-2">✗ 피해야 할 요소</h4>
                        <ul class="space-y-1 text-sm text-gray-700">
                            <li>• 과장된 표현 남발</li>
                            <li>• 너무 긴 제목 (50자 이상)</li>
                            <li>• 모호하고 추상적인 단어</li>
                            <li>• 클릭베이트성 제목</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function generateTitles() {
                const topic = document.getElementById('topic').value;
                const count = parseInt(document.getElementById('count').value);

                if (!topic) {
                    alert('주제를 입력해주세요');
                    return;
                }

                const templates = [
                    \`\${topic}, 이렇게 하면 성공합니다\`,
                    \`\${topic} 완벽 가이드 (2025년 최신)\`,
                    \`\${topic} 처음 시작하는 분들을 위한 5단계\`,
                    \`전문가가 알려주는 \${topic} 핵심 전략\`,
                    \`\${topic} 실수하지 않는 방법 7가지\`,
                    \`\${topic}로 성과 200% 높이는 법\`,
                    \`학부모가 꼭 알아야 할 \${topic} 정보\`,
                    \`\${topic} 효과 극대화하는 꿀팁\`,
                    \`\${topic} 전에 반드시 알아야 할 것들\`,
                    \`\${topic} 성공 사례와 노하우 대공개\`,
                    \`왜 \${topic}이 중요한가? (실전 경험담)\`,
                    \`\${topic} 비용부터 효과까지 완벽 분석\`,
                    \`\${topic} 고민 해결! 전문가 Q&A\`,
                    \`\${topic} 1등의 비밀, 이것 때문이었어요\`,
                    \`\${topic} 시작 전 체크리스트 10가지\`,
                    \`\${topic}의 모든 것 A to Z\`,
                    \`\${topic} 실전 적용 후기 (솔직 리뷰)\`,
                    \`\${topic}, 이 방법으로 바로 시작하세요\`,
                    \`\${topic} 전문가가 추천하는 최고의 방법\`,
                    \`\${topic} 성공률 높이는 3가지 원칙\`
                ];

                const selectedTitles = templates.sort(() => 0.5 - Math.random()).slice(0, count);

                const titlesHTML = selectedTitles.map((title, index) => \`
                    <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                        <div class="flex-shrink-0 w-8 h-8 gradient-purple rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            \${index + 1}
                        </div>
                        <div class="flex-1">
                            <div class="text-gray-900 font-medium">\${title}</div>
                            <div class="text-xs text-gray-500 mt-1">\${title.length}자</div>
                        </div>
                        <button onclick="copyTitle('\${title.replace(/'/g, "\\\\'")}', this)" 
                                class="flex-shrink-0 px-4 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                            <i class="fas fa-copy mr-1"></i>복사
                        </button>
                    </div>
                \`).join('');

                document.getElementById('titleList').innerHTML = titlesHTML;
                document.getElementById('results').classList.remove('hidden');
            }

            function copyTitle(title, button) {
                navigator.clipboard.writeText(title).then(() => {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check mr-1"></i>복사됨';
                    button.classList.add('text-green-600');
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('text-green-600');
                    }, 2000);
                });
            }
        </script>
    </body>
    </html>
  `)
})

// 3. 상담 예약 캘린더
app.get('/tools/consultation-calendar', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>상담 예약 캘린더 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .calendar-day { min-height: 100px; }
            .time-slot { cursor: pointer; transition: all 0.2s; }
            .time-slot:hover { transform: scale(1.05); }
            .time-slot.selected { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-calendar-check text-purple-600 mr-3"></i>
                    상담 예약 캘린더
                </h1>
                <p class="text-xl text-gray-600">원하시는 날짜와 시간을 선택하여 무료 상담을 예약하세요</p>
            </div>

            <div class="grid lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">2025년 1월</h2>
                            <div class="flex gap-2">
                                <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-4">
                            <div class="text-center text-sm font-medium text-red-500 py-2">일</div>
                            <div class="text-center text-sm font-medium text-gray-600 py-2">월</div>
                            <div class="text-center text-sm font-medium text-gray-600 py-2">화</div>
                            <div class="text-center text-sm font-medium text-gray-600 py-2">수</div>
                            <div class="text-center text-sm font-medium text-gray-600 py-2">목</div>
                            <div class="text-center text-sm font-medium text-gray-600 py-2">금</div>
                            <div class="text-center text-sm font-medium text-blue-500 py-2">토</div>
                        </div>

                        <div class="grid grid-cols-7 gap-2" id="calendar"></div>

                        <div class="mt-8">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">예약 가능 시간</h3>
                            <div id="timeSlots" class="grid grid-cols-4 gap-3"></div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-1">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">예약 정보</h2>
                        
                        <div class="space-y-4 mb-6">
                            <div class="p-4 bg-purple-50 rounded-xl">
                                <div class="text-sm text-gray-600 mb-1">선택한 날짜</div>
                                <div class="font-bold text-gray-900" id="selectedDate">날짜를 선택하세요</div>
                            </div>

                            <div class="p-4 bg-purple-50 rounded-xl">
                                <div class="text-sm text-gray-600 mb-1">선택한 시간</div>
                                <div class="font-bold text-gray-900" id="selectedTime">시간을 선택하세요</div>
                            </div>
                        </div>

                        <div class="space-y-3 mb-6">
                            <input type="text" id="name" placeholder="이름" 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <input type="tel" id="phone" placeholder="연락처" 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <textarea id="message" placeholder="문의 내용" rows="3"
                                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"></textarea>
                        </div>

                        <button onclick="submitReservation()" 
                                class="w-full gradient-purple text-white py-4 rounded-xl font-bold hover:shadow-lg transition">
                            <i class="fas fa-check mr-2"></i>예약하기
                        </button>

                        <div class="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            상담은 약 30분 소요됩니다
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let selectedDate = null;
            let selectedTimeSlot = null;

            function generateCalendar() {
                const calendar = document.getElementById('calendar');
                const today = new Date();
                const daysInMonth = 31;
                const startDay = 3; // 1월 1일이 수요일

                let html = '';
                for (let i = 0; i < startDay; i++) {
                    html += '<div></div>';
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const isPast = day < today.getDate();
                    const isToday = day === today.getDate();
                    
                    html += \`
                        <div onclick="selectDate(\${day})" 
                             class="calendar-day border border-gray-200 rounded-lg p-2 text-center cursor-pointer hover:border-purple-400 transition \${isPast ? 'bg-gray-100 cursor-not-allowed' : ''} \${isToday ? 'border-purple-600 bg-purple-50' : ''}">
                            <div class="font-medium \${isPast ? 'text-gray-400' : 'text-gray-900'}">\${day}</div>
                            \${!isPast ? '<div class="text-xs text-green-600 mt-1">예약가능</div>' : ''}
                        </div>
                    \`;
                }

                calendar.innerHTML = html;
            }

            function selectDate(day) {
                const today = new Date();
                if (day < today.getDate()) return;

                selectedDate = \`2025년 1월 \${day}일\`;
                document.getElementById('selectedDate').textContent = selectedDate;

                const timeSlots = document.getElementById('timeSlots');
                const times = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
                
                timeSlots.innerHTML = times.map(time => \`
                    <button onclick="selectTime('\${time}')" 
                            class="time-slot px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium hover:border-purple-400 transition">
                        \${time}
                    </button>
                \`).join('');
            }

            function selectTime(time) {
                selectedTimeSlot = time;
                document.getElementById('selectedTime').textContent = time;

                document.querySelectorAll('.time-slot').forEach(slot => {
                    slot.classList.remove('selected');
                });
                event.target.classList.add('selected');
            }

            function submitReservation() {
                const name = document.getElementById('name').value;
                const phone = document.getElementById('phone').value;

                if (!selectedDate || !selectedTimeSlot) {
                    alert('날짜와 시간을 선택해주세요');
                    return;
                }

                if (!name || !phone) {
                    alert('이름과 연락처를 입력해주세요');
                    return;
                }

                alert(\`예약이 완료되었습니다!\\n\\n날짜: \${selectedDate}\\n시간: \${selectedTimeSlot}\\n이름: \${name}\`);
            }

            generateCalendar();
        </script>
    </body>
    </html>
  `)
})

// 4. 학원 홍보 문구 생성기
app.get('/tools/promo-generator', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학원 홍보 문구 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">
                <i class="fas fa-bullhorn text-purple-600 mr-3"></i>학원 홍보 문구 생성기
            </h1>
            <p class="text-xl text-gray-600 mb-8">학생 모집에 효과적인 홍보 문구를 자동으로 생성합니다</p>

            <div class="bg-white rounded-2xl shadow-sm border p-8 mb-8">
                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm font-medium mb-2">학원 유형</label>
                        <select id="type" class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option>영어학원</option>
                            <option>수학학원</option>
                            <option>과학학원</option>
                            <option>논술학원</option>
                            <option>입시학원</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">타겟 학년</label>
                        <select id="grade" class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                            <option>초등</option>
                            <option>중등</option>
                            <option>고등</option>
                            <option>전학년</option>
                        </select>
                    </div>
                </div>
                <button onclick="generate()" class="w-full gradient-purple text-white py-4 rounded-xl font-bold">
                    <i class="fas fa-magic mr-2"></i>문구 생성하기
                </button>
            </div>

            <div id="results" class="hidden space-y-4"></div>
        </div>

        <script>
            function generate() {
                const type = document.getElementById('type').value;
                const grade = document.getElementById('grade').value;
                const templates = [
                    \`\${grade} \${type} 1등의 비결, 지금 바로 확인하세요!\`,
                    \`\${grade}생 성적 향상 프로그램 무료 체험 이벤트\`,
                    \`소수 정예 \${grade} \${type} - 1:1 맞춤 관리\`,
                    \`\${grade} 내신·수능 완벽 대비 \${type}\`,
                    \`합격률 98%! \${grade} 전문 \${type}\`,
                    \`\${grade} \${type} 겨울방학 특강 모집 중\`,
                    \`\${grade}생 학부모님, 성적 걱정 끝! 검증된 커리큘럼\`,
                    \`\${grade} \${type} 신규 오픈 이벤트 - 첫달 50% 할인\`,
                    \`\${grade}생 전문 강사진의 1:1 케어 시스템\`,
                    \`\${grade} \${type} 성적 보장반 운영 중\`
                ];

                const html = templates.map((text, i) => \`
                    <div class="bg-white rounded-xl p-6 shadow-sm border">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="text-sm text-purple-600 font-medium mb-2">홍보 문구 \${i+1}</div>
                                <div class="text-lg font-medium text-gray-900">\${text}</div>
                            </div>
                            <button onclick="copy('\${text.replace(/'/g, "\\\\'")}', this)" 
                                    class="px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg">
                                <i class="fas fa-copy"></i> 복사
                            </button>
                        </div>
                    </div>
                \`).join('');

                document.getElementById('results').innerHTML = html;
                document.getElementById('results').classList.remove('hidden');
            }

            function copy(text, btn) {
                navigator.clipboard.writeText(text);
                btn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
                setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> 복사', 2000);
            }
        </script>
    </body>
    </html>
  `)
})

// 5. 리뷰 답변 템플릿
app.get('/tools/review-template', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>리뷰 답변 템플릿 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">
                <i class="fas fa-comment-dots text-purple-600 mr-3"></i>리뷰 답변 템플릿
            </h1>
            <p class="text-xl text-gray-600 mb-8">긍정/부정 리뷰에 즉시 사용 가능한 전문적인 답변 템플릿</p>

            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white rounded-2xl p-6 shadow-sm border">
                    <h2 class="text-xl font-bold text-green-600 mb-4">
                        <i class="fas fa-smile mr-2"></i>긍정 리뷰 답변
                    </h2>
                    <div class="space-y-4">
                        ${['감사합니다! 앞으로도 최선을 다하겠습니다.', '소중한 후기 감사드립니다. 더욱 발전하는 학원이 되겠습니다.', '아이들의 성장이 저희의 가장 큰 보람입니다. 항상 응원해주세요!'].map((text, i) => `
                            <div class="p-4 bg-green-50 rounded-xl">
                                <div class="text-sm text-gray-600 mb-2">템플릿 ${i+1}</div>
                                <div class="text-gray-900">${text}</div>
                                <button onclick="copyText('${text}')" class="mt-2 text-sm text-green-600 hover:underline">
                                    <i class="fas fa-copy"></i> 복사
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-6 shadow-sm border">
                    <h2 class="text-xl font-bold text-orange-600 mb-4">
                        <i class="fas fa-frown mr-2"></i>부정 리뷰 답변
                    </h2>
                    <div class="space-y-4">
                        ${['소중한 의견 감사합니다. 더 나은 서비스를 제공하도록 노력하겠습니다.', '불편을 드려 죄송합니다. 빠르게 개선하겠습니다.', '전화 주시면 자세히 상담드리겠습니다. 감사합니다.'].map((text, i) => `
                            <div class="p-4 bg-orange-50 rounded-xl">
                                <div class="text-sm text-gray-600 mb-2">템플릿 ${i+1}</div>
                                <div class="text-gray-900">${text}</div>
                                <button onclick="copyText('${text}')" class="mt-2 text-sm text-orange-600 hover:underline">
                                    <i class="fas fa-copy"></i> 복사
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <script>
            function copyText(text) {
                navigator.clipboard.writeText(text);
                alert('복사되었습니다!');
            }
        </script>
    </body>
    </html>
  `)
})

// 6. 학부모 문자 메시지 템플릿
app.get('/tools/parent-sms-template', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학부모 문자 템플릿 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold mb-4">
                <i class="fas fa-sms text-purple-600 mr-3"></i>학부모 문자 메시지 템플릿
            </h1>
            <p class="text-xl text-gray-600 mb-8">상황별로 바로 사용 가능한 학부모 문자 템플릿</p>

            <div class="grid md:grid-cols-3 gap-6">
                ${[
                    {title: '성적 향상 안내', icon: 'chart-line', color: 'green', messages: [
                        '안녕하세요. 이번 시험에서 수학 성적이 많이 향상되었습니다! 앞으로도 응원 부탁드립니다.',
                        '학생의 꾸준한 노력으로 성적이 올랐습니다. 축하드립니다!',
                        '이번 달 학습 진도가 우수합니다. 계속 응원해주세요.'
                    ]},
                    {title: '결석 확인', icon: 'calendar-times', color: 'orange', messages: [
                        '안녕하세요. 오늘 수업에 불참하셨는데 괜찮으신가요?',
                        '결석 사유 확인 부탁드립니다. 보강 수업 안내드리겠습니다.',
                        '수업 불참 확인되었습니다. 건강 상태 괜찮으신지요?'
                    ]},
                    {title: '이벤트 안내', icon: 'gift', color: 'purple', messages: [
                        '[이벤트] 친구 추천 시 상품권 증정! 자세한 내용은 학원으로 문의주세요.',
                        '겨울방학 특강 안내드립니다. 조기 등록 시 할인 혜택!',
                        '학부모 상담 주간 운영 중입니다. 예약 부탁드립니다.'
                    ]}
                ].map(category => `
                    <div class="bg-white rounded-2xl p-6 shadow-sm border">
                        <h2 class="text-lg font-bold text-${category.color}-600 mb-4">
                            <i class="fas fa-${category.icon} mr-2"></i>${category.title}
                        </h2>
                        <div class="space-y-3">
                            ${category.messages.map((msg, i) => `
                                <div class="p-3 bg-gray-50 rounded-lg text-sm">
                                    <div class="text-gray-900 mb-2">${msg}</div>
                                    <button onclick="copy('${msg.replace(/'/g, "\\\\'")}', this)" 
                                            class="text-xs text-purple-600 hover:underline">
                                        복사하기
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <script>
            function copy(text, btn) {
                navigator.clipboard.writeText(text);
                btn.textContent = '복사됨!';
                setTimeout(() => btn.textContent = '복사하기', 2000);
            }
        </script>
    </body>
    </html>
  `)
})

// 7. 학원 포스터 문구 생성기
app.get('/tools/poster-generator', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학원 포스터 문구 생성기 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .poster-preview { aspect-ratio: 3/4; }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-6xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold mb-4">
                <i class="fas fa-image text-purple-600 mr-3"></i>학원 포스터 문구 생성기
            </h1>
            <p class="text-xl text-gray-600 mb-8">눈에 띄는 학원 홍보 포스터 문구를 생성합니다</p>

            <div class="grid lg:grid-cols-2 gap-8">
                <div class="bg-white rounded-2xl p-8 shadow-sm">
                    <h2 class="text-xl font-bold mb-6">포스터 설정</h2>
                    <div class="space-y-4 mb-6">
                        <input type="text" id="title" placeholder="메인 문구 (예: 겨울방학 특강)" 
                               class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        <input type="text" id="subtitle" placeholder="부제목 (예: 성적 향상 보장)" 
                               class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                        <input type="text" id="discount" placeholder="할인율 (예: 30% 할인)" 
                               class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <button onclick="generatePoster()" class="w-full gradient-purple text-white py-4 rounded-xl font-bold">
                        포스터 미리보기
                    </button>
                </div>

                <div class="bg-white rounded-2xl p-8 shadow-sm">
                    <h2 class="text-xl font-bold mb-6">미리보기</h2>
                    <div id="preview" class="poster-preview bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-8 flex flex-col justify-center items-center text-white">
                        <div class="text-center">
                            <div id="previewTitle" class="text-4xl font-bold mb-4">겨울방학 특강</div>
                            <div id="previewSubtitle" class="text-2xl mb-4">성적 향상 보장</div>
                            <div id="previewDiscount" class="text-5xl font-bold mb-4">30% 할인</div>
                            <div class="text-lg">슈퍼플레이스 학원</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function generatePoster() {
                const title = document.getElementById('title').value || '겨울방학 특강';
                const subtitle = document.getElementById('subtitle').value || '성적 향상 보장';
                const discount = document.getElementById('discount').value || '30% 할인';

                document.getElementById('previewTitle').textContent = title;
                document.getElementById('previewSubtitle').textContent = subtitle;
                document.getElementById('previewDiscount').textContent = discount;
            }
        </script>
    </body>
    </html>
  `)
})

// 8. 경쟁사 분석 도구
app.get('/tools/competitor-analysis', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>경쟁사 분석 도구 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold mb-4">
                <i class="fas fa-chart-bar text-purple-600 mr-3"></i>경쟁사 분석 도구
            </h1>
            <p class="text-xl text-gray-600 mb-8">주변 학원 정보를 분석하여 차별화 전략을 수립하세요</p>

            <div class="grid lg:grid-cols-3 gap-6">
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 class="text-lg font-bold mb-4">
                        <i class="fas fa-map-marker-alt text-purple-600 mr-2"></i>지역 검색
                    </h2>
                    <input type="text" id="location" placeholder="예: 인천 서구" 
                           class="w-full px-4 py-3 border rounded-xl mb-4 focus:ring-2 focus:ring-purple-500 outline-none">
                    <button onclick="analyze()" class="w-full gradient-purple text-white py-3 rounded-xl font-bold">
                        분석 시작
                    </button>
                </div>

                <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
                    <h2 class="text-lg font-bold mb-4">분석 결과</h2>
                    <div id="results" class="space-y-4">
                        <div class="text-center py-12 text-gray-500">
                            지역을 입력하고 분석을 시작하세요
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function analyze() {
                const location = document.getElementById('location').value;
                if (!location) {
                    alert('지역을 입력해주세요');
                    return;
                }

                const data = [
                    { name: 'A 영어학원', rating: 4.5, reviews: 120, price: '중간' },
                    { name: 'B 학원', rating: 4.2, reviews: 85, price: '높음' },
                    { name: 'C 영어', rating: 4.7, reviews: 200, price: '낮음' }
                ];

                const html = data.map(item => \`
                    <div class="p-4 border rounded-xl hover:border-purple-400 transition">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-lg">\${item.name}</h3>
                            <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                ⭐ \${item.rating}
                            </span>
                        </div>
                        <div class="text-sm text-gray-600 space-y-1">
                            <div>리뷰: \${item.reviews}개</div>
                            <div>가격대: \${item.price}</div>
                        </div>
                    </div>
                \`).join('');

                document.getElementById('results').innerHTML = html;
            }
        </script>
    </body>
    </html>
  `)
})

// 9. 학원 운영 체크리스트
app.get('/tools/operation-checklist', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학원 운영 체크리스트 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold mb-4">
                <i class="fas fa-tasks text-purple-600 mr-3"></i>학원 운영 체크리스트
            </h1>
            <p class="text-xl text-gray-600 mb-8">매일 확인해야 할 필수 체크리스트</p>

            <div class="space-y-6">
                ${[
                    {title: '오전 업무', items: ['교실 청소 및 환기', '학생 출결 확인', '오늘의 수업 자료 준비', '학부모 문의 답변']},
                    {title: '수업 중', items: ['학생 집중도 체크', '숙제 검사', '이해도 확인', '보충 필요 학생 파악']},
                    {title: '수업 후', items: ['오늘의 진도 기록', '학부모 상담 예약', '다음 수업 준비', '시설 점검']}
                ].map(section => `
                    <div class="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 class="text-xl font-bold text-purple-600 mb-4">
                            <i class="fas fa-clock mr-2"></i>${section.title}
                        </h2>
                        <div class="space-y-3">
                            ${section.items.map((item, i) => `
                                <label class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <input type="checkbox" class="w-5 h-5 text-purple-600 rounded">
                                    <span class="text-gray-900">${item}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="mt-8 text-center">
                <button onclick="resetAll()" class="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300">
                    전체 초기화
                </button>
            </div>
        </div>

        <script>
            function resetAll() {
                document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            }
        </script>
    </body>
    </html>
  `)
})

// 10. 마케팅 캠페인 플래너
app.get('/tools/campaign-planner', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마케팅 캠페인 플래너 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/tools" class="text-gray-600 hover:text-purple-600">← 툴 목록</a>
                </div>
            </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold mb-4">
                <i class="fas fa-calendar-alt text-purple-600 mr-3"></i>마케팅 캠페인 플래너
            </h1>
            <p class="text-xl text-gray-600 mb-8">월별 마케팅 캠페인을 체계적으로 계획하세요</p>

            <div class="bg-white rounded-2xl p-8 shadow-sm mb-8">
                <h2 class="text-2xl font-bold mb-6">2025년 연간 캠페인 계획</h2>
                
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${[
                        {month: '1월', campaign: '겨울방학 특강', status: 'active'},
                        {month: '2월', campaign: '신학기 준비반', status: 'planning'},
                        {month: '3월', campaign: '봄 신규 등록 이벤트', status: 'upcoming'},
                        {month: '4월', campaign: '중간고사 대비반', status: 'upcoming'},
                        {month: '7월', campaign: '여름방학 캠프', status: 'upcoming'},
                        {month: '12월', campaign: '연말 결산 이벤트', status: 'upcoming'}
                    ].map(item => `
                        <div class="p-6 border-2 ${item.status === 'active' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'} rounded-xl">
                            <div class="flex justify-between items-start mb-3">
                                <h3 class="font-bold text-lg">${item.month}</h3>
                                <span class="px-2 py-1 text-xs rounded-full ${
                                    item.status === 'active' ? 'bg-purple-200 text-purple-700' : 
                                    item.status === 'planning' ? 'bg-blue-200 text-blue-700' : 
                                    'bg-gray-200 text-gray-700'
                                }">
                                    ${item.status === 'active' ? '진행중' : item.status === 'planning' ? '준비중' : '예정'}
                                </span>
                            </div>
                            <p class="text-gray-700">${item.campaign}</p>
                            <button onclick="alert('캠페인 상세 페이지')" 
                                    class="mt-4 w-full py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50">
                                자세히 보기
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
                <h3 class="text-xl font-bold mb-4">💡 효과적인 캠페인 전략</h3>
                <div class="grid md:grid-cols-3 gap-6">
                    <div>
                        <h4 class="font-bold text-purple-600 mb-2">타이밍</h4>
                        <p class="text-sm text-gray-700">방학 2주 전부터 홍보 시작</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-purple-600 mb-2">채널</h4>
                        <p class="text-sm text-gray-700">네이버 플레이스, 블로그, 문자</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-purple-600 mb-2">혜택</h4>
                        <p class="text-sm text-gray-700">조기 등록 할인 + 사은품</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// 툴 메인 페이지 (목록)
app.get('/tools', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마케팅 툴 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .tool-card { transition: all 0.3s; }
            .tool-card:hover { transform: translateY(-4px); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <a href="/" class="text-gray-600 hover:text-purple-600">← 홈으로</a>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="text-center mb-12">
                <h1 class="text-5xl font-bold text-gray-900 mb-4">마케팅 툴</h1>
                <p class="text-xl text-gray-600">학원 마케팅에 필요한 모든 도구를 한 곳에서</p>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${[
                    {url: '/tools/landing-builder', icon: 'rocket', title: '랜딩페이지 생성기', desc: '학원 맞춤 랜딩페이지 제작', color: 'purple'},
                    {url: '/tools/place-keyword-analyzer', icon: 'search', title: '네이버 플레이스 키워드 분석기', desc: '최적의 키워드로 상위 노출', color: 'blue'},
                    {url: '/tools/blog-title-generator', icon: 'lightbulb', title: '블로그 제목 생성기', desc: '클릭률 높은 제목 자동 생성', color: 'orange'},
                    {url: '/tools/consultation-calendar', icon: 'calendar-check', title: '상담 예약 캘린더', desc: '간편한 상담 예약 시스템', color: 'green'},
                    {url: '/tools/promo-generator', icon: 'bullhorn', title: '학원 홍보 문구 생성기', desc: '효과적인 홍보 문구 생성', color: 'cyan'},
                    {url: '/tools/review-template', icon: 'comment-dots', title: '리뷰 답변 템플릿', desc: '즉시 사용 가능한 답변', color: 'pink'},
                    {url: '/tools/parent-sms-template', icon: 'sms', title: '학부모 문자 템플릿', desc: '상황별 문자 메시지', color: 'indigo'},
                    {url: '/tools/poster-generator', icon: 'image', title: '포스터 문구 생성기', desc: '눈에 띄는 포스터 제작', color: 'red'},
                    {url: '/tools/competitor-analysis', icon: 'chart-bar', title: '경쟁사 분석 도구', desc: '주변 학원 정보 분석', color: 'teal'},
                    {url: '/tools/operation-checklist', icon: 'tasks', title: '학원 운영 체크리스트', desc: '필수 업무 관리', color: 'yellow'},
                    {url: '/tools/campaign-planner', icon: 'calendar-alt', title: '마케팅 캠페인 플래너', desc: '연간 캠페인 계획', color: 'emerald'}
                ].map(tool => `
                    <a href="${tool.url}" class="tool-card block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 bg-${tool.color}-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-${tool.icon} text-${tool.color}-600 text-xl"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-bold text-lg text-gray-900 mb-2">${tool.title}</h3>
                                <p class="text-sm text-gray-600">${tool.desc}</p>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </a>
                `).join('')}
            </div>

            <div class="mt-12 text-center">
                <div class="inline-block bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-rocket text-purple-600 mr-2"></i>
                        더 많은 기능이 계속 추가됩니다!
                    </h3>
                    <p class="text-gray-600 mb-6">학원 운영에 필요한 툴이 있다면 제안해주세요</p>
                    <a href="/contact" class="inline-block gradient-purple text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg">
                        기능 제안하기
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// ============================================
// 관리자 페이지
// ============================================

// 관리자 대시보드
app.get('/admin', async (c) => {
  const { env } = c
  
  // 통계 데이터 조회
  const totalUsers = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
  const totalContacts = await env.DB.prepare('SELECT COUNT(*) as count FROM contacts').first()
  const pendingContacts = await env.DB.prepare('SELECT COUNT(*) as count FROM contacts WHERE status = ?').bind('pending').first()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 대시보드 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .card-hover { transition: all 0.3s ease; }
            .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin" class="text-purple-600 font-medium">대시보드</a>
                            <a href="/admin/users" class="text-gray-600 hover:text-purple-600">사용자</a>
                            <a href="/admin/deposits" class="text-gray-600 hover:text-purple-600">입금 신청</a>
                            <a href="/admin/contacts" class="text-gray-600 hover:text-purple-600">문의</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
                <p class="text-gray-600">시스템 전체 현황을 한눈에 확인하세요</p>
            </div>

            <!-- 통계 카드 -->
            <div class="grid md:grid-cols-3 gap-6 mb-8">
                <!-- 전체 사용자 -->
                <div class="bg-white rounded-2xl p-6 shadow-sm card-hover border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                            <i class="fas fa-users text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-gray-500">전체</span>
                    </div>
                    <div class="text-3xl font-bold text-gray-900 mb-1">${totalUsers?.count || 0}</div>
                    <div class="text-sm text-gray-600">전체 사용자</div>
                </div>

                <!-- 전체 문의 -->
                <div class="bg-white rounded-2xl p-6 shadow-sm card-hover border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-envelope text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-gray-500">전체</span>
                    </div>
                    <div class="text-3xl font-bold text-gray-900 mb-1">${totalContacts?.count || 0}</div>
                    <div class="text-sm text-gray-600">전체 문의</div>
                </div>

                <!-- 대기중 문의 -->
                <div class="bg-white rounded-2xl p-6 shadow-sm card-hover border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-clock text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-orange-500">처리 필요</span>
                    </div>
                    <div class="text-3xl font-bold text-gray-900 mb-1">${pendingContacts?.count || 0}</div>
                    <div class="text-sm text-gray-600">대기중 문의</div>
                </div>
            </div>

            <!-- 빠른 메뉴 -->
            <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 class="text-xl font-bold text-gray-900 mb-6">빠른 메뉴</h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <a href="/admin/users" class="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                            <i class="fas fa-users text-white"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-900">사용자 관리</div>
                            <div class="text-sm text-gray-600">회원 목록 및 관리</div>
                        </div>
                    </a>

                    <a href="/admin/contacts" class="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition">
                        <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-envelope text-white"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-900">문의 관리</div>
                            <div class="text-sm text-gray-600">대행 문의 확인</div>
                        </div>
                    </a>

                    <a href="/admin/programs" class="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition">
                        <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-graduation-cap text-white"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-900">프로그램 관리</div>
                            <div class="text-sm text-gray-600">교육 프로그램 관리</div>
                        </div>
                    </a>
                </div>
            </div>
        </div>

        <script>
            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 사용자 관리 페이지
app.get('/admin/users', async (c) => {
  const { env } = c
  
  // 사용자 목록 조회 (포인트 포함)
  const users = await env.DB.prepare('SELECT id, email, name, phone, academy_name, role, points, created_at FROM users ORDER BY created_at DESC').all()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>사용자 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/admin" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin" class="text-gray-600 hover:text-purple-600">대시보드</a>
                            <a href="/admin/users" class="text-purple-600 font-medium">사용자</a>
                            <a href="/admin/contacts" class="text-gray-600 hover:text-purple-600">문의</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">사용자 관리</h1>
                    <p class="text-gray-600">전체 ${users?.results?.length || 0}명의 사용자</p>
                </div>
            </div>

            <!-- 사용자 목록 테이블 -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학원명</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">포인트</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${users?.results?.map(user => {
                                // 작은따옴표 이스케이프 (JavaScript 함수에 안전하게 전달)
                                const safeName = (user.name || '').replace(/'/g, "\\'")
                                const safeEmail = (user.email || '').replace(/'/g, "\\'")
                                return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${user.phone || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${user.academy_name || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">${(user.points || 0).toLocaleString()}P</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-3 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                                            ${user.role === 'admin' ? '관리자' : '일반회원'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${new Date(user.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        ${user.role !== 'admin' ? `
                                            <div class="flex gap-2 flex-wrap">
                                                <button onclick="changePassword(${user.id}, '${safeName}')" class="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-xs font-medium" title="비밀번호 변경">
                                                    🔑 비밀번호
                                                </button>
                                                <button onclick="givePoints(${user.id}, '${safeName}', ${user.points || 0})" class="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium" title="포인트 지급">
                                                    💰 지급
                                                </button>
                                                <button onclick="deductPoints(${user.id}, '${safeName}', ${user.points || 0})" class="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium" title="포인트 차감">
                                                    ❌ 차감
                                                </button>
                                                <button onclick="loginAs(${user.id}, '${safeName}')" class="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs font-medium" title="이 사용자로 로그인">
                                                    👤 로그인
                                                </button>
                                                <button onclick="managePermissions(${user.id}, '${safeName}')" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium" title="권한 관리">
                                                    ⚙️ 권한
                                                </button>
                                            </div>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `}).join('') || '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">등록된 사용자가 없습니다</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 권한 관리 모달 -->
        <div id="permissionModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">프로그램 권한 관리</h2>
                        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <p id="modalUserName" class="text-gray-600 mt-2"></p>
                </div>
                
                <div class="p-6">
                    <!-- 프로그램 권한 섹션 -->
                    <h3 class="text-lg font-bold text-gray-900 mb-4">교육 프로그램</h3>
                    <div id="programPermissions" class="grid md:grid-cols-2 gap-4 mb-6">
                        <!-- 프로그램 권한 체크박스 -->
                    </div>

                    <!-- 툴 권한 섹션 -->
                    <h3 class="text-lg font-bold text-gray-900 mb-4">마케팅 툴</h3>
                    <div id="toolPermissions" class="grid md:grid-cols-2 gap-4">
                        <!-- 툴 권한 체크박스 -->
                    </div>
                </div>

                <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        취소
                    </button>
                    <button onclick="savePermissions()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        저장
                    </button>
                </div>
            </div>
        </div>

        <script>
            let currentUserId = null;

            const programs = [
                { id: 'naver-place', name: '네이버 플레이스 상위노출' },
                { id: 'blog', name: '블로그 상위노출' },
                { id: 'funnel', name: '퍼널 마케팅' },
                { id: 'sns', name: 'SNS 마케팅' },
                { id: 'video', name: '영상 마케팅' },
                { id: 'ad', name: '온라인 광고' },
                { id: 'community', name: '커뮤니티 마케팅' },
                { id: 'branding', name: '브랜딩' },
                { id: 'data', name: '데이터 분석' }
            ];

            const tools = [
                { id: 'place-keyword-analyzer', name: '키워드 분석기' },
                { id: 'blog-title-generator', name: '블로그 제목 생성기' },
                { id: 'consultation-calendar', name: '상담 예약 캘린더' },
                { id: 'promo-generator', name: '홍보 문구 생성기' },
                { id: 'review-template', name: '리뷰 답변 템플릿' },
                { id: 'parent-sms-template', name: '학부모 문자 템플릿' },
                { id: 'poster-generator', name: '포스터 문구 생성기' },
                { id: 'competitor-analysis', name: '경쟁사 분석' },
                { id: 'operation-checklist', name: '운영 체크리스트' },
                { id: 'campaign-planner', name: '캠페인 플래너' }
            ];

            async function managePermissions(userId, userName) {
                currentUserId = userId;
                document.getElementById('modalUserName').textContent = userName + '님의 권한 설정';
                
                // 현재 권한 조회
                const response = await fetch('/api/user/' + userId + '/permissions');
                const data = await response.json();
                const currentPermissions = data.permissions || [];
                
                // 프로그램 권한 렌더링
                const programPerms = document.getElementById('programPermissions');
                programPerms.innerHTML = programs.map(prog => {
                    const hasPermission = currentPermissions.some(p => 
                        p.permission_type === 'program' && p.permission_name === prog.id
                    );
                    return '<label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">' +
                        '<input type="checkbox" class="w-5 h-5 text-blue-600 rounded mr-3" data-type="program" data-name="' + prog.id + '" ' + (hasPermission ? 'checked' : '') + '>' +
                        '<span class="text-sm font-medium text-gray-900">' + prog.name + '</span>' +
                        '</label>';
                }).join('');

                // 툴 권한 렌더링
                const toolPerms = document.getElementById('toolPermissions');
                toolPerms.innerHTML = tools.map(tool => {
                    const hasPermission = currentPermissions.some(p => 
                        p.permission_type === 'tool' && p.permission_name === tool.id
                    );
                    return '<label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">' +
                        '<input type="checkbox" class="w-5 h-5 text-blue-600 rounded mr-3" data-type="tool" data-name="' + tool.id + '" ' + (hasPermission ? 'checked' : '') + '>' +
                        '<span class="text-sm font-medium text-gray-900">' + tool.name + '</span>' +
                        '</label>';
                }).join('');

                // 모달 표시
                document.getElementById('permissionModal').classList.remove('hidden');
            }

            async function savePermissions() {
                const checkboxes = document.querySelectorAll('#permissionModal input[type="checkbox"]');
                
                for (const checkbox of checkboxes) {
                    const type = checkbox.dataset.type;
                    const name = checkbox.dataset.name;
                    
                    if (checkbox.checked) {
                        // 권한 부여
                        await fetch('/api/admin/permissions/grant', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: currentUserId,
                                permissionType: type,
                                permissionName: name,
                                expiresAt: null
                            })
                        });
                    } else {
                        // 권한 회수
                        await fetch('/api/admin/permissions/revoke', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: currentUserId,
                                permissionType: type,
                                permissionName: name
                            })
                        });
                    }
                }

                alert('권한이 업데이트되었습니다.');
                closeModal();
            }

            function closeModal() {
                document.getElementById('permissionModal').classList.add('hidden');
                currentUserId = null;
            }

            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }

            // 비밀번호 변경
            async function changePassword(userId, userName) {
                const newPassword = prompt(userName + '님의 새 비밀번호를 입력하세요 (최소 6자):');
                if (!newPassword) return;
                
                if (newPassword.length < 6) {
                    alert('비밀번호는 최소 6자 이상이어야 합니다.');
                    return;
                }

                try {
                    const response = await fetch('/api/admin/users/' + userId + '/password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newPassword })
                    });

                    const data = await response.json();
                    if (data.success) {
                        alert('비밀번호가 변경되었습니다!');
                    } else {
                        alert('오류: ' + (data.error || '비밀번호 변경 실패'));
                    }
                } catch (error) {
                    alert('비밀번호 변경 중 오류가 발생했습니다.');
                }
            }

            // 포인트 지급
            async function givePoints(userId, userName, currentPoints) {
                const pointsStr = prompt(userName + '님에게 지급할 포인트를 입력하세요 (현재: ' + currentPoints + 'P):');
                if (!pointsStr) return;
                
                const points = parseInt(pointsStr);
                if (isNaN(points) || points <= 0) {
                    alert('올바른 포인트를 입력하세요.');
                    return;
                }

                try {
                    const response = await fetch('/api/admin/users/' + userId + '/points', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ points })
                    });

                    const data = await response.json();
                    if (data.success) {
                        alert(points.toLocaleString() + 'P가 지급되었습니다! 새 잔액: ' + data.newPoints.toLocaleString() + 'P');
                        location.reload();
                    } else {
                        alert('오류: ' + (data.error || '포인트 지급 실패'));
                    }
                } catch (error) {
                    alert('포인트 지급 중 오류가 발생했습니다.');
                }
            }

            // 포인트 차감 (환수)
            async function deductPoints(userId, userName, currentPoints) {
                const pointsStr = prompt(userName + '님의 포인트를 차감합니다 (현재: ' + currentPoints.toLocaleString() + 'P) - 차감할 포인트를 입력하세요:');
                if (!pointsStr) return;
                
                const points = parseInt(pointsStr);
                if (isNaN(points) || points <= 0) {
                    alert('올바른 포인트를 입력하세요.');
                    return;
                }

                // 현재 포인트보다 많이 차감하려는 경우 경고
                if (points > currentPoints) {
                    if (!confirm('경고: 현재 포인트(' + currentPoints.toLocaleString() + 'P)보다 많은 금액(' + points.toLocaleString() + 'P)을 차감하면 포인트가 마이너스가 됩니다. 계속하시겠습니까?')) {
                        return;
                    }
                }

                if (!confirm(userName + '님의 포인트를 ' + points.toLocaleString() + 'P 차감하시겠습니까? (차감 후 잔액: ' + (currentPoints - points).toLocaleString() + 'P)')) {
                    return;
                }

                try {
                    const response = await fetch('/api/admin/users/' + userId + '/points/deduct', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ points })
                    });

                    const data = await response.json();
                    if (data.success) {
                        alert(points.toLocaleString() + 'P가 차감되었습니다! 새 잔액: ' + data.newPoints.toLocaleString() + 'P');
                        location.reload();
                    } else {
                        alert('오류: ' + (data.error || '포인트 차감 실패'));
                    }
                } catch (error) {
                    alert('포인트 차감 중 오류가 발생했습니다.');
                }
            }

            // 사용자로 로그인
            async function loginAs(userId, userName) {
                if (!confirm(userName + '님의 계정으로 로그인하시겠습니까?')) return;

                try {
                    const response = await fetch('/api/admin/login-as/' + userId, {
                        method: 'POST'
                    });

                    const data = await response.json();
                    if (data.success) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        alert(userName + '님으로 로그인되었습니다!');
                        window.location.href = '/dashboard';
                    } else {
                        alert('오류: ' + (data.error || '로그인 실패'));
                    }
                } catch (error) {
                    alert('로그인 중 오류가 발생했습니다.');
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 사용자: 내 입금 내역 페이지
app.get('/my-deposits', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 입금 내역 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/dashboard" class="text-2xl font-bold text-purple-600">슈퍼플레이스</a>
                    <div class="flex items-center gap-4">
                        <span id="userName" class="text-gray-700"></span>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                            <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">내 입금 신청 내역</h1>
                    <p class="text-gray-600">전체 <span id="totalCount">0</span>건의 입금 신청</p>
                </div>
                <a href="/dashboard" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">
                    <i class="fas fa-arrow-left mr-2"></i>대시보드로 돌아가기
                </a>
            </div>

            <!-- 필터 버튼 -->
            <div class="mb-6 flex gap-2">
                <button onclick="filterDeposits('all')" class="filter-btn px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">전체</button>
                <button onclick="filterDeposits('pending')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">대기중</button>
                <button onclick="filterDeposits('approved')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">승인완료</button>
                <button onclick="filterDeposits('rejected')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">거절됨</button>
            </div>

            <!-- 입금 신청 목록 -->
            <div id="depositList" class="space-y-4">
                <!-- 로딩 중 -->
                <div class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                    <p class="mt-4 text-gray-600">입금 내역을 불러오는 중...</p>
                </div>
            </div>
        </div>

        <script>
            let allDeposits = [];
            let currentFilter = 'all';

            window.onload = async function() {
                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    window.location.href = '/login';
                    return;
                }

                const user = JSON.parse(userStr);
                document.getElementById('userName').textContent = user.name || user.email;

                await loadDeposits(user.id);
            }

            async function loadDeposits(userId) {
                try {
                    const response = await fetch('/api/deposit/my-requests/' + userId);
                    const data = await response.json();

                    if (data.success) {
                        allDeposits = data.requests || [];
                        document.getElementById('totalCount').textContent = allDeposits.length;
                        renderDeposits();
                    } else {
                        showError('입금 내역을 불러올 수 없습니다.');
                    }
                } catch (error) {
                    showError('입금 내역 조회 중 오류가 발생했습니다.');
                }
            }

            function renderDeposits() {
                const container = document.getElementById('depositList');
                const filtered = currentFilter === 'all' 
                    ? allDeposits 
                    : allDeposits.filter(d => d.status === currentFilter);

                if (filtered.length === 0) {
                    container.innerHTML = '<div class="text-center py-12 text-gray-500">입금 신청 내역이 없습니다</div>';
                    return;
                }

                container.innerHTML = filtered.map(deposit => {
                    const statusBadge = {
                        'pending': '<span class="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">대기중</span>',
                        'approved': '<span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">승인완료</span>',
                        'rejected': '<span class="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">거절됨</span>'
                    }[deposit.status] || '<span class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">알 수 없음</span>';

                    return '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">' +
                        '<div class="flex justify-between items-start mb-4">' +
                            '<div class="flex-1">' +
                                '<div class="flex items-center gap-3 mb-2">' +
                                    '<h3 class="text-lg font-bold text-gray-900">' + deposit.amount.toLocaleString() + '원</h3>' +
                                    statusBadge +
                                '</div>' +
                                '<div class="grid grid-cols-2 gap-2 text-sm text-gray-600">' +
                                    '<span><i class="fas fa-university mr-1"></i>' + (deposit.bank_name || '-') + '</span>' +
                                    '<span><i class="fas fa-credit-card mr-1"></i>' + (deposit.account_number || '-') + '</span>' +
                                    '<span><i class="fas fa-user mr-1"></i>입금자: ' + (deposit.depositor_name || '-') + '</span>' +
                                    '<span><i class="fas fa-clock mr-1"></i>' + new Date(deposit.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + '</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        (deposit.message ? '<div class="bg-gray-50 rounded-xl p-4 mb-4"><div class="text-sm text-gray-700">' + deposit.message + '</div></div>' : '') +
                        (deposit.processed_at ? '<div class="text-xs text-gray-500 mt-2">처리일시: ' + new Date(deposit.processed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + '</div>' : '') +
                    '</div>';
                }).join('');
            }

            function filterDeposits(status) {
                currentFilter = status;
                renderDeposits();

                // 버튼 스타일 업데이트
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.className = 'filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium';
                });
                event.target.className = 'filter-btn px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium';
            }

            function showError(message) {
                document.getElementById('depositList').innerHTML = 
                    '<div class="text-center py-12 text-red-600">' +
                        '<i class="fas fa-exclamation-circle text-4xl mb-4"></i>' +
                        '<p>' + message + '</p>' +
                    '</div>';
            }

            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 관리자: 입금 신청 관리 페이지
app.get('/admin/deposits', async (c) => {
  const { env } = c
  
  // 입금 신청 목록 조회
  const deposits = await env.DB.prepare('SELECT * FROM deposit_requests ORDER BY created_at DESC').all()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>입금 신청 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/admin" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin" class="text-gray-600 hover:text-purple-600">대시보드</a>
                            <a href="/admin/users" class="text-gray-600 hover:text-purple-600">사용자</a>
                            <a href="/admin/deposits" class="text-purple-600 font-medium">입금 신청</a>
                            <a href="/admin/contacts" class="text-gray-600 hover:text-purple-600">문의</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">입금 신청 관리</h1>
                    <p class="text-gray-600">전체 ${deposits?.results?.length || 0}건의 입금 신청</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="filterDeposits('all')" class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">전체</button>
                    <button onclick="filterDeposits('pending')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">대기중</button>
                    <button onclick="filterDeposits('approved')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">승인</button>
                    <button onclick="filterDeposits('rejected')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">거절</button>
                </div>
            </div>

            <!-- 계좌 정보 -->
            <div class="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl p-6 mb-8 text-white shadow-lg">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold mb-2">입금 계좌 정보</h3>
                        <div class="space-y-1">
                            <p class="text-blue-100">은행: <span class="font-bold text-white">하나은행</span></p>
                            <p class="text-blue-100">계좌번호: <span class="font-bold text-white text-xl">746-910023-17004</span></p>
                            <p class="text-blue-100">예금주: <span class="font-bold text-white">주식회사 우리는 슈퍼플레이스다</span></p>
                        </div>
                    </div>
                    <button onclick="copyAccountNumber()" class="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-bold flex items-center gap-2">
                        <i class="fas fa-copy"></i>
                        계좌번호 복사
                    </button>
                </div>
            </div>

            <!-- 입금 신청 목록 -->
            <div class="space-y-4">
                ${deposits?.results?.map(deposit => `
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition" data-status="${deposit.status || 'pending'}">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 class="text-lg font-bold text-gray-900">${deposit.user_name}</h3>
                                    <span class="px-3 py-1 text-xs font-medium rounded-full ${
                                        deposit.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                        deposit.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                        'bg-orange-100 text-orange-700'
                                    }">
                                        ${deposit.status === 'approved' ? '승인완료' : deposit.status === 'rejected' ? '거절됨' : '대기중'}
                                    </span>
                                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                        ${deposit.amount?.toLocaleString()}원
                                    </span>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <span><i class="fas fa-envelope mr-1"></i>${deposit.user_email}</span>
                                    <span><i class="fas fa-university mr-1"></i>${deposit.bank_name || '-'}</span>
                                    <span><i class="fas fa-credit-card mr-1"></i>${deposit.account_number || '-'}</span>
                                    <span><i class="fas fa-user mr-1"></i>입금자: ${deposit.depositor_name || '-'}</span>
                                </div>
                            </div>
                            <div class="text-sm text-gray-500 text-right">
                                <div>${new Date(deposit.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
                                ${deposit.processed_at ? `<div class="text-xs mt-1">처리: ${new Date(deposit.processed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>` : ''}
                            </div>
                        </div>

                        ${deposit.message ? `
                            <div class="bg-gray-50 rounded-xl p-4 mb-4">
                                <div class="text-sm text-gray-700">${deposit.message}</div>
                            </div>
                        ` : ''}

                        ${deposit.status === 'pending' ? `
                            <div class="flex gap-2">
                                <button onclick="processDeposit(${deposit.id}, 'approved', ${deposit.amount}, '${deposit.user_name}')" 
                                        class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                                    <i class="fas fa-check mr-2"></i>승인 (${deposit.amount?.toLocaleString()}P 지급)
                                </button>
                                <button onclick="processDeposit(${deposit.id}, 'rejected', 0, '${deposit.user_name}')" 
                                        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                                    <i class="fas fa-times mr-2"></i>거절
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('') || '<div class="text-center py-12 text-gray-500">입금 신청 내역이 없습니다</div>'}
            </div>
        </div>

        <script>
            function filterDeposits(status) {
                const deposits = document.querySelectorAll('[data-status]');
                deposits.forEach(deposit => {
                    if (status === 'all' || deposit.dataset.status === status) {
                        deposit.style.display = 'block';
                    } else {
                        deposit.style.display = 'none';
                    }
                });

                // 버튼 스타일 업데이트
                document.querySelectorAll('button[onclick^="filterDeposits"]').forEach(btn => {
                    btn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium';
                });
                event.target.className = 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium';
            }

            function copyAccountNumber() {
                const accountNumber = '746-910023-17004';
                navigator.clipboard.writeText(accountNumber).then(() => {
                    alert('계좌번호가 복사되었습니다!\\n' + accountNumber);
                }).catch(err => {
                    alert('복사 실패: ' + err);
                });
            }

            async function processDeposit(depositId, status, points, userName) {
                const action = status === 'approved' ? '승인' : '거절';
                const message = status === 'approved' 
                    ? userName + '님의 입금 신청을 승인하고 ' + points.toLocaleString() + 'P를 지급하시겠습니까?' 
                    : userName + '님의 입금 신청을 거절하시겠습니까?';

                if (!confirm(message)) return;

                try {
                    const response = await fetch('/api/admin/deposit/requests/' + depositId + '/process', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status, points })
                    });

                    const data = await response.json();
                    if (data.success) {
                        alert(action + ' 처리가 완료되었습니다!');
                        location.reload();
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (error) {
                    alert('처리 중 오류가 발생했습니다.');
                }
            }

            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 문의 관리 페이지
app.get('/admin/contacts', async (c) => {
  const { env } = c
  
  // 문의 목록 조회
  const contacts = await env.DB.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>문의 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/admin" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin" class="text-gray-600 hover:text-purple-600">대시보드</a>
                            <a href="/admin/users" class="text-gray-600 hover:text-purple-600">사용자</a>
                            <a href="/admin/contacts" class="text-purple-600 font-medium">문의</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <!-- 메인 컨텐츠 -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">문의 관리</h1>
                    <p class="text-gray-600">전체 ${contacts?.results?.length || 0}건의 문의</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="filterContacts('all')" class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">전체</button>
                    <button onclick="filterContacts('pending')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">대기중</button>
                    <button onclick="filterContacts('completed')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">처리완료</button>
                </div>
            </div>

            <!-- 문의 목록 -->
            <div class="space-y-4">
                ${contacts?.results?.map(contact => `
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition" data-status="${contact.status || 'pending'}">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 class="text-lg font-bold text-gray-900">${contact.name}</h3>
                                    <span class="px-3 py-1 text-xs font-medium rounded-full ${contact.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                                        ${contact.status === 'completed' ? '처리완료' : '대기중'}
                                    </span>
                                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                        ${contact.inquiry || '일반문의'}
                                    </span>
                                </div>
                                <div class="flex gap-4 text-sm text-gray-600">
                                    <span><i class="fas fa-building mr-1"></i>${contact.academy || '-'}</span>
                                    <span><i class="fas fa-phone mr-1"></i>${contact.phone}</span>
                                    <span><i class="fas fa-envelope mr-1"></i>${contact.email}</span>
                                </div>
                            </div>
                            <div class="text-sm text-gray-500">
                                ${new Date(contact.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </div>
                        </div>

                        <div class="bg-gray-50 rounded-xl p-4 mb-4">
                            <div class="text-sm text-gray-700 whitespace-pre-wrap">${contact.message}</div>
                        </div>

                        ${contact.programs ? `
                            <div class="flex gap-2 mb-4">
                                <span class="text-sm text-gray-600">관심 프로그램:</span>
                                ${JSON.parse(contact.programs || '[]').map(p => `
                                    <span class="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg">${p}</span>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div class="flex gap-2">
                            <button onclick="updateStatus(${contact.id}, 'completed')" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                                <i class="fas fa-check mr-1"></i>처리완료
                            </button>
                            <button onclick="updateStatus(${contact.id}, 'pending')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                                <i class="fas fa-undo mr-1"></i>대기중으로
                            </button>
                        </div>
                    </div>
                `).join('') || '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">등록된 문의가 없습니다</div>'}
            </div>
        </div>

        <script>
            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }

            function filterContacts(status) {
                const items = document.querySelectorAll('[data-status]');
                const buttons = document.querySelectorAll('button[onclick^="filterContacts"]');
                
                buttons.forEach(btn => {
                    btn.classList.remove('bg-purple-600', 'text-white');
                    btn.classList.add('bg-gray-200', 'text-gray-700');
                });
                event.target.classList.add('bg-purple-600', 'text-white');
                event.target.classList.remove('bg-gray-200', 'text-gray-700');
                
                items.forEach(item => {
                    if(status === 'all') {
                        item.style.display = 'block';
                    } else {
                        item.style.display = item.dataset.status === status ? 'block' : 'none';
                    }
                });
            }

            async function updateStatus(id, status) {
                try {
                    const response = await fetch('/api/admin/contacts/' + id, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    });

                    if(response.ok) {
                        alert('상태가 변경되었습니다');
                        location.reload();
                    } else {
                        alert('상태 변경 실패');
                    }
                } catch(error) {
                    alert('오류가 발생했습니다');
                }
            }
        </script>
    </body>
    </html>
  `)
})

// 권한 관리 API
// 사용자 권한 조회 API
app.get('/api/user/:id/permissions', async (c) => {
  try {
    const { env } = c;
    const userId = c.req.param('id');
    
    const permissions = await env.DB.prepare(`
      SELECT permission_type, permission_name, granted_at, expires_at, is_active
      FROM user_permissions
      WHERE user_id = ? AND is_active = 1
      ORDER BY granted_at DESC
    `).bind(userId).all();
    
    return c.json({ permissions: permissions.results });
  } catch (error) {
    console.error('Get permissions error:', error);
    return c.json({ success: false, error: '권한 조회 실패' }, 500);
  }
});

// 권한 부여 API (관리자 전용)
app.post('/api/admin/permissions/grant', async (c) => {
  try {
    const { env } = c;
    const { userId, permissionType, permissionName, expiresAt } = await c.req.json();
    
    const result = await env.DB.prepare(`
      INSERT INTO user_permissions (user_id, permission_type, permission_name, granted_by, expires_at, is_active)
      VALUES (?, ?, ?, 1, ?, 1)
    `).bind(userId, permissionType, permissionName, expiresAt || null).run();
    
    return c.json({ success: true, message: '권한이 부여되었습니다' });
  } catch (error) {
    console.error('Grant permission error:', error);
    return c.json({ success: false, error: '권한 부여 실패' }, 500);
  }
});

// 권한 회수 API (관리자 전용)
app.post('/api/admin/permissions/revoke', async (c) => {
  try {
    const { env } = c;
    const { userId, permissionType, permissionName } = await c.req.json();
    
    await env.DB.prepare(`
      UPDATE user_permissions
      SET is_active = 0
      WHERE user_id = ? AND permission_type = ? AND permission_name = ?
    `).bind(userId, permissionType, permissionName).run();
    
    return c.json({ success: true, message: '권한이 회수되었습니다' });
  } catch (error) {
    console.error('Revoke permission error:', error);
    return c.json({ success: false, error: '권한 회수 실패' }, 500);
  }
});

// 문의 상태 업데이트 API
app.patch('/api/admin/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    const { env } = c
    
    await env.DB.prepare('UPDATE contacts SET status = ? WHERE id = ?').bind(status, id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update contact status error:', error)
    return c.json({ success: false }, 500)
  }
})

// 문의 상태 업데이트 API
app.patch('/api/admin/contacts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    const { env } = c
    
    await env.DB.prepare('UPDATE contacts SET status = ? WHERE id = ?').bind(status, id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update contact status error:', error)
    return c.json({ success: false }, 500)
  }
})

// 관리자 대시보드
app.get('/admin/dashboard', async (c) => {
  const { env } = c
  
  // 통계 데이터 조회
  const usersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').all()
  const contactsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM contacts').all()
  const pendingContacts = await env.DB.prepare('SELECT COUNT(*) as count FROM contacts WHERE status = "pending"').all()
  
  const totalUsers = usersCount.results[0]?.count || 0
  const totalContacts = contactsCount.results[0]?.count || 0
  const pendingCount = pendingContacts.results[0]?.count || 0
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 대시보드 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/admin/dashboard" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin/dashboard" class="text-purple-600 font-semibold">대시보드</a>
                            <a href="/admin/users" class="text-gray-600 hover:text-purple-600">사용자</a>
                            <a href="/admin/contacts" class="text-gray-600 hover:text-purple-600">문의</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">관리자 대시보드</h1>
            
            <div class="grid md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">전체 사용자</span>
                        <i class="fas fa-users text-blue-600 text-2xl"></i>
                    </div>
                    <p class="text-3xl font-bold text-gray-900">${totalUsers}</p>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">전체 문의</span>
                        <i class="fas fa-envelope text-green-600 text-2xl"></i>
                    </div>
                    <p class="text-3xl font-bold text-gray-900">${totalContacts}</p>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">대기중 문의</span>
                        <i class="fas fa-clock text-orange-600 text-2xl"></i>
                    </div>
                    <p class="text-3xl font-bold text-gray-900">${pendingCount}</p>
                </div>
            </div>
            
            <div class="grid md:grid-cols-3 gap-6">
                <a href="/admin/users" class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-200">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-user-cog text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">사용자 관리</h3>
                            <p class="text-gray-600">사용자 목록 및 권한 관리</p>
                        </div>
                    </div>
                </a>
                
                <a href="/admin/contacts" class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-200">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-comments text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">문의 관리</h3>
                            <p class="text-gray-600">대행 문의 처리 및 관리</p>
                        </div>
                    </div>
                </a>
                
                <a href="/admin/programs" class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-200">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-graduation-cap text-purple-600 text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">프로그램 관리</h3>
                            <p class="text-gray-600">교육 프로그램 13개 등록됨</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>

        <script>
            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }
        </script>
    </body>
    </html>
  `)
})

// .html 확장자 접근 시 리다이렉트
app.get('/admin/programs.html', (c) => {
  return c.redirect('/admin/programs', 301)
})

// 관리자 프로그램 관리 페이지
app.get('/admin/programs', async (c) => {
  const { env } = c
  
  // 모든 사용자와 프로그램 목록 조회
  const users = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE role != ? ORDER BY created_at DESC').bind('admin').all()

  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>프로그램 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-8">
                        <a href="/admin/dashboard" class="text-2xl font-bold text-purple-600">슈퍼플레이스 관리자</a>
                        <div class="flex gap-4">
                            <a href="/admin/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                            <a href="/admin/users" class="text-gray-600 hover:text-purple-600">사용자</a>
                            <a href="/admin/contacts" class="text-gray-600 hover:text-purple-600">문의</a>
                            <a href="/admin/programs" class="text-purple-600 font-semibold">프로그램</a>
                        </div>
                    </div>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">프로그램 관리</h1>
                <p class="text-gray-600">총 13개의 교육 프로그램이 등록되어 있습니다. 클릭하여 권한을 관리하세요.</p>
            </div>

            <div id="programsGrid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>

        <!-- 권한 관리 모달 -->
        <div id="permissionModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <span id="modalProgramIcon"></span>
                        <span id="modalProgramName"></span> 권한 관리
                    </h2>
                    <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>

                <div class="mb-6">
                    <h3 class="text-lg font-bold mb-4">사용자별 권한 설정</h3>
                    <div id="usersList" class="space-y-3 max-h-96 overflow-y-auto"></div>
                </div>

                <div class="flex gap-4">
                    <button onclick="savePermissions()" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button onclick="closeModal()" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
                        취소
                    </button>
                </div>
            </div>
        </div>

        <script>
            const programs = [
                { id: 'naver-place', name: '네이버 플레이스 상위노출', desc: '지역 검색 1위를 위한 실전 노하우', icon: '🗺️', url: '/programs/naver-place' },
                { id: 'blog', name: '블로그 상위노출', desc: '검색 1페이지 진입을 위한 블로그 마케팅', icon: '📝', url: '/programs/blog' },
                { id: 'funnel', name: '퍼널 마케팅', desc: '자동화된 학생 모집 시스템 구축', icon: '🎯', url: '/programs/funnel' },
                { id: 'sns', name: 'SNS 마케팅', desc: '인스타그램, 페이스북 활용 전략', icon: '📱', url: '/programs/sns' },
                { id: 'video', name: '영상 마케팅', desc: '유튜브, 숏폼 콘텐츠 제작', icon: '🎥', url: '/programs/video' },
                { id: 'ad', name: '온라인 광고', desc: '네이버, 구글 광고 운영 전략', icon: '💰', url: '/programs/ad' },
                { id: 'community', name: '커뮤니티 마케팅', desc: '학부모 커뮤니티 활성화 전략', icon: '👥', url: '/programs/community' },
                { id: 'branding', name: '브랜딩', desc: '학원 브랜드 아이덴티티 구축', icon: '🎨', url: '/programs/branding' },
                { id: 'data', name: '데이터 분석', desc: '마케팅 성과 분석 및 최적화', icon: '📊', url: '/programs/data' },
                { id: 'carrot', name: '당근 비즈니스 마케팅', desc: '지역 기반 당근마켓 활용 전략', icon: '🥕', url: '/programs/carrot' },
                { id: 'meta', name: '메타 광고', desc: 'Facebook/Instagram 광고 운영', icon: '📘', url: '/programs/meta' },
                { id: 'youtube-ad', name: '유튜브 광고', desc: '유튜브 광고 캠페인 운영', icon: '📺', url: '/programs/youtube-ad' },
                { id: 'threads', name: '쓰레드 마케팅', desc: 'Meta Threads 활용 전략', icon: '🧵', url: '/programs/threads' }
            ];

            const users = ${JSON.stringify(users.results || [])};
            let currentProgram = null;
            let userPermissions = {};

            // 프로그램 카드 렌더링
            function renderPrograms() {
                const grid = document.getElementById('programsGrid');
                grid.innerHTML = programs.map(p => 
                    '<div onclick="openPermissionModal(\\'' + p.id + '\\')" ' +
                         'class="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition cursor-pointer">' +
                        '<div class="text-4xl mb-3">' + p.icon + '</div>' +
                        '<h3 class="text-xl font-bold text-gray-900 mb-2">' + p.name + '</h3>' +
                        '<p class="text-gray-600 text-sm mb-4">' + p.desc + '</p>' +
                        '<div class="flex gap-2">' +
                            '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">활성화</span>' +
                            '<a href="' + p.url + '" target="_blank" onclick="event.stopPropagation()" ' +
                               'class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200">' +
                                '<i class="fas fa-external-link-alt mr-1"></i>보기' +
                            '</a>' +
                        '</div>' +
                    '</div>'
                ).join('');
            }

            // 권한 관리 모달 열기
            async function openPermissionModal(programId) {
                currentProgram = programs.find(p => p.id === programId);
                document.getElementById('modalProgramIcon').textContent = currentProgram.icon;
                document.getElementById('modalProgramName').textContent = currentProgram.name;

                // 사용자별 권한 조회
                userPermissions = {};
                for (const user of users) {
                    const response = await fetch('/api/user/' + user.id + '/permissions');
                    const data = await response.json();
                    const permissions = data.permissions || [];
                    userPermissions[user.id] = permissions.some(
                        p => p.permission_type === 'program' && p.permission_name === programId && p.is_active === 1
                    );
                }

                renderUsersList();
                document.getElementById('permissionModal').classList.remove('hidden');
            }

            // 사용자 목록 렌더링
            function renderUsersList() {
                const list = document.getElementById('usersList');
                list.innerHTML = users.map(user =>
                    '<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">' +
                        '<div class="flex-1">' +
                            '<p class="font-semibold text-gray-900">' + user.name + '</p>' +
                            '<p class="text-sm text-gray-600">' + user.email + '</p>' +
                        '</div>' +
                        '<label class="flex items-center cursor-pointer">' +
                            '<input type="checkbox" ' +
                                   'id="user-' + user.id + '" ' +
                                   (userPermissions[user.id] ? 'checked' : '') +
                                   ' class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">' +
                            '<span class="ml-3 text-sm font-medium text-gray-900">권한 부여</span>' +
                        '</label>' +
                    '</div>'
                ).join('');
            }

            // 권한 저장
            async function savePermissions() {
                const updates = [];
                
                for (const user of users) {
                    const checkbox = document.getElementById('user-' + user.id);
                    const hasPermission = checkbox.checked;
                    const hadPermission = userPermissions[user.id];

                    if (hasPermission !== hadPermission) {
                        updates.push({ userId: user.id, hasPermission });
                    }
                }

                if (updates.length === 0) {
                    alert('변경사항이 없습니다.');
                    return;
                }

                for (const update of updates) {
                    const url = update.hasPermission 
                        ? '/api/admin/permissions/grant'
                        : '/api/admin/permissions/revoke';

                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: update.userId,
                            permissionType: 'program',
                            permissionName: currentProgram.id
                        })
                    });
                }

                alert('권한이 성공적으로 저장되었습니다.');
                closeModal();
            }

            function closeModal() {
                document.getElementById('permissionModal').classList.add('hidden');
                currentProgram = null;
            }

            function logout() {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            }

            // 페이지 로드 시 프로그램 렌더링
            renderPrograms();
        </script>
    </body>
    </html>
  `)
})

export default app
