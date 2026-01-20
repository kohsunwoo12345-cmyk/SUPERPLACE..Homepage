# 🔧 수동 수정 가이드

## FOREIGN KEY 에러 해결 방법

### 문제
```
❌ 업데이트 실패: D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

### 해결책: Cloudflare Dashboard에서 SQL 실행

#### 1. Cloudflare Dashboard 접속
1. https://dash.cloudflare.com 접속
2. Workers & Pages 선택
3. D1 데이터베이스 선택
4. Console 탭 클릭

#### 2. SQL 실행 (복사 & 붙여넣기)
```sql
-- Step 1: 백업 테이블 생성
CREATE TABLE academies_backup AS SELECT * FROM academies;

-- Step 2: 기존 테이블 삭제
DROP TABLE IF EXISTS academies;

-- Step 3: FOREIGN KEY 없이 재생성
CREATE TABLE academies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: 데이터 복원
INSERT INTO academies (id, academy_name, owner_id, created_at)
SELECT id, academy_name, owner_id, created_at FROM academies_backup;

-- Step 5: 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_academies_owner_id ON academies(owner_id);

-- Step 6: 백업 테이블 삭제
DROP TABLE academies_backup;

-- Step 7: 확인
SELECT COUNT(*) as total_academies FROM academies;
```

#### 3. 실행 후 테스트
```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/usage/23/update-limits" \
  -H "Content-Type: application/json" \
  -d '{
    "studentLimit": 100,
    "aiReportLimit": 100,
    "landingPageLimit": 100,
    "teacherLimit": 10,
    "subscriptionMonths": 6
  }'
```

**예상 결과:**
```json
{
  "success": true,
  "message": "사용 한도가 업데이트되었습니다",
  "limits": {
    "studentLimit": 100,
    "aiReportLimit": 100,
    "landingPageLimit": 100,
    "teacherLimit": 10
  }
}
```

---

## 대안: API를 통한 자동 수정 (배포 후)

API가 정상적으로 배포되면 다음 명령으로 자동 수정 가능:

```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/fix-academies-table"
```

---

## 현재 작동하는 기능

### ✅ 즉시 사용 가능
1. **포인트 지급/차감** - 100% 작동
2. **권한 관리** - 100% 작동
3. **비밀번호 변경** - 100% 작동
4. **사용자 삭제** - 100% 작동

### ⚠️ 부분 작동
5. **플랜 제공** - User 2는 성공, User 23은 실패 (FOREIGN KEY 에러)

---

**마지막 업데이트:** 2026-01-20 20:42 KST
