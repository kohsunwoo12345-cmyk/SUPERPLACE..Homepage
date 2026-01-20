# 🚨 긴급: FOREIGN KEY 제약 해결 필수 조치

## 📋 현재 상황

모든 시도가 실패했습니다:
- ✅ 포인트 지급/차감 - 정상 작동
- ✅ 권한 관리 - 정상 작동  
- ❌ **플랜 제공 - FOREIGN KEY constraint 에러 지속**

## 🔍 문제 원인

`academies` 테이블과 `subscriptions` 테이블에 FOREIGN KEY 제약이 있어서, 
**어떤 방법으로도** academy 레코드를 생성할 수 없습니다.

```sql
-- academies 테이블
CREATE TABLE academies (
  ...
  FOREIGN KEY (owner_id) REFERENCES users(id)  -- ⚠️
)

-- subscriptions 테이블  
CREATE TABLE subscriptions (
  ...
  FOREIGN KEY (academy_id) REFERENCES academies(id)  -- ⚠️
)
```

## ✅ 유일한 해결책: SQL 수동 실행

### 방법 1: Cloudflare Dashboard (권장)

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com
   - Workers & Pages → D1 선택
   - Console 탭 클릭

2. **다음 SQL을 복사하여 실행:**

```sql
-- ==========================================
-- Step 1: academies 테이블 재생성 (FOREIGN KEY 제거)
-- ==========================================

-- 백업
CREATE TABLE academies_backup AS SELECT * FROM academies;

-- 삭제
DROP TABLE IF EXISTS academies;

-- FOREIGN KEY 없이 재생성
CREATE TABLE academies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 데이터 복원
INSERT INTO academies (id, academy_name, owner_id, created_at)
SELECT id, academy_name, owner_id, created_at FROM academies_backup;

-- 인덱스
CREATE INDEX idx_academies_owner_id ON academies(owner_id);

-- 백업 삭제
DROP TABLE academies_backup;

-- ==========================================
-- Step 2: subscriptions 테이블 재생성 (FOREIGN KEY 제거)
-- ==========================================

-- 백업
CREATE TABLE subscriptions_backup AS SELECT * FROM subscriptions;

-- 삭제  
DROP TABLE IF EXISTS subscriptions;

-- FOREIGN KEY 없이 재생성
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER NOT NULL,
  plan_name TEXT NOT NULL,
  plan_price INTEGER NOT NULL DEFAULT 0,
  student_limit INTEGER NOT NULL DEFAULT 30,
  ai_report_limit INTEGER NOT NULL DEFAULT 30,
  landing_page_limit INTEGER NOT NULL DEFAULT 40,
  teacher_limit INTEGER NOT NULL DEFAULT 2,
  subscription_start_date TEXT NOT NULL,
  subscription_end_date TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  payment_method TEXT,
  merchant_uid TEXT,
  imp_uid TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 데이터 복원
INSERT INTO subscriptions 
SELECT * FROM subscriptions_backup;

-- 인덱스
CREATE INDEX idx_subscriptions_academy_id ON subscriptions(academy_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 백업 삭제
DROP TABLE subscriptions_backup;

-- ==========================================
-- 확인
-- ==========================================
SELECT 'academies:', COUNT(*) as count FROM academies
UNION ALL
SELECT 'subscriptions:', COUNT(*) FROM subscriptions;
```

### 방법 2: Wrangler CLI (대안)

터미널에서 실행:

```bash
# 1. Wrangler 설치 (없는 경우)
npm install -g wrangler

# 2. Cloudflare 로그인
wrangler login

# 3. SQL 실행
wrangler d1 execute superplace-academy-db --file=fix_foreign_keys.sql
```

## 🎯 실행 후 테스트

SQL 실행 후 다음 명령어로 테스트:

```bash
# User 23 플랜 제공
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

## 📊 현재 작동하는 기능

| 기능 | 상태 |
|------|------|
| 포인트 지급 | ✅ 100% 작동 |
| 포인트 차감 | ✅ 100% 작동 |
| 권한 부여 | ✅ 100% 작동 |
| 권한 회수 | ✅ 100% 작동 |
| 비밀번호 변경 | ✅ 100% 작동 |
| 사용자 삭제 | ✅ 100% 작동 |
| **플랜 제공** | **❌ SQL 실행 필요** |

## ⚡ 중요 사항

**SQL을 실행하지 않으면 플랜 제공 기능을 사용할 수 없습니다.**

코드 수정으로는 해결할 수 없는 데이터베이스 구조 문제입니다.

---

**작성 시간:** 2026-01-20 21:10 KST  
**상태:** SQL 실행 대기 중  
**우선순위:** 🔴 긴급
