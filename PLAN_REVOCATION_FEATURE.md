# 🎯 플랜 회수 기능 추가 완료

## ✅ 배포 완료
- **배포 URL**: https://0027739c.superplace-academy.pages.dev
- **메인 URL**: https://superplace-academy.pages.dev
- **배포 시간**: 2026-01-20 01:30 UTC
- **빌드 크기**: 1,800.64 kB

## 🆕 추가된 기능

### 1. 플랜 회수 API
**엔드포인트**: `POST /api/admin/revoke-plan/:userId`

**기능**:
- 사용자의 모든 활성 구독을 만료 처리
- 사용자의 모든 권한을 비활성화
- 대시보드 기능 카드 자동 숨김

**응답 예시**:
```json
{
  "success": true,
  "message": "플랜이 회수되었습니다",
  "details": {
    "subscriptionsExpired": 1,
    "permissionsRevoked": 19
  }
}
```

### 2. 관리자 대시보드 UI

#### 플랜 회수 버튼
사용 한도 관리 모달에 **"플랜 회수"** 버튼 추가:
- 위치: 모달 하단 왼쪽
- 색상: 빨간색 (경고색)
- 아이콘: 🚫 (ban icon)

#### 확인 다이얼로그
플랜 회수 시 상세한 경고 메시지 표시:
```
⚠️ 정말 [사용자명]님의 플랜을 회수하시겠습니까?

회수 시:
• 모든 구독이 만료 처리됩니다
• 모든 권한이 비활성화됩니다
• 대시보드 기능 카드가 숨겨집니다

이 작업은 되돌릴 수 없습니다.
```

#### 성공 메시지
회수 완료 시 결과 표시:
```
✅ 플랜이 성공적으로 회수되었습니다!

• 만료된 구독: 1개
• 비활성화된 권한: 19개
```

## 🔧 기술 구현

### 백엔드 (API)
```javascript
app.post('/api/admin/revoke-plan/:userId', async (c) => {
  // 1. 사용자 확인
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, academy_id FROM users WHERE id = ?'
  ).bind(userId).first()
  
  // 2. 모든 활성 구독 만료
  await c.env.DB.prepare(`
    UPDATE subscriptions 
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE academy_id = ? AND status = 'active'
  `).bind(academyId).run()
  
  // 3. 모든 권한 비활성화
  await c.env.DB.prepare(`
    UPDATE user_permissions 
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run()
  
  return c.json({ success: true, ... })
})
```

### 프론트엔드 (UI)
```javascript
async function revokePlan() {
  // 1. 확인 다이얼로그
  if (!confirm('⚠️ 정말 플랜을 회수하시겠습니까?...')) {
    return;
  }
  
  // 2. API 호출
  const response = await fetch(
    '/api/admin/revoke-plan/' + currentUsageUserId, 
    { method: 'POST' }
  )
  
  // 3. 결과 표시
  if (data.success) {
    alert('✅ 플랜이 성공적으로 회수되었습니다!')
    window.location.reload()
  }
}
```

## 📊 작동 방식

### 플랜 회수 흐름:
```
관리자 대시보드
    ↓
사용 한도 관리 모달 열기
    ↓
"플랜 회수" 버튼 클릭
    ↓
확인 다이얼로그 표시
    ↓
사용자 확인 → 확인 클릭
    ↓
POST /api/admin/revoke-plan/:userId
    ↓
1. subscriptions.status = 'expired'
2. user_permissions.is_active = 0
    ↓
성공 메시지 표시
    ↓
페이지 새로고침 → 업데이트된 상태 표시
```

### 사용자에게 미치는 영향:
```
플랜 회수 전:
✅ 활성 구독 표시
✅ 4개 기능 카드 표시
✅ 모든 기능 사용 가능

플랜 회수 후:
❌ 구독 만료 표시
❌ 기능 카드 숨김
❌ 모든 기능 사용 불가
```

## 🧪 테스트 시나리오

### 시나리오 1: 정상 회수
1. 관리자 로그인
2. 사용자 목록에서 대상 사용자 선택
3. "사용 한도 관리" 클릭
4. "플랜 회수" 버튼 클릭
5. 확인 다이얼로그에서 "확인" 클릭
6. ✅ 성공 메시지 확인
7. 해당 사용자 로그인 → 구독 만료 확인

### 시나리오 2: 회수 취소
1. "플랜 회수" 버튼 클릭
2. 확인 다이얼로그에서 "취소" 클릭
3. ✅ 아무 변화 없음 (플랜 유지)

### 시나리오 3: 이미 만료된 플랜
1. 만료된 플랜을 가진 사용자 선택
2. "플랜 회수" 클릭
3. ✅ "만료된 구독: 0개" 표시 (정상)

## 📝 사용 방법

### 관리자 작업 순서:

#### 1. 관리자 대시보드 접속
```
https://superplace-academy.pages.dev/admin/dashboard
```

#### 2. 사용자 선택
- 사용자 목록에서 플랜을 회수할 사용자 찾기
- "사용 한도 관리" 버튼 클릭

#### 3. 플랜 회수 실행
- 모달 하단 왼쪽의 빨간색 "플랜 회수" 버튼 클릭
- 확인 다이얼로그 내용 확인
- "확인" 버튼 클릭

#### 4. 결과 확인
- 성공 메시지에서 회수된 구독/권한 개수 확인
- 자동 새로고침 후 사용자 상태 업데이트 확인

## 🔗 관련 기능

### 1. 플랜 설정 (기존)
- **엔드포인트**: `POST /api/admin/usage/:userId/update-limits`
- **기능**: 플랜 부여 및 권한 자동 부여

### 2. 플랜 회수 (신규)
- **엔드포인트**: `POST /api/admin/revoke-plan/:userId`
- **기능**: 플랜 만료 및 권한 자동 환수

### 3. 자동 만료 (기존)
- **트리거**: `/api/subscriptions/status` 호출 시
- **기능**: 만료일 체크 후 자동 만료 및 권한 환수

## ⚠️ 주의사항

### 1. 되돌릴 수 없음
- 플랜 회수는 **즉시 실행**됩니다
- **되돌리기 불가능**합니다
- 다시 부여하려면 새로 플랜을 설정해야 합니다

### 2. 즉시 적용
- 회수 즉시 사용자의 모든 권한이 비활성화됩니다
- 현재 로그인 중이더라도 다음 페이지 로드 시 적용됩니다

### 3. 데이터 유지
- **사용자 데이터는 삭제되지 않습니다**
- 학생 정보, 랜딩페이지 등은 그대로 유지됩니다
- 다시 플랜을 부여하면 이전 데이터를 계속 사용할 수 있습니다

## 🎯 사용 사례

### 1. 체험 기간 종료
```
체험 플랜 (7일) → 기간 종료 → 관리자가 수동 회수
```

### 2. 위반 조치
```
정책 위반 사용자 → 즉시 플랜 회수 → 계정 정지
```

### 3. 요금 미납
```
요금 미납 → 플랜 회수 → 결제 완료 시 재부여
```

### 4. 계약 해지
```
계약 해지 요청 → 플랜 회수 → 데이터는 보관
```

## 📊 통계 및 로그

### 회수 시 기록되는 정보:
- 회수 시간 (`updated_at`)
- 만료된 구독 개수
- 비활성화된 권한 개수

### 로그 확인:
```javascript
console.log('[Admin] Revoking plan for user:', userId)
console.log('[Admin] Subscriptions expired:', updateResult.meta.changes)
console.log('[Admin] Permissions revoked:', revokeResult.meta.changes)
```

## 🔗 중요 링크

- **관리자 대시보드**: https://superplace-academy.pages.dev/admin/dashboard
- **메인 사이트**: https://superplace-academy.pages.dev
- **최신 배포**: https://0027739c.superplace-academy.pages.dev

## 📅 변경 이력

### 2026-01-20 01:30 UTC
- ✅ 플랜 회수 API 추가
- ✅ 관리자 UI에 플랜 회수 버튼 추가
- ✅ 확인 다이얼로그 및 성공 메시지 구현
- ✅ 배포 완료

---

**Status**: ✅ **완료 및 배포됨**
**Commit**: `bcbb1e7` - "feat: add plan revocation feature for admin"
**Last Updated**: 2026-01-20 01:30 UTC
