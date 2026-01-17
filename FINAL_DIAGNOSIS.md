# 학생 삭제 기능 - 최종 보고서

## ⚠️  현재 상태: 해결 불가 (D1 데이터베이스 제약)

### 🚨 핵심 문제
**students 테이블에 대한 모든 UPDATE 쿼리가 FOREIGN KEY 제약으로 실패합니다.**

```
D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

## 🔍 시도한 모든 방법 (모두 실패)

### 1. ❌ Hard Delete + CASCADE
```typescript
DELETE FROM daily_records WHERE student_id = ?
DELETE FROM students WHERE id = ?
```
→ FOREIGN KEY 오류

### 2. ❌ D1 Batch Transaction
```typescript
await DB.batch([
  DB.prepare('UPDATE students SET class_id = NULL WHERE id = ?'),
  DB.prepare('DELETE FROM daily_records WHERE student_id = ?'),
  DB.prepare('DELETE FROM students WHERE id = ?')
])
```
→ FOREIGN KEY 오류

### 3. ❌ Soft Delete (Simple UPDATE)
```typescript
UPDATE students 
SET status = 'deleted' 
WHERE id = ?
```
→ FOREIGN KEY 오류

### 4. ❌ Soft Delete (Clear FK first)
```typescript
// Step 1
UPDATE students SET class_id = NULL WHERE id = ?
// Step 2  
UPDATE students SET status = 'deleted' WHERE id = ?
```
→ FOREIGN KEY 오류 (Step 1에서 실패)

## 💀 근본 원인

### 추정되는 데이터베이스 구조
```sql
-- students 테이블이 다른 테이블에서 참조되고 있음
CREATE TABLE unknown_table (
  ...
  student_ref INTEGER REFERENCES students(id) 
    ON UPDATE RESTRICT 
    ON DELETE RESTRICT
)
```

**ON UPDATE RESTRICT**가 설정되어 있어:
- students 테이블의 **어떤 컬럼도 UPDATE 불가능**
- 심지어 **status 컬럼조차 변경 불가능**
- class_id를 NULL로 변경하는 것도 실패

### 왜 찾을 수 없는가?
1. **PRAGMA 명령 차단**: D1에서 `PRAGMA foreign_key_list()` 실행 → SQLITE_AUTH 오류
2. **소스 코드에 없음**: CREATE TABLE 문에 명시적 외래키 정의 없음
3. **D1 자동 생성**: D1이 테이블 관계를 분석하여 자동으로 외래키 추가했을 가능성

## 🛠️  해결 방법 (데이터베이스 직접 조작 필요)

### Option 1: Wrangler CLI로 외래키 제거 (권장)
```bash
# 1. 외래키 확인
wrangler d1 execute <database-id> --command="
  SELECT sql FROM sqlite_master WHERE type='table'
"

# 2. 외래키 비활성화
wrangler d1 execute <database-id> --command="
  PRAGMA foreign_keys = OFF
"

# 3. 문제 테이블 찾기
wrangler d1 execute <database-id> --command="
  SELECT name FROM sqlite_master WHERE type='table'
"

# 4. 각 테이블의 외래키 확인
wrangler d1 execute <database-id> --command="
  PRAGMA foreign_key_list(테이블명)
"

# 5. 테이블 재생성 (외래키 제거)
```

### Option 2: 새 D1 데이터베이스 생성
```bash
# 1. 새 데이터베이스 생성
wrangler d1 create superplace-academy-v2

# 2. 기존 데이터 백업
wrangler d1 export <old-database-id> > backup.sql

# 3. 외래키 제거한 스키마로 재생성
# 4. 데이터 복원
wrangler d1 execute <new-database-id> --file=backup-modified.sql

# 5. wrangler.toml 업데이트
```

### Option 3: 테이블 재생성 (데이터 보존)
```sql
-- 1. 백업 테이블 생성
CREATE TABLE students_backup AS SELECT * FROM students;

-- 2. 원본 테이블 삭제
DROP TABLE students;

-- 3. 외래키 없이 재생성
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ...
  -- REFERENCES 없음
);

-- 4. 데이터 복원
INSERT INTO students SELECT * FROM students_backup;

-- 5. 백업 테이블 삭제
DROP TABLE students_backup;
```

## 📊 현재 데이터베이스 상태

### 테이블 구조 (추정)
```
students (id, name, class_id, status, ...)
  ↑
  │ REFERENCES (ON UPDATE RESTRICT)
  │
unknown_table(s) - 이름을 알 수 없음
```

### 학생 ID 4 상태
```json
{
  "id": 4,
  "name": "고선우",
  "class_id": 3,
  "status": "active",
  "academy_id": 1
}
```

### 관련 데이터
- daily_records: 0개 (student_id = 4 없음)
- 기타 참조 테이블: **불명** (PRAGMA 차단)

## 🎯 임시 대안 (현재 불가능)

모든 임시 대안이 실패했습니다:
- ❌ Soft Delete → UPDATE 불가
- ❌ 상태 변경 → UPDATE 불가  
- ❌ 외래키 해제 → UPDATE 불가

## 📞 필요한 조치

### 즉시 필요
1. **D1 데이터베이스 접근 권한**
   - Cloudflare 계정 로그인
   - wrangler CLI 인증

2. **외래키 구조 파악**
   ```bash
   wrangler d1 execute <db-id> --command="
     SELECT name, sql FROM sqlite_master WHERE type='table'
   "
   ```

3. **외래키 제거 또는 비활성화**
   - PRAGMA foreign_keys = OFF
   - 또는 테이블 재생성

### 장기적 해결
1. **스키마 관리 도구 도입**
   - Prisma ORM
   - Drizzle ORM
   - 명시적 마이그레이션 스크립트

2. **외래키 정책 재정의**
   - ON DELETE CASCADE 사용
   - ON UPDATE CASCADE 사용
   - 또는 외래키 미사용

3. **Soft Delete 표준화**
   - 모든 테이블에 status 컬럼
   - 외래키 대신 애플리케이션 레벨 제약

## 🔧 제공된 디버그 API

배포된 API (현재 사용 가능):
```
GET /api/debug/student-references/:studentId
```

응답 예시:
```json
{
  "success": true,
  "studentId": "4",
  "references": {
    "daily_records": { "count": 0 },
    "student": {
      "id": 4,
      "name": "고선우",
      "class_id": 3,
      "status": "active"
    }
  }
}
```

## 📝 최종 결론

### 현재 상태
- ⚠️  **학생 삭제 기능: 완전히 차단됨**
- ⚠️  **UPDATE조차 불가능**
- ⚠️  **D1 데이터베이스 직접 조작 필수**

### 다음 단계
1. Wrangler CLI로 데이터베이스 접근
2. 외래키 구조 확인
3. 외래키 제거 또는 재정의
4. 애플리케이션 재배포
5. 삭제 기능 테스트

### 소요 시간 예상
- CLI 접근 및 확인: 10분
- 외래키 제거/재생성: 20-30분
- 테스트 및 검증: 10분
- **총 예상 시간: 40-50분**

---

## 📌 URL

- **메인**: https://superplace-academy.pages.dev
- **학생 관리**: https://superplace-academy.pages.dev/students/list
- **최신 배포**: https://6012ee63.superplace-academy.pages.dev
- **GitHub**: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage

## 📦 커밋

**최신 커밋**: `687fd35` - "fix: Clear class_id first before soft delete to bypass FK"

**상태**: ❌ 실패 (FOREIGN KEY 제약으로 모든 UPDATE 차단)

---

**작성일**: 2026-01-17 16:45 UTC  
**작성자**: AI Developer  
**상태**: 🔴 **해결 불가 - D1 데이터베이스 직접 조작 필요**

**권장 조치**: Cloudflare D1 CLI 접근하여 외래키 제거 또는 데이터베이스 재생성
