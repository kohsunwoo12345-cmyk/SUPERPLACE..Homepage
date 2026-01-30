-- 시스템 관리자 계정 생성
-- 이 계정은 전체 시스템을 관리할 수 있는 최고 권한을 가집니다

-- 기존 admin 계정 확인
SELECT '=== 기존 admin 계정 확인 ===' as info;
SELECT id, email, name, role FROM users WHERE role = 'admin';

-- admin 계정이 없으면 생성
INSERT OR IGNORE INTO users (
    email, 
    password, 
    name, 
    role,
    created_at
) VALUES (
    'admin@superplace.co.kr',
    'admin1234',
    '시스템 관리자',
    'admin',
    datetime('now')
);

-- 생성 후 확인
SELECT '=== 생성된 admin 계정 ===' as info;
SELECT id, email, name, role, created_at FROM users WHERE email = 'admin@superplace.co.kr';

-- 모든 admin 계정 목록
SELECT '=== 전체 admin 계정 목록 ===' as info;
SELECT id, email, name, role FROM users WHERE role = 'admin';
