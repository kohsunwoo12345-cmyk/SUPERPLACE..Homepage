# 🔧 Cloudflare Pages 환경 변수 설정 가이드

## 📌 개요
SMS 문자 발송 기능을 사용하기 위해서는 Cloudflare Pages에 알리고 API 키를 환경 변수로 설정해야 합니다.

---

## 🔑 필요한 환경 변수

```bash
ALIGO_API_KEY=4bbi3l27pb5qh11tkujl578bttz6vb5j
ALIGO_USER_ID=wangholy
```

---

## 🚀 방법 1: Cloudflare Dashboard (가장 쉬움 - 권장)

### 1단계: Cloudflare Dashboard 접속
1. 브라우저에서 https://dash.cloudflare.com 접속
2. Cloudflare 계정으로 로그인

### 2단계: Pages 프로젝트 선택
1. 왼쪽 메뉴에서 **Workers & Pages** 클릭
2. **superplace-academy** 프로젝트 클릭

### 3단계: 환경 변수 설정
1. 상단 탭에서 **Settings** 클릭
2. 스크롤 내려서 **Environment variables** 섹션 찾기
3. **Production** 탭 선택 (또는 Preview도 같이 설정)

### 4단계: 변수 추가
**첫 번째 변수:**
- **Variable name**: `ALIGO_API_KEY`
- **Value**: `4bbi3l27pb5qh11tkujl578bttz6vb5j`
- **Encrypt** 체크박스 선택 (선택사항, 보안 강화)
- **Add variable** 버튼 클릭

**두 번째 변수:**
- **Variable name**: `ALIGO_USER_ID`
- **Value**: `wangholy`
- **Encrypt** 체크박스 선택 (선택사항)
- **Add variable** 버튼 클릭

### 5단계: 재배포
환경 변수는 다음 배포부터 적용됩니다. 즉시 적용하려면:

1. 상단 탭에서 **Deployments** 클릭
2. 최신 배포 항목의 **...** (더보기) 메뉴 클릭
3. **Retry deployment** 선택
4. 배포 완료 대기 (약 1-2분)

---

## 💻 방법 2: wrangler CLI (터미널)

### 1단계: wrangler 설치 확인
```bash
npx wrangler --version
```

### 2단계: Cloudflare 로그인
```bash
npx wrangler login
```
브라우저가 열리면 Cloudflare에 로그인하고 권한 승인

### 3단계: 환경 변수 설정
```bash
cd /home/user/webapp

# ALIGO_API_KEY 설정
npx wrangler pages secret put ALIGO_API_KEY --project-name=superplace-academy
# 프롬프트가 나타나면 입력: 4bbi3l27pb5qh11tkujl578bttz6vb5j

# ALIGO_USER_ID 설정
npx wrangler pages secret put ALIGO_USER_ID --project-name=superplace-academy
# 프롬프트가 나타나면 입력: wangholy
```

### 4단계: 환경 변수 확인
```bash
# 환경 변수 목록 확인 (값은 보안상 숨겨짐)
npx wrangler pages deployment tail --project-name=superplace-academy
```

---

## ✅ 설정 확인 방법

### 방법 1: 테스트 스크립트
```bash
cd /home/user/webapp
./test_full_flow.sh
```

예상 결과:
- ✅ SMS 발송: 성공!
- (또는 포인트 부족 메시지)

### 방법 2: API 직접 호출
```bash
curl -X POST "https://superplace-academy.pages.dev/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [
      {"name": "테스트", "phone": "010-8739-9697"}
    ],
    "message": "[테스트] 환경 변수 설정 확인"
  }'
```

**성공 응답:**
```json
{
  "success": true,
  "message": "문자 발송이 완료되었습니다.",
  "data": {
    "sentCount": 1,
    "failCount": 0
  }
}
```

**실패 응답 (환경 변수 미설정):**
```json
{
  "success": false,
  "error": "인증오류입니다.",
  "aligoError": {
    "result_code": -101,
    "message": "인증오류입니다."
  }
}
```

---

## 🔍 문제 해결

### Q1: 환경 변수를 설정했는데도 인증 오류가 발생해요
**A:** 환경 변수 설정 후 반드시 재배포해야 합니다.
- Deployments → 최신 배포의 "..." → Retry deployment

### Q2: wrangler 명령어가 실행되지 않아요
**A:** wrangler 버전을 확인하세요.
```bash
npx wrangler --version  # 최소 3.0 이상 필요
npm install -g wrangler@latest  # 업데이트
```

### Q3: 프로젝트 이름을 모르겠어요
**A:** 
- Dashboard에서 확인: Workers & Pages 메뉴
- 또는 wrangler.toml 파일 확인:
```bash
cat wrangler.toml | grep name
```

### Q4: 환경 변수가 제대로 설정되었는지 확인하고 싶어요
**A:** Dashboard에서 확인:
1. Workers & Pages → superplace-academy
2. Settings → Environment variables
3. Production 탭에서 변수 목록 확인
   - `ALIGO_API_KEY` ******* (값 숨김)
   - `ALIGO_USER_ID` ******* (값 숨김)

---

## 📖 추가 참고 자료

- [Cloudflare Pages 환경 변수 공식 문서](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [알리고 SMS API 문서](https://smartsms.aligo.in/admin/api/info.html)

---

## 🎯 빠른 체크리스트

설정이 완료되었는지 확인:
- [ ] Cloudflare Dashboard에 로그인 완료
- [ ] superplace-academy 프로젝트 찾음
- [ ] Settings → Environment variables 접속
- [ ] ALIGO_API_KEY 추가 완료
- [ ] ALIGO_USER_ID 추가 완료
- [ ] 재배포 (Retry deployment) 완료
- [ ] 테스트 스크립트로 SMS 발송 성공 확인

---

## 💡 보안 팁

1. **환경 변수는 암호화**: Encrypt 옵션을 항상 체크하세요
2. **API 키 노출 금지**: GitHub에 API 키를 절대 커밋하지 마세요
3. **정기적 변경**: API 키는 정기적으로 갱신하세요
4. **권한 최소화**: 필요한 권한만 부여하세요

---

## 📞 지원

문제가 계속되면:
1. `TROUBLESHOOTING_GUIDE.md` 참고
2. `test_full_flow.sh` 실행하여 상세 로그 확인
3. Cloudflare Dashboard의 Logs 탭에서 에러 로그 확인
