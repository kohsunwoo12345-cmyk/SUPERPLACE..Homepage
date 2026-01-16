// 관리자: 사용자 상세 정보 조회 API와 페이지

// API: 사용자 상세 정보 조회
export async function getUserDetailAPI(c, userId) {
  try {
    // 사용자 기본 정보
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, phone, academy_name, role, points, created_at
      FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }
    
    // 발신번호 인증 요청 내역
    const verificationRequests = await c.env.DB.prepare(`
      SELECT id, phone_number, verification_method, document_url, status, 
             created_at, processed_at, admin_note
      FROM sender_verification_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    // 등록된 발신번호 목록
    const senderNumbers = await c.env.DB.prepare(`
      SELECT id, phone_number, verification_method, status, verification_date, created_at
      FROM sender_ids
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    // 랜딩페이지 목록
    const landingPages = await c.env.DB.prepare(`
      SELECT id, title, slug, status, view_count, created_at, updated_at
      FROM landing_pages
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(userId).all()
    
    // 권한 목록
    const permissions = await c.env.DB.prepare(`
      SELECT program_key, granted_at, expires_at
      FROM user_permissions
      WHERE user_id = ? AND is_active = 1
      ORDER BY granted_at DESC
    `).bind(userId).all()
    
    // SMS 발송 통계
    const smsStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM sms_logs
      WHERE user_id = ?
    `).bind(userId).first()
    
    return c.json({
      success: true,
      user,
      verificationRequests: verificationRequests.results || [],
      senderNumbers: senderNumbers.results || [],
      landingPages: landingPages.results || [],
      permissions: permissions.results || [],
      smsStats: smsStats || { total_sent: 0, success_count: 0, failed_count: 0 }
    })
  } catch (err) {
    console.error('Get user detail error:', err)
    return c.json({ success: false, error: '사용자 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
}
