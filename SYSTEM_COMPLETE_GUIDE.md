# SUPERPLACE Academy - 전체 시스템 가이드

## 📋 시스템 개요

SUPERPLACE Academy는 학원장과 선생님을 위한 통합 관리 시스템입니다.

### 핵심 기능

1. **플랜 기반 구독 시스템**
   - 학원장이 플랜을 구매하면 해당 학원의 모든 선생님이 동일한 플랜 혜택을 받습니다
   - 선생님은 별도 구매 없이 학원장의 플랜을 상속받습니다

2. **학생 관리**
   - 학생 등록, 수정, 삭제
   - 반 배정 및 관리
   - 학부모 연락처 관리

3. **선생님 관리**
   - 선생님 등록 및 승인
   - 권한 관리 (전체 공개 / 배정된 반만 공개)
   - 반 배정

4. **일일 성과 기록**
   - 출석 체크
   - 과제 제출 여부
   - 수업 이해도

## 🔐 사용자 역할 및 권한

### 1. 학원장 (Director)
- `user_type`: `director` 또는 NULL
- `academy_id`: 자신의 `id`
- `parent_user_id`: NULL

**권한:**
- ✅ 모든 학생 데이터 조회
- ✅ 모든 반 데이터 조회
- ✅ 선생님 등록 및 관리
- ✅ 선생님 권한 설정
- ✅ 플랜 구매 및 관리
- ✅ 학원 데이터 전체 관리

### 2. 선생님 (Teacher)
- `user_type`: `teacher`
- `academy_id`: 소속 학원장의 `id` (= `parent_user_id`)
- `parent_user_id`: 학원장의 `id`

**권한 (학원장이 설정):**

#### A. 모두 다 공개
```json
{
  "canViewAllStudents": true,
  "canWriteDailyReports": true,
  "assignedClasses": []
}
```
- ✅ 모든 학생 조회
- ✅ 모든 반 조회
- ✅ 모든 학생의 일일 성과 작성
- ✅ 랜딩페이지 접근
- ✅ 네이버 검색량 조회
- ✅ AI 리포트 생성

#### B. 배정된 반만 공개
```json
{
  "canViewAllStudents": false,
  "canWriteDailyReports": true,
  "assignedClasses": [1, 2, 3]  // 배정된 반 ID 목록
}
```
- ✅ 배정된 반의 학생만 조회
- ✅ 배정된 반만 조회
- ✅ 배정된 학생의 일일 성과만 작성
- ❌ 랜딩페이지 접근 불가
- ❌ 네이버 검색량 조회 불가
- ❌ AI 리포트 생성 불가

## 🎯 플랜 상속 시스템

### 작동 원리

1. **학원장이 플랜 구매**
   ```sql
   INSERT INTO subscriptions (user_id, academy_id, plan_name, ...)
   VALUES (7, 7, 'Basic Plan', ...);
   ```
   - `user_id`: 학원장 ID
   - `academy_id`: 학원장 ID (동일)

2. **선생님 등록**
   ```sql
   INSERT INTO users (email, name, user_type, academy_id, parent_user_id, ...)
   VALUES ('teacher@example.com', '김선생', 'teacher', 7, 7, ...);
   ```
   - `academy_id`: 학원장 ID
   - `parent_user_id`: 학원장 ID

3. **플랜 조회 시 자동 상속**
   ```javascript
   // /api/subscriptions/status
   if (user.user_type === 'teacher') {
     // 선생님은 academy_id로 플랜 조회
     const subscription = await getSubscriptionByAcademyId(user.academy_id);
   } else {
     // 학원장은 자신의 ID로 플랜 조회
     const subscription = await getSubscriptionByUserId(user.id);
   }
   ```

## 🗄️ 데이터베이스 구조

### users 테이블
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  user_type TEXT,  -- 'director' or 'teacher'
  academy_id INTEGER,  -- 소속 학원 ID
  parent_user_id INTEGER,  -- 학원장 ID (선생님만)
  permissions TEXT,  -- JSON: {canViewAllStudents, canWriteDailyReports, assignedClasses}
  ...
);
```

### subscriptions 테이블
```sql
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,  -- 구매한 사용자 ID (학원장)
  academy_id INTEGER,  -- 학원 ID (user_id와 동일)
  plan_name TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT,  -- 'active', 'expired'
  student_limit INTEGER,
  teacher_limit INTEGER,
  ai_report_limit INTEGER,
  landing_page_limit INTEGER,
  ...
);
```

### students 테이블
```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT,
  academy_id INTEGER,  -- 소속 학원 ID
  class_id INTEGER,  -- 소속 반 ID
  status TEXT,  -- 'active', 'inactive'
  ...
);
```

### classes 테이블
```sql
CREATE TABLE classes (
  id INTEGER PRIMARY KEY,
  academy_id INTEGER,  -- 소속 학원 ID
  class_name TEXT,
  grade TEXT,
  ...
);
```

## 🔄 데이터 흐름

### 1. 로그인 시
```
사용자 로그인
  ↓
세션 생성 (sessions 테이블)
  ↓
localStorage에 사용자 정보 저장
  - id, email, name, user_type, academy_id, parent_user_id
```

### 2. 대시보드 로드 시
```
/students 페이지 접속
  ↓
localStorage에서 사용자 정보 읽기
  ↓
서버에서 최신 사용자 정보 가져오기 (GET /api/user/profile)
  ↓
localStorage 업데이트
  ↓
academy_id 자동 수정 (없는 경우)
  - 선생님: parent_user_id 사용
  - 학원장: 자신의 id 사용
  ↓
권한 확인
  - 학원장: 자동으로 전체 권한 부여
  - 선생님: 서버에서 권한 조회 (GET /api/teachers/{id}/permissions)
  ↓
대시보드 데이터 로드
  - 학생 수 (GET /api/students)
  - 반 수 (GET /api/classes)
  - 선생님 수 (GET /api/teachers/list) - 학원장만
  - 과목 수 (GET /api/courses)
```

### 3. API 데이터 필터링
```
GET /api/students
  ↓
X-User-Data-Base64 헤더에서 사용자 정보 추출
  ↓
user_type === 'teacher' && !canViewAllStudents && assignedClasses.length > 0
  ↓ YES (배정된 반만)
  SELECT * FROM students 
  WHERE academy_id = ? AND class_id IN (?, ?, ...)
  
  ↓ NO (전체 접근)
  SELECT * FROM students 
  WHERE academy_id = ?
```

## 📊 시나리오별 동작

### 시나리오 1: 학원장이 플랜 구매
1. 학원장 로그인 (user_id: 7)
2. 대시보드 접속 → 플랜 페이지
3. "Basic Plan" 구매
4. `subscriptions` 테이블에 레코드 생성:
   ```sql
   user_id: 7
   academy_id: 7
   plan_name: 'Basic Plan'
   student_limit: 100
   teacher_limit: 10
   ```

### 시나리오 2: 선생님 등록
1. 학원장이 선생님 인증 코드 생성
2. 선생님이 회원가입 페이지에서 인증 코드 입력
3. 선생님 계정 생성:
   ```sql
   id: 24
   email: 'teacher@example.com'
   user_type: 'teacher'
   academy_id: 7  (학원장 ID)
   parent_user_id: 7  (학원장 ID)
   ```

### 시나리오 3: 선생님이 대시보드 접속
1. 선생님 로그인 (user_id: 24)
2. `/students` 페이지 접속
3. 서버에서 최신 정보 가져오기:
   - academy_id: 7 확인
   - parent_user_id: 7 확인
4. 플랜 정보 조회:
   ```sql
   SELECT * FROM subscriptions 
   WHERE academy_id = 7 AND status = 'active'
   ```
   → 학원장의 플랜 정보 반환
5. 권한 조회:
   ```sql
   SELECT permissions FROM users WHERE id = 24
   ```
6. 대시보드 표시:
   - 플랜: Basic Plan (학원장과 동일)
   - 학생 한도: 100명 (학원장과 동일)
   - 선생님 한도: 10명 (학원장과 동일)
   - 현재 학생 수: 45명
   - 현재 반 수: 24개 (또는 배정된 반만)

### 시나리오 4: 선생님 권한 설정
1. 학원장이 선생님 관리 페이지 접속
2. 선생님 선택 후 "권한 설정" 클릭
3. 옵션 선택:
   - **A. 모두 다 공개**
   - **B. 배정된 반만 공개** → 반 선택 (예: 반 1, 반 2)
4. 저장:
   ```sql
   UPDATE users 
   SET permissions = '{"canViewAllStudents":false,"canWriteDailyReports":true,"assignedClasses":[1,2]}'
   WHERE id = 24
   ```
5. 선생님이 다음 로그인 시:
   - 학생 목록: 반 1, 2의 학생만 표시
   - 반 관리: 반 1, 2만 표시
   - 과목 관리: 숨김
   - 랜딩페이지: 숨김

## 🚀 배포 및 테스트

### 배포 URL
- **Production**: https://superplace-academy.pages.dev
- **학생 관리**: https://superplace-academy.pages.dev/students
- **로그인**: https://superplace-academy.pages.dev/login
- **회원가입**: https://superplace-academy.pages.dev/signup
- **인스타그램 팔로워 구매**: https://superplace-academy.pages.dev/store/

### 테스트 계정

#### 학원장 계정 예시
- Email: director@example.com
- Password: (설정된 비밀번호)
- user_type: director
- academy_id: (자신의 ID)

#### 선생님 계정 예시
- Email: kumetang3@gmail.com
- user_type: teacher
- academy_id: 7
- parent_user_id: 7

### 테스트 방법

1. **학원장 테스트**
   ```
   1. 로그인
   2. /students 접속
   3. 확인사항:
      - 전체 학생 수 표시
      - 전체 반 수 표시
      - 선생님 수 표시
      - "선생님 관리" 카드 표시
   ```

2. **선생님 테스트 (전체 공개)**
   ```
   1. 로그인
   2. /students 접속
   3. 확인사항:
      - 전체 학생 수 표시
      - 전체 반 수 표시
      - "선생님 관리" 카드 숨김
      - 학원장과 동일한 플랜 표시
   ```

3. **선생님 테스트 (배정된 반만)**
   ```
   1. 로그인
   2. /students 접속
   3. 확인사항:
      - 배정된 반의 학생만 표시
      - 배정된 반만 표시
      - "선생님 관리" 카드 숨김
      - 랜딩페이지, 네이버 검색량, AI 리포트 숨김
   ```

## 🔧 문제 해결

### 문제: 학생/반 수가 0으로 표시됨

**원인:**
- localStorage에 있는 사용자 정보가 오래됨
- academy_id가 설정되지 않음
- 권한 정보가 잘못됨

**해결방법:**
1. 로그아웃 후 다시 로그인
2. localStorage 삭제:
   ```javascript
   localStorage.removeItem('user');
   location.reload();
   ```
3. 서버에서 academy_id 수정:
   ```
   POST /api/debug/fix-academy-id
   {
     "email": "user@example.com",
     "academy_id": 7
   }
   ```

### 문제: 선생님이 데이터를 볼 수 없음

**원인:**
- 권한이 설정되지 않음
- academy_id가 잘못됨

**해결방법:**
1. 학원장이 선생님 권한 설정
2. 선생님 로그아웃 후 재로그인

### 문제: 플랜 정보가 표시되지 않음

**원인:**
- subscriptions 테이블에 레코드 없음
- academy_id 불일치

**해결방법:**
1. 학원장 계정에서 플랜 구매
2. academy_id 확인 및 수정

## 📝 API 엔드포인트

### 인증
- `POST /api/signup` - 회원가입
- `POST /api/login` - 로그인
- `GET /api/user/profile` - 사용자 정보 조회

### 학생 관리
- `GET /api/students` - 학생 목록 (권한에 따라 필터링)
- `POST /api/students` - 학생 등록
- `PUT /api/students/:id` - 학생 정보 수정
- `DELETE /api/students/:id` - 학생 삭제

### 반 관리
- `GET /api/classes` - 반 목록 (권한에 따라 필터링)
- `POST /api/classes` - 반 생성
- `PUT /api/classes/:id` - 반 정보 수정
- `DELETE /api/classes/:id` - 반 삭제

### 선생님 관리 (학원장 전용)
- `GET /api/teachers/list` - 선생님 목록
- `POST /api/teachers/add` - 선생님 추가
- `GET /api/teachers/:id/permissions` - 선생님 권한 조회
- `POST /api/teachers/:id/permissions` - 선생님 권한 설정

### 플랜 및 구독
- `GET /api/subscriptions/status` - 현재 플랜 정보 (자동 상속)
- `GET /api/subscriptions/usage` - 플랜 사용량

### 디버깅 (개발 전용)
- `GET /api/debug/user-by-email?email=xxx` - 이메일로 사용자 조회
- `POST /api/debug/fix-user-type` - 사용자 타입 수정
- `POST /api/debug/fix-academy-id` - academy_id 수정

## ✅ 구현 완료 사항

- ✅ 학원장 플랜 구매 시 선생님 자동 상속
- ✅ 선생님 등록 시 academy_id 자동 설정
- ✅ 선생님 권한에 따른 데이터 필터링
- ✅ 대시보드에서 서버 데이터 자동 동기화
- ✅ academy_id 자동 수정 로직
- ✅ localStorage 자동 업데이트
- ✅ 플랜 한도 자동 적용
- ✅ 권한별 UI 자동 조정

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 브라우저 콘솔 로그
2. 네트워크 탭의 API 응답
3. localStorage의 user 데이터
4. 디버그 API로 서버 데이터 확인

---

**최종 업데이트:** 2026-01-21
**버전:** 2.0.30
**상태:** ✅ 100% 구현 완료
