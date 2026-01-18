import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const studentRoutes = new Hono<{ Bindings: Bindings }>()

// 학생 데이터에 현재 학년 추가 (현재는 grade를 그대로 사용)
function enrichStudentWithCurrentGrade(student: any) {
  student.current_grade = student.grade // 현재 학년은 grade 필드 사용
  return student
}

// ==================== 반(Class) 관리 API ====================

// 반 목록 조회
studentRoutes.get('/api/classes', async (c) => {
  const { DB } = c.env
  
  // X-User-Data-Base64 헤더에서 academyId 추출
  let academyId = c.req.query('academyId')
  
  try {
    const userHeader = c.req.header('X-User-Data-Base64')
    if (userHeader) {
      const userData = JSON.parse(decodeURIComponent(escape(atob(userHeader))))
      academyId = academyId || userData.id || userData.academy_id
    }
  } catch (err) {
    console.error('[StudentRoutes] Failed to parse user header:', err)
  }
  
  if (!academyId) {
    return c.json({ success: false, error: '학원 ID가 필요합니다.' }, 400)
  }
  
  try {
    const result = await DB.prepare(`
      SELECT c.*, COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND (s.status = 'active' OR s.status IS NULL)
      WHERE c.academy_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).bind(academyId).all()
    
    return c.json({ success: true, classes: result.results })
  } catch (error) {
    console.error('[StudentRoutes] Get classes error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 반 생성
studentRoutes.post('/api/classes', async (c) => {
  const { DB } = c.env
  const { academyId, className, grade, description } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO classes (academy_id, class_name, grade, description)
      VALUES (?, ?, ?, ?)
    `).bind(academyId || 1, className, grade || '', description || '').run()
    
    return c.json({ success: true, classId: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 반 수정
studentRoutes.put('/api/classes/:classId', async (c) => {
  const { DB } = c.env
  const classId = c.req.param('classId')
  const { className, grade, description } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE classes
      SET class_name = ?, grade = ?, description = ?
      WHERE id = ?
    `).bind(className, grade || '', description || '', classId).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 반 삭제
studentRoutes.delete('/api/classes/:classId', async (c) => {
  const { DB } = c.env
  const classId = c.req.param('classId')
  
  try {
    await DB.prepare('DELETE FROM classes WHERE id = ?').bind(classId).run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== 학생 관리 API ====================

// 학생 목록 조회 (권한 기반 필터링)
studentRoutes.get('/api/students', async (c) => {
  const { DB } = c.env
  
  // X-User-Data-Base64 헤더에서 사용자 정보 추출
  let academyId = c.req.query('academyId')
  let userId: string | undefined
  let userType: string | undefined
  
  try {
    const userHeader = c.req.header('X-User-Data-Base64')
    if (userHeader) {
      const userData = JSON.parse(decodeURIComponent(escape(atob(userHeader))))
      academyId = academyId || userData.id || userData.academy_id
      userId = userData.id
      userType = userData.user_type
    }
  } catch (err) {
    console.error('[StudentRoutes] Failed to parse user header:', err)
  }
  
  const classId = c.req.query('classId')
  
  try {
    let query = `
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.academy_id = ? AND (s.status = 'active' OR s.status IS NULL)
    `
    const params = [academyId]
    
    // 선생님인 경우 배정받은 반의 학생만 조회
    if (userType === 'teacher' && userId) {
      console.log('[StudentRoutes] Teacher mode, userId:', userId)
      
      // teacher_permissions 테이블에서 해당 선생님의 권한 조회
      try {
        const permRows = await DB.prepare(
          'SELECT permission_key, permission_value FROM teacher_permissions WHERE teacher_id = ?'
        ).bind(userId).all()
        
        console.log('[StudentRoutes] Permission rows:', JSON.stringify(permRows.results))
        
        let canViewAllStudents = false
        let assignedClasses: number[] = []
        
        if (permRows.results) {
          for (const row of permRows.results) {
            if (row.permission_key === 'canViewAllStudents') {
              canViewAllStudents = row.permission_value === '1' || row.permission_value === 1 || row.permission_value === true
            } else if (row.permission_key === 'assignedClasses' && typeof row.permission_value === 'string') {
              try {
                assignedClasses = JSON.parse(row.permission_value)
              } catch (e) {
                console.error('[StudentRoutes] Failed to parse assignedClasses:', e)
              }
            }
          }
        }
        
        console.log('[StudentRoutes] canViewAllStudents:', canViewAllStudents)
        console.log('[StudentRoutes] assignedClasses:', JSON.stringify(assignedClasses))
      } catch (permError) {
        console.error('[StudentRoutes] Error fetching permissions:', permError)
        return c.json({ success: false, error: permError.message }, 500)
      }
      
      // 전체 조회 권한이 없으면 배정된 반만 조회
      if (!canViewAllStudents) {
        if (assignedClasses.length === 0) {
          // 배정된 반이 없으면 빈 결과 반환
          return c.json({ success: true, students: [] })
        }
        
        const placeholders = assignedClasses.map(() => '?').join(',')
        query = `
          SELECT s.*, c.class_name
          FROM students s
          LEFT JOIN classes c ON s.class_id = c.id
          WHERE s.academy_id = ? AND s.class_id IN (${placeholders}) AND (s.status = 'active' OR s.status IS NULL)
        `
        params.push(...assignedClasses)
      }
      // 전체 조회 권한이 있으면 모든 학생 조회 (기존 쿼리 유지)
    }
    
    if (classId) {
      query += ' AND s.class_id = ?'
      params.push(classId)
    }
    
    query += ' ORDER BY s.created_at DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    
    // 각 학생의 현재 학년 계산
    const studentsWithGrade = result.results.map(student => enrichStudentWithCurrentGrade(student))
    
    return c.json({ success: true, students: studentsWithGrade })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 학생 상세 조회
studentRoutes.get('/api/students/:studentId', async (c) => {
  const { DB } = c.env
  const studentId = c.req.param('studentId')
  
  try {
    const student = await DB.prepare(`
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).bind(studentId).first()
    
    if (!student) {
      return c.json({ success: false, error: '학생을 찾을 수 없습니다.' }, 404)
    }
    
    // 현재 학년 계산
    const studentWithGrade = enrichStudentWithCurrentGrade(student)
    
    return c.json({ success: true, student: studentWithGrade })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 학생 생성
studentRoutes.post('/api/students', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  let { academyId, classId, name, phone, parentName, parentPhone, grade, subjects, enrollmentDate, memo } = body
  
  // X-User-Data-Base64 헤더에서 academyId 추출
  try {
    const userHeader = c.req.header('X-User-Data-Base64')
    if (userHeader && !academyId) {
      const userData = JSON.parse(decodeURIComponent(escape(atob(userHeader))))
      academyId = userData.id || userData.academy_id
    }
  } catch (err) {
    console.error('[StudentRoutes] Failed to parse user header:', err)
  }
  
  try {
    // academy_id 필수 검증
    if (!academyId) {
      return c.json({ success: false, error: '학원 ID가 필요합니다.' }, 400)
    }
    
    // 필수 필드 검증
    if (!name || !grade || !parentName || !parentPhone) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요. (이름, 학년, 학부모 이름, 학부모 연락처)' }, 400)
    }
    
    const result = await DB.prepare(`
      INSERT INTO students (academy_id, class_id, name, phone, parent_name, parent_phone, grade, subjects, enrollment_date, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      academyId,
      classId || null,
      name,
      phone || '',
      parentName,
      parentPhone,
      grade,
      subjects || '',
      enrollmentDate || new Date().toISOString().split('T')[0],
      memo || ''
    ).run()
    
    return c.json({ success: true, studentId: result.meta.last_row_id })
  } catch (error) {
    console.error('[StudentRoutes] Add student error:', error)
    return c.json({ success: false, error: `학생 추가 실패: ${error.message || error}` }, 500)
  }
})

// 학생 수정
studentRoutes.put('/api/students/:studentId', async (c) => {
  const { DB } = c.env
  const studentId = c.req.param('studentId')
  const body = await c.req.json()
  const { classId, name, phone, parentName, parentPhone, grade, subjects, memo } = body
  
  try {
    await DB.prepare(`
      UPDATE students
      SET class_id = ?, name = ?, phone = ?, parent_name = ?, parent_phone = ?, grade = ?, subjects = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(classId || null, name, phone || '', parentName, parentPhone, grade, subjects, memo || '', studentId).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 학생 삭제 (Soft Delete)
studentRoutes.delete('/api/students/:studentId', async (c) => {
  const { DB } = c.env
  const studentId = c.req.param('studentId')
  
  try {
    // Soft delete: status를 'deleted'로 변경
    await DB.prepare(`
      UPDATE students 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(studentId).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== 과목 관리 API ====================

// 과목 목록 조회
studentRoutes.get('/api/courses', async (c) => {
  const { DB } = c.env
  
  // X-User-Data-Base64 헤더에서 academyId 추출
  let academyId = c.req.query('academyId')
  
  try {
    const userHeader = c.req.header('X-User-Data-Base64')
    if (userHeader) {
      const userData = JSON.parse(decodeURIComponent(escape(atob(userHeader))))
      academyId = academyId || userData.id || userData.academy_id
    }
  } catch (err) {
    console.error('[StudentRoutes] Failed to parse user header:', err)
  }
  
  if (!academyId) {
    return c.json({ success: false, error: '학원 ID가 필요합니다.' }, 400)
  }
  
  try {
    const result = await DB.prepare(`
      SELECT * FROM courses WHERE academy_id = ? ORDER BY created_at DESC
    `).bind(academyId).all()
    
    return c.json({ success: true, courses: result.results })
  } catch (error) {
    console.error('[StudentRoutes] Get courses error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 과목 생성
studentRoutes.post('/api/courses', async (c) => {
  const { DB } = c.env
  const { academy_id, course_name, description } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO courses (academy_id, course_name, description)
      VALUES (?, ?, ?)
    `).bind(academy_id || 1, course_name, description || '').run()
    
    return c.json({ success: true, courseId: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 과목 수정
studentRoutes.put('/api/courses/:courseId', async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('courseId')
  const { academy_id, course_name, description } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE courses 
      SET course_name = ?, description = ?
      WHERE id = ? AND academy_id = ?
    `).bind(course_name, description || '', courseId, academy_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 과목 삭제
studentRoutes.delete('/api/courses/:courseId', async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('courseId')
  const academyId = c.req.query('academyId')
  
  try {
    await DB.prepare(`
      DELETE FROM courses 
      WHERE id = ? AND academy_id = ?
    `).bind(courseId, academyId).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== 일일 성과 기록 API ====================

// 일일 기록 조회 (특정 날짜 또는 날짜 범위)
studentRoutes.get('/api/daily-records', async (c) => {
  const { DB } = c.env
  const studentId = c.req.query('studentId')
  const date = c.req.query('date')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  
  try {
    let query = `
      SELECT dr.*, s.name as student_name, cl.class_name
      FROM daily_records dr
      LEFT JOIN students s ON dr.student_id = s.id
      LEFT JOIN classes cl ON dr.class_id = cl.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (studentId) {
      query += ' AND dr.student_id = ?'
      params.push(studentId)
    }
    
    if (date) {
      query += ' AND dr.record_date = ?'
      params.push(date)
    } else if (startDate && endDate) {
      query += ' AND dr.record_date BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }
    
    query += ' ORDER BY dr.record_date DESC, dr.created_at DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, records: result.results })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 일일 기록 생성
studentRoutes.post('/api/daily-records', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { 
    studentId, 
    classId, 
    recordDate, 
    attendance, 
    lessonConcept,
    lessonUnderstanding,
    lessonParticipation,
    lessonAchievement,
    homeworkStatus, 
    homeworkContent,
    homeworkAchievement,
    memo 
  } = body
  
  try {
    const result = await DB.prepare(`
      INSERT INTO daily_records (
        student_id, class_id, record_date, attendance,
        lesson_concept, lesson_understanding, lesson_participation, lesson_achievement,
        homework_status, homework_content, homework_achievement, memo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentId,
      classId || null,
      recordDate,
      attendance || null,
      lessonConcept || null,
      lessonUnderstanding || null,
      lessonParticipation || null,
      lessonAchievement || '',
      homeworkStatus || null,
      homeworkContent || null,
      homeworkAchievement || '',
      memo || ''
    ).run()
    
    return c.json({ success: true, recordId: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 일일 기록 수정
studentRoutes.put('/api/daily-records/:recordId', async (c) => {
  const { DB } = c.env
  const recordId = c.req.param('recordId')
  const body = await c.req.json()
  const { 
    classId, 
    attendance, 
    lessonConcept,
    lessonUnderstanding,
    lessonParticipation,
    lessonAchievement,
    homeworkStatus, 
    homeworkContent,
    homeworkAchievement,
    memo 
  } = body
  
  try {
    await DB.prepare(`
      UPDATE daily_records
      SET class_id = ?, attendance = ?, 
          lesson_concept = ?, lesson_understanding = ?, lesson_participation = ?, lesson_achievement = ?,
          homework_status = ?, homework_content = ?, homework_achievement = ?, memo = ?
      WHERE id = ?
    `).bind(
      classId || null, 
      attendance || null, 
      lessonConcept || null,
      lessonUnderstanding || null,
      lessonParticipation || null,
      lessonAchievement || '',
      homeworkStatus || null, 
      homeworkContent || null,
      homeworkAchievement || '',
      memo || '', 
      recordId
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 일일 기록 삭제
studentRoutes.delete('/api/daily-records/:recordId', async (c) => {
  const { DB } = c.env
  const recordId = c.req.param('recordId')
  
  try {
    await DB.prepare('DELETE FROM daily_records WHERE id = ?').bind(recordId).run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 학생 통계 조회 (출석률, 평균 이해도 등)
studentRoutes.get('/api/students/:studentId/stats', async (c) => {
  const { DB } = c.env
  const studentId = c.req.param('studentId')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN attendance = '출석' THEN 1 ELSE 0 END) as attendance_count,
        SUM(CASE WHEN homework_status = '완료' THEN 1 ELSE 0 END) as homework_completed,
        AVG(understanding_level) as avg_understanding,
        AVG(participation_level) as avg_participation
      FROM daily_records
      WHERE student_id = ?
        AND record_date BETWEEN ? AND ?
    `
    
    const result = await DB.prepare(query).bind(studentId, startDate, endDate).first()
    
    return c.json({ success: true, stats: result })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default studentRoutes
