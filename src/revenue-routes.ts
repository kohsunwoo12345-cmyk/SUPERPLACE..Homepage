import { Hono } from 'hono'

const app = new Hono()

// 원장님/관리자 전용 미들웨어
const requireDirector = async (c: any, next: any) => {
  try {
    const userDataBase64 = c.req.header('X-User-Data-Base64')
    if (!userDataBase64) {
      return c.json({ error: '인증 정보가 필요합니다' }, 401)
    }

    const decoded = atob(userDataBase64)
    const user = JSON.parse(decodeURIComponent(decoded))
    
    // 선생님은 100% 차단
    if (user.user_type === 'teacher') {
      return c.json({ error: '접근 권한이 없습니다' }, 403)
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: '인증 실패' }, 401)
  }
}

// ========================================
// 매출 통계 API
// ========================================

// 월별 매출 통계
app.get('/api/revenue/monthly', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    
    // 실제 납입된 금액 (tuition_payments에서)
    const paidResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COUNT(DISTINCT student_id) as paying_students
      FROM tuition_payments
      WHERE academy_id = ? 
        AND year = ? 
        AND month = ?
        AND status IN ('paid', 'partial')
    `).bind(user.id, year, month).first()
    
    // 예상 매출 (활성 학생 * 교육비)
    const expectedResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COALESCE(SUM(tr.monthly_fee), 0) as expected_revenue,
        COUNT(DISTINCT CASE WHEN tr.monthly_fee > 0 THEN s.id END) as students_with_fee
      FROM students s
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.user_id = ?
        AND s.status = 'active'
    `).bind(user.id).first()
    
    // 미납 금액
    const unpaidResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(COALESCE(tp.amount, tr.monthly_fee, 0) - COALESCE(tp.paid_amount, 0)), 0) as total_unpaid,
        COUNT(DISTINCT s.id) as unpaid_students
      FROM students s
      LEFT JOIN tuition_payments tp ON s.id = tp.student_id 
        AND tp.year = ? AND tp.month = ?
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.user_id = ? 
        AND s.status = 'active'
        AND COALESCE(tp.status, 'unpaid') IN ('unpaid', 'partial', 'overdue')
    `).bind(year, month, user.id).first()
    
    return c.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      revenue: {
        total_paid: paidResult?.total_paid || 0,
        expected_revenue: expectedResult?.expected_revenue || 0,
        total_unpaid: unpaidResult?.total_unpaid || 0,
        collection_rate: expectedResult?.expected_revenue > 0 
          ? ((paidResult?.total_paid || 0) / expectedResult.expected_revenue * 100).toFixed(1)
          : 0,
        total_students: expectedResult?.total_students || 0,
        paying_students: paidResult?.paying_students || 0,
        unpaid_students: unpaidResult?.unpaid_students || 0
      }
    })
  } catch (error) {
    console.error('Error fetching monthly revenue:', error)
    return c.json({ error: '매출 조회 실패', details: error.message }, 500)
  }
})

// 연간 매출 추이 (12개월)
app.get('/api/revenue/yearly', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    
    const monthlyData = []
    
    for (let month = 1; month <= 12; month++) {
      const result = await c.env.DB.prepare(`
        SELECT 
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COUNT(DISTINCT student_id) as paying_students
        FROM tuition_payments
        WHERE academy_id = ? 
          AND year = ? 
          AND month = ?
          AND status IN ('paid', 'partial')
      `).bind(user.id, year, month).first()
      
      monthlyData.push({
        month,
        total_paid: result?.total_paid || 0,
        paying_students: result?.paying_students || 0
      })
    }
    
    return c.json({
      success: true,
      year: parseInt(year),
      monthly_data: monthlyData,
      total_yearly: monthlyData.reduce((sum, m) => sum + (m.total_paid || 0), 0)
    })
  } catch (error) {
    console.error('Error fetching yearly revenue:', error)
    return c.json({ error: '연간 매출 조회 실패', details: error.message }, 500)
  }
})

// 학생별 매출 기여도
app.get('/api/revenue/by-student', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
    
    const students = await c.env.DB.prepare(`
      SELECT 
        s.id,
        s.name as student_name,
        s.grade,
        COALESCE(tr.monthly_fee, 0) as monthly_fee,
        COALESCE(tp.paid_amount, 0) as paid_amount,
        COALESCE(tp.status, 'unpaid') as payment_status,
        tp.paid_date
      FROM students s
      LEFT JOIN tuition_payments tp ON s.id = tp.student_id 
        AND tp.year = ? AND tp.month = ?
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.user_id = ?
        AND s.status = 'active'
      ORDER BY paid_amount DESC, s.name ASC
    `).bind(year, month, user.id).all()
    
    return c.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      students: students.results || []
    })
  } catch (error) {
    console.error('Error fetching revenue by student:', error)
    return c.json({ error: '학생별 매출 조회 실패', details: error.message }, 500)
  }
})

// 매출 대시보드 요약
app.get('/api/revenue/dashboard', requireDirector, async (c) => {
  try {
    const user = c.get('user')
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 이번 달 매출
    const thisMonthResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(paid_amount), 0) as total_paid
      FROM tuition_payments
      WHERE academy_id = ? 
        AND year = ? 
        AND month = ?
        AND status IN ('paid', 'partial')
    `).bind(user.id, currentYear, currentMonth).first()
    
    // 지난 달 매출
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    
    const lastMonthResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(paid_amount), 0) as total_paid
      FROM tuition_payments
      WHERE academy_id = ? 
        AND year = ? 
        AND month = ?
        AND status IN ('paid', 'partial')
    `).bind(user.id, lastMonthYear, lastMonth).first()
    
    // 올해 누적 매출
    const yearlyResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(paid_amount), 0) as total_paid
      FROM tuition_payments
      WHERE academy_id = ? 
        AND year = ?
        AND status IN ('paid', 'partial')
    `).bind(user.id, currentYear).first()
    
    // 총 학생 수 및 평균 교육비
    const studentsResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_students,
        COALESCE(AVG(tr.monthly_fee), 0) as avg_fee
      FROM students s
      LEFT JOIN tuition_rates tr ON s.id = tr.student_id
        AND (tr.end_date IS NULL OR tr.end_date >= date('now'))
      WHERE s.user_id = ?
        AND s.status = 'active'
    `).bind(user.id).first()
    
    // 선생님 수 조회
    const teachersResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total_teachers
      FROM users
      WHERE parent_user_id = ? AND user_type = 'teacher'
    `).bind(user.id).first()
    
    const thisMonthPaid = thisMonthResult?.total_paid || 0
    const lastMonthPaid = lastMonthResult?.total_paid || 0
    const growthRate = lastMonthPaid > 0 
      ? (((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100).toFixed(1)
      : 0
    
    return c.json({
      success: true,
      dashboard: {
        this_month_revenue: thisMonthPaid,
        last_month_revenue: lastMonthPaid,
        growth_rate: parseFloat(growthRate),
        yearly_revenue: yearlyResult?.total_paid || 0,
        total_students: studentsResult?.total_students || 0,
        total_teachers: teachersResult?.total_teachers || 0,
        avg_monthly_fee: Math.round(studentsResult?.avg_fee || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching revenue dashboard:', error)
    return c.json({ error: '매출 대시보드 조회 실패', details: error.message }, 500)
  }
})

export default app
