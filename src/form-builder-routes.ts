// Form Builder Routes - 폼 템플릿 및 제출 관리
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  ALIGO_API_KEY?: string
  ALIGO_USER_ID?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 인증 미들웨어
const requireAuth = async (c: any, next: any) => {
  const sessionId = c.req.cookie('session_id')
  
  if (!sessionId) {
    return c.json({ error: '로그인이 필요합니다' }, 401)
  }

  const session = await c.env.DB.prepare(`
    SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > datetime('now')
  `).bind(sessionId).first()

  if (!session) {
    return c.json({ error: '세션이 만료되었습니다' }, 401)
  }

  c.set('userId', session.user_id)
  await next()
}

// 폼 템플릿 목록 조회
app.get('/api/form-templates', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    
    const templates = await c.env.DB.prepare(`
      SELECT * FROM form_templates 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all()

    return c.json(templates.results || [])
  } catch (error) {
    console.error('Error fetching templates:', error)
    return c.json({ error: '템플릿을 불러올 수 없습니다' }, 500)
  }
})

// 폼 제출 (공개 API - 인증 불필요)
app.post('/api/form-submissions', async (c) => {
  try {
    const data = await c.req.json()
    
    if (!data.form_template_id || !data.submission_data) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }

    const template: any = await c.env.DB.prepare(`
      SELECT * FROM form_templates WHERE id = ?
    `).bind(data.form_template_id).first()

    if (!template) {
      return c.json({ error: '폼을 찾을 수 없습니다' }, 404)
    }

    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const userAgent = c.req.header('user-agent') || 'unknown'

    const result = await c.env.DB.prepare(`
      INSERT INTO form_submissions (
        form_template_id, landing_page_id, submission_data,
        ip_address, user_agent, status
      ) VALUES (?, ?, ?, ?, ?, 'new')
    `).bind(
      data.form_template_id,
      data.landing_page_id || null,
      data.submission_data,
      ipAddress,
      userAgent
    ).run()

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: template.success_message || '신청이 완료되었습니다!'
    })
  } catch (error) {
    console.error('Error submitting form:', error)
    return c.json({ error: '제출에 실패했습니다' }, 500)
  }
})

export default app
