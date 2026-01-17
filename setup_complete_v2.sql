-- ================================================
-- SUPERPLACE Academy v2.0 - Complete Setup Script
-- 회원가입 시스템 + 선생님/학원장 관리 + 테스트 데이터
-- ================================================

-- ============================================
-- 1. 기본 테이블 확인 및 컬럼 추가
-- ============================================

-- users 테이블에 user_type 컬럼 추가 (이미 있으면 에러 무시됨)
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director';
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;
ALTER TABLE users ADD COLUMN academy_name TEXT;
ALTER TABLE users ADD COLUMN academy_location TEXT;

-- ============================================
-- 2. 학원 인증 코드 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS academy_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 3. 선생님 신청 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verification_code TEXT NOT NULL,
    academy_name TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    director_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (director_id) REFERENCES users(id)
);

-- ============================================
-- 4. 선생님-학부모 연락처 권한 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_parent_contact_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    director_id INTEGER NOT NULL,
    can_view_contact BOOLEAN DEFAULT 0,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (director_id) REFERENCES users(id),
    UNIQUE(teacher_id, director_id)
);

-- ============================================
-- 5. 반 관리 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    teacher_id INTEGER,
    grade_level TEXT,
    subject TEXT,
    max_students INTEGER DEFAULT 20,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- ============================================
-- 6. 학생 테이블 (기존에 있으면 스킵)
-- ============================================

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT,
    school TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    address TEXT,
    notes TEXT,
    user_id INTEGER NOT NULL,
    class_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- ============================================
-- 7. 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON academy_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON academy_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_status ON teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_director_id ON teacher_applications(director_id);
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- ============================================
-- 8. 기존 사용자 user_type 업데이트
-- ============================================

-- 기존 사용자를 모두 원장님으로 설정
UPDATE users 
SET user_type = 'director' 
WHERE user_type IS NULL OR user_type = '';

-- ============================================
-- 9. 테스트 데이터 삽입
-- ============================================

-- 테스트 원장님 계정
INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, academy_location, user_type, role, points, created_at)
VALUES 
(1, 'director@test.com', 'test1234!', '김원장', '010-1234-5678', '슈퍼플레이스 학원', '서울 강남구', 'director', 'member', 0, datetime('now'));

-- 테스트 원장님 2
INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, academy_location, user_type, role, points, created_at)
VALUES 
(2, 'director2@test.com', 'test1234!', '박원장', '010-2345-6789', '꾸메땅학원 분당점', '경기 성남시 분당구', 'director', 'member', 0, datetime('now'));

-- 원장님 1의 인증 코드 생성
INSERT OR IGNORE INTO academy_verification_codes (user_id, code, is_active)
VALUES (1, 'ABC123', 1);

-- 원장님 2의 인증 코드 생성
INSERT OR IGNORE INTO academy_verification_codes (user_id, code, is_active)
VALUES (2, 'XYZ789', 1);

-- 테스트 선생님 계정 (원장님 1 소속)
INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, user_type, role, parent_user_id, points, created_at)
VALUES 
(3, 'teacher1@test.com', 'test1234!', '이선생', '010-3456-7890', '슈퍼플레이스 학원', 'teacher', 'member', 1, 0, datetime('now'));

-- 테스트 선생님 2 (원장님 2 소속)
INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, user_type, role, parent_user_id, points, created_at)
VALUES 
(4, 'teacher2@test.com', 'test1234!', '최선생', '010-4567-8901', '꾸메땅학원 분당점', 'teacher', 'member', 2, 0, datetime('now'));

-- 선생님 연락처 권한 설정
INSERT OR IGNORE INTO teacher_parent_contact_permissions (teacher_id, director_id, can_view_contact)
VALUES 
(3, 1, 1),  -- 이선생은 연락처 조회 가능
(4, 2, 0);  -- 최선생은 연락처 조회 불가

-- 테스트 반 생성
INSERT OR IGNORE INTO classes (id, name, description, user_id, teacher_id, grade_level, subject, max_students, status)
VALUES 
(1, '초등 3학년 수학 A반', '기초 연산 중심', 1, 3, '초3', '수학', 15, 'active'),
(2, '초등 4학년 수학 B반', '심화 문제 해결', 1, 3, '초4', '수학', 15, 'active'),
(3, '중등 1학년 영어반', '기초 문법', 2, 4, '중1', '영어', 20, 'active');

-- 테스트 학생 데이터
INSERT OR IGNORE INTO students (name, grade, school, parent_name, parent_phone, parent_email, user_id, class_id, status)
VALUES 
('김민수', '초3', '서울초등학교', '김학부', '010-1111-2222', 'parent1@test.com', 1, 1, 'active'),
('이영희', '초3', '서울초등학교', '이학부', '010-2222-3333', 'parent2@test.com', 1, 1, 'active'),
('박철수', '초4', '강남초등학교', '박학부', '010-3333-4444', 'parent3@test.com', 1, 2, 'active'),
('정수진', '중1', '분당중학교', '정학부', '010-4444-5555', 'parent4@test.com', 2, 3, 'active'),
('한지민', '중1', '분당중학교', '한학부', '010-5555-6666', 'parent5@test.com', 2, 3, 'active');

-- 테스트 선생님 신청 (승인 대기)
INSERT OR IGNORE INTO teacher_applications (verification_code, academy_name, name, email, password, phone, status, director_id)
VALUES 
('ABC123', '슈퍼플레이스 학원', '강선생', 'teacher3@test.com', 'test1234!', '010-6666-7777', 'pending', 1);

-- ============================================
-- 10. 검증 쿼리
-- ============================================

-- 전체 사용자 조회
SELECT 
    id, 
    email, 
    name, 
    user_type, 
    academy_name, 
    parent_user_id,
    created_at
FROM users
ORDER BY id;

-- 원장님별 선생님 목록
SELECT 
    u.id,
    u.name as teacher_name,
    u.email,
    u.phone,
    p.name as director_name,
    u.academy_name
FROM users u
LEFT JOIN users p ON u.parent_user_id = p.id
WHERE u.user_type = 'teacher'
ORDER BY u.parent_user_id, u.id;

-- 인증 코드 확인
SELECT 
    vc.code,
    u.name as director_name,
    u.academy_name,
    vc.is_active,
    vc.created_at
FROM academy_verification_codes vc
JOIN users u ON vc.user_id = u.id
WHERE vc.is_active = 1
ORDER BY vc.created_at DESC;

-- 승인 대기 중인 선생님 신청
SELECT 
    ta.id,
    ta.name as applicant_name,
    ta.email,
    ta.academy_name,
    ta.verification_code,
    ta.status,
    u.name as director_name,
    ta.created_at
FROM teacher_applications ta
LEFT JOIN users u ON ta.director_id = u.id
WHERE ta.status = 'pending'
ORDER BY ta.created_at DESC;

-- 반별 학생 수
SELECT 
    c.id,
    c.name as class_name,
    c.grade_level,
    c.subject,
    t.name as teacher_name,
    COUNT(s.id) as student_count,
    c.max_students
FROM classes c
LEFT JOIN users t ON c.teacher_id = t.id
LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
GROUP BY c.id
ORDER BY c.id;

-- ============================================
-- 완료 메시지
-- ============================================

-- 마지막 확인: 테이블 생성 여부
SELECT 
    'Setup Complete! 🎉' as status,
    (SELECT COUNT(*) FROM users WHERE user_type = 'director') as total_directors,
    (SELECT COUNT(*) FROM users WHERE user_type = 'teacher') as total_teachers,
    (SELECT COUNT(*) FROM classes) as total_classes,
    (SELECT COUNT(*) FROM students) as total_students,
    (SELECT COUNT(*) FROM teacher_applications WHERE status = 'pending') as pending_applications;
