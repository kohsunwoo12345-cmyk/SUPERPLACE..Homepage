# 🎯 귀하의 D1 데이터베이스 정보

## 📌 데이터베이스 세부 정보

**데이터베이스 이름**: `webapp-production`  
**데이터베이스 ID**: `8c106540-21b4-4fa9-8879-c4956e459ca1`

## 🔗 직접 접속 링크

### 방법 1: Cloudflare 대시보드 (추천)

1. **D1 데이터베이스 목록 페이지**
   ```
   https://dash.cloudflare.com/
   ```
   - 로그인 후 → Workers & Pages → D1 SQL Database

2. **데이터베이스 목록에서 찾기**
   - 이름: **webapp-production** 찾아서 클릭

3. **Console 탭 클릭**
   - 상단에 "Console" 탭이 보임
   - SQL 쿼리 입력창 사용

### 방법 2: 직접 URL (계정 ID 필요)

만약 계정 ID를 안다면:
```
https://dash.cloudflare.com/[YOUR_ACCOUNT_ID]/workers/d1/8c106540-21b4-4fa9-8879-c4956e459ca1
```

계정 ID 확인 방법:
1. Cloudflare 대시보드 로그인
2. URL 확인: `https://dash.cloudflare.com/[이 부분이 계정 ID]/...`

## 🛠️ 즉시 실행할 SQL 쿼리

D1 Console에 접속하면 다음 쿼리들을 **순서대로** 실행하세요:

### 1단계: 현재 상태 확인

```sql
-- 모든 테이블 목록 보기
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
```

### 2단계: students 테이블 구조 확인

```sql
-- students 테이블 생성문 보기
SELECT sql FROM sqlite_master WHERE type='table' AND name='students';
```

**⚠️ 이 결과를 꼭 저에게 보내주세요!**

### 3단계: 외래키 비활성화 시도

```sql
PRAGMA foreign_keys = OFF;
```

### 4단계: 삭제 테스트

```sql
-- 학생 ID 4를 soft delete
UPDATE students 
SET status = 'deleted', 
    class_id = NULL, 
    updated_at = CURRENT_TIMESTAMP 
WHERE id = 4;
```

**결과:**
- ✅ "Query succeeded" → 성공! 웹에서 바로 확인 가능
- ❌ FOREIGN KEY 오류 → 5단계로 진행

### 5단계: 테이블 재생성 (4단계 실패 시에만)

```sql
-- 백업 생성
CREATE TABLE students_backup AS SELECT * FROM students;

-- 확인
SELECT COUNT(*) FROM students_backup;

-- 원본 삭제
DROP TABLE students;

-- 외래키 없이 재생성
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
);

-- 데이터 복원
INSERT INTO students SELECT * FROM students_backup;

-- 확인
SELECT COUNT(*) FROM students;
SELECT * FROM students LIMIT 3;

-- 백업 삭제
DROP TABLE students_backup;
```

### 6단계: 최종 테스트

```sql
-- 학생 4 삭제 재시도
UPDATE students SET status='deleted', class_id=NULL WHERE id=4;

-- 확인
SELECT id, name, status FROM students WHERE id=4;
```

## 📸 스크린샷 안내

다음 화면들을 스크린샷으로 찍어주시면 도움이 됩니다:

1. **D1 데이터베이스 목록** (webapp-production 보이는 화면)
2. **Console 탭** (SQL 입력창 보이는 화면)
3. **2단계 쿼리 결과** (students 테이블 CREATE TABLE 문)
4. **4단계 결과** (UPDATE 쿼리 실행 결과)

## 🎯 예상 소요 시간

- **준비**: 2분 (로그인 + Console 접속)
- **확인**: 3분 (1~2단계)
- **수정**: 5분 (3~5단계)
- **테스트**: 2분 (6단계 + 웹 확인)

**총 약 12분 예상**

## ✅ 성공 확인 방법

1. **D1 Console에서:**
   ```sql
   UPDATE students SET status='deleted' WHERE id=4;
   ```
   → "Query succeeded" 메시지

2. **웹 페이지에서:**
   - https://superplace-academy.pages.dev/students/list
   - 학생 삭제 버튼 클릭
   - ✅ "학생이 삭제되었습니다" 메시지
   - 목록에서 해당 학생 사라짐

## 🆘 막히면?

진행하다가 막히면:

1. **스크린샷** 찍어서 보내주기
2. **에러 메시지** 복사해서 보내주기
3. **2단계 쿼리 결과** (CREATE TABLE 문) 보내주기

제가 정확한 해결 방법을 알려드릴게요!

---

## 📝 요약

1. Cloudflare 대시보드 로그인
2. Workers & Pages → D1 SQL Database
3. **webapp-production** 클릭
4. Console 탭 클릭
5. 위 쿼리들 순서대로 실행
6. 웹에서 테스트

**첫 번째로**: 2단계 쿼리 결과를 저에게 보내주세요!
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='students';
```

이 결과를 보면 정확한 외래키 구조를 파악할 수 있습니다!
