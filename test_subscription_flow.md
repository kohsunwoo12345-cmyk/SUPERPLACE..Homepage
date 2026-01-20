# 플랜 회수 테스트 가이드

## 수정 사항 요약

### API 변경 (`/api/admin/revoke-plan/:userId`)
1. **이전**: `UPDATE subscriptions SET status = 'cancelled'`
2. **현재**: `DELETE FROM subscriptions` (모든 구독 완전 삭제)
3. **추가**: `DELETE FROM user_permissions` (모든 권한 삭제)
4. **유지**: `DELETE FROM user_programs` (프로그램 삭제)
5. **유지**: `UPDATE usage_tracking SET ... = 0` (사용량 초기화)

### 구독 확인 API (`/api/subscriptions/status`)
- 구독이 없으면: `{ success: true, hasSubscription: false, message: '활성 구독이 없습니다' }`
- 대시보드에서 `hasSubscription: false`일 때 경고 배너 표시

## 테스트 시나리오

### 1. 관리자가 플랜 회수
1. 관리자로 로그인
2. `/admin/users` 페이지 접속
3. 사용자의 📊 버튼 클릭 (사용 한도 관리)
4. "플랜 회수" 버튼 클릭
5. 확인 팝업에서 "확인"
6. ✅ "플랜이 성공적으로 회수되었습니다" 메시지 표시

### 2. 사용자 입장에서 확인
1. 해당 사용자로 로그인 (또는 이미 로그인된 상태에서 페이지 새로고침)
2. `/dashboard` 페이지 접속
3. ✅ 상단에 빨간색 경고 배너 표시:
   - "⚠️ 구독 플랜이 없습니다"
   - "모든 기능을 사용하려면 플랜을 구독해주세요"
   - "플랜 선택하기 →" 버튼

### 3. 데이터베이스 확인 (선택사항)
```sql
-- 구독 삭제 확인
SELECT * FROM subscriptions WHERE academy_id = [USER_ID];
-- 결과: 0 rows

-- 권한 삭제 확인
SELECT * FROM user_permissions WHERE user_id = [USER_ID];
-- 결과: 0 rows

-- 프로그램 삭제 확인
SELECT * FROM user_programs WHERE user_id = [USER_ID];
-- 결과: 0 rows

-- 사용량 초기화 확인
SELECT * FROM usage_tracking WHERE academy_id = [USER_ID];
-- 결과: current_students=0, ai_reports_used_this_month=0, etc.
```

## 배포 정보
- 배포 URL: https://superplace-academy.pages.dev
- 배포 시간: $(date)
- Git 커밋: 8f95f63

## 주의사항
- 플랜 회수는 되돌릴 수 없습니다
- 사용자는 즉시 모든 기능 접근 불가
- 캐시나 세션으로 인해 즉시 반영되지 않을 수 있음 (페이지 새로고침 필요)
