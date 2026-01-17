# 🚀 SUPERPLACE Academy v2.0 - Turso DB 직접 설정 가이드

## 📋 개요

Cloudflare Pages 배포가 지연되는 동안, **Turso DB에서 직접 SQL을 실행**하여 전체 시스템을 즉시 사용할 수 있습니다.

---

## 🎯 1단계: Turso CLI 설치 및 로그인

### Turso CLI 설치 (이미 설치되어 있으면 스킵)

```bash
# Linux/Mac
curl -sSfL https://get.tur.so/install.sh | bash

# 또는 npm으로 설치
npm install -g @turso/cli
```

### Turso 로그인

```bash
turso auth login
```

브라우저가 열리면 GitHub 계정으로 로그인

---

## 🎯 2단계: 데이터베이스 연결

### 데이터베이스 목록 확인

```bash
turso db list
```

### 데이터베이스 이름 확인 (예: webapp-production 또는 superplace-academy)

```bash
# 데이터베이스 이름이 'webapp-production'인 경우
turso db shell webapp-production
```

---

## 🎯 3단계: SQL 스크립트 실행

### 방법 A: GitHub에서 파일 다운로드 후 실행 (권장)

```bash
# 1. SQL 파일 다운로드
curl -o setup_v2.sql https://raw.githubusercontent.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage/main/setup_complete_v2.sql

# 2. Turso DB에서 실행
turso db shell webapp-production < setup_v2.sql
```

### 방법 B: 수동으로 복사-붙여넣기

1. GitHub에서 파일 열기:
   ```
   https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage/blob/main/setup_complete_v2.sql
   ```

2. "Raw" 버튼 클릭

3. 전체 SQL 코드 복사

4. Turso shell에서 붙여넣기:
   ```bash
   turso db shell webapp-production
   ```
   
5. SQL 코드 붙여넣고 Enter

---

## 🎯 4단계: 테스트 데이터 확인

SQL 실행 후 다음 쿼리로 확인:

### 전체 사용자 확인

```sql
SELECT id, email, name, user_type, academy_name FROM users;
```

**예상 결과:**
```
id | email                | name    | user_type | academy_name
---|---------------------|---------|-----------|------------------
1  | director@test.com   | 김원장   | director  | 슈퍼플레이스 학원
2  | director2@test.com  | 박원장   | director  | 꾸메땅학원 분당점
3  | teacher1@test.com   | 이선생   | teacher   | 슈퍼플레이스 학원
4  | teacher2@test.com   | 최선생   | teacher   | 꾸메땅학원 분당점
```

### 인증 코드 확인

```sql
SELECT code, is_active FROM academy_verification_codes WHERE is_active = 1;
```

**예상 결과:**
```
code   | is_active
-------|----------
ABC123 | 1
XYZ789 | 1
```

### 반 및 학생 수 확인

```sql
SELECT 
    c.name as class_name,
    t.name as teacher_name,
    COUNT(s.id) as student_count
FROM classes c
LEFT JOIN users t ON c.teacher_id = t.id
LEFT JOIN students s ON c.id = s.class_id
GROUP BY c.id;
```

---

## 🧪 5단계: 시스템 테스트

### 테스트 계정 정보

#### 원장님 계정 1
```
이메일: director@test.com
비밀번호: test1234!
학원명: 슈퍼플레이스 학원
인증코드: ABC123
```

#### 원장님 계정 2
```
이메일: director2@test.com
비밀번호: test1234!
학원명: 꾸메땅학원 분당점
인증코드: XYZ789
```

#### 선생님 계정 1
```
이메일: teacher1@test.com
비밀번호: test1234!
소속: 슈퍼플레이스 학원 (김원장)
```

#### 선생님 계정 2
```
이메일: teacher2@test.com
비밀번호: test1234!
소속: 꾸메땅학원 분당점 (박원장)
```

---

## 📱 6단계: API 테스트

### 회원가입 API 테스트 (원장님)

```bash
curl -X POST https://superplace-academy.pages.dev/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "신원장",
    "email": "new.director@test.com",
    "password": "test1234!",
    "phone": "010-9999-8888",
    "academy_name": "테스트학원",
    "academy_location": "서울 강남구",
    "user_type": "director"
  }'
```

### 로그인 API 테스트

```bash
curl -X POST https://superplace-academy.pages.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "director@test.com",
    "password": "test1234!"
  }'
```

### 선생님 목록 조회 (원장님용)

```bash
# user_id=1 (김원장)의 선생님 목록
curl "https://superplace-academy.pages.dev/api/teachers/list?directorId=1"
```

### 인증 코드 조회

```bash
curl "https://superplace-academy.pages.dev/api/teachers/verification-code?directorId=1"
```

### 선생님 등록 신청

```bash
curl -X POST https://superplace-academy.pages.dev/api/teachers/apply \
  -H "Content-Type: application/json" \
  -d '{
    "verificationCode": "ABC123",
    "academy_name": "슈퍼플레이스 학원",
    "name": "정선생",
    "email": "new.teacher@test.com",
    "password": "test1234!",
    "phone": "010-7777-8888"
  }'
```

---

## 🔍 추가 유용한 SQL 쿼리

### 특정 원장님의 선생님 목록

```sql
SELECT 
    u.name as teacher_name,
    u.email,
    u.phone,
    u.created_at
FROM users u
WHERE u.user_type = 'teacher' 
  AND u.parent_user_id = 1  -- 원장님 ID
ORDER BY u.created_at DESC;
```

### 승인 대기 중인 선생님 신청

```sql
SELECT 
    name,
    email,
    academy_name,
    verification_code,
    created_at
FROM teacher_applications
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### 반별 학생 통계

```sql
SELECT 
    c.name as class_name,
    c.grade_level,
    c.subject,
    t.name as teacher_name,
    COUNT(s.id) as enrolled_students,
    c.max_students,
    (c.max_students - COUNT(s.id)) as available_seats
FROM classes c
LEFT JOIN users t ON c.teacher_id = t.id
LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
GROUP BY c.id
ORDER BY c.id;
```

### 학원별 통계

```sql
SELECT 
    u.academy_name,
    u.name as director_name,
    COUNT(DISTINCT t.id) as total_teachers,
    COUNT(DISTINCT c.id) as total_classes,
    COUNT(DISTINCT s.id) as total_students
FROM users u
LEFT JOIN users t ON u.id = t.parent_user_id AND t.user_type = 'teacher'
LEFT JOIN classes c ON u.id = c.user_id
LEFT JOIN students s ON u.id = s.user_id
WHERE u.user_type = 'director'
GROUP BY u.id;
```

---

## 🛠 문제 해결

### Q1: "table already exists" 에러가 나면?

**답:** 정상입니다! `CREATE TABLE IF NOT EXISTS`를 사용했기 때문에 이미 존재하는 테이블은 건너뜁니다.

### Q2: 테스트 데이터가 중복으로 들어가면?

**답:** `INSERT OR IGNORE`를 사용했기 때문에 이미 있는 데이터는 건너뜁니다.

### Q3: 기존 데이터를 초기화하고 싶다면?

```sql
-- 주의: 모든 데이터가 삭제됩니다!
DELETE FROM teacher_parent_contact_permissions;
DELETE FROM teacher_applications;
DELETE FROM students;
DELETE FROM classes;
DELETE FROM academy_verification_codes;
DELETE FROM users WHERE id > 0;  -- 모든 사용자 삭제

-- 그 후 setup_complete_v2.sql 다시 실행
```

### Q4: 특정 테이블만 다시 만들고 싶다면?

```sql
-- 예: teacher_applications 테이블만 초기화
DROP TABLE IF EXISTS teacher_applications;

-- 그 후 해당 CREATE TABLE 부분만 복사해서 실행
```

---

## 📚 테이블 구조

### users (사용자)
- `id`: 사용자 ID
- `email`: 이메일 (로그인 ID)
- `password`: 비밀번호
- `name`: 이름
- `phone`: 연락처
- `user_type`: 'director' (원장님) 또는 'teacher' (선생님)
- `parent_user_id`: 선생님인 경우 소속 원장님 ID
- `academy_name`: 학원명
- `academy_location`: 학원 위치

### academy_verification_codes (인증 코드)
- `id`: 코드 ID
- `user_id`: 원장님 ID
- `code`: 6자리 인증 코드
- `is_active`: 활성화 여부

### teacher_applications (선생님 신청)
- `id`: 신청 ID
- `verification_code`: 입력한 인증 코드
- `academy_name`: 입력한 학원명
- `name`: 이름
- `email`: 이메일
- `status`: 'pending' (대기), 'approved' (승인), 'rejected' (거절)
- `director_id`: 승인/거절한 원장님 ID

### classes (반)
- `id`: 반 ID
- `name`: 반 이름
- `user_id`: 원장님 ID
- `teacher_id`: 담당 선생님 ID
- `grade_level`: 학년
- `subject`: 과목
- `max_students`: 최대 학생 수

### students (학생)
- `id`: 학생 ID
- `name`: 이름
- `grade`: 학년
- `school`: 학교
- `parent_name`: 학부모 이름
- `parent_phone`: 학부모 연락처
- `user_id`: 원장님 ID
- `class_id`: 소속 반 ID

---

## ✅ 완료 체크리스트

- [ ] Turso CLI 설치 및 로그인
- [ ] 데이터베이스 연결
- [ ] setup_complete_v2.sql 실행
- [ ] 테스트 데이터 확인 (SELECT 쿼리)
- [ ] 테스트 계정으로 로그인 테스트
- [ ] API 엔드포인트 테스트
- [ ] 회원가입 테스트
- [ ] 선생님 등록 신청 테스트
- [ ] 인증 코드 발급 테스트

---

## 🎉 다음 단계

1. **프론트엔드 배포 기다리기**
   - Cloudflare Pages가 자동으로 배포됨
   - 또는 수동으로 재배포

2. **실제 사용 시작**
   - 테스트 계정으로 로그인
   - 기능 테스트 및 확인
   - 실제 학원 데이터 입력

3. **추가 기능 개발**
   - 필요한 기능 요청
   - 버그 리포트

---

**문의사항이 있으시면 언제든 알려주세요!** 🚀
