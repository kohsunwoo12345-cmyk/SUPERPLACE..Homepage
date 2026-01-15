import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const studentRoutes = new Hono<{ Bindings: Bindings }>()

// ==================== 반(Class) 관리 API ====================

// 반 목록 조회
studentRoutes.get('/api/classes', async (c) => {
  const { DB } = c.env
  const academyId = c.req.query('academyId') || '1'
  
  try {
    const result = await DB.prepare(`
      SELECT c.*, COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      WHERE c.academy_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).bind(academyId).all()
    
    return c.json({ success: true, classes: result.results })
  } catch (error) {
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

// 학생 목록 조회
studentRoutes.get('/api/students', async (c) => {
  const { DB } = c.env
  const academyId = c.req.query('academyId') || '1'
  const classId = c.req.query('classId')
  
  try {
    let query = `
      SELECT s.*, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.academy_id = ?
    `
    const params = [academyId]
    
    if (classId) {
      query += ' AND s.class_id = ?'
      params.push(classId)
    }
    
    query += ' ORDER BY s.created_at DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, students: result.results })
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
    
    return c.json({ success: true, student })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 학생 생성
studentRoutes.post('/api/students', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { academyId, classId, name, phone, parentName, parentPhone, grade, subjects, enrollmentDate, memo } = body
  
  try {
    const result = await DB.prepare(`
      INSERT INTO students (academy_id, class_id, name, phone, parent_name, parent_phone, grade, subjects, enrollment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      academyId || 1,
      classId || null,
      name,
      phone || '',
      parentName,
      parentPhone,
      grade,
      subjects,
      enrollmentDate,
      memo || ''
    ).run()
    
    return c.json({ success: true, studentId: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
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

// 학생 삭제
studentRoutes.delete('/api/students/:studentId', async (c) => {
  const { DB } = c.env
  const studentId = c.req.param('studentId')
  
  try {
    await DB.prepare('DELETE FROM students WHERE id = ?').bind(studentId).run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== 과목 관리 API ====================

// 과목 목록 조회
studentRoutes.get('/api/courses', async (c) => {
  const { DB } = c.env
  const academyId = c.req.query('academyId') || '1'
  
  try {
    const result = await DB.prepare(`
      SELECT * FROM courses WHERE academy_id = ? ORDER BY created_at DESC
    `).bind(academyId).all()
    
    return c.json({ success: true, courses: result.results })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 과목 생성
studentRoutes.post('/api/courses', async (c) => {
  const { DB } = c.env
  const { academyId, courseName, description } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO courses (academy_id, course_name, description)
      VALUES (?, ?, ?)
    `).bind(academyId || 1, courseName, description || '').run()
    
    return c.json({ success: true, courseId: result.meta.last_row_id })
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
      SELECT dr.*, s.name as student_name, c.course_name
      FROM daily_records dr
      LEFT JOIN students s ON dr.student_id = s.id
      LEFT JOIN courses c ON dr.course_id = c.id
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
  const { studentId, courseId, recordDate, attendance, homeworkStatus, understandingLevel, participationLevel, achievement, memo } = body
  
  try {
    const result = await DB.prepare(`
      INSERT INTO daily_records (student_id, course_id, record_date, attendance, homework_status, understanding_level, participation_level, achievement, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentId,
      courseId || null,
      recordDate,
      attendance || null,
      homeworkStatus || null,
      understandingLevel || null,
      participationLevel || null,
      achievement || '',
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
  const { courseId, attendance, homeworkStatus, understandingLevel, participationLevel, achievement, memo } = body
  
  try {
    await DB.prepare(`
      UPDATE daily_records
      SET course_id = ?, attendance = ?, homework_status = ?, understanding_level = ?, participation_level = ?, achievement = ?, memo = ?
      WHERE id = ?
    `).bind(courseId || null, attendance || null, homeworkStatus || null, understandingLevel || null, participationLevel || null, achievement || '', memo || '', recordId).run()
    
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
