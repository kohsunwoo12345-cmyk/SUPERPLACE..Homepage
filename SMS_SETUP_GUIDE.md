# SMS 자동 발송 시스템 설정 가이드

## 🚀 빠른 시작

SMS 자동 발송 시스템은 **Aligo SMS API**를 사용합니다.

---

## 📋 1단계: Aligo 가입 및 API 키 발급

### 1. Aligo 가입
- 웹사이트: https://smartsms.aligo.in
- 회원가입 (개인 또는 사업자)
- 본인인증 완료

### 2. 발신번호 등록
- 학원 전화번호 등록 (예: 032-123-4567 또는 010-1234-5678)
- 서류 제출 및 승인 대기 (1-2일 소요)

### 3. API 키 발급
- 로그인 후 [API 설정] 메뉴
- API Key 발급 받기
- User ID 확인

---

## 🔑 2단계: API 키 설정

### 로컬 개발 환경

프로젝트 폴더의 `.dev.vars` 파일을 수정하세요:

```env
# Aligo SMS API 설정
ALIGO_API_KEY=여기에_발급받은_API_KEY_입력
ALIGO_USER_ID=여기에_User_ID_입력
ALIGO_SENDER=032123456 7  # 등록한 발신번호 (하이픈 제거)

# 실제 발송 모드
SMS_REAL_MODE=N  # N=테스트모드(실제 발송 안됨), Y=실제발송
```

**⚠️ 주의사항:**
- `.dev.vars` 파일은 Git에 커밋되지 않습니다 (보안)
- 발신번호는 하이픈(-) 없이 입력하세요
- 처음에는 `SMS_REAL_MODE=N`으로 테스트하세요

---

### Cloudflare Pages 배포 환경

Cloudflare 대시보드에서 환경변수를 설정하세요:

```bash
# Wrangler CLI로 설정
wrangler pages secret put ALIGO_API_KEY --project-name webapp
wrangler pages secret put ALIGO_USER_ID --project-name webapp
wrangler pages secret put ALIGO_SENDER --project-name webapp
wrangler pages secret put SMS_REAL_MODE --project-name webapp
```

또는 Cloudflare 대시보드에서:
1. Pages 프로젝트 선택
2. Settings > Environment variables
3. 각 변수 추가

---

## ✅ 3단계: 테스트

### 1. 테스트 모드 발송 (무료)
```env
SMS_REAL_MODE=N
```
- 실제 문자가 발송되지 않습니다
- DB에만 기록되고 Aligo 테스트 API 호출
- 크레딧 소모 없음

### 2. 실제 발송 모드
```env
SMS_REAL_MODE=Y
```
- 실제 문자가 발송됩니다
- Aligo 크레딧 소모 (건당 약 15원)

### 3. 웹에서 테스트
1. https://your-domain.com/tools/sms-sender 접속
2. 템플릿 선택
3. 수신자 정보 입력
4. "즉시 발송" 클릭

---

## 💰 요금 안내

### Aligo 요금
- **LMS (장문)**: 건당 15원
- **SMS (단문)**: 건당 13원 (90바이트 이하)
- 충전 단위: 최소 1만원부터
- 유효기간: 충전 후 1년

### 월 예상 비용 계산
- 학생 100명 × 월 4회 발송 = 400건
- 400건 × 15원 = 6,000원/월

---

## 🔧 문제 해결

### API 키가 작동하지 않을 때
1. API 키가 정확한지 확인
2. 발신번호가 승인되었는지 확인
3. Aligo 크레딧 잔액 확인
4. PM2 재시작: `pm2 restart webapp`

### 문자가 발송되지 않을 때
- `SMS_REAL_MODE=Y`로 설정했는지 확인
- 발송 기록에서 `result_code` 확인
- result_code=1이면 성공, 그 외는 실패

### 환경변수가 반영되지 않을 때
```bash
# PM2 재시작
cd /home/user/webapp
pm2 restart webapp
```

---

## 📱 사용 가능한 기능

### 현재 구현된 기능
✅ 템플릿 관리 (6개 기본 템플릿)
✅ 즉시 발송
✅ 예약 발송 (DB 기록)
✅ 발송 기록 조회
✅ 발송 통계

### 향후 추가 가능 기능
- 학생 그룹별 일괄 발송
- 스케줄러를 통한 자동 예약 발송
- 카카오톡 알림톡 연동
- 발송 실패 재시도

---

## 🆘 지원

문의사항이 있으시면:
- Aligo 고객센터: 1661-5098
- 시스템 문의: 개발자에게 문의

---

## 📄 관련 파일

- `.dev.vars` - 로컬 환경변수 (Git 제외)
- `migrations/0007_add_sms_system.sql` - DB 스키마
- `src/index.tsx` - SMS API 구현

---

**마지막 업데이트: 2024-12-20**
