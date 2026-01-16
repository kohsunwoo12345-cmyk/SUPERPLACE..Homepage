# 🚨 SMS 발송 인증 오류 - IP 제한 문제

## 📋 문제 요약

**에러 메시지:**
```json
{
  "success": false,
  "error": "인증오류입니다.-IP",
  "aligoError": {
    "result_code": -101,
    "message": "인증오류입니다.-IP"
  }
}
```

**원인:**
- 알리고 API에서 **IP 주소 제한**이 설정되어 있음
- Cloudflare Pages의 IP는 계속 변경되므로 고정 IP를 허용할 수 없음

---

## ✅ 해결 방법

### 1. 알리고 웹사이트에서 IP 제한 해제

1. **알리고 웹사이트 접속**
   ```
   https://smartsms.aligo.in/
   ```

2. **로그인**
   - 아이디: `wangholy`
   - 비밀번호: (귀하의 비밀번호)

3. **보안 설정 > API 설정**
   - 메뉴: `설정` → `보안 설정` → `API 설정`
   - 또는 직접 접속: https://smartsms.aligo.in/admin/api.html

4. **IP 제한 해제**
   ```
   [ ] IP 제한 사용 (체크 해제)
   
   또는
   
   [x] 모든 IP 허용
   ```

5. **저장 및 적용**

---

## 🧪 해결 후 테스트 방법

### 웹 브라우저에서 테스트

1. **페이지 접속**
   ```
   https://superplace-academy.pages.dev/sms/compose
   ```

2. **개발자 도구 (F12) 열기**

3. **Console에 아래 코드 붙여넣기**
   ```javascript
   // 로그인 우회
   localStorage.setItem('user', JSON.stringify({
     id: 1,
     name: '관리자',
     academy_id: 1,
     role: 'admin'
   }));
   location.reload();
   ```

4. **SMS 발송**
   - 발신번호: `010-8739-9697`
   - 수신번호: 테스트할 번호 입력
   - 메시지: 내용 작성
   - **발송 버튼 클릭**

---

### API로 직접 테스트

```bash
curl -X POST https://superplace-academy.pages.dev/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [{"phone": "010-8739-9697", "name": "테스트"}],
    "message": "[테스트] SMS 발송 테스트"
  }'
```

**성공 응답:**
```json
{
  "success": true,
  "message": "문자 발송이 완료되었습니다.",
  "sentCount": 1,
  "totalCost": 20
}
```

---

## 📞 알리고 고객센터

IP 제한 설정을 찾을 수 없는 경우:

- **전화**: 1522-5179
- **시간**: 평일 09:00-18:00
- **문의**: "API IP 제한을 해제하고 싶습니다"

---

## 🔍 현재 상태

✅ **완료:**
- wrangler.toml 환경 변수 설정
- src/index.tsx fallback 값 수정
- 빌드 및 배포 완료
- 프로덕션 URL 정상 작동

⚠️ **대기 중:**
- 알리고 API IP 제한 해제

---

## 📝 최종 확인 체크리스트

- [ ] 알리고 웹사이트 로그인
- [ ] API 설정에서 IP 제한 해제
- [ ] 프로덕션 URL에서 SMS 발송 테스트
- [ ] 성공 메시지 확인

---

**작성일:** 2026-01-16  
**커밋:** b31c9e2  
**프로덕션 URL:** https://superplace-academy.pages.dev/sms/compose
