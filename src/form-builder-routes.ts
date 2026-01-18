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

// ========================================
// 폼 템플릿 관리 API
// ========================================

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

// 특정 폼 템플릿 조회
app.get('/api/form-templates/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.param('id')
    
    const template = await c.env.DB.prepare(`
      SELECT * FROM form_templates 
      WHERE id = ? AND user_id = ?
    `).bind(templateId, userId).first()

    if (!template) {
      return c.json({ error: '템플릿을 찾을 수 없습니다' }, 404)
    }

    return c.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return c.json({ error: '템플릿을 불러올 수 없습니다' }, 500)
  }
})

// 폼 템플릿 생성
app.post('/api/form-templates', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const data = await c.req.json()
    
    if (!data.name || !data.fields) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }

    // 필드 JSON 유효성 검사
    try {
      JSON.parse(data.fields)
    } catch (e) {
      return c.json({ error: '잘못된 필드 형식입니다' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO form_templates (
        name, description, user_id, fields, 
        submit_button_text, success_message,
        notification_email, notification_phone, send_sms_notification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.description || '',
      userId,
      data.fields,
      data.submit_button_text || '신청하기',
      data.success_message || '신청이 완료되었습니다!',
      data.notification_email || '',
      data.notification_phone || '',
      data.send_sms_notification || 0
    ).run()

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: '템플릿이 생성되었습니다' 
    })
  } catch (error) {
    console.error('Error creating template:', error)
    return c.json({ error: '템플릿 생성에 실패했습니다' }, 500)
  }
})

// 폼 템플릿 수정
app.put('/api/form-templates/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.param('id')
    const data = await c.req.json()
    
    // 소유권 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM form_templates WHERE id = ? AND user_id = ?
    `).bind(templateId, userId).first()

    if (!existing) {
      return c.json({ error: '템플릿을 찾을 수 없거나 권한이 없습니다' }, 404)
    }

    if (!data.name || !data.fields) {
      return c.json({ error: '필수 항목을 입력해주세요' }, 400)
    }

    // 필드 JSON 유효성 검사
    try {
      JSON.parse(data.fields)
    } catch (e) {
      return c.json({ error: '잘못된 필드 형식입니다' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE form_templates SET
        name = ?,
        description = ?,
        fields = ?,
        submit_button_text = ?,
        success_message = ?,
        notification_email = ?,
        notification_phone = ?,
        send_sms_notification = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(
      data.name,
      data.description || '',
      data.fields,
      data.submit_button_text || '신청하기',
      data.success_message || '신청이 완료되었습니다!',
      data.notification_email || '',
      data.notification_phone || '',
      data.send_sms_notification || 0,
      templateId,
      userId
    ).run()

    return c.json({ 
      success: true, 
      message: '템플릿이 수정되었습니다' 
    })
  } catch (error) {
    console.error('Error updating template:', error)
    return c.json({ error: '템플릿 수정에 실패했습니다' }, 500)
  }
})

// 폼 템플릿 삭제
app.delete('/api/form-templates/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.param('id')
    
    // 소유권 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM form_templates WHERE id = ? AND user_id = ?
    `).bind(templateId, userId).first()

    if (!existing) {
      return c.json({ error: '템플릿을 찾을 수 없거나 권한이 없습니다' }, 404)
    }

    await c.env.DB.prepare(`
      DELETE FROM form_templates WHERE id = ? AND user_id = ?
    `).bind(templateId, userId).run()

    return c.json({ 
      success: true, 
      message: '템플릿이 삭제되었습니다' 
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    return c.json({ error: '템플릿 삭제에 실패했습니다' }, 500)
  }
})

// 폼 HTML 생성 (랜딩페이지에 삽입할 HTML 코드)
app.get('/api/form-templates/:id/html', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.param('id')
    
    const template: any = await c.env.DB.prepare(`
      SELECT * FROM form_templates 
      WHERE id = ? AND user_id = ?
    `).bind(templateId, userId).first()

    if (!template) {
      return c.json({ error: '템플릿을 찾을 수 없습니다' }, 404)
    }

    const fields = JSON.parse(template.fields)
    
    // HTML 생성
    let html = `
<!-- 폼 시작: ${template.name} -->
<form id="customForm_${template.id}" class="space-y-4" onsubmit="submitCustomForm(event, ${template.id})">
`

    // 각 필드 렌더링
    fields.forEach((field: any) => {
      html += `  <div>\n`
      html += `    <label class="block text-sm font-medium text-gray-700 mb-1">\n`
      html += `      ${field.label}`
      if (field.required) html += ` <span class="text-red-500">*</span>`
      html += `\n    </label>\n`
      
      if (field.type === 'textarea') {
        html += `    <textarea name="${field.name}" ${field.required ? 'required' : ''}\n`
        html += `              placeholder="${field.placeholder || ''}"\n`
        html += `              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"\n`
        html += `              rows="4"></textarea>\n`
      } else if (field.type === 'select') {
        html += `    <select name="${field.name}" ${field.required ? 'required' : ''}\n`
        html += `            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">\n`
        html += `      <option value="">선택하세요</option>\n`
        if (field.options) {
          field.options.forEach((option: string) => {
            html += `      <option value="${option}">${option}</option>\n`
          })
        }
        html += `    </select>\n`
      } else if (field.type === 'radio') {
        if (field.options) {
          field.options.forEach((option: string) => {
            html += `    <div class="flex items-center">\n`
            html += `      <input type="radio" name="${field.name}" value="${option}" ${field.required ? 'required' : ''}\n`
            html += `             class="text-blue-600 focus:ring-blue-500">\n`
            html += `      <label class="ml-2 text-sm text-gray-700">${option}</label>\n`
            html += `    </div>\n`
          })
        }
      } else if (field.type === 'checkbox') {
        html += `    <div class="flex items-center">\n`
        html += `      <input type="checkbox" name="${field.name}" ${field.required ? 'required' : ''}\n`
        html += `             class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">\n`
        html += `      <label class="ml-2 text-sm text-gray-700">${field.label}</label>\n`
        html += `    </div>\n`
      } else {
        html += `    <input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''}\n`
        html += `           placeholder="${field.placeholder || ''}"\n`
        html += `           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">\n`
      }
      
      html += `  </div>\n`
    })

    html += `  <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium">\n`
    html += `    ${template.submit_button_text}\n`
    html += `  </button>\n`
    html += `</form>\n`
    html += `\n`
    html += `<script>\n`
    html += `async function submitCustomForm(event, templateId) {\n`
    html += `  event.preventDefault();\n`
    html += `  const form = event.target;\n`
    html += `  const formData = new FormData(form);\n`
    html += `  const data = Object.fromEntries(formData.entries());\n`
    html += `  \n`
    html += `  try {\n`
    html += `    const response = await fetch('/api/form-submissions', {\n`
    html += `      method: 'POST',\n`
    html += `      headers: { 'Content-Type': 'application/json' },\n`
    html += `      body: JSON.stringify({\n`
    html += `        form_template_id: templateId,\n`
    html += `        submission_data: JSON.stringify(data)\n`
    html += `      })\n`
    html += `    });\n`
    html += `    \n`
    html += `    if (response.ok) {\n`
    html += `      alert('${template.success_message}');\n`
    html += `      form.reset();\n`
    html += `    } else {\n`
    html += `      alert('제출에 실패했습니다. 다시 시도해주세요.');\n`
    html += `    }\n`
    html += `  } catch (error) {\n`
    html += `    console.error('Form submission error:', error);\n`
    html += `    alert('제출 중 오류가 발생했습니다.');\n`
    html += `  }\n`
    html += `}\n`
    html += `</script>\n`
    html += `<!-- 폼 끝 -->\n`

    return c.json({ 
      success: true,
      html: html,
      template: {
        id: template.id,
        name: template.name
      }
    })
  } catch (error) {
    console.error('Error generating HTML:', error)
    return c.json({ error: 'HTML 생성에 실패했습니다' }, 500)
  }
})

// ========================================
// 폼 제출 관리 API
// ========================================

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

// 폼 제출 내역 조회 (관리자용)
app.get('/api/form-submissions', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.query('template_id')
    const status = c.req.query('status')
    
    let query = `
      SELECT 
        fs.*,
        ft.name as template_name,
        lp.title as landing_page_title
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      LEFT JOIN landing_pages lp ON fs.landing_page_id = lp.id
      WHERE ft.user_id = ?
    `
    
    const params: any[] = [userId]
    
    if (templateId) {
      query += ` AND fs.form_template_id = ?`
      params.push(templateId)
    }
    
    if (status) {
      query += ` AND fs.status = ?`
      params.push(status)
    }
    
    query += ` ORDER BY fs.submitted_at DESC`
    
    const submissions = await c.env.DB.prepare(query).bind(...params).all()

    return c.json(submissions.results || [])
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return c.json({ error: '제출 내역을 불러올 수 없습니다' }, 500)
  }
})

// 특정 제출 내역 조회
app.get('/api/form-submissions/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const submissionId = c.req.param('id')
    
    const submission: any = await c.env.DB.prepare(`
      SELECT 
        fs.*,
        ft.name as template_name,
        ft.user_id as template_owner
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      WHERE fs.id = ?
    `).bind(submissionId).first()

    if (!submission || submission.template_owner !== userId) {
      return c.json({ error: '제출 내역을 찾을 수 없거나 권한이 없습니다' }, 404)
    }

    // 조회 시간 업데이트
    if (!submission.viewed_at) {
      await c.env.DB.prepare(`
        UPDATE form_submissions SET viewed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(submissionId).run()
    }

    return c.json(submission)
  } catch (error) {
    console.error('Error fetching submission:', error)
    return c.json({ error: '제출 내역을 불러올 수 없습니다' }, 500)
  }
})

// 제출 내역 상태 변경
app.patch('/api/form-submissions/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const submissionId = c.req.param('id')
    const data = await c.req.json()
    
    // 소유권 확인
    const submission: any = await c.env.DB.prepare(`
      SELECT ft.user_id 
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      WHERE fs.id = ?
    `).bind(submissionId).first()

    if (!submission || submission.user_id !== userId) {
      return c.json({ error: '제출 내역을 찾을 수 없거나 권한이 없습니다' }, 404)
    }

    await c.env.DB.prepare(`
      UPDATE form_submissions 
      SET status = ?, notes = ?
      WHERE id = ?
    `).bind(
      data.status || 'new',
      data.notes || '',
      submissionId
    ).run()

    return c.json({ 
      success: true, 
      message: '상태가 변경되었습니다' 
    })
  } catch (error) {
    console.error('Error updating submission:', error)
    return c.json({ error: '상태 변경에 실패했습니다' }, 500)
  }
})

// 제출 내역 삭제
app.delete('/api/form-submissions/:id', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const submissionId = c.req.param('id')
    
    // 소유권 확인
    const submission: any = await c.env.DB.prepare(`
      SELECT ft.user_id 
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      WHERE fs.id = ?
    `).bind(submissionId).first()

    if (!submission || submission.user_id !== userId) {
      return c.json({ error: '제출 내역을 찾을 수 없거나 권한이 없습니다' }, 404)
    }

    await c.env.DB.prepare(`
      DELETE FROM form_submissions WHERE id = ?
    `).bind(submissionId).run()

    return c.json({ 
      success: true, 
      message: '제출 내역이 삭제되었습니다' 
    })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return c.json({ error: '제출 내역 삭제에 실패했습니다' }, 500)
  }
})

// 제출 통계
app.get('/api/form-submissions/stats', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const templateId = c.req.query('template_id')
    
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      WHERE ft.user_id = ?
    `
    
    const params: any[] = [userId]
    
    if (templateId) {
      query += ` AND fs.form_template_id = ?`
      params.push(templateId)
    }
    
    const stats = await c.env.DB.prepare(query).bind(...params).first()

    return c.json(stats || {
      total: 0,
      new_count: 0,
      contacted_count: 0,
      completed_count: 0,
      rejected_count: 0
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return c.json({ error: '통계를 불러올 수 없습니다' }, 500)
  }
})

export default app
