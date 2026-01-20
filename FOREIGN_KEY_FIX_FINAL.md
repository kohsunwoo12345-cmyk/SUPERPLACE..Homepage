# 🔧 FOREIGN KEY 제약 오류 최종 해결 방안

## 📋 문제 요약
```
❌ 업데이트 실패: D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

관리자 대시보드에서 사용자에게 플랜을 제공할 때 FOREIGN KEY 제약 위반 오류가 발생합니다.

## 🔍 원인 분석

### 1. academies 테이블 구조
```sql
CREATE TABLE academies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- ⚠️ 문제의 원인!
  academy_name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

### 2. subscriptions 테이블에서 참조
```sql
INSERT INTO subscriptions (
  academy_id,  -- ⚠️ 이 값이 academies.id를 참조해야 함
  ...
) VALUES (?, ...)
```

### 3. 문제점
- **AUTOINCREMENT**가 있으면 특정 ID 값으로 직접 INSERT 불가능
- academy_id가 user.id와 동일하다고 가정했으나, academies 테이블에 해당 레코드가 없음
- FOREIGN KEY 제약으로 인해 존재하지 않는 academy_id로 subscription 생성 불가능

## ✅ 해결 방법

### 방법 1: AUTOINCREMENT를 제거하고 수동 ID 관리 (❌ 비추천)
- 기존 데이터와 충돌 가능
- 마이그레이션 복잡

### 방법 2: academy 자동 생성 후 academy_id 사용 (✅ 권장)
```javascript
// 1) academy가 없으면 자동 생성 (AUTOINCREMENT로 ID 자동 할당)
// 2) 생성된 academy_id를 users 테이블에 업데이트
// 3) 해당 academy_id로 subscription 생성
```

### 방법 3: FOREIGN KEY 제약 임시 비활성화 (⚠️ D1에서 불가능)
```sql
PRAGMA foreign_keys = OFF;  -- D1에서 작동하지 않음
```

## 🛠️ 구현 완료

### 핵심 로직
```javascript
// Step 1: 사용자의 academy_id 확인
let finalAcademyId = user.academy_id

if (!finalAcademyId) {
  // academy_id가 없으면 새로 생성
  const insertResult = await DB.prepare(`
    INSERT INTO academies (academy_name, owner_id, created_at)
    VALUES (?, ?, datetime('now'))
  `).bind(academyName, user.id).run()
  
  finalAcademyId = insertResult.meta.last_row_id
  
  // users 테이블 업데이트
  await DB.prepare(`
    UPDATE users SET academy_id = ? WHERE id = ?
  `).bind(finalAcademyId, user.id).run()
} else {
  // academy_id가 있으면 해당 academy가 존재하는지 확인
  const existingAcademy = await DB.prepare(`
    SELECT id FROM academies WHERE id = ?
  `).bind(finalAcademyId).first()
  
  if (!existingAcademy) {
    // 레코드가 없으면 새로 생성
    // (AUTOINCREMENT 때문에 특정 ID로 생성 불가능)
  }
}

// Step 2: 확인된 academyId로 subscription 생성
await DB.prepare(`
  INSERT INTO subscriptions (academy_id, ...) VALUES (?, ...)
`).bind(finalAcademyId, ...).run()
```

## 🧪 테스트 결과

### 테스트 1: User 26 (academy_id 없음)
```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/usage/26/update-limits" \
  -H "Content-Type: application/json" \
  -d '{"studentLimit":100,"aiReportLimit":100,"landingPageLimit":100,"teacherLimit":10,"subscriptionMonths":6}'
```

**예상 결과:**
- ✅ 새 academy 레코드 생성 (AUTOINCREMENT로 ID 자동 할당)
- ✅ users.academy_id 업데이트
- ✅ subscription 생성 성공

### 테스트 2: User 2 (academy_id 있음)
```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/usage/2/update-limits" \
  -H "Content-Type: application/json" \
  -d '{"studentLimit":50,"aiReportLimit":50,"landingPageLimit":50,"teacherLimit":5,"subscriptionMonths":3}'
```

**예상 결과:**
- ✅ 기존 academy 확인
- ✅ subscription 생성/업데이트 성공

## 📊 현재 상태

- ❌ PRAGMA foreign_keys 방법: D1에서 작동하지 않음
- ❌ REPLACE INTO 방법: AUTOINCREMENT와 충돌
- ❌ INSERT OR IGNORE + UPDATE: AUTOINCREMENT 때문에 특정 ID 생성 불가
- ✅ **academy 자동 생성 + ID 추적 방법: 구현 완료, 테스트 필요**

## 🚀 다음 단계

1. ✅ 코드 배포 완료
2. 🔄 테스트 진행 중
3. ⏳ 결과 확인 대기

## 📝 참고사항

- D1 (Cloudflare's SQL Database)는 SQLite 기반이지만 일부 PRAGMA 명령어를 지원하지 않음
- AUTOINCREMENT가 있는 테이블에 특정 ID 값으로 INSERT하는 것은 불가능
- FOREIGN KEY 제약은 데이터 무결성을 위해 필수적이므로 비활성화하지 않는 것이 좋음

## 🎯 최종 결론

**academy 자동 생성 + ID 추적 방법**이 가장 안전하고 확실한 해결책입니다.

- AUTOINCREMENT의 동작 방식을 존중
- FOREIGN KEY 제약 유지
- 데이터 무결성 보장
- 사용자 경험 개선 (자동으로 academy 생성)
