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

✅ **권한 관리 시스템 (신규)** 🆕
- 사용자별 프로그램 접근 권한 제어
- 대시보드 메뉴 권한 기반 표시/숨김
- DB: `user_permissions` 테이블
- 프로그램 키:
  - `search_volume` - 네이버 검색량 조회
  - `sms` - SMS 발송 시스템  
  - `landing_builder` - 랜딩페이지 빌더
  - `analytics` - 분석 도구
- API 엔드포인트:
  - `GET /api/user/permissions?userId={id}` - 사용자 권한 조회
  - `POST /api/admin/grant-permission` - 권한 부여
  - `POST /api/admin/revoke-permission` - 권한 회수
- 관리자는 모든 권한 자동 부여
- 권한 없는 사용자는 대시보드에서 메뉴 숨김 처리

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
- **대시보드 바로가기** 추가 🆕

✅ **랜딩페이지 생성 시스템 (완료)** 🆕
- AI 기반 랜딩페이지 자동 생성 (`/tools/landing-builder`)
  - 학원 소개 템플릿
  - 프로그램 홍보 템플릿
  - 학생 리포트 템플릿
- **사용자별 랜딩페이지 저장** ✅
  - landing_pages 테이블에 자동 저장
  - 고유 slug로 URL 생성
  - QR 코드 자동 생성
- **폴더 관리 시스템** ✅
  - 랜딩페이지를 폴더로 정리
  - 폴더 생성/삭제
  - 페이지 이동
- **대시보드 통합** ✅
  - 최근 랜딩페이지 3개 표시
  - 조회수 실시간 표시
  - URL 복사 기능
  - "전체 관리" 페이지 (`/tools/landing-manager`)
- API 엔드포인트:
  - `POST /api/landing/create` - 랜딩페이지 생성
  - `GET /api/landing/my-pages` - 내 랜딩페이지 목록
  - `DELETE /api/landing/:id` - 랜딩페이지 삭제
  - `POST /api/landing/folder/create` - 폴더 생성
  - `GET /api/landing/folders` - 폴더 목록

✅ **SMS 발송 시스템 (완료)**
- 알리고 SMS API 연동 완료
- 발신번호 관리 UI (`/sms/senders`)
  - 발신번호 등록/삭제
  - 알리고 웹사이트 인증 연동
- **발신번호 인증 신청 시스템 (신규)** 🆕
  - 사업자 등록증 업로드 (`/sms/sender/request`)
  - 사업체명, 사업자등록번호, 발신번호 신청
  - imgbb 이미지 호스팅 연동
  - 관리자 승인/거절 시스템 (`/admin/sender/verification`)
  - 신청 내역 확인 및 상태 추적
- 문자 작성 UI (`/sms/compose`)
  - SMS/LMS 자동 구분
  - 엑셀 업로드 및 치환 변수 매핑
  - 예약 발송 기능
- 발송 내역 UI (`/sms/logs`)
  - 발송 통계 및 필터링
  - 상세 내역 확인
- **포인트 관리 UI (`/sms/points`)** 🆕 개선
  - 💰 **포인트 잔액 카드**
    - 실시간 잔액 표시
    - SMS/LMS/MMS 발송 가능 건수
    - 총 충전/사용/거래 건수 통계
  - 💳 **충전하기 탭**
    - 입금 신청 양식 (금액, 은행명, 계좌번호, 입금자명, 메모)
    - 빠른 금액 선택 (+1만, +5만, +10만, +50만)
    - 입금 안내 정보
  - 📋 **충전 내역 탭**
    - 사용자별 입금 신청 내역 조회
    - 상태별 표시 (대기중/승인완료/거절됨)
    - 신청일/처리일 표시
  - 📊 **사용 내역 탭**
    - 포인트 거래 내역 조회 (충전/사용/환불)
    - 거래 유형별 아이콘 표시 (📥 충전, 📤 사용)
    - 잔액 변동 추적
  - 💵 **요금표 탭**
    - SMS/LMS/MMS 요금 안내
- 대시보드 SMS 메뉴 통합
  - 네비게이션 드롭다운 메뉴
  - SMS 빠른 접근 섹션
  - 실시간 포인트 표시
- API 엔드포인트
  - 발신번호 등록: `POST /api/sms/sender/register`
  - 발신번호 삭제: `DELETE /api/sms/sender/:id`
  - 발신번호 인증 신청: `POST /api/sms/sender/verification-request` 🆕
  - 발신번호 신청 목록: `GET /api/sms/sender/verification-requests` 🆕
  - 발신번호 승인/거절: `POST /api/sms/sender/verification-process` 🆕
  - 관리자 신청 목록: `GET /api/admin/sender/verification-requests` 🆕
  - SMS 발송: `POST /api/sms/send`
  - 발송 내역: `GET /api/sms/logs`
  - **입금 신청**: `POST /api/deposit/request` 🆕
  - **입금 신청 내역**: `GET /api/deposit/my-requests/:userId` 🆕
  - **포인트 거래 내역**: `GET /api/point-transactions/:userId` 🆕
  - **입금 승인/거절**: `PUT /api/admin/deposit/requests/:id/process` 🆕
  - 포인트 충전: `POST /api/sms/charge`
  - 요금표: `GET /api/sms/pricing`
- 주요 기능
  - **사용자별 포인트 관리 시스템** ✅ 완료
    - 입금 신청 및 관리자 승인 플로우
    - 실시간 포인트 차감 (SMS 발송 시)
    - 실패 시 자동 환불
    - 거래 내역 추적 및 통계
  - **이메일 알림 시스템** ✅ 완료
    - 입금 승인 시 자동 이메일 발송 (Resend API)
    - 충전 금액, 현재 잔액, SMS 발송 가능 건수 표시
    - 전문적인 이메일 템플릿
  - 선차감 후발송 로직 (실패 시 자동 환불)
  - 메시지 치환 기능 (`#{이름}`, `#{학원명}` 등)
  - 자동 메시지 타입 결정 (SMS 90바이트, LMS 2000바이트)
  - 발송 성공/실패 통계
  - 사업자 등록증 기반 발신번호 인증 🆕

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

### SMS 발송 시스템 (완료)
- **발신번호 관리**: `/sms/senders`
  - 발신번호 등록 및 삭제
  - 알리고 웹사이트 인증 연동
- **발신번호 인증 신청**: `/sms/sender/request` 🆕
  - 사업자 등록증 업로드 (JPG, PNG)
  - 사업체명, 사업자등록번호 입력
  - 발신번호 등록 신청
  - 신청 내역 확인 및 상태 추적
  - imgbb 이미지 호스팅 연동
- **문자 작성**: `/sms/compose`
  - SMS/LMS 자동 구분 (90바이트 기준)
  - 엑셀 업로드 및 치환 변수 매핑 (`#{이름}`, `#{학원명}` 등)
  - 예약 발송 기능
- **발송 내역**: `/sms/logs`
  - 발송 통계 및 필터링
  - 상세 내역 모달
- **포인트 관리**: `/sms/points`
  - 포인트 잔액 확인
  - 포인트 계산기
  - 충전 및 사용 내역
- **관리자 - 발신번호 승인**: `/admin/sender/verification` 🆕
  - 신청 목록 조회 (승인 대기/승인 완료/거절됨)
  - 사업자 등록증 이미지 확인
  - 신청 승인/거절 처리
  - 관리자 메모 기능
- **API 엔드포인트**:
  - `POST /api/sms/sender/register` - 발신번호 등록
  - `DELETE /api/sms/sender/:id` - 발신번호 삭제
  - `POST /api/sms/sender/verification-request` - 발신번호 인증 신청 🆕
  - `GET /api/sms/sender/verification-requests` - 신청 목록 조회 🆕
  - `POST /api/sms/sender/verification-process` - 신청 승인/거절 🆕
  - `GET /api/admin/sender/verification-requests` - 관리자 전체 신청 목록 🆕
  - `POST /api/sms/send` - SMS 발송 (선차감 후발송)
  - `GET /api/sms/logs` - 발송 내역
  - `POST /api/sms/charge` - 포인트 충전 (관리자)
  - `GET /api/sms/pricing` - 요금표

### 네비게이션 링크
- `/programs` - 교육 프로그램 목록
- `/programs/data` - 검색량 조회 도구 (redirect to /tools/search-volume)
- `/success` - 성공 사례
- `/contact` - 문의하기
- `/login` - 로그인
- `/dashboard` - 학원장 대시보드
  - SMS 빠른 접근 섹션
  - 네비게이션 SMS 드롭다운 메뉴
- `/sms/compose` - SMS 문자 작성
- `/sms/senders` - 발신번호 관리
- `/sms/sender/request` - 발신번호 인증 신청 🆕
- `/sms/logs` - 발송 내역
- `/sms/points` - 포인트 관리
- `/admin/dashboard` - 관리자 대시보드
- `/admin/sender/verification` - 발신번호 승인 관리 🆕

## 아직 구현되지 않은 기능

### 검색량 조회 도구
❌ Python Selenium 크롤러 연동 (백엔드 크롤링 로직)
- 네이버 검색량 실시간 크롤링
- 네이버 플레이스 순위 크롤링
- 경쟁사 정보 크롤링
- 경쟁사 키워드 추출

### 교육 프로그램 관리
❌ 교육 프로그램 등록 시스템
- 프로그램 생성/수정/삭제
- 강의 컨텐츠 관리

### 기타
❌ 회원 인증 시스템 강화
❌ 관리자 페이지 고도화

## 추천 다음 개발 단계

### 1단계: SMS 시스템 실제 테스트 및 배포 (최우선) ✅ 완료
1. ✅ 발신번호 관리 페이지 - 발신번호 등록 및 관리 UI
2. ✅ 문자 작성 페이지 - 메시지 입력, 엑셀 업로드, 예약 발송
3. ✅ 발송 내역 페이지 - 발송 내역 조회 및 상세 내역
4. ✅ 포인트 관리 페이지 - 포인트 잔액 확인 및 충전
5. ✅ 대시보드 SMS 메뉴 통합 - 네비게이션 및 빠른 접근
6. ⏳ **알리고 웹사이트 설정** (즉시 필요)
   - 발신번호 등록: 010-8739-9697
   - 발송 허용 IP: 모든 IP 허용 (개발 단계)
7. ⏳ 실제 SMS 발송 테스트
8. ⏳ Cloudflare Pages 프로덕션 배포

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
- **Production (Latest)**: https://8c6f3ad6.superplace.pages.dev ✅ **최신 배포 (권한 시스템 포함)**
- **Production (Main)**: https://superplace.pages.dev
- **Production (Legacy)**: https://superplace-academy.pages.dev
- **Sandbox**: https://3000-iozj30l08naj729nalnbi-0e616f0a.sandbox.novita.ai
- **GitHub Repository**: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage.git

## 데이터 아키텍처
- **데이터베이스**: Cloudflare D1 (SQLite)
  - `users` - 사용자 정보 (balance 컬럼 추가)
  - `user_permissions` - 사용자별 프로그램 권한 관리 🆕
  - `contacts` - 문의 내역
  - `landing_pages` - 랜딩페이지 빌더
  - `search_analysis_logs` - 검색량 조회 히스토리
  - **SMS 시스템 테이블**:
    - `sms_pricing` - SMS/LMS/MMS 요금표
    - `sender_ids` - 발신번호 목록
    - `sender_verification_requests` - 발신번호 인증 신청 🆕
    - `sms_logs` - 발송 내역 로그
    - `sms_recipients` - 수신자별 상세 내역
    - `point_transactions` - 포인트 거래 내역
    - `deposit_requests` - 입금 신청 내역 🆕
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
- **Production URL**: https://8c6f3ad6.superplace.pages.dev ⭐ **최신 (권한 시스템)**
- **마지막 업데이트**: 2026-01-14 14:59 KST
- **최근 변경사항**: 
  - ✅ **권한 관리 시스템 구축** (user_permissions 테이블, 권한 API, 대시보드 접근 제어) 🆕
  - ✅ **발신번호 4개 서류 업로드** (사업자등록증, 통신사가입증명원, 재직증명서, 계약서) 🆕
  - ✅ **대시보드 권한 기반 메뉴 표시** (권한 없으면 숨김 처리) 🆕
  - ✅ **포인트 관리 시스템 완전 개편** (탭 UI, 충전/사용 내역, 통계)
  - ✅ **이메일 알림 시스템 추가** (Resend API 연동)
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

## 알리고 SMS API 설정 (✅ 완료)
SMS 시스템에 필요한 환경 변수가 설정되었습니다:

**로컬 개발 환경 (.dev.vars)**
```bash
ALIGO_API_KEY=4bbi3l27pb5qh11tkujl578bttz6vb5j
ALIGO_USER_ID=wangholy
```

**프로덕션 환경 (Cloudflare Pages Secrets)** ✅ **설정 완료**
```bash
# 이미 설정됨
✅ ALIGO_API_KEY - Cloudflare Secret으로 저장됨
✅ ALIGO_USER_ID - Cloudflare Secret으로 저장됨
```

**선택 사항: Resend 이메일 API (이메일 알림용)**
```bash
# 입금 승인 시 이메일 알림을 보내려면 설정하세요
npx wrangler pages secret put RESEND_API_KEY --project-name superplace
```

자세한 설정 방법은 **SMS_API_SETUP.md** 문서를 참고하세요.
