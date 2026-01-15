# 🔧 문제 해결 가이드

## 1. 학생 목록이 학부모 소통 페이지에 표시되지 않는 경우

### ✅ 현재 상태
- **학생 등록 페이지**: https://superplace-academy.pages.dev/students/list
- **학부모 소통 페이지**: https://superplace-academy.pages.dev/tools/parent-message

### 🔍 문제 원인
학생 목록은 정상적으로 API에서 로드되고 있습니다. 브라우저 개발자 도구에서 확인 필요.

### ✅ 확인 방법

1. **학생 데이터 확인** (API 테스트)
```bash
curl "https://superplace-academy.pages.dev/api/students?academyId=1"
```

예상 응답:
```json
{
  "success": true,
  "students": [
    {
      "id": 1,
      "name": "홍길동",
      "grade": "중1",
      "class_name": "테스트반"
    }
  ]
}
```

2. **브라우저에서 확인**
   - https://superplace-academy.pages.dev/tools/parent-message 접속
   - F12 키로 개발자 도구 열기
   - Console 탭에서 에러 확인
   - Network 탭에서 `/api/students` 요청 확인

3. **localStorage 사용자 정보 확인**
   - 개발자 도구 → Application → Local Storage
   - `user` 키 확인 → `academy_id` 값이 1인지 확인

### 🔧 해결 방법

**방법 1: 로그인 후 사용**
```
1. https://superplace-academy.pages.dev/login 접속
2. 계정으로 로그인
3. 학부모 소통 페이지에서 본인 학원의 학생만 표시됨
```

**방법 2: 게스트 모드 (academy_id가 1인 학생만 표시)**
```javascript
// 개발자 도구 Console에서 실행
localStorage.setItem('user', JSON.stringify({
  id: 1,
  name: '테스트 사용자',
  academy_id: 1,
  role: 'user'
}));
location.reload();
```

---

## 2. SMS 문자 발송이 안 되는 경우

### 🔍 문제 원인
Cloudflare Pages 환경 변수에 알리고 API 키가 설정되지 않았을 가능성이 높습니다.

### ✅ 알리고 API 정보
```
API Key: 4bbi3l27pb5qh11tkujl578bttz6vb5j
사용자 ID: wangholy
발신번호: 010-8739-9697
```

### 🔧 Cloudflare Pages 환경 변수 설정 방법

#### 방법 1: Cloudflare Dashboard (권장)

1. **Cloudflare 대시보드 접속**
   - https://dash.cloudflare.com
   - 로그인

2. **Pages 프로젝트 선택**
   - Workers & Pages → superplace-academy 선택

3. **환경 변수 설정**
   - Settings 탭 클릭
   - Environment variables 섹션
   - `Production` 환경에 다음 변수 추가:

   ```
   ALIGO_API_KEY = 4bbi3l27pb5qh11tkujl578bttz6vb5j
   ALIGO_USER_ID = wangholy
   ```

4. **재배포**
   - Deployments 탭
   - 최신 배포의 "..." 메뉴 클릭
   - "Retry deployment" 선택

#### 방법 2: wrangler CLI

```bash
cd /home/user/webapp

# Production 환경 변수 설정
npx wrangler pages secret put ALIGO_API_KEY --project-name=superplace-academy
# 입력 프롬프트에서: 4bbi3l27pb5qh11tkujl578bttz6vb5j

npx wrangler pages secret put ALIGO_USER_ID --project-name=superplace-academy  
# 입력 프롬프트에서: wangholy
```

### ✅ SMS 발송 테스트

#### 1. 발신번호 등록 확인
```bash
# 발신번호 목록 조회
curl -X GET "https://superplace-academy.pages.dev/api/sms/senders" \
  -H "X-User-Id: 1"
```

#### 2. 발신번호가 없으면 등록
```bash
# 발신번호 등록 (알리고에서 인증 완료된 번호)
curl -X POST "https://superplace-academy.pages.dev/api/sms/sender/register" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "phoneNumber": "010-8739-9697",
    "verificationMethod": "aligo_website"
  }'
```

#### 3. SMS 발송 테스트
```bash
curl -X POST "https://superplace-academy.pages.dev/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [
      {"name": "테스트", "phone": "010-8739-9697"}
    ],
    "message": "[테스트] SMS 발송 테스트입니다!"
  }'
```

#### 예상 성공 응답:
```json
{
  "success": true,
  "message": "문자 발송이 완료되었습니다.",
  "data": {
    "sentCount": 1,
    "failCount": 0,
    "msgType": "SMS",
    "successList": [{"phone": "010-8739-9697", "status": "success"}]
  }
}
```

#### 예상 실패 응답 (환경 변수 없음):
```json
{
  "success": false,
  "error": "알리고 API 호출 실패",
  "aligoError": "인증 실패"
}
```

---

## 3. 웹 UI에서 SMS 발송

### 📱 자동 문자 발송 페이지
https://superplace-academy.pages.dev/tools/sms

**사용 방법:**
1. 로그인
2. 자동 문자 발송 메뉴 클릭
3. 발신번호 선택 (010-8739-9697)
4. 수신자 선택 (학생 목록에서)
5. 메시지 작성
6. 발송 버튼 클릭

**주의사항:**
- 포인트가 충분한지 확인 (SMS: 20원/건, LMS: 50원/건)
- 발신번호가 인증되어 있는지 확인
- 환경 변수가 설정되어 있는지 확인

---

## 4. 포인트 충전

### 포인트 잔액 확인
```bash
curl "https://superplace-academy.pages.dev/api/user/profile" \
  -H "X-User-Id: 1"
```

### 포인트 수동 충전 (관리자)
```bash
# DB에 직접 업데이트 (Cloudflare D1 Dashboard)
UPDATE users SET balance = 10000 WHERE id = 1;
```

---

## 5. 빠른 체크리스트

- [ ] 학생이 등록되어 있나요? (https://superplace-academy.pages.dev/students/list)
- [ ] 로그인이 되어 있나요?
- [ ] localStorage에 user 정보가 있나요?
- [ ] Cloudflare 환경 변수가 설정되어 있나요? (ALIGO_API_KEY, ALIGO_USER_ID)
- [ ] 발신번호가 등록되어 있나요? (010-8739-9697)
- [ ] 포인트 잔액이 충분한가요?
- [ ] 브라우저 개발자 도구에서 에러가 있나요?

---

## 6. 추가 지원

문제가 계속되면:
1. 브라우저 개발자 도구 Console 탭의 에러 메시지 확인
2. Network 탭에서 실패한 API 요청 확인
3. Response 탭에서 에러 내용 확인

**자주 발생하는 오류:**
- `로그인이 필요합니다` → 로그인 또는 localStorage 설정
- `발신번호를 찾을 수 없습니다` → 발신번호 등록 필요
- `포인트가 부족합니다` → 포인트 충전 필요
- `알리고 API 호출 실패` → 환경 변수 설정 필요
