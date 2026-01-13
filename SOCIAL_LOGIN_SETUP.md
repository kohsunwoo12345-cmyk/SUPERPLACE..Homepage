# 우리는 슈퍼플레이스다 - 소셜 로그인 설정 가이드

## 🎉 구글 & 카카오 소셜 로그인 기능 추가 완료!

소셜 로그인 기능이 성공적으로 구현되었습니다. 이제 사용자는 구글이나 카카오 계정으로 간편하게 로그인할 수 있습니다.

---

## ✨ 주요 기능

### 1. **구글 로그인 (Google OAuth 2.0)**
- Google Sign-In JavaScript 라이브러리 사용
- 미가입 사용자 자동 회원가입 페이지 리다이렉트
- 이메일, 이름 자동 입력

### 2. **카카오 로그인 (Kakao OAuth 2.0)**
- Kakao JavaScript SDK 사용
- 미가입 사용자 자동 회원가입 페이지 리다이렉트
- 이메일, 닉네임 자동 입력

### 3. **간소화된 회원가입**
- 소셜 로그인 사용자는 **학원 이름**과 **학원 위치**만 입력
- 비밀번호 입력 불필요
- 이메일과 이름은 자동으로 입력됨

---

## 🚀 배포 및 설정 방법

### 1단계: API 키 설정

#### **구글 OAuth 2.0 설정**

1. **Google Cloud Console** 접속: https://console.cloud.google.com/
2. 프로젝트 생성 또는 선택
3. **API 및 서비스 > 사용자 인증 정보** 이동
4. **+ 사용자 인증 정보 만들기 > OAuth 2.0 클라이언트 ID** 선택
5. 애플리케이션 유형: **웹 애플리케이션**
6. **승인된 자바스크립트 원본** 추가:
   ```
   https://superplace-academy.pages.dev
   https://4ca9fea1.superplace.pages.dev
   http://localhost:3000
   ```
7. **승인된 리디렉션 URI** 추가:
   ```
   https://superplace-academy.pages.dev/login
   https://4ca9fea1.superplace.pages.dev/login
   http://localhost:3000/login
   ```
8. **클라이언트 ID** 복사 (예: `123456789-abcdefg.apps.googleusercontent.com`)

#### **카카오 OAuth 2.0 설정**

1. **Kakao Developers** 접속: https://developers.kakao.com/
2. 내 애플리케이션 > 애플리케이션 추가하기
3. **앱 키 > JavaScript 키** 복사
4. **플랫폼 설정 > Web 플랫폼 추가**
5. 사이트 도메인 추가:
   ```
   https://superplace-academy.pages.dev
   https://4ca9fea1.superplace.pages.dev
   http://localhost:3000
   ```
6. **제품 설정 > 카카오 로그인 > Redirect URI** 등록:
   ```
   https://superplace-academy.pages.dev/login
   https://4ca9fea1.superplace.pages.dev/login
   http://localhost:3000/login
   ```
7. **동의항목 설정**: 이메일, 프로필 정보 필수 동의로 설정

---

### 2단계: 환경 변수 설정

#### **로컬 개발 환경**

`.dev.vars` 파일을 수정하여 API 키를 설정합니다:

```bash
# .dev.vars
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
KAKAO_JS_KEY=YOUR_KAKAO_JS_KEY_HERE
```

#### **프로덕션 환경 (Cloudflare Pages)**

Cloudflare Pages에 환경 변수를 설정합니다:

```bash
# Cloudflare 대시보드에서 설정
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name superplace
# 프롬프트에 YOUR_GOOGLE_CLIENT_ID_HERE 입력

npx wrangler pages secret put KAKAO_JS_KEY --project-name superplace
# 프롬프트에 YOUR_KAKAO_JS_KEY_HERE 입력
```

또는 Cloudflare Pages 대시보드에서 직접 설정:
1. https://dash.cloudflare.com 접속
2. **Pages > superplace > Settings > Environment variables**
3. **Add variable** 클릭
4. `GOOGLE_CLIENT_ID` 추가 (Production, Preview 모두)
5. `KAKAO_JS_KEY` 추가 (Production, Preview 모두)

---

### 3단계: 데이터베이스 마이그레이션

#### **로컬 데이터베이스**

```bash
cd /home/user/webapp
npx wrangler d1 migrations apply webapp-production --local
```

#### **프로덕션 데이터베이스**

```bash
npx wrangler d1 migrations apply webapp-production
```

---

### 4단계: 빌드 및 배포

#### **로컬 테스트**

```bash
npm run build
pm2 start ecosystem.config.cjs
```

#### **프로덕션 배포**

```bash
npm run build
npx wrangler pages deploy dist --project-name superplace
```

---

## 📝 데이터베이스 스키마

### users 테이블에 추가된 컬럼

```sql
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN kakao_id TEXT;
ALTER TABLE users ADD COLUMN profile_image TEXT;
ALTER TABLE users ADD COLUMN social_provider TEXT;
```

---

## 🔐 보안 고려사항

1. **API 키 보호**
   - `.dev.vars` 파일은 `.gitignore`에 포함되어 있음
   - 절대로 Git에 커밋하지 마세요
   - 프로덕션 환경에서는 Cloudflare Secrets 사용

2. **HTTPS 사용**
   - 소셜 로그인은 HTTPS 환경에서만 작동
   - 로컬 개발은 `http://localhost`만 허용

3. **도메인 검증**
   - 구글과 카카오 콘솔에 정확한 도메인 등록 필수

---

## 🎯 사용자 플로우

### 신규 사용자 (소셜 로그인)

1. `/login` 페이지에서 **구글로 계속하기** 또는 **카카오로 계속하기** 클릭
2. 소셜 로그인 인증 완료
3. 미가입자일 경우 자동으로 `/register?from=google` 또는 `/register?from=kakao`로 리다이렉트
4. 이메일과 이름은 이미 입력되어 있음 (읽기 전용)
5. **학원 이름**과 **학원 위치**만 입력
6. 회원가입 완료 → 로그인 페이지로 이동
7. 다시 소셜 로그인하면 바로 대시보드로 이동

### 기존 사용자 (소셜 로그인)

1. `/login` 페이지에서 소셜 로그인
2. 이미 가입된 경우 바로 대시보드로 이동

---

## 🔧 API 엔드포인트

### `/api/auth/google` (POST)

구글 로그인 처리

**Request Body:**
```json
{
  "idToken": "google_jwt_token",
  "email": "user@example.com",
  "name": "홍길동",
  "picture": "https://..."
}
```

**Response (기존 사용자):**
```json
{
  "success": true,
  "message": "구글 로그인 성공",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "user",
    "points": 0,
    "profile_image": "https://..."
  }
}
```

**Response (신규 사용자):**
```json
{
  "success": false,
  "needsRegistration": true,
  "socialData": {
    "provider": "google",
    "email": "user@example.com",
    "name": "홍길동",
    "picture": "https://...",
    "google_id": "google_jwt_token"
  },
  "message": "회원가입이 필요합니다."
}
```

### `/api/auth/kakao` (POST)

카카오 로그인 처리 (구글 로그인과 동일한 구조)

---

## 📱 테스트

### 로컬 테스트

1. `.dev.vars` 파일에 API 키 설정
2. `npm run build && pm2 start ecosystem.config.cjs`
3. http://localhost:3000/login 접속
4. 구글 또는 카카오 로그인 테스트

### 프로덕션 테스트

1. Cloudflare Pages에 환경 변수 설정
2. 배포 완료 후 https://superplace-academy.pages.dev/login 접속
3. 소셜 로그인 테스트

---

## 📊 현재 배포 상태

- **GitHub**: ✅ 푸시 완료
  - Repository: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage
  - Commit: `Add Google and Kakao social login functionality`
  
- **Database**: ✅ 로컬 마이그레이션 완료
  - Migration: `0019_add_social_login.sql`
  
- **Cloudflare Pages**: ⏳ 대기 중
  - API 키 설정 필요
  - Cloudflare API 토큰을 Deploy 탭에서 설정하세요

---

## ⚠️ 다음 단계

1. **Deploy 탭에서 Cloudflare API 키 설정**
2. **구글 OAuth 2.0 클라이언트 ID 발급**
3. **카카오 JavaScript 키 발급**
4. **Cloudflare Pages에 환경 변수 설정**
5. **프로덕션 데이터베이스 마이그레이션 실행**
6. **프로덕션 배포**

---

## 📞 문의

설정 과정에서 문제가 발생하면 언제든지 말씀해주세요!

**원장님, 이제 구글과 카카오 로그인 기능이 완성되었습니다! 🎉**
