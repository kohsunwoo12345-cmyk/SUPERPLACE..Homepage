# 플랜 상속 및 자동 회수 시스템 가이드

## 🚀 배포 정보
- **배포 완료**: 2026-01-20 23:15 (UTC)
- **Git 커밋**: `c5368cc`
- **배포 URL**: https://100c06d2.superplace-academy.pages.dev
- **프로덕션 URL**: https://superplace-academy.pages.dev

## 🎯 시스템 개요

### 플랜 상속 구조
```
학원 원장 (academy_id: 123)
  ├─ 플랜: 프로 플랜 (학생 100, AI리포트 100, 랜딩페이지 140, 선생님 6)
  ├─ 구독 기간: 2026-01-20 ~ 2026-02-20
  │
  └─ 소속 선생님들 (100% 동일한 플랜 적용)
      ├─ 선생님 A (academy_id: 123) → 프로 플랜 전체 기능
      ├─ 선생님 B (academy_id: 123) → 프로 플랜 전체 기능
      └─ 선생님 C (academy_id: 123) → 프로 플랜 전체 기능
```

## ✨ 주요 기능

### 1. 플랜 상속 시스템
#### 원장이 구독하면
- ✅ 원장: 즉시 플랜 활성화
- ✅ 모든 선생님: 자동으로 동일한 플랜 적용
- ✅ 동일한 한도 공유
- ✅ 동일한 만료일

#### 적용되는 내용
- **구독 정보**: 플랜 이름, 시작일, 종료일
- **사용 한도**: 학생 수, AI 리포트, 랜딩페이지, 선생님
- **프로그램 접근**: 4개 기본 프로그램 (학생 관리, AI 리포트, 대시보드, 검색량 조회)
- **마케팅 도구**: 모든 마케팅 도구 섹션

### 2. 자동 회수 시스템
#### 플랜 만료 시
- ✅ 매일 자동 체크 (한국시간 오전 10시)
- ✅ 만료된 구독 자동 감지
- ✅ 원장 + 모든 선생님 권한 즉시 회수
- ✅ 프로그램 접근 차단
- ✅ 사용량 카운터 초기화

#### 회수되는 내용
- **구독 상태**: `active` → `expired`
- **사용자 권한**: 모든 권한 삭제
- **프로그램 접근**: 4개 기본 프로그램 삭제
- **사용량**: 모든 카운터 0으로 리셋

## 🔧 기술 구현

### A. 플랜 상속 로직

#### 구독 상태 API (`/api/subscriptions/status`)
```javascript
// 사용자 타입 확인
const user = await DB.prepare(`
  SELECT id, academy_id, user_type FROM users WHERE id = ?
`).bind(userId).first()

// 플랜 조회 로직
let academyId
if (user.user_type === 'teacher') {
  // 선생님: 원장의 academy_id로 구독 조회
  academyId = user.academy_id
} else {
  // 원장: 자신의 ID로 구독 조회
  academyId = user.id
}

// 구독 조회 (원장과 선생님 모두 같은 구독을 봄)
SELECT * FROM subscriptions 
WHERE academy_id = ? AND status = 'active'
```

#### 사용량 조회 API (`/api/usage/check`)
```javascript
// 동일한 로직 적용
if (user.user_type === 'teacher') {
  academyId = user.academy_id  // 원장 ID
} else {
  academyId = user.id
}

// 같은 구독의 한도를 조회
SELECT * FROM subscriptions WHERE academy_id = ?
```

### B. 자동 회수 로직

#### Cron Job API (`/api/subscriptions/check-expired`)
```javascript
// 1. 만료된 구독 찾기
SELECT id, academy_id, plan_name, subscription_end_date 
FROM subscriptions 
WHERE status = 'active' AND subscription_end_date < today

// 2. 각 만료된 구독마다 회수 처리
for (const subscription of expiredSubscriptions) {
  // 2-1. 구독 상태 변경
  UPDATE subscriptions SET status = 'expired' WHERE id = ?
  
  // 2-2. 학원의 모든 사용자 찾기 (원장 + 선생님)
  SELECT id FROM users WHERE academy_id = subscription.academy_id
  
  // 2-3. 모든 사용자의 권한 삭제
  for (const user of academyUsers) {
    DELETE FROM user_permissions WHERE user_id = user.id
    DELETE FROM user_programs WHERE user_id = user.id
  }
  
  // 2-4. 사용량 카운터 리셋
  UPDATE usage_tracking 
  SET current_students = 0, 
      ai_reports_used_this_month = 0,
      landing_pages_created = 0,
      current_teachers = 0,
      sms_sent_this_month = 0
  WHERE academy_id = subscription.academy_id
}
```

#### Cron 스케줄 (`wrangler.toml`)
```toml
[triggers]
crons = ["0 1 * * *"]  # 매일 1AM UTC = 10AM 한국시간
```

## 📊 데이터베이스 구조

### users 테이블
```sql
id  | email              | user_type | academy_id
----|-------------------|-----------|------------
123 | owner@test.com    | owner     | 123       (자기 자신)
124 | teacher1@test.com | teacher   | 123       (원장 ID)
125 | teacher2@test.com | teacher   | 123       (원장 ID)
```

### subscriptions 테이블
```sql
id  | academy_id | plan_name  | status | start_date  | end_date
----|-----------|-----------|--------|------------|------------
1   | 123       | 프로 플랜  | active | 2026-01-20 | 2026-02-20
```

### 구독 조회 결과
- **원장 (user_id: 123)**: academy_id = 123으로 조회 → 구독 발견 ✅
- **선생님 (user_id: 124)**: academy_id = 123으로 조회 → 동일한 구독 ✅
- **선생님 (user_id: 125)**: academy_id = 123으로 조회 → 동일한 구독 ✅

## 🎬 시나리오 예시

### 시나리오 1: 원장이 플랜 구독
```
1. 원장이 "프로 플랜" 구독 (2026-01-20 ~ 2026-02-20)
   ↓
2. 구독 생성: academy_id = 123 (원장 ID)
   ↓
3. 원장 로그인 → 대시보드
   - ✅ 프로 플랜 표시
   - ✅ 학생: 0/100, AI리포트: 0/100
   - ✅ 마케팅 도구 섹션 표시
   ↓
4. 선생님 A 로그인 → 대시보드
   - ✅ 프로 플랜 표시 (원장과 동일)
   - ✅ 학생: 0/100, AI리포트: 0/100 (원장과 동일)
   - ✅ 마케팅 도구 섹션 표시
```

### 시나리오 2: 플랜 만료
```
2026-02-20 23:59:59
   ↓
2026-02-21 01:00:00 (UTC) = 10:00:00 (한국시간)
   ↓
Cron Job 실행: /api/subscriptions/check-expired
   ↓
1. 만료된 구독 발견: academy_id = 123
   ↓
2. 구독 상태 변경: status = 'expired'
   ↓
3. 학원 사용자 찾기: [원장(123), 선생님A(124), 선생님B(125)]
   ↓
4. 모든 사용자 권한 삭제
   - DELETE FROM user_permissions WHERE user_id IN (123, 124, 125)
   - DELETE FROM user_programs WHERE user_id IN (123, 124, 125)
   ↓
5. 사용량 리셋
   - UPDATE usage_tracking SET ... = 0 WHERE academy_id = 123
   ↓
6. 원장 로그인 → 대시보드
   - ❌ "구독 플랜이 없습니다" 경고 배너
   - ❌ 마케팅 도구 섹션 숨김
   ↓
7. 선생님 로그인 → 대시보드
   - ❌ "구독 플랜이 없습니다" 경고 배너 (원장과 동일)
   - ❌ 마케팅 도구 섹션 숨김 (원장과 동일)
```

### 시나리오 3: 플랜 갱신
```
1. 원장이 새로 "프로 플랜" 구독
   ↓
2. 새 구독 생성: academy_id = 123
   ↓
3. 4개 기본 프로그램 자동 등록
   - user_id = 123 (원장)
   ↓
4. 원장 + 모든 선생님 즉시 접근 가능
   - 원장: 구독 정보 표시 ✅
   - 선생님들: 동일한 구독 정보 표시 ✅
```

## 🧪 테스트 가이드

### 테스트 1: 플랜 상속 확인
1. **원장 계정으로 테스트**
   - 플랜 구독 완료
   - 대시보드 접속 → 플랜 정보 확인
   - 예상: "프로 플랜", "2026-01-20 ~ 2026-02-20"

2. **선생님 계정으로 테스트**
   - 선생님 계정 생성 (academy_id = 원장 ID)
   - 대시보드 접속
   - 예상: 원장과 **동일한** 플랜 정보 표시

3. **콘솔 로그 확인**
   ```
   [Subscription Status] userId: 124, user_type: teacher
   [Subscription Status] Teacher detected, using owner academy_id: 123
   [Subscription Status] Using academy_id: 123 for user_type: teacher
   ```

### 테스트 2: 자동 회수 확인 (수동 트리거)
```bash
# Cron Job 수동 실행
curl https://superplace-academy.pages.dev/api/subscriptions/check-expired
```

**예상 응답**:
```json
{
  "success": true,
  "message": "Successfully expired 1 subscriptions",
  "expiredCount": 1,
  "expiredSubscriptions": [
    {
      "id": 1,
      "academy_id": 123,
      "plan_name": "프로 플랜",
      "end_date": "2026-01-20"
    }
  ]
}
```

### 테스트 3: 만료 후 접근 차단 확인
1. Cron Job 실행 후
2. 원장 로그인 → 대시보드
   - 예상: ❌ "구독 플랜이 없습니다" 배너
3. 선생님 로그인 → 대시보드
   - 예상: ❌ "구독 플랜이 없습니다" 배너 (원장과 동일)

## 📋 API 엔드포인트

### 1. 구독 상태 조회
```
GET /api/subscriptions/status
Cookie: session_id=xxx

응답 (원장):
{
  "success": true,
  "hasSubscription": true,
  "subscription": {
    "planName": "프로 플랜",
    "startDate": "2026-01-20",
    "endDate": "2026-02-20",
    "studentLimit": 100,
    "aiReportLimit": 100,
    "landingPageLimit": 140,
    "teacherLimit": 6
  }
}

응답 (선생님): 동일한 응답
```

### 2. 사용량 조회
```
GET /api/usage/check
Cookie: session_id=xxx

응답:
{
  "success": true,
  "limits": {
    "students": 100,
    "aiReports": 100,
    "landingPages": 140,
    "teachers": 6
  },
  "usage": {
    "students": 5,
    "aiReports": 2,
    "landingPages": 3,
    "teachers": 2,
    "sms": 0
  }
}
```

### 3. 만료 체크 Cron
```
GET /api/subscriptions/check-expired

응답:
{
  "success": true,
  "message": "Successfully expired X subscriptions",
  "expiredCount": X,
  "expiredSubscriptions": [...]
}
```

## 🔄 Cron Job 설정

### Cloudflare Workers Cron (권장)
- **설정 파일**: `wrangler.toml`
- **스케줄**: `0 1 * * *` (매일 1AM UTC = 10AM 한국시간)
- **자동 실행**: Cloudflare가 자동으로 호출

### 대안: 외부 서비스
**GitHub Actions** (`.github/workflows/cron.yml`):
```yaml
name: Check Expired Subscriptions
on:
  schedule:
    - cron: '0 1 * * *'  # 매일 1AM UTC
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl https://superplace-academy.pages.dev/api/subscriptions/check-expired
```

**UptimeRobot**:
- URL: `https://superplace-academy.pages.dev/api/subscriptions/check-expired`
- Interval: 매일 1회
- Method: GET

## ✅ 체크리스트

### 플랜 상속
- [ ] 원장이 구독하면 선생님도 즉시 플랜 표시
- [ ] 선생님 대시보드에 원장과 동일한 한도 표시
- [ ] 선생님도 4개 기본 프로그램 접근 가능
- [ ] 선생님도 마케팅 도구 섹션 표시

### 자동 회수
- [ ] Cron Job이 매일 실행됨
- [ ] 만료된 구독 자동 감지
- [ ] 원장 권한 자동 삭제
- [ ] 모든 선생님 권한 자동 삭제
- [ ] 사용량 카운터 자동 리셋
- [ ] 만료 후 "구독 플랜이 없습니다" 표시

## 🎉 요약

### 원장 입장
- ✅ 플랜 1개만 구독하면 됨
- ✅ 모든 선생님에게 자동 적용
- ✅ 만료 시 자동으로 모두 회수됨
- ✅ 별도 관리 불필요

### 선생님 입장
- ✅ 별도 구독 불필요
- ✅ 원장 플랜 그대로 사용
- ✅ 원장이 갱신하면 자동 복구
- ✅ 동일한 사용자 경험

### 시스템 입장
- ✅ 완전 자동화
- ✅ 수동 개입 불필요
- ✅ 데이터 일관성 보장
- ✅ 확장 가능한 구조

---

**모든 시스템이 구축되었습니다!** 🚀

- **플랜 상속**: 원장 구독 → 모든 선생님 자동 적용
- **자동 회수**: 플랜 만료 → 원장+선생님 권한 자동 삭제
- **배포 완료**: https://superplace-academy.pages.dev
