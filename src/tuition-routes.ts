// 교육비 관리 시스템 - 원장님 전용 (선생님에게는 100% 숨김)
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 인증 및 권한 체크 미들웨어 (원장님만 접근 가능)
const requireDirector = async (c: any, next: any) => {
  try {
    const userDataHeader = c.req.header('X-User-Data-Base64')
    if (!userDataHeader) {
      return c.json({ error: '인증이 필요합니다' }, 401)
    }

    const userDataJson = Buffer.from(userDataHeader, 'base64').toString('utf-8')
    const user = JSON.parse(userDataJson)

    // 선생님은 완전히 차단
    if (user.user_type === 'teacher') {
      return c.json({ error: '접근 권한이 없습니다' }, 403)
    }

    // 원장님만 허용
    if (user.user_type !== 'director' && user.user_type !== 'admin') {
      return c.json({ error: '원장님만 접근 가능합니다' }, 403)
    }

    c.set('user', user)
    await next()
  } catch (error) {
    console.error('Auth error:', error)
    return c.json({ error: '인증 처리 중 오류가 발생했습니다' }, 500)
  }
}

// ========================================
// 교육비 납입 기록 API
// ========================================

// 학생별 교육비 납입 현황 조회
app.get('/api/tuition/students/:studentId/payments', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const studentId = c.req.param('studentId')
    
    // 학생이 해당 학원 소속인지 확인
    const student = await c.env.DB.prepare(`
      SELECT * FROM students WHERE id = ? AND user_id = ?
    `).bind(studentId, user.id).first()
    
    if (!student) {
      return c.json({ error: '학생을 찾을 수 없습니다' }, 404)
    }
    
    // 납입 기록 조회
    const payments = await c.env.DB.prepare(`
      SELECT * FROM tuition_payments 
      WHERE student_id = ? 
      ORDER BY year DESC, month DESC
    `).bind(studentId).all()
    
    // 교육비 설정 조회
    const rate = await c.env.DB.prepare(`
      SELECT * FROM tuition_rates 
      WHERE student_id = ? AND (end_date IS NULL OR end_date >= date('now'))
      ORDER BY start_date DESC
      LIMIT 1
    `).bind(studentId).first()
    
    return c.json({
      success: true,
      student: student,
      payments: payments.results || [],
      currentRate: rate || null
    })
  } catch (error) {
    console.error('Error fetching student payments:', error)
    return c.json({ error: '납입 내역 조회 실패' }, 500)
  }
})

// 전체 학생 납입 현황 조회 (월별) - 모든 학생 표시
app.get('/api/tuition/payments', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    const status = c.req.query('status') // unpaid, paid, partial, overdue
    
    // 모든 활성 학생을 보여주되, 납입 기록이 있으면 조인
    let query = `
      SELECT 
        s.id as student_id,
        s.name as student_name,
        s.grade,
        s.parent_name,
        s.parent_phone,
        COALESCE(tp.id, 0) as id,
        COALESCE(tp.year, ?) as year,
        COALESCE(tp.month, ?) as month,
        COALESCE(tp.amount, COALESCE(tr.monthly_fee, COALESCE(c.monthly_fee, 0))) as amount,
        COALESCE(tp.paid_amount, 0) as paid_amount,
        COALESCE(tp.status, 'unpaid') as status,
        tp.paid_date,
        tp.memo,
        tp.payment_method,
        COALESCE(tr.monthly_fee, COALESCE(c.monthly_fee, 0)) as monthly_fee
      FROM students s
      LEFT JOIN tuition_payments tp ON s.id = tp.student_id 
        AND tp.year = ? AND tp.month = ?
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = ?
        AND s.status = 'active'
    `
    
    const params: any[] = [year, month, year, month, user.id]
    
    if (status) {
      query += ` AND COALESCE(tp.status, 'unpaid') = ?`
      params.push(status)
    }
    
    query += ` ORDER BY COALESCE(tp.status, 'unpaid') DESC, s.name ASC`
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      payments: result.results || []
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return c.json({ error: '납입 현황 조회 실패', details: error.message }, 500)
  }
})

// 납입 기록 등록
app.post('/api/tuition/payments', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const data = await c.req.json()
    
    const { student_id, year, month, amount, status, paid_amount, paid_date, memo, payment_method } = data
    
    if (!student_id || !year || !month || !amount) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }
    
    // 학생 확인
    const student = await c.env.DB.prepare(`
      SELECT * FROM students WHERE id = ? AND user_id = ?
    `).bind(student_id, user.id).first()
    
    if (!student) {
      return c.json({ error: '학생을 찾을 수 없습니다' }, 404)
    }
    
    // 중복 체크
    const existing = await c.env.DB.prepare(`
      SELECT id FROM tuition_payments 
      WHERE student_id = ? AND year = ? AND month = ?
    `).bind(student_id, year, month).first()
    
    if (existing) {
      return c.json({ error: '해당 월의 납입 기록이 이미 존재합니다' }, 400)
    }
    
    // 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO tuition_payments (
        student_id, academy_id, year, month, amount,
        status, paid_amount, paid_date, memo, payment_method, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      student_id,
      user.id,
      year,
      month,
      amount,
      status || 'unpaid',
      paid_amount || 0,
      paid_date || null,
      memo || null,
      payment_method || null,
      user.id
    ).run()
    
    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: '납입 기록이 등록되었습니다'
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return c.json({ error: '납입 기록 등록 실패' }, 500)
  }
})

// 납입 기록 수정
app.put('/api/tuition/payments/:id', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const paymentId = c.req.param('id')
    const data = await c.req.json()
    
    // 기존 기록 확인
    const existing: any = await c.env.DB.prepare(`
      SELECT * FROM tuition_payments WHERE id = ? AND user_id = ?
    `).bind(paymentId, user.id).first()
    
    if (!existing) {
      return c.json({ error: '납입 기록을 찾을 수 없습니다' }, 404)
    }
    
    const { status, paid_amount, paid_date, memo, payment_method } = data
    
    await c.env.DB.prepare(`
      UPDATE tuition_payments 
      SET status = ?, paid_amount = ?, paid_date = ?, memo = ?, payment_method = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      status || existing.status,
      paid_amount !== undefined ? paid_amount : existing.paid_amount,
      paid_date || existing.paid_date,
      memo !== undefined ? memo : existing.memo,
      payment_method || existing.payment_method,
      paymentId
    ).run()
    
    return c.json({
      success: true,
      message: '납입 기록이 수정되었습니다'
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    return c.json({ error: '납입 기록 수정 실패' }, 500)
  }
})

// 납입 기록 삭제
app.delete('/api/tuition/payments/:id', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const paymentId = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM tuition_payments WHERE id = ? AND user_id = ?
    `).bind(paymentId, user.id).run()
    
    return c.json({
      success: true,
      message: '납입 기록이 삭제되었습니다'
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return c.json({ error: '납입 기록 삭제 실패' }, 500)
  }
})

// ========================================
// 교육비 설정 API
// ========================================

// 학생 교육비 설정
app.post('/api/tuition/rates', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const data = await c.req.json()
    
    const { student_id, monthly_fee, start_date, end_date } = data
    
    if (!student_id || !monthly_fee || !start_date) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }
    
    // 학생 확인
    const student = await c.env.DB.prepare(`
      SELECT * FROM students WHERE id = ? AND user_id = ?
    `).bind(student_id, user.id).first()
    
    if (!student) {
      return c.json({ error: '학생을 찾을 수 없습니다' }, 404)
    }
    
    // 기존 설정 종료 처리
    await c.env.DB.prepare(`
      UPDATE tuition_rates 
      SET end_date = date('now', '-1 day')
      WHERE student_id = ? AND end_date IS NULL
    `).bind(student_id).run()
    
    // 새 설정 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO tuition_rates (student_id, academy_id, monthly_fee, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      student_id,
      user.id,
      monthly_fee,
      start_date,
      end_date || null
    ).run()
    
    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: '교육비가 설정되었습니다'
    })
  } catch (error) {
    console.error('Error setting tuition rate:', error)
    return c.json({ error: '교육비 설정 실패' }, 500)
  }
})

// ========================================
// 통계 API
// ========================================

// 미납 학생 목록 (납입 기록이 없는 학생 포함)
app.get('/api/tuition/unpaid-students', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    
    // 모든 활성 학생을 가져오되, 납입 기록이 있으면 조인
    const result = await c.env.DB.prepare(`
      SELECT 
        s.id,
        s.name as student_name,
        s.grade,
        s.parent_name,
        s.parent_phone,
        ? as year,
        ? as month,
        COALESCE(tp.amount, COALESCE(tr.monthly_fee, COALESCE(c.monthly_fee, 0))) as amount,
        COALESCE(tp.paid_amount, 0) as paid_amount,
        COALESCE(tp.status, 'unpaid') as status,
        tp.memo,
        COALESCE(tp.amount, COALESCE(tr.monthly_fee, COALESCE(c.monthly_fee, 0))) - COALESCE(tp.paid_amount, 0) as unpaid_amount,
        COALESCE(tr.monthly_fee, c.monthly_fee) as monthly_fee
      FROM students s
      LEFT JOIN tuition_payments tp ON s.id = tp.student_id 
        AND tp.year = ? AND tp.month = ?
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = ? 
        AND s.status = 'active'
        AND COALESCE(tp.status, 'unpaid') IN ('unpaid', 'partial', 'overdue')
      ORDER BY s.name ASC
    `).bind(year, month, year, month, user.id).all()
    
    return c.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      unpaidStudents: result.results || []
    })
  } catch (error) {
    console.error('Error fetching unpaid students:', error)
    return c.json({ error: '미납 학생 조회 실패', details: error.message }, 500)
  }
})

// 교육비 통계 (모든 활성 학생 기준)
app.get('/api/tuition/stats', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    
    const stats: any = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        SUM(CASE WHEN COALESCE(tp.status, 'unpaid') = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN COALESCE(tp.status, 'unpaid') = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count,
        SUM(CASE WHEN COALESCE(tp.status, 'unpaid') = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN COALESCE(tp.status, 'unpaid') = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
        SUM(COALESCE(tp.amount, COALESCE(tr.monthly_fee, COALESCE(c.monthly_fee, 0)))) as total_amount,
        SUM(COALESCE(tp.paid_amount, 0)) as total_paid
      FROM students s
      LEFT JOIN tuition_payments tp ON s.id = tp.student_id 
        AND tp.year = ? AND tp.month = ?
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = ? 
        AND s.status = 'active'
    `).bind(year, month, user.id).first()
    
    return c.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      stats: stats || {}
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return c.json({ error: '통계 조회 실패', details: error.message }, 500)
  }
})

// ========================================
// 학생 목록 조회 (반 정보 포함)
// ========================================
app.get('/api/students', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    
    const students = await c.env.DB.prepare(`
      SELECT 
        s.*,
        c.name as class_name,
        c.monthly_fee as class_fee
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.name ASC
    `).bind(user.id).all()
    
    return c.json({
      success: true,
      students: students.results || []
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return c.json({ error: '학생 목록 조회 실패', details: error.message }, 500)
  }
})

export default app

// ========================================
// 반(클래스) 관리 API
// ========================================

// 반 목록 조회
app.get('/api/tuition/classes', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    
    const classes = await c.env.DB.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as student_count,
        u.name as teacher_name
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `).bind(user.id).all()
    
    return c.json({
      success: true,
      classes: classes.results || []
    })
  } catch (error) {
    console.error('Error fetching classes:', error)
    return c.json({ error: '반 목록 조회 실패', details: error.message }, 500)
  }
})

// 반 교육비 설정
app.put('/api/tuition/classes/:id/fee', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const classId = c.req.param('id')
    const { monthly_fee } = await c.req.json()
    
    if (monthly_fee === undefined || monthly_fee === null) {
      return c.json({ error: '월 교육비를 입력해주세요' }, 400)
    }
    
    // 반 소유권 확인
    const classInfo = await c.env.DB.prepare(`
      SELECT * FROM classes WHERE id = ? AND user_id = ?
    `).bind(classId, user.id).first()
    
    if (!classInfo) {
      return c.json({ error: '반을 찾을 수 없습니다' }, 404)
    }
    
    // 교육비 업데이트
    await c.env.DB.prepare(`
      UPDATE classes SET monthly_fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(monthly_fee, classId).run()
    
    return c.json({
      success: true,
      message: '반 교육비가 설정되었습니다'
    })
  } catch (error) {
    console.error('Error updating class fee:', error)
    return c.json({ error: '반 교육비 설정 실패', details: error.message }, 500)
  }
})

// 학생별 해당 월 납입액 계산 API
app.get('/api/tuition/student-fees/:studentId', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const studentId = c.req.param('studentId')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    
    // 학생 정보 및 반 교육비 조회
    const student = await c.env.DB.prepare(`
      SELECT 
        s.*,
        c.monthly_fee as class_fee,
        c.name as class_name,
        tr.monthly_fee as custom_fee
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.id = ? AND s.user_id = ?
    `).bind(studentId, user.id).first()
    
    if (!student) {
      return c.json({ error: '학생을 찾을 수 없습니다' }, 404)
    }
    
    // 우선순위: custom_fee > class_fee > 0
    const monthlyFee = student.custom_fee || student.class_fee || 0
    
    // 해당 월 납입 기록 조회
    const payment = await c.env.DB.prepare(`
      SELECT * FROM tuition_payments 
      WHERE student_id = ? AND year = ? AND month = ?
    `).bind(studentId, year, month).first()
    
    return c.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class_name: student.class_name,
        monthly_fee: monthlyFee
      },
      payment: payment || null,
      amount_due: monthlyFee,
      amount_paid: payment?.paid_amount || 0,
      status: payment?.status || 'unpaid'
    })
  } catch (error) {
    console.error('Error fetching student fee:', error)
    return c.json({ error: '학생 납입액 조회 실패', details: error.message }, 500)
  }
})

// 납입 완료 처리 (간편)
app.post('/api/tuition/mark-paid', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const { student_id, year, month } = await c.req.json()
    
    if (!student_id || !year || !month) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }
    
    // 학생 정보 및 월 납입액 조회
    const student = await c.env.DB.prepare(`
      SELECT 
        s.*,
        c.monthly_fee as class_fee,
        tr.monthly_fee as custom_fee
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.id = ? AND s.user_id = ?
    `).bind(student_id, user.id).first()
    
    if (!student) {
      return c.json({ error: '학생을 찾을 수 없습니다' }, 404)
    }
    
    const amount = student.custom_fee || student.class_fee || 0
    
    // 기존 납입 기록 확인
    const existing = await c.env.DB.prepare(`
      SELECT * FROM tuition_payments 
      WHERE student_id = ? AND year = ? AND month = ?
    `).bind(student_id, year, month).first()
    
    if (existing) {
      // 업데이트
      await c.env.DB.prepare(`
        UPDATE tuition_payments 
        SET status = 'paid', paid_amount = ?, paid_date = date('now'), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(amount, existing.id).run()
    } else {
      // 새로 생성
      await c.env.DB.prepare(`
        INSERT INTO tuition_payments (
          student_id, academy_id, year, month, amount, paid_amount, 
          status, paid_date, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'paid', date('now'), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(student_id, user.id, year, month, amount, amount, user.id).run()
    }
    
    return c.json({
      success: true,
      message: '납입 완료 처리되었습니다'
    })
  } catch (error) {
    console.error('Error marking paid:', error)
    return c.json({ error: '납입 완료 처리 실패', details: error.message }, 500)
  }
})

