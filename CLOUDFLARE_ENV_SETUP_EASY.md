# 🔧 Cloudflare 환경 변수 설정 가이드 (비개발자용)

## 📌 왜 이 설정이 필요한가요?

현재 **로컬 개발 서버에서는 SMS가 정상 작동**하지만,  
실제 웹사이트 (https://superplace-academy.pages.dev)에서는 **"인증오류입니다."** 라는 메시지가 나옵니다.

이는 **알리고 SMS API 인증 정보**가 웹사이트에 설정되지 않았기 때문입니다.

**이 가이드를 따라하시면 5분 안에 해결됩니다!** ✅

---

## 🎯 설정할 내용

아래 두 개의 정보를 Cloudflare에 입력하면 됩니다:

```
ALIGO_API_KEY: 4bbi3l27pb5qh11tkujl578bttz6vb5j
ALIGO_USER_ID: wangholy
```

---

## 📖 단계별 설정 방법 (스크린샷 포함)

### 1단계: Cloudflare 로그인하기

1. 브라우저를 열고 다음 주소로 이동하세요:
   ```
   https://dash.cloudflare.com
   ```

2. 로그인하세요 (이메일과 비밀번호 입력)

---

### 2단계: 프로젝트 찾기

1. 로그인 후, 왼쪽 메뉴에서 **"Workers & Pages"** 클릭
   
2. 프로젝트 목록에서 **"superplace-academy"** 찾아서 클릭

---

### 3단계: 설정 페이지로 이동

1. 상단 탭 메뉴에서 **"Settings"** (설정) 클릭

2. 왼쪽 사이드바에서 **"Environment variables"** (환경 변수) 찾기
   - 스크롤을 내려야 보일 수 있습니다

---

### 4단계: 첫 번째 변수 추가하기

1. **"Add variable"** (변수 추가) 버튼 클릭

2. 다음 정보를 입력하세요:

   **Variable name (변수 이름):**
   ```
   ALIGO_API_KEY
   ```
   
   **Value (값):**
   ```
   4bbi3l27pb5qh11tkujl578bttz6vb5j
   ```

3. **Environment (환경):**
   - ✅ **Production** 체크
   - ☐ Preview 체크 안 함 (선택사항)

4. **Encrypt 옵션:**
   - ✅ **"Encrypt"** 체크 (보안을 위해 권장)

5. **"Add variable"** 버튼 클릭하여 저장

---

### 5단계: 두 번째 변수 추가하기

1. 다시 **"Add variable"** (변수 추가) 버튼 클릭

2. 다음 정보를 입력하세요:

   **Variable name (변수 이름):**
   ```
   ALIGO_USER_ID
   ```
   
   **Value (값):**
   ```
   wangholy
   ```

3. **Environment (환경):**
   - ✅ **Production** 체크
   - ☐ Preview 체크 안 함 (선택사항)

4. **Encrypt 옵션:**
   - ☐ **"Encrypt"** 체크 안 함 (일반 텍스트로 저장)

5. **"Add variable"** 버튼 클릭하여 저장

---

### 6단계: 변경사항 확인하기

Environment variables 페이지에서 다음 두 개가 보여야 합니다:

```
✅ ALIGO_API_KEY: ******************** (encrypted)
✅ ALIGO_USER_ID: wangholy
```

---

### 7단계: 웹사이트 재배포하기

변수를 추가했다면, **웹사이트를 다시 배포**해야 합니다.

#### 옵션 1: Cloudflare에서 재배포 (권장)

1. 상단 탭 메뉴에서 **"Deployments"** (배포) 클릭

2. 가장 위에 있는 최신 배포 항목 찾기

3. 오른쪽 끝에 있는 **"..." (점 3개)** 버튼 클릭

4. **"Retry deployment"** (재배포) 클릭

5. 확인 팝업이 뜨면 **"Retry deployment"** 다시 클릭

6. ⏱️ **2-3분 정도 기다리세요** (배포 진행 중)

7. 배포 상태가 **"Success"** (성공)로 바뀌면 완료!

#### 옵션 2: GitHub를 통한 자동 배포

GitHub에 푸시하면 자동으로 배포됩니다 (이미 최신 코드가 푸시되어 있음).

---

### 8단계: SMS 발송 테스트하기

1. 브라우저에서 다음 주소로 이동:
   ```
   https://superplace-academy.pages.dev/sms/compose
   ```

2. 로그인하세요

3. SMS 작성 페이지에서:
   - **발신번호**: 010-8739-9697 선택
   - **수신번호**: 테스트할 전화번호 입력
   - **메시지**: 원하는 메시지 작성

4. **"발송"** 버튼 클릭

5. ✅ **"문자 발송이 완료되었습니다."** 메시지가 나오면 성공!

---

## ⚠️ 주의사항

### "Deployments" 탭이 안 보이는 경우

일부 Cloudflare 계정에서는 Deployments 탭이 다른 위치에 있을 수 있습니다.

**대체 방법:**

1. **"View details"** 또는 **"Manage deployment"** 버튼 찾기
2. 프로젝트 대시보드에서 **최신 배포 날짜/시간** 클릭
3. **"Redeploy"** 또는 **"Retry"** 버튼 찾기

또는:

1. 상단의 **프로젝트 이름** (superplace-academy) 클릭
2. **"Production"** 섹션 찾기
3. **"View deployment"** → **오른쪽 상단의 "..." 메뉴** → **"Retry deployment"**

---

## 🔍 설정이 제대로 되었는지 확인하는 방법

### 방법 1: 웹사이트에서 직접 확인

```
https://superplace-academy.pages.dev/sms/compose
```
- 로그인 후 SMS 발송 테스트
- ✅ "문자 발송이 완료되었습니다." → 성공!
- ❌ "인증오류입니다." → 환경 변수가 아직 적용 안 됨 (재배포 필요)

### 방법 2: 개발자 도구로 확인 (선택사항)

1. 웹사이트 열기: https://superplace-academy.pages.dev
2. **F12** 키를 눌러 개발자 도구 열기
3. **Console** 탭 클릭
4. 다음 코드 붙여넣기 후 **Enter**:
   ```javascript
   fetch('https://superplace-academy.pages.dev/api/sms/send', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       userId: 1,
       senderId: 1,
       receivers: [{phone: "010-8739-9697", name: "테스트"}],
       message: "[테스트] SMS API 확인"
     })
   }).then(r => r.json()).then(d => console.log(d))
   ```
5. 결과 확인:
   - ✅ `success: true` → 환경 변수 설정 성공!
   - ❌ `error: "인증오류입니다."` → 환경 변수 미적용 (재배포 필요)

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1: 환경 변수를 추가했는데도 여전히 "인증오류입니다."가 나와요.

**A:** 재배포를 하지 않았을 가능성이 높습니다.

**해결 방법:**
1. Cloudflare → Deployments → 최신 배포 → "..." → "Retry deployment"
2. 2-3분 기다린 후 다시 테스트

### Q2: "Deployments" 탭을 찾을 수 없어요.

**A:** Cloudflare UI가 계정마다 다를 수 있습니다.

**해결 방법:**
1. 프로젝트 대시보드에서 **"Production"** 섹션 찾기
2. **"View deployment"** 클릭
3. 오른쪽 상단 **"..."** 메뉴에서 **"Retry"** 찾기

또는 개발자에게 다음 명령어 실행 요청:
```bash
git commit --allow-empty -m "deploy: 환경 변수 설정 후 재배포"
git push origin main
```

### Q3: ALIGO_API_KEY를 Encrypt(암호화) 해야 하나요?

**A:** 권장하지만 필수는 아닙니다.

- ✅ **Encrypt 체크**: API 키가 암호화되어 안전하게 저장됨 (권장)
- ☐ **Encrypt 체크 안 함**: 평문으로 저장되지만 작동은 정상

보안을 위해 **Encrypt를 체크하는 것을 권장**합니다.

### Q4: ALIGO_USER_ID도 Encrypt 해야 하나요?

**A:** 필요 없습니다.

- ALIGO_USER_ID는 공개 정보이므로 암호화하지 않아도 됩니다.
- 단순 사용자 ID이므로 평문으로 저장해도 안전합니다.

### Q5: 설정 후 바로 작동하나요?

**A:** 재배포 후 2-3분 정도 기다려야 합니다.

**타임라인:**
1. 환경 변수 추가: 즉시
2. 재배포 시작: 즉시
3. ⏱️ 배포 완료: 2-3분 소요
4. ✅ SMS 발송 가능: 배포 완료 후

### Q6: Production과 Preview의 차이는 뭔가요?

**A:**
- **Production**: 실제 웹사이트 (https://superplace-academy.pages.dev)
- **Preview**: 테스트용 임시 URL (보통 사용 안 함)

**일반적으로 Production만 체크하면 됩니다.**

---

## 📞 도움이 필요하신가요?

### 스크린샷 찍어서 보내주세요

설정 중 문제가 생기면 다음 스크린샷을 찍어서 개발자에게 보내주세요:

1. **Environment variables 페이지** 스크린샷
2. **Deployments 페이지** 스크린샷 (배포 상태 포함)
3. **에러 메시지** 스크린샷 (발생 시)

---

## ✅ 완료 체크리스트

설정을 완료하셨다면 다음을 확인해주세요:

- [ ] Cloudflare 로그인 완료
- [ ] superplace-academy 프로젝트 찾기 완료
- [ ] Settings → Environment variables 페이지 접속 완료
- [ ] ALIGO_API_KEY 변수 추가 완료 (Encrypt 체크)
- [ ] ALIGO_USER_ID 변수 추가 완료
- [ ] 두 개의 변수가 목록에 표시됨 확인 완료
- [ ] Retry deployment 실행 완료
- [ ] 2-3분 대기 완료
- [ ] 배포 상태 "Success" 확인 완료
- [ ] SMS 발송 테스트 완료
- [ ] "문자 발송이 완료되었습니다." 메시지 확인 완료

**모든 항목에 체크가 되었다면 설정이 완료된 것입니다!** 🎉

---

## 🔗 빠른 링크

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **SMS 발송 페이지**: https://superplace-academy.pages.dev/sms/compose
- **발신번호 관리**: https://superplace-academy.pages.dev/sms/sender
- **발송 내역**: https://superplace-academy.pages.dev/sms/history

---

## 📝 요약

1. ✅ Cloudflare 로그인
2. ✅ Workers & Pages → superplace-academy
3. ✅ Settings → Environment variables
4. ✅ Add variable (2개)
   - `ALIGO_API_KEY` = `4bbi3l27pb5qh11tkujl578bttz6vb5j` (Encrypt ✅)
   - `ALIGO_USER_ID` = `wangholy`
5. ✅ Deployments → Retry deployment
6. ⏱️ 2-3분 대기
7. ✅ SMS 발송 테스트

**이 7단계만 따라하시면 완료됩니다!** 🚀

---

**작성일**: 2026-01-15  
**대상**: 비개발자 사용자  
**난이도**: ⭐ 쉬움  
**예상 소요 시간**: 5-10분
