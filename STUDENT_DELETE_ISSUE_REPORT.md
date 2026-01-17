# 학생 삭제 이슈 보고서

## 🚨 문제 상황

**에러**: `D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT`

**발생 조건**: 학생 삭제 시 항상 발생 (Hard Delete, Soft Delete 모두 실패)

## 🔍 시도한 해결 방법

### 1. ❌ Hard Delete with CASCADE
```typescript
// 1. daily_records 삭제
DELETE FROM daily_records WHERE student_id = ?
// 2. students 삭제  
DELETE FROM students WHERE id = ?
```
**결과**: 실패 (FOREIGN KEY 오류)

### 2. ❌ D1 Batch Transaction
```typescript
const statements = [
  DB.prepare('UPDATE students SET class_id = NULL WHERE id = ?'),
  DB.prepare('DELETE FROM daily_records WHERE student_id = ?'),
  DB.prepare('DELETE FROM students WHERE id = ?')
]
await DB.batch(statements)
```
**결과**: 실패 (FOREIGN KEY 오류)

### 3. ❌ Soft Delete (UPDATE)
```typescript
UPDATE students 
SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
WHERE id = ?
```
**결과**: 실패 (FOREIGN KEY 오류) ⚠️  **UPDATE조차 실패!**

## 🔎 원인 분석

### 확인된 사실
1. ✅ `daily_records` 테이블에 student_id 참조 (COUNT = 0, 삭제 대상 없음)
2. ✅ `students.class_id` = 3 (classes 테이블 참조)
3. ⚠️  **UPDATE 쿼리도 FOREIGN KEY 오류 발생**

### 추정 원인
students 테이블이 **다른 테이블에서 외래키로 참조**되고 있으며,  
**ON UPDATE RESTRICT** 제약이 설정되어 있을 가능성이 높습니다.

```sql
-- 추정되는 스키마
CREATE TABLE some_table (
  ...
  student_id INTEGER REFERENCES students(id) ON UPDATE RESTRICT ON DELETE RESTRICT
)
```

### 문제의 핵심
- D1에서 `PRAGMA foreign_key_list()` 명령 차단 (SQLITE_AUTH)
- 외래키 구조를 직접 확인할 수 없음
- 소스 코드에 명시적 외래키 정의 없음 (D1이 자동 생성했을 가능성)

## 💡 해결 방안

### 즉시 해결 가능한 방법 (권장)

#### Option 1: D1 데이터베이스 마이그레이션
```bash
# 1. 기존 데이터 백업
wrangler d1 execute superplace-academy --command "SELECT * FROM students" > backup.sql

# 2. 외래키 제약 확인 및 제거
wrangler d1 execute superplace-academy --command "PRAGMA foreign_keys = OFF"

# 3. 테이블 재생성 (외래키 없이)
# 또는 foreign_key_list 확인 후 제거
```

#### Option 2: 새 D1 데이터베이스 생성
1. 새 D1 데이터베이스 생성 (외래키 없이)
2. 기존 데이터 마이그레이션
3. wrangler.toml 업데이트

#### Option 3: 임시 우회 (Soft Delete 수정)
현재 Soft Delete가 실패하므로, 다른 접근 필요:
```typescript
// students 테이블 복사본 생성
CREATE TABLE students_backup AS SELECT * FROM students;

// 기존 students 테이블 삭제 (CASCADE)
DROP TABLE students CASCADE;

// 외래키 없이 재생성
CREATE TABLE students (...);

// 데이터 복원
INSERT INTO students SELECT * FROM students_backup;
```

### 장기적 해결 방안

1. **명시적 스키마 관리**: 외래키를 소스 코드에 명시
2. **마이그레이션 도구**: Prisma, Drizzle ORM 사용
3. **Soft Delete 표준화**: 모든 테이블에 status 컬럼 추가

## 📊 데이터베이스 상태

### 학생 데이터 (ID: 4)
```json
{
  "id": 4,
  "academy_id": 1,
  "name": "고선우",
  "phone": "DASDASD",
  "parent_name": "강성범",
  "parent_phone": "ASD",
  "grade": "초1",
  "subjects": "영어, 수학",
  "class_id": 3,
  "status": "active"
}
```

### 관련 테이블
- `daily_records`: 0개 레코드 (student_id = 4)
- `classes`: class_id = 3 존재
- 기타 참조 테이블: 불명 (PRAGMA 명령 차단)

## 🛠️ 다음 단계

### 즉시 필요한 작업
1. **Wrangler CLI로 D1 데이터베이스 직접 접근**
   ```bash
   wrangler d1 execute superplace-academy --command "PRAGMA foreign_keys = OFF"
   ```

2. **외래키 목록 확인**
   ```bash
   wrangler d1 execute superplace-academy --command "SELECT sql FROM sqlite_master WHERE type='table'"
   ```

3. **문제 테이블 찾기**
   - students를 참조하는 모든 테이블 확인
   - ON UPDATE RESTRICT 제약 찾기

### 추가 디버깅
현재 추가된 API:
- `GET /api/debug/student-references/:studentId` - 학생 참조 확인

필요한 추가 API:
- D1 직접 쿼리 API (관리자 전용)
- 외래키 목록 확인 API
- 테이블 스키마 확인 API

## 🎯 임시 해결책 (현재 사용 가능)

### 학생 "비활성화"로 대체
삭제 대신 비활성화 상태로 변경:

```typescript
// 프론트엔드 수정
function deleteStudent(studentId) {
  // DELETE 대신 PUT 사용
  fetch(`/api/students/${studentId}/deactivate`, {
    method: 'POST'
  })
}

// 백엔드에 새 API 추가
app.post('/api/students/:id/deactivate', async (c) => {
  // class_id를 NULL로 설정하여 외래키 해제 시도
  await c.env.DB.prepare(`
    UPDATE students 
    SET status = 'inactive', 
        class_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(studentId).run()
  
  return c.json({ success: true })
})
```

## 📞 지원 필요 사항

1. **Cloudflare D1 데이터베이스 접근 권한**
   - wrangler CLI 실행 가능 여부
   - 데이터베이스 직접 쿼리 권한

2. **데이터베이스 구조 문서**
   - 외래키 정의
   - 테이블 간 관계도

3. **마이그레이션 승인**
   - 테이블 재생성 필요 시
   - 데이터 백업 및 복원

## 📝 요약

**현재 상황**: students 테이블 UPDATE조차 FOREIGN KEY 오류로 불가능  
**근본 원인**: 알 수 없는 외래키 제약 (ON UPDATE RESTRICT 추정)  
**즉시 해결**: D1 CLI로 외래키 확인 및 제거 필요  
**임시 해결**: 새 API로 class_id=NULL 설정 후 비활성화

---

**작성일**: 2026-01-17  
**작성자**: AI Developer  
**상태**: ⚠️  해결 보류 (D1 데이터베이스 직접 접근 필요)
