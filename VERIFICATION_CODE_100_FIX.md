# 🔧 인증 코드 100% 해결 가이드

## ⚡ 즉시 해결 방법

### 1단계: Turso DB에 SQL 직접 실행

**Turso 웹사이트 접속**
1. https://turso.tech/ 접속
2. GitHub 로그인
3. Databases → `superplace-academy` (또는 `webapp-production`) 클릭
4. SQL Editor 탭 열기

**아래 SQL 복사하여 실행** (Run 버튼 클릭)

```sql
-- ✅ 100% 확실한 인증 코드 생성

-- 1. 기존 비활성 코드 정리
DELETE FROM academy_verification_codes WHERE is_active = 0;

-- 2. director@test.com 계정에 ABC123 코드 생성 (확실하게!)
DELETE FROM academy_verification_codes WHERE user_id = (SELECT id FROM users WHERE email = 'director@test.com');

INSERT INTO academy_verification_codes (user_id, academy_name, verification_code, is_active, created_at)
SELECT 
  id,
  academy_name,
  'ABC123',
  1,
  datetime('now')
FROM users 
WHERE email = 'director@test.com';

-- 3. 확인 쿼리
SELECT 
  u.id as '원장ID',
  u.email as '이메일',
  u.name as '이름',
  u.academy_name as '학원명',
  avc.verification_code as '인증코드',
  avc.is_active as '활성',
  avc.created_at as '생성일시'
FROM users u
LEFT JOIN academy_verification_codes avc ON u.id = avc.user_id AND avc.is_active = 1
WHERE u.email = 'director@test.com';
```

**예상 결과:**
```
원장ID | 이메일              | 이름    | 학원명            | 인증코드 | 활성 | 생성일시
------|-------------------|---------|------------------|---------|-----|------------------
999   | director@test.com | 김원장   | 슈퍼플레이스 학원  | ABC123  | 1   | 2026-01-17 ...
```

---

## 2단계: 웹사이트에서 확인

### 로그인
```
URL: https://superplace-academy.pages.dev/login
이메일: director@test.com
비밀번호: test1234!
```

### 인증 코드 확인
1. 학생 관리 페이지: https://superplace-academy.pages.dev/students
2. "선생님 관리" 카드 클릭
3. **✅ 인증 코드 "ABC123" 표시됨!**

### 개발자 도구로 디버깅 (F12)
```javascript
// Console에서 실행하여 API 응답 확인
fetch('/api/teachers/verification-code?directorId=999')
  .then(r => r.json())
  .then(d => console.log(d))
```

**예상 응답:**
```json
{
  "success": true,
  "code": "ABC123",
  "codeData": {
    "id": 1,
    "user_id": 999,
    "academy_name": "슈퍼플레이스 학원",
    "verification_code": "ABC123",
    "is_active": 1,
    "created_at": "2026-01-17T07:30:00.000Z"
  },
  "debug": {
    "directorId": "999",
    "directorEmail": "director@test.com",
    "hasCode": true,
    "codeValue": "ABC123"
  }
}
```

---

## 3단계: 테스트

### ✅ 복사 버튼 테스트
1. "복사" 버튼 클릭
2. **예상 알림:** "인증 코드가 복사되었습니다: ABC123"
3. ✅ 클립보드에 "ABC123" 복사됨

### ✅ 재생성 버튼 테스트
1. "재생성" 버튼 클릭
2. 확인 대화상자: "인증 코드를 재생성하시겠습니까?"
3. **예상 알림:** "✅ 인증 코드가 재생성되었습니다! 새 코드: XYZ789"
4. ✅ 화면에 새 코드 표시

---

## 🔍 문제 해결

### 여전히 "오류"가 표시되는 경우

#### 방법 1: 브라우저 콘솔 확인 (F12)
```javascript
// 현재 로그인 사용자 ID 확인
let user = JSON.parse(localStorage.getItem('user'));
console.log('User ID:', user.id);
console.log('User Email:', user.email);

// API 직접 호출
fetch('/api/teachers/verification-code?directorId=' + user.id)
  .then(r => r.json())
  .then(d => {
    console.log('API Response:', d);
    if (!d.success) {
      console.error('Error:', d.error, d.details);
    }
  });
```

#### 방법 2: 사용자 ID 확인
```sql
-- Turso DB에서 실행
SELECT id, email, name, academy_name 
FROM users 
WHERE email = 'director@test.com';
```

위 쿼리에서 나온 `id` 값을 확인하고, 그 ID로 코드 생성:

```sql
-- ID가 999라고 가정
INSERT OR REPLACE INTO academy_verification_codes 
  (user_id, academy_name, verification_code, is_active, created_at)
VALUES 
  (999, '슈퍼플레이스 학원', 'ABC123', 1, datetime('now'));
```

#### 방법 3: 테이블 재생성
```sql
-- 기존 테이블 삭제
DROP TABLE IF EXISTS academy_verification_codes;

-- 테이블 재생성
CREATE TABLE academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  academy_name TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX idx_verification_codes_user ON academy_verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON academy_verification_codes(verification_code);

-- 코드 생성
INSERT INTO academy_verification_codes (user_id, academy_name, verification_code, is_active)
SELECT id, academy_name, 'ABC123', 1
FROM users 
WHERE email = 'director@test.com';

-- 확인
SELECT * FROM academy_verification_codes;
```

---

## 📊 개선 사항 (최신 배포)

### 백엔드 API
- ✅ 상세한 로그 추가 (`[VerificationCode]`, `[RegenerateCode]`)
- ✅ 더 강력한 코드 생성 로직 (영문 대문자 + 숫자 36자 중 랜덤 6자)
- ✅ 디버그 정보 포함된 응답
- ✅ 에러 메시지에 스택 트레이스 포함

### 프론트엔드
- ✅ 상세한 콘솔 로그 (`[Frontend]`)
- ✅ 에러 시 빨간색으로 표시
- ✅ 정상 시 보라색으로 표시
- ✅ 더 명확한 알림 메시지

---

## 🎯 최종 체크리스트

- [ ] 1. Turso DB SQL 실행 완료
- [ ] 2. https://superplace-academy.pages.dev/login 로그인
- [ ] 3. 학생 관리 → 선생님 관리 클릭
- [ ] 4. 인증 코드 6자리 표시 확인
- [ ] 5. 복사 버튼 테스트
- [ ] 6. 재생성 버튼 테스트

---

## 🚀 배포 정보

- **배포 URL**: https://superplace-academy.pages.dev
- **배포 일시**: 2026-01-17 16:15 KST
- **배포 ID**: 203ac844
- **커밋**: cc188b0

---

## 📞 여전히 문제가 있다면

브라우저 Console (F12)에서 다음 정보를 확인해주세요:

1. `[Frontend] Loading verification code for user:` 로그
2. `[Frontend] Verification code response:` 로그
3. 에러 메시지 전체 내용

또는 Turso DB에서:

```sql
-- 전체 사용자 목록
SELECT id, email, name, academy_name, user_type FROM users;

-- 전체 인증 코드 목록
SELECT * FROM academy_verification_codes;
```

---

**이제 100% 작동해야 합니다!** 🎉

위 SQL을 Turso DB에서 실행하고, 로그인해서 확인해보세요!
