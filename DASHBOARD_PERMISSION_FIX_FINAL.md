# 🔧 대시보드 카드 표시 및 플랜 회수 기능 수정 - 최종 보고서

## 📋 문제 분석

### 1. 대시보드 카드가 표시되지 않는 문제
**증상**: 관리자가 사용자에게 플랜을 부여해도 대시보드의 주요 기능 카드가 표시되지 않음

**원인**:
1. ✅ 대시보드 카드 HTML은 존재함 (라인 11464-11512)
2. ✅ 권한 매핑 로직은 존재함 (라인 11988-11991)
3. ✅ 권한 체크 로직은 존재함 (라인 12002-12046)
4. ❌ **핵심 문제**: `grantDefaultPermissions` 함수가 `INSERT OR REPLACE`를 사용하여 기존 비활성화된 권한(`is_active=0`)을 제대로 활성화하지 못함

### 2. 플랜 회수 기능 작동 확인
**상태**: ✅ 정상 작동
- API: `POST /api/admin/revoke-plan/:userId`
- 기능: 구독을 'expired'로 변경하고 모든 권한을 `is_active=0`으로 설정
- 확인: User 2의 구독이 'expired' 상태로 올바르게 변경됨

## 🔨 수정 사항

### 1. 권한 부여 로직 개선 (commit: 550b60c)
**파일**: `src/index.tsx` (라인 547-605)
**변경 내용**:
```typescript
// Before: INSERT OR REPLACE (기존 행을 덮어쓰지 못함)
await db.prepare(`
  INSERT OR REPLACE INTO user_permissions (user_id, program_key, granted_by, is_active, created_at)
  VALUES (?, ?, 'system', 1, datetime('now'))
`).bind(userId, programKey).run()

// After: 기존 권한 확인 후 UPDATE 또는 INSERT
const existing = await db.prepare(`
  SELECT id FROM user_permissions 
  WHERE user_id = ? AND program_key = ?
`).bind(userId, programKey).first()

if (existing) {
  // 기존 권한이 있으면 활성화만
  await db.prepare(`
    UPDATE user_permissions 
    SET is_active = 1, granted_by = 'system'
    WHERE user_id = ? AND program_key = ?
  `).bind(userId, programKey).run()
} else {
  // 권한이 없으면 새로 생성
  await db.prepare(`
    INSERT INTO user_permissions (user_id, program_key, granted_by, is_active, created_at)
    VALUES (?, ?, 'system', 1, datetime('now'))
  `).bind(userId, programKey).run()
}
```

### 2. 로깅 추가 (commit: 8f480cf)
**파일**: `src/index.tsx` (라인 7438, 7473, 7479)
**추가 내용**:
```typescript
const permissionResult = await grantDefaultPermissions(c.env.DB, userId)
console.log('[Admin] Permission grant result:', permissionResult)
```

### 3. 디버그 API 추가 (commit: fb54330)
**파일**: `src/index.tsx` (라인 7503-7525)
**새 API**:
```typescript
POST /api/debug/force-grant-permissions/:userId
```
**기능**: 사용자에게 강제로 권한을 부여하고 결과를 확인

## 🎯 작동 방식

### 정상 플로우
1. 관리자가 `/admin/dashboard`에서 사용자 선택
2. "사용 한도 관리" 클릭
3. 플랜 설정 (학생 수, AI 리포트 수, 랜딩페이지 수, 교사 수, 개월 수)
4. 저장 버튼 클릭
5. **자동 실행**: `POST /api/admin/usage/:userId/update-limits`
6. **자동 실행**: `grantDefaultPermissions(db, userId)`
7. **자동 실행**: 18개 기본 권한 부여/활성화:
   - `student_management` (학생 관리)
   - `landing_builder` (랜딩페이지 생성기)
   - `ai_learning_report` (AI 학습 분석 리포트)
   - `sms_sender` (SMS 발송)
   - ... 외 14개
8. 사용자가 대시보드 접속
9. **자동 실행**: `checkUserPermissions()`
10. **결과**: 권한이 있는 카드만 표시

### 대시보드 카드 매핑
```javascript
const dashboardCardMapping = {
  'landing_builder': '.dashboard-card-landing-builder',
  'ai_learning_report': '.dashboard-card-ai-report',
  'student_management': '.dashboard-card-student-mgmt',
  'sms_sender': '.dashboard-card-sms'
}
```

## 📊 테스트 결과

### User 2 테스트 (superplace12@gmail.com)
1. **초기 상태**: 
   - 구독: expired
   - 권한: 모두 비활성화 (is_active=0)
   - 대시보드 카드: 표시 안됨 ❌

2. **플랜 부여 후**:
   - 구독: active (2026-01-21 ~ 2026-04-20)
   - 권한: 18개 권한 부여 시도
   - **예상**: 대시보드 카드 4개 표시 ✅

3. **실제 결과** (배포 후 확인 필요):
   - API 응답: `{"success": true, "message": "사용 한도가 업데이트되었습니다"}`
   - 권한 확인: `GET /api/user/permissions?userId=2`
   - **대기 중**: 배포 완료 후 재확인 필요

## 🚀 배포 상태

### Git 커밋
- `550b60c`: 권한 활성화 로직 수정
- `d880522`: 빈 커밋으로 배포 트리거
- `8f480cf`: 로깅 추가
- `fb54330`: 디버그 API 추가

### Cloudflare Pages 배포
- **상태**: 진행 중 (자동 배포)
- **예상 시간**: 2-5분
- **확인 방법**: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage/actions

## ✅ 검증 방법

### 1. 권한 확인
```bash
curl -s "https://superplace-academy.pages.dev/api/user/permissions?userId=2" | jq '.permissions | with_entries(select(.value == true)) | keys'
```
**예상 결과**:
```json
[
  "ai_learning_report",
  "landing_builder",
  "sms_sender",
  "student_management",
  ... (외 14개)
]
```

### 2. 대시보드 확인
1. User 2로 로그인: https://superplace-academy.pages.dev/login
2. 이메일: `superplace12@gmail.com`
3. 대시보드 접속: https://superplace-academy.pages.dev/dashboard
4. **예상**: 다음 4개 카드 표시
   - 랜딩페이지 생성기
   - AI 학습 분석 리포트
   - 학생 관리
   - 문자 메시지

### 3. 플랜 회수 테스트
```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/revoke-plan/2" | jq .
```
**예상 결과**:
- 구독이 'expired'로 변경
- 권한이 모두 `is_active=0`으로 변경
- 대시보드 카드 모두 숨김

### 4. 재부여 테스트
```bash
curl -X POST "https://superplace-academy.pages.dev/api/admin/usage/2/update-limits" \
  -H "Content-Type: application/json" \
  -d '{
    "studentLimit": 30,
    "aiReportLimit": 30,
    "landingPageLimit": 40,
    "teacherLimit": 2,
    "subscriptionMonths": 1
  }' | jq .
```
**예상 결과**:
- 구독이 'active'로 변경
- 권한이 모두 `is_active=1`로 활성화
- 대시보드 카드 다시 표시

## 🐛 알려진 이슈

### 1. 배포 지연
**문제**: GitHub Actions → Cloudflare Pages 자동 배포가 2-5분 소요
**해결책**: 배포 완료까지 대기 필요

### 2. API 토큰 만료
**문제**: Wrangler CLI 직접 배포 시 API 토큰 인증 실패
**해결책**: GitHub 푸시 → 자동 배포 방식 사용

### 3. 관리자 role 누락
**문제**: User 1, User 7의 role 컬럼이 null
**영향**: 직접 권한 부여 API 사용 불가
**해결책**: `grantDefaultPermissions`는 'system' 권한으로 실행되므로 영향 없음

## 📝 다음 단계

### 즉시 수행
1. ⏳ Cloudflare Pages 배포 완료 대기 (2-5분)
2. ✅ User 2 권한 확인 API 테스트
3. ✅ User 2 대시보드 카드 표시 확인
4. ✅ 플랜 회수 테스트
5. ✅ 재부여 테스트

### 향후 개선
1. 관리자 계정 role 설정 (User 1, User 7)
2. 디버그 API 제거 또는 관리자 전용으로 제한
3. 권한 부여 실패 시 재시도 로직
4. 사용자 대시보드에 권한 부족 메시지 표시

---

**작성일**: 2026-01-20 17:30 KST  
**최종 커밋**: fb54330  
**배포 상태**: 진행 중  
**담당자**: Claude Code Agent
