# 🔑 Cloudflare Pages 환경 변수 설정 가이드

## ✅ 완료된 작업

1. ✅ 구글 API 키 설정 완료
2. ✅ 코드에 환경 변수 적용 완료
3. ✅ 빌드 성공
4. ✅ GitHub 푸시 완료

---

## 📝 Cloudflare Pages 환경 변수 설정 방법

### 방법 1: Cloudflare 대시보드에서 설정 (권장)

#### 1단계: Cloudflare Pages 대시보드 접속
https://dash.cloudflare.com

#### 2단계: 프로젝트 선택
- **Pages** 메뉴 클릭
- **superplace** 프로젝트 선택

#### 3단계: 환경 변수 설정
- **Settings** 탭 클릭
- **Environment variables** 섹션으로 스크롤
- **Add variable** 버튼 클릭

#### 4단계: 변수 추가

**변수 1: GOOGLE_CLIENT_ID**
- Variable name: `GOOGLE_CLIENT_ID`
- Value: `AIzaSyCIaXrFwei8kcC8dgzIrvVx_7zCi86vXhw`
- Environment: **Production** ✓ **Preview** ✓
- **Add variable** 클릭

**변수 2: KAKAO_JS_KEY** (카카오 JavaScript 키 발급 후)
- Variable name: `KAKAO_JS_KEY`
- Value: `YOUR_KAKAO_JS_KEY_HERE`
- Environment: **Production** ✓ **Preview** ✓
- **Add variable** 클릭

#### 5단계: 재배포
- 환경 변수 설정 후 자동으로 재배포됩니다
- 또는 **Deployments** 탭에서 **Retry deployment** 클릭

---

### 방법 2: Wrangler CLI로 설정

**1. Cloudflare API 토큰 설정**
```bash
# Deploy 탭에서 Cloudflare API 토큰 설정
```

**2. 환경 변수 설정**
```bash
# Google API 키 설정
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name superplace
# 프롬프트에 입력: AIzaSyCIaXrFwei8kcC8dgzIrvVx_7zCi86vXhw

# Kakao JavaScript 키 설정 (발급 후)
npx wrangler pages secret put KAKAO_JS_KEY --project-name superplace
# 프롬프트에 카카오 JS 키 입력
```

**3. 배포**
```bash
npm run build
npx wrangler pages deploy dist --project-name superplace
```

---

## 🎯 카카오 JavaScript 키 발급 방법

### ⚠️ 중요: 현재 받으신 카카오 토큰은 Access Token입니다

원장님이 주신 토큰:
```
JC9mJsPMTO8AY4s1gJeUjeL2IG50YL5ZAAAAAQoXFO4AAAGbtuzTSf8D-j8FVvr5
```

이것은 **사용자의 Access Token**이며, **앱의 JavaScript 키가 아닙니다**.

### JavaScript 키 발급 절차:

#### 1. Kakao Developers 접속
https://developers.kakao.com/

#### 2. 내 애플리케이션 선택
- 좌측 메뉴에서 **내 애플리케이션** 클릭
- 기존 앱 선택 또는 **애플리케이션 추가하기**

#### 3. JavaScript 키 확인
- **앱 설정** > **앱 키** 메뉴
- **JavaScript 키** 복사
  - 형식: 32자리 영문자+숫자 (예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

#### 4. 플랫폼 설정
- **앱 설정** > **플랫폼** 메뉴
- **Web 플랫폼 등록** 클릭
- 사이트 도메인 추가:
  ```
  https://superplace-academy.pages.dev
  http://localhost:3000
  ```

#### 5. 카카오 로그인 활성화
- **제품 설정** > **카카오 로그인** 메뉴
- **활성화 설정** ON으로 변경
- **Redirect URI** 등록:
  ```
  https://superplace-academy.pages.dev/login
  http://localhost:3000/login
  ```

#### 6. 동의항목 설정
- **제품 설정** > **카카오 로그인** > **동의항목**
- **닉네임**: 필수 동의
- **이메일**: 필수 동의
- **Save** 클릭

---

## 🚀 배포 후 확인 사항

### 1. 환경 변수 확인
Cloudflare Pages 대시보드에서:
- Settings > Environment variables
- `GOOGLE_CLIENT_ID` 설정 확인
- `KAKAO_JS_KEY` 설정 확인 (발급 후)

### 2. 배포 상태 확인
- Deployments 탭에서 최신 배포 상태 확인
- 빌드 로그 확인

### 3. 기능 테스트
**URL**: https://superplace-academy.pages.dev/login

**테스트 항목**:
- ✓ 구글 로그인 버튼 클릭
- ✓ 구글 로그인 팝업 표시
- ✓ 로그인 성공 시 대시보드로 이동
- ✓ 미가입자는 회원가입 페이지로 이동
- ✓ 회원가입 시 이메일, 이름 자동 입력
- ✓ 학원 이름, 위치만 입력하면 가입 완료

---

## 🔧 문제 해결

### 구글 로그인이 작동하지 않는 경우

**1. Google Cloud Console에서 승인된 도메인 확인**
```
https://console.cloud.google.com/
→ API 및 서비스 > 사용자 인증 정보
→ OAuth 2.0 클라이언트 ID 선택
→ 승인된 JavaScript 원본 및 리디렉션 URI 확인
```

**필수 도메인**:
- `https://superplace-academy.pages.dev`
- `http://localhost:3000`

**2. 환경 변수 확인**
Cloudflare Pages 대시보드에서 `GOOGLE_CLIENT_ID`가 정확히 설정되어 있는지 확인

**3. 브라우저 콘솔 확인**
- F12 > Console 탭
- 에러 메시지 확인

### 카카오 로그인이 작동하지 않는 경우

**1. JavaScript 키 확인**
- Kakao Developers에서 올바른 JavaScript 키를 복사했는지 확인
- Access Token이 아닌 JavaScript 키인지 확인

**2. 플랫폼 설정 확인**
- Kakao Developers > 앱 설정 > 플랫폼
- Web 플랫폼에 도메인이 등록되어 있는지 확인

**3. Redirect URI 확인**
- 제품 설정 > 카카오 로그인
- Redirect URI가 정확히 등록되어 있는지 확인

---

## 📊 현재 상태

### ✅ 완료
- 구글 API 키 설정
- 코드 구현 완료
- GitHub 푸시 완료
- 빌드 성공

### ⏳ 대기 중
- Cloudflare Pages 환경 변수 설정
- Cloudflare Pages 재배포
- 카카오 JavaScript 키 발급

---

## 📞 다음 단계

1. **Cloudflare Pages 환경 변수 설정** (방법 1 또는 방법 2)
2. **카카오 JavaScript 키 발급**
3. **재배포 확인**
4. **기능 테스트**

---

원장님, 이제 다음 작업만 하시면 됩니다:

1. ✅ **구글 로그인은 바로 사용 가능합니다!**
   - Cloudflare 대시보드에서 `GOOGLE_CLIENT_ID` 환경 변수만 설정하세요

2. ⏳ **카카오 로그인**
   - Kakao Developers에서 JavaScript 키를 발급받으세요
   - Cloudflare 대시보드에서 `KAKAO_JS_KEY` 환경 변수를 설정하세요

질문이 있으시면 언제든 말씀해주세요! 🙏
