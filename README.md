# 우리는 슈퍼플레이스다 - 학원 마케팅 전문 웹사이트

## 프로젝트 개요
- **회사명**: 우리는 슈퍼플레이스다
- **목표**: 전국 학원장들을 위한 마케팅 교육 플랫폼 제공
- **주요 기능**: 
  - 네이버 플레이스 상위노출 교육
  - 블로그 마케팅 교육
  - 퍼널 마케팅 교육
  - 학원장 커뮤니티 (오픈채팅 & 오프라인 모임)

## 현재 완료된 기능
✅ **메인 페이지 (홈)**
- 히어로 섹션 (메인 비주얼)
- 통계 섹션 (500+ 학원, 95% 만족도 등)
- 핵심 교육 프로그램 소개 (3가지)
  - 네이버 플레이스 상위노출
  - 블로그 상위노출
  - 퍼널 마케팅
- Why Us 섹션 (차별점 강조)
- CTA (Call-to-Action) 섹션
- 반응형 네비게이션 (모바일 메뉴 포함)
- 푸터 (사업자 정보 포함)
  - 사업자번호: 142-88-02445
  - 주소: 인천광역시 서구 청라커낼로 270, 2층 2196호
  - 이메일: wangholy1@naver.com
  - 전화: 010-8739-9697

✅ **검색량 조회 도구**
- 네이버 검색량 분석
- 플레이스 순위 조회 (광고 제외)
- 경쟁사 순위 분석
- 경쟁사 대표 키워드 추출
- API 엔드포인트: `/api/search-analysis`
- 프로그램 접근: `/programs/data` → `/tools/search-volume`

✅ **SMS 발송 시스템 (백엔드 완료, UI 개발 예정)**
- 알리고 SMS API 연동 완료
- 발신번호 인증 API (`/api/sms/sender/verify`)
- SMS 발송 API - 선차감 후발송 로직 (`/api/sms/send`)
- SMS 요금표 조회 (`/api/sms/pricing`)
- 발송 내역 조회 (`/api/sms/logs`)
- 포인트 충전 API (`/api/sms/charge`)
- 메시지 치환 기능 (`#{이름}`)
- 예약 발송 기능
- 포인트 거래 내역 추적
- 자동 메시지 타입 결정 (SMS/LMS)

## 현재 기능 진입 경로 (URI)

### 메인 페이지
- **경로**: `/`
- **설명**: 랜딩 페이지, 회사 소개 및 서비스 개요

### 검색량 조회 도구 (신규 추가)
- **경로**: `/tools/search-volume`
- **설명**: 네이버 검색량 및 플레이스 순위 조회
- **기능**:
  - 키워드 검색량 분석
  - 네이버 플레이스 순위 조회 (광고 제외)
  - 경쟁사 순위 및 리뷰 수 확인
  - 경쟁사 대표 키워드 추출
- **API**: `POST /api/search-analysis`

### SMS 발송 시스템 (백엔드 완료, UI 개발 예정)
- **SMS 요금표**: `GET /api/sms/pricing`
- **발신번호 목록**: `GET /api/sms/senders?userId=1`
- **발신번호 인증**: `POST /api/sms/sender/verify`
- **SMS 발송**: `POST /api/sms/send`
- **발송 내역**: `GET /api/sms/logs?userId=1&page=1&limit=20`
- **포인트 충전**: `POST /api/sms/charge` (관리자 전용)
- **기능**:
  - 알리고 SMS API 연동
  - 선차감 후발송 로직 (실패 시 자동 환불)
  - 메시지 치환 기능 (`#{이름}`)
  - 예약 발송 기능
  - 자동 메시지 타입 결정 (SMS/LMS)
  - 포인트 거래 내역 추적

### 네비게이션 링크
- `/programs` - 교육 프로그램 목록
- `/programs/data` - 검색량 조회 도구 (redirect to /tools/search-volume)
- `/success` - 성공 사례
- `/contact` - 문의하기
- `/login` - 로그인
- `/dashboard` - 학원장 대시보드

## 아직 구현되지 않은 기능

### 검색량 조회 도구
❌ Python Selenium 크롤러 연동 (백엔드 크롤링 로직)
- 네이버 검색량 실시간 크롤링
- 네이버 플레이스 순위 크롤링
- 경쟁사 정보 크롤링
- 경쟁사 키워드 추출

### SMS 발송 시스템
❌ **발신번호 관리 UI** (최우선)
- 발신번호 목록 표시
- 발신번호 추가 (인증 요청)
- 발신번호 삭제

❌ **문자 작성 UI** (최우선)
- 메시지 입력창 (바이트 수 실시간 표시)
- SMS/LMS 자동 구분
- 엑셀 업로드 기능
- 치환 메시지 미리보기
- 예약 발송 시간 설정
- 발송 버튼

❌ **발송 내역 UI**
- 발송 내역 테이블
- 상태별 필터 (성공/실패)
- 날짜별 검색
- 수신자별 상세 내역

❌ **포인트 관리 UI**
- 현재 포인트 잔액 표시
- 입금 신청
- 포인트 거래 내역

❌ **법적 준비 사항**
- 080 수신거부 서비스 신청
- 부가통신사업자 신고
- 이용약관 및 개인정보처리방침

### 기타
❌ 회원 인증 시스템 강화
❌ 관리자 페이지 고도화

## 추천 다음 개발 단계

### 1단계: SMS 시스템 UI 개발 (최우선)
1. **발신번호 관리 페이지** - 발신번호 인증 및 관리 UI
2. **문자 작성 페이지** - 메시지 입력, 엑셀 업로드, 예약 발송
3. **발송 내역 페이지** - 발송 내역 조회 및 상세 내역
4. **포인트 관리 페이지** - 포인트 잔액 확인 및 입금 신청
5. **알리고 API 키 발급** - SMS_API_SETUP.md 참고

### 2단계: Python Selenium 크롤러 구현 (우선순위 높음)
6. **네이버 검색량 크롤러** - 실제 검색량 데이터 수집
7. **네이버 플레이스 순위 크롤러** - 실시간 순위 추적 (광고 제외)
8. **경쟁사 분석 크롤러** - 경쟁사 정보 및 키워드 추출
9. **크롤링 결과 DB 저장** - search_analysis_logs 테이블 활용

### 3단계: 검색량 조회 고도화 (우선순위 중간)
10. **히스토리 기능** - 과거 조회 결과 확인
11. **리포트 생성** - PDF/Excel 다운로드
12. **알림 기능** - 순위 변동 시 알림

### 4단계: 고급 기능 (우선순위 낮음)
13. **키워드 추천** - AI 기반 키워드 추천
14. **경쟁사 모니터링** - 자동 순위 추적
15. **대시보드 차트** - 검색량/순위 변화 그래프

## 현재 URL
- **Production**: https://superplace-academy.pages.dev
- **Latest Deployment**: https://4948abd8.superplace-academy.pages.dev
- **GitHub Repository**: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage.git

## 데이터 아키텍처
- **데이터베이스**: Cloudflare D1 (SQLite)
  - `users` - 사용자 정보 (balance 컬럼 추가)
  - `contacts` - 문의 내역
  - `landing_pages` - 랜딩페이지 빌더
  - `search_analysis_logs` - 검색량 조회 히스토리
  - **SMS 시스템 테이블**:
    - `sms_pricing` - SMS/LMS/MMS 요금표
    - `sender_ids` - 발신번호 목록
    - `sms_logs` - 발송 내역 로그
    - `sms_recipients` - 수신자별 상세 내역
    - `point_transactions` - 포인트 거래 내역
- **스토리지**: 
  - Cloudflare KV - 세션 관리
  - imgbb API - 썸네일 이미지 업로드
- **외부 서비스**:
  - **알리고 SMS API** - 문자 발송 (✅ 연동 완료)
  - 네이버 검색 API (예정) - 검색량 데이터
  - Python Selenium (예정) - 실시간 크롤링

## 기술 스택
- **Frontend**: HTML, TailwindCSS, JavaScript
- **Backend**: Hono (TypeScript)
- **배포**: Cloudflare Pages (예정)
- **버전 관리**: Git

## 디자인 특징
- 💜 퍼플/인디고 그라데이션 테마
- 📱 완전 반응형 디자인 (모바일 최적화)
- 🎨 전문적이고 신뢰감 있는 디자인
- ✨ 부드러운 애니메이션 효과 (hover, transition)
- 🚀 현대적인 UI/UX 패턴

## 로컬 개발 가이드

### 서버 시작
```bash
# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list

# 로그 확인
pm2 logs webapp --nostream
```

### 개발 명령어
```bash
# 포트 정리
npm run clean-port

# 서버 테스트
npm run test

# 빌드
npm run build
```

## 사용자 가이드

### 방문자 (일반 사용자)
1. 메인 페이지에서 회사 소개 및 서비스 확인
2. "무료 상담 신청" 버튼 클릭 → 문의 페이지로 이동 (예정)
3. "교육 프로그램 보기" 버튼 클릭 → 프로그램 상세 페이지로 이동 (예정)

### 학원장 (회원)
1. "로그인" 버튼 클릭 → 로그인 페이지 (예정)
2. 로그인 후 대시보드 접근 (예정)
3. 교육 자료, 커뮤니티 등 이용 (예정)

## 배포 상태
- **플랫폼**: Cloudflare Pages
- **상태**: ✅ Production 배포 완료
- **Production URL**: https://superplace-academy.pages.dev
- **마지막 업데이트**: 2026-01-13
- **최근 변경사항**: 
  - SMS API 시스템 백엔드 구현 완료 (알리고 연동)
  - 검색량 조회 도구 활성화

## 중요 문서
- **SMS_API_SETUP.md** - SMS 시스템 설정 가이드 (알리고 API, 요금표, 법적 준비사항)
- **SOCIAL_LOGIN_SETUP.md** - 소셜 로그인 설정 가이드 (Google/Kakao)
- **CLOUDFLARE_ENV_SETUP.md** - Cloudflare 환경 변수 설정 가이드

## 다음 작업
다음 개발 우선순위:
1. **알리고 SMS API 키 발급** (최우선) - SMS_API_SETUP.md 참고
2. **SMS UI 개발** (최우선) - 발신번호 관리, 문자 작성, 발송 내역, 포인트 관리
3. **Python Selenium 크롤러 구현** - 실제 검색량 및 순위 데이터 수집
4. **크롤링 API 연동** - /api/search-analysis 백엔드 로직 구현
5. **검색량 조회 히스토리** - 과거 조회 결과 확인 기능
6. **리포트 생성** - PDF/Excel 다운로드 기능

## 알리고 SMS API 설정 필요
SMS 시스템을 사용하려면 다음 환경 변수를 설정해야 합니다:
```bash
# 로컬 개발 (.dev.vars)
ALIGO_API_KEY=your_aligo_api_key_here
ALIGO_USER_ID=your_aligo_user_id_here

# 프로덕션 (Cloudflare Pages Secrets)
npx wrangler pages secret put ALIGO_API_KEY --project-name superplace
npx wrangler pages secret put ALIGO_USER_ID --project-name superplace
```

자세한 설정 방법은 **SMS_API_SETUP.md** 문서를 참고하세요.
