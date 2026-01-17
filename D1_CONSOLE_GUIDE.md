# Cloudflare D1 콘솔 접속 및 외래키 제거 가이드

## 📍 Step 1: Cloudflare 대시보드 접속

1. **Cloudflare 대시보드 로그인**
   - URL: https://dash.cloudflare.com/
   - 계정으로 로그인

2. **Workers & Pages 메뉴로 이동**
   - 왼쪽 사이드바에서 "Workers & Pages" 클릭

3. **D1 데이터베이스 선택**
   - 상단 탭에서 **"D1 SQL Database"** 클릭
   - 또는 직접 URL: https://dash.cloudflare.com/?to=/:account/workers/d1

## 📍 Step 2: 데이터베이스 찾기

D1 데이터베이스 목록에서 프로젝트의 데이터베이스를 찾습니다:

**데이터베이스 이름 확인 방법:**
```bash
# 프로젝트의 wrangler.toml 파일 확인 필요
# 또는 D1 목록에서 "superplace" 관련 이름 찾기
```

가능한 이름:
- `superplace-academy`
- `superplace-academy-db`
- `SUPERPLACE-db`

찾으면 **클릭하여 상세 페이지로 이동**

## 📍 Step 3: Console (콘솔) 탭 열기

데이터베이스 상세 페이지에서:

1. 상단 탭 중 **"Console"** 클릭
2. SQL 쿼리 입력창이 나타남

## 🔍 Step 4: 외래키 구조 확인

### 4-1. 모든 테이블 목록 보기

Console에 다음 쿼리 입력 후 **"Execute"** 버튼 클릭:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
```

**예상 결과:**
```
students
classes
courses
daily_records
users
(기타 테이블들...)
```

### 4-2. students 테이블 구조 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='students';
```

**이 쿼리 결과를 복사해서 저에게 보여주세요!**

### 4-3. 외래키 제약 확인 (시도)

```sql
PRAGMA foreign_key_list(students);
```

만약 "not authorized" 오류가 나면 → 다음 단계로

### 4-4. students를 참조하는 테이블 찾기

다음 쿼리들을 하나씩 실행:

```sql
-- daily_records 테이블 구조
SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_records';

-- classes 테이블 구조
SELECT sql FROM sqlite_master WHERE type='table' AND name='classes';

-- courses 테이블 구조
SELECT sql FROM sqlite_master WHERE type='table' AND name='courses';

-- users 테이블 구조
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';
```

**각 결과를 복사해서 저에게 보여주세요!**

## 🛠️ Step 5: 외래키 제거 (방법 1 - 추천)

### Option A: 외래키 비활성화 (임시)

```sql
PRAGMA foreign_keys = OFF;
```

이 명령 실행 후 다시 학생 삭제 시도:
- https://superplace-academy.pages.dev/students/list
- 학생 삭제 버튼 클릭

**만약 여전히 실패하면** → Option B로 진행

### Option B: 테이블 재생성 (영구)

⚠️ **주의**: 이 작업은 데이터를 임시로 백업했다가 복원합니다.

#### 1단계: 백업 테이블 생성

```sql
CREATE TABLE students_backup AS SELECT * FROM students;
```

#### 2단계: students를 참조하는 외래키 확인

다른 테이블의 CREATE TABLE 문에서 `REFERENCES students` 찾기

#### 3단계: 원본 테이블 삭제

```sql
DROP TABLE students;
```

#### 4단계: 외래키 없이 재생성

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  phone TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  grade TEXT NOT NULL,
  subjects TEXT NOT NULL,
  enrollment_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  class_id INTEGER
  -- REFERENCES 없음! (외래키 제거)
);
```

#### 5단계: 데이터 복원

```sql
INSERT INTO students 
SELECT * FROM students_backup;
```

#### 6단계: 백업 테이블 삭제

```sql
DROP TABLE students_backup;
```

#### 7단계: 확인

```sql
SELECT COUNT(*) FROM students;
SELECT * FROM students LIMIT 5;
```

## 🛠️ Step 6: 테스트

D1 콘솔에서 직접 테스트:

### 테스트 1: 학생 목록 조회

```sql
SELECT id, name, status, class_id FROM students WHERE status='active' LIMIT 5;
```

### 테스트 2: Soft Delete 시도

```sql
-- 학생 ID 4를 soft delete
UPDATE students SET status='deleted', class_id=NULL WHERE id=4;
```

**결과:**
- ✅ 성공하면: "Query succeeded" 또는 "1 row affected"
- ❌ 실패하면: 여전히 FOREIGN KEY 오류

### 테스트 3: 삭제 확인

```sql
-- status='active'인 학생만 보기
SELECT id, name, status FROM students WHERE status='active';

-- 삭제된 학생 확인
SELECT id, name, status FROM students WHERE status='deleted';
```

## 🎯 Step 7: 웹에서 최종 확인

D1 콘솔에서 성공했으면, 웹 페이지에서 확인:

1. https://superplace-academy.pages.dev/students/list 접속
2. 학생 삭제 버튼 클릭
3. ✅ 성공 메시지 확인!

## 📋 체크리스트

진행하면서 다음 정보를 저에게 보내주세요:

- [ ] D1 데이터베이스 이름 확인
- [ ] Console 탭 접속 완료
- [ ] `SELECT sql FROM sqlite_master WHERE name='students'` 결과
- [ ] `SELECT sql FROM sqlite_master WHERE name='daily_records'` 결과
- [ ] `PRAGMA foreign_keys = OFF` 실행 결과
- [ ] `UPDATE students SET status='deleted' WHERE id=4` 테스트 결과

## 🆘 문제 해결

### Q1: D1 데이터베이스가 안 보여요
**답변**: 
- Workers & Pages > Overview에서 프로젝트 선택
- 우측 "Settings" 탭 > "Bindings" 섹션에서 D1 데이터베이스 확인

### Q2: Console 탭이 없어요
**답변**:
- D1 데이터베이스 목록에서 데이터베이스 **이름을 클릭**해야 상세 페이지로 이동
- 상세 페이지 상단에 "Console" 탭이 있음

### Q3: PRAGMA foreign_keys = OFF가 안 먹혀요
**답변**:
- D1이 세션별로 설정됨
- 테이블 재생성(Option B) 필요

### Q4: 테이블 재생성이 무서워요
**답변**:
- 백업 먼저 만들어서 안전함
- 혹시 모르니 전체 데이터 백업:
  ```sql
  -- 모든 학생 데이터 조회 (엑셀로 저장 가능)
  SELECT * FROM students;
  ```

## 📸 스크린샷 가이드

막히는 부분이 있으면 다음 스크린샷을 찍어서 보내주세요:

1. **D1 데이터베이스 목록 화면**
2. **Console 탭 화면**
3. **쿼리 실행 결과 화면**
4. **에러 메시지 (있다면)**

---

## 🚀 빠른 시작 (요약)

```sql
-- 1. 테이블 구조 확인
SELECT sql FROM sqlite_master WHERE name='students';

-- 2. 외래키 비활성화 시도
PRAGMA foreign_keys = OFF;

-- 3. 삭제 테스트
UPDATE students SET status='deleted' WHERE id=4;

-- 4. 성공하면 끝!
-- 5. 실패하면 테이블 재생성 필요
```

**제일 먼저**: Step 4의 쿼리 결과들을 저에게 보내주시면, 정확한 해결 방법을 알려드릴 수 있습니다!

---

**도움말**:
- D1 Console 직접 URL: `https://dash.cloudflare.com/[YOUR_ACCOUNT_ID]/workers/d1/[DATABASE_ID]`
- Cloudflare 문서: https://developers.cloudflare.com/d1/
