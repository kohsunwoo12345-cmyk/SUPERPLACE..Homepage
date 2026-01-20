# ✅ 플랜 회수 기능 수정 완료

## 🐛 발견된 문제
**오류 메시지**: `D1_ERROR: no such column: updated_at: SQLITE_ERROR`

### 원인 분석:
1. `user_permissions` 테이블에 `updated_at` 컬럼이 존재하지 않음
2. 플랜 회수 API에서 `updated_at` 컬럼 업데이트 시도
3. 자동 만료 처리에서도 동일한 문제 발생

### 테이블 스키마 확인:
```sql
-- user_permissions 테이블 (updated_at 없음)
CREATE TABLE user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_key TEXT NOT NULL,
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- ✅
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  -- updated_at 컬럼 없음 ❌
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(user_id, program_key)
)

-- subscriptions 테이블 (updated_at 있음)
CREATE TABLE subscriptions (
  ...
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- ✅
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- ✅
)
```

## 🔧 수정 내용

### 1. 플랜 회수 API 수정
**파일**: `src/index.tsx` (Line 7509-7513)

**Before**:
```javascript
await c.env.DB.prepare(`
  UPDATE user_permissions 
  SET is_active = 0, updated_at = CURRENT_TIMESTAMP  // ❌ 오류
  WHERE user_id = ?
`).bind(userId).run()
```

**After**:
```javascript
await c.env.DB.prepare(`
  UPDATE user_permissions 
  SET is_active = 0  // ✅ 수정
  WHERE user_id = ?
`).bind(userId).run()
```

### 2. 자동 만료 처리 수정
**파일**: `src/index.tsx` (Line 6850-6854)

**Before**:
```javascript
await c.env.DB.prepare(`
  UPDATE user_permissions 
  SET is_active = 0, updated_at = CURRENT_TIMESTAMP  // ❌ 오류
  WHERE user_id = ?
`).bind(user.id).run()
```

**After**:
```javascript
await c.env.DB.prepare(`
  UPDATE user_permissions 
  SET is_active = 0  // ✅ 수정
  WHERE user_id = ?
`).bind(user.id).run()
```

## ✅ 배포 완료
- **배포 URL**: https://c01f8aeb.superplace-academy.pages.dev
- **메인 URL**: https://superplace-academy.pages.dev
- **배포 시간**: 2026-01-20 01:45 UTC
- **Commit**: `3bc1937` - "fix: remove updated_at from user_permissions table queries"

## 🧪 테스트 방법

### 방법 1: API 직접 테스트 (관리자용)
```bash
# User 2 플랜 회수 테스트
curl -X POST 'https://superplace-academy.pages.dev/api/admin/revoke-plan/2' \
  -H 'Content-Type: application/json'

# 예상 결과:
{
  "success": true,
  "message": "플랜이 회수되었습니다",
  "details": {
    "subscriptionsExpired": 1,
    "permissionsRevoked": 19
  }
}
```

### 방법 2: 관리자 대시보드에서 테스트 (권장)

#### Step 1: 관리자 로그인
```
https://superplace-academy.pages.dev/login
```
- 관리자 계정으로 로그인

#### Step 2: 관리자 대시보드 접속
```
https://superplace-academy.pages.dev/admin/dashboard
```

#### Step 3: 테스트 사용자 선택
- 사용자 목록에서 **User 2 (superplace12@gmail.com)** 찾기
- 현재 상태: 활성 구독 있음 (관리자 설정 플랜)

#### Step 4: 사용 한도 관리 모달 열기
- "사용 한도 관리" 버튼 클릭
- 현재 플랜 정보 확인:
  - 플랜: 관리자 설정 플랜
  - 기간: 2026-01-20 ~ 2026-02-19
  - 한도: 학생 30, AI 리포트 30, 랜딩페이지 40, 선생님 2

#### Step 5: 플랜 회수 실행
1. 모달 하단 왼쪽의 빨간색 **"플랜 회수"** 버튼 클릭
2. 확인 다이얼로그 표시:
   ```
   ⚠️ 정말 고선우님의 플랜을 회수하시겠습니까?
   
   회수 시:
   • 모든 구독이 만료 처리됩니다
   • 모든 권한이 비활성화됩니다
   • 대시보드 기능 카드가 숨겨집니다
   
   이 작업은 되돌릴 수 없습니다.
   ```
3. **"확인"** 클릭

#### Step 6: 결과 확인
- 성공 메시지:
  ```
  ✅ 플랜이 성공적으로 회수되었습니다!
  
  • 만료된 구독: 1개
  • 비활성화된 권한: 19개
  ```
- 페이지 자동 새로고침

#### Step 7: 회수 후 상태 확인
1. User 2로 로그인:
   ```
   https://superplace-academy.pages.dev/login
   Email: superplace12@gmail.com
   ```

2. 대시보드 확인:
   - ❌ "구독 플랜이 없습니다" 메시지 표시
   - ❌ 4개 기능 카드 모두 숨김
   - ❌ 모든 기능 사용 불가

#### Step 8: 플랜 재부여 (복구 테스트)
1. 관리자 대시보드로 돌아가기
2. User 2의 "사용 한도 관리" 다시 클릭
3. 플랜 재설정:
   - 학생: 30
   - AI 리포트: 30
   - 랜딩페이지: 40
   - 선생님: 2
   - 구독 기간: 1개월
4. **"저장"** 클릭
5. User 2로 다시 로그인 → 기능 복구 확인

## 📊 검증 체크리스트

### 백엔드 검증:
- [x] `user_permissions` 테이블 스키마 확인
- [x] `updated_at` 컬럼 제거
- [x] 플랜 회수 API 수정
- [x] 자동 만료 처리 수정
- [x] 빌드 성공
- [x] 배포 완료

### API 테스트:
- [x] 존재하지 않는 사용자 (에러 처리 확인)
- [ ] 실제 사용자로 플랜 회수 테스트 (관리자 대시보드에서)
- [ ] 회수 후 권한 확인
- [ ] 회수 후 대시보드 확인
- [ ] 플랜 재부여 테스트

### UI 테스트:
- [ ] "플랜 회수" 버튼 표시 확인
- [ ] 확인 다이얼로그 표시 확인
- [ ] 성공 메시지 표시 확인
- [ ] 페이지 자동 새로고침 확인

## 🔍 디버깅 정보

### 로그 확인:
플랜 회수 시 서버 로그:
```
[Admin] Revoking plan for user: 2
[Admin] Subscriptions expired: 1
[Admin] Permissions revoked: 19
```

### 에러 발생 시:
1. 브라우저 콘솔 확인 (F12)
2. 네트워크 탭에서 API 응답 확인
3. 에러 메시지 스크린샷 공유

## 📝 추가 정보

### 데이터베이스 상태 확인:
```bash
# 구독 상태 확인
curl 'https://superplace-academy.pages.dev/api/debug/user/2/subscription' | jq

# 권한 상태 확인
curl 'https://superplace-academy.pages.dev/api/user/permissions?userId=2' | jq
```

### 예상 결과:
**회수 전**:
```json
{
  "subscriptions": {
    "active": {
      "status": "active",
      "plan_name": "관리자 설정 플랜"
    }
  }
}
```

**회수 후**:
```json
{
  "subscriptions": {
    "active": null
  }
}
```

## 🎯 최종 확인

### 테스트 필요:
실제로 **관리자 대시보드에서 플랜 회수 버튼을 클릭**하여 정상 작동하는지 확인해주세요.

### 예상 동작:
1. ✅ 에러 없이 회수 완료
2. ✅ 성공 메시지 표시
3. ✅ 사용자의 기능 카드 숨김
4. ✅ 사용자의 모든 권한 비활성화

---

**Status**: ✅ **수정 완료 및 배포됨**
**Next Step**: 🧪 **관리자 대시보드에서 실제 테스트 필요**
**Last Updated**: 2026-01-20 01:45 UTC
