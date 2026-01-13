# SMS API 시스템 설정 가이드

## 📱 시스템 개요

서버(Railway/Cloudflare Pages)에서 **'장부 정리(포인트 차감)'**를 처리하고, 실제 발송은 **알리고 SMS API**에 위임하는 구조입니다.

---

## 🗄️ 데이터베이스 설계

### 1. Users 테이블 (balance 추가)
```sql
ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;
```

### 2. SMS 관련 테이블 (마이그레이션 0020)
- **sms_pricing**: SMS/LMS/MMS 요금표
- **sender_ids**: 사용자별 인증된 발신번호 목록
- **sms_logs**: 발송 내역 로그
- **sms_recipients**: 수신자별 상세 내역
- **point_transactions**: 포인트 거래 내역

---

## 🔑 알리고 API 설정

### 1. 알리고 회원가입 및 API 키 발급
1. https://smartsms.aligo.in/ 접속
2. 회원가입 후 로그인
3. **API 설정** 메뉴로 이동
4. **API Key** 발급
5. **사용자 ID** 확인

### 2. 환경 변수 설정

#### 로컬 개발 (.dev.vars)
```bash
# 알리고 SMS API 설정
ALIGO_API_KEY=your_aligo_api_key_here
ALIGO_USER_ID=your_aligo_user_id_here
```

#### 프로덕션 (Cloudflare Pages Secrets)
```bash
# Cloudflare Pages에 환경 변수 추가
npx wrangler pages secret put ALIGO_API_KEY --project-name superplace
# 프롬프트: your_aligo_api_key_here

npx wrangler pages secret put ALIGO_USER_ID --project-name superplace
# 프롬프트: your_aligo_user_id_here
```

---

## 📡 API 엔드포인트

### 1. SMS 요금표 조회
```http
GET /api/sms/pricing
```

**응답:**
```json
{
  "success": true,
  "pricing": [
    {
      "message_type": "SMS",
      "wholesale_price": 8.4,
      "retail_price": 20,
      "margin": 11.6,
      "description": "단문 메시지 (90바이트 이하)"
    },
    {
      "message_type": "LMS",
      "wholesale_price": 25,
      "retail_price": 50,
      "margin": 25,
      "description": "장문 메시지 (2000바이트 이하)"
    }
  ]
}
```

---

### 2. 발신번호 목록 조회
```http
GET /api/sms/senders?userId=1
```

**응답:**
```json
{
  "success": true,
  "senders": [
    {
      "id": 1,
      "phone_number": "01012345678",
      "verification_method": "mobile",
      "verification_date": "2024-01-15 10:30:00",
      "status": "verified"
    }
  ]
}
```

---

### 3. 발신번호 인증 요청 (알리고 API 연동)
```http
POST /api/sms/sender/verify
Content-Type: application/json

{
  "userId": 1,
  "phoneNumber": "010-1234-5678",
  "method": "mobile"
}
```

**응답:**
```json
{
  "success": true,
  "message": "인증 요청이 완료되었습니다. 휴대폰 또는 ARS로 인증을 진행해주세요.",
  "senderId": 1
}
```

**인증 방법:**
- `"mobile"`: 휴대폰 인증 (문자로 인증번호 수신)
- `"ars"`: ARS 인증 (전화로 인증)

---

### 4. SMS 발송 API (핵심 로직 - 선차감 후발송)
```http
POST /api/sms/send
Content-Type: application/json

{
  "userId": 1,
  "senderId": 1,
  "receivers": [
    {
      "name": "홍길동",
      "phone": "01012345678"
    },
    {
      "name": "김철수",
      "phone": "01087654321"
    }
  ],
  "message": "안녕하세요 #{이름} 원장님! 꾸메땅학원입니다.",
  "reserveTime": "2024-01-20T14:30:00"
}
```

**발송 흐름:**
1. **사용자 잔액 확인**
2. **메시지 타입 자동 결정** (바이트 수 계산)
   - 90바이트 이하: SMS
   - 91~2000바이트: LMS
3. **총 비용 계산** (수신자 수 × 건당 요금)
4. **포인트 선차감**
5. **알리고 API 호출** (실제 발송)
6. **발송 성공**: SMS 로그 기록
7. **발송 실패**: 포인트 환불

**성공 응답:**
```json
{
  "success": true,
  "message": "문자 발송이 완료되었습니다.",
  "sentCount": 2,
  "totalCost": 40,
  "remainingBalance": 960
}
```

**실패 응답:**
```json
{
  "success": false,
  "error": "포인트가 부족합니다. (필요: 100P, 보유: 50P)"
}
```

---

### 5. SMS 발송 내역 조회
```http
GET /api/sms/logs?userId=1&page=1&limit=20
```

**응답:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "user_id": 1,
      "sender_phone": "01012345678",
      "receiver_number": "01087654321,01011112222",
      "message_type": "SMS",
      "message_content": "안녕하세요 원장님! 꾸메땅학원입니다.",
      "byte_size": 45,
      "point_cost": 40,
      "status": "success",
      "sent_at": "2024-01-15 14:30:00",
      "created_at": "2024-01-15 14:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 6. 포인트 충전 API (관리자 전용)
```http
POST /api/sms/charge
Content-Type: application/json

{
  "userId": 1,
  "amount": 10000,
  "adminId": 1,
  "description": "입금 확인 후 포인트 충전"
}
```

**응답:**
```json
{
  "success": true,
  "message": "포인트 충전이 완료되었습니다.",
  "balance": 10000
}
```

---

## 💰 비즈니스 정산 모델

### 요금표 (소매가 기준)
| 메시지 타입 | 도매가 | 소매가 | 마진 |
|------------|--------|--------|------|
| **SMS** (단문) | 8.4원 | 20원 | 11.6원 |
| **LMS** (장문) | 25원 | 50원 | 25원 |
| **MMS** (포토) | 60원 | 150원 | 90원 |

### 정산 로직
1. **사용자가 포인트 충전**: 예) 10,000원 = 10,000P
2. **SMS 발송**: 20P × 100명 = 2,000P 차감
3. **실제 비용**: 8.4원 × 100명 = 840원
4. **마진**: 1,160원 (58% 마진율)

---

## 🎯 주요 기능

### ✅ 선차감 후발송 원칙
- 발송 클릭 시 즉시 포인트 차감
- 알리고 API 호출
- **발송 실패 시 자동 환불**

### ✅ 메시지 치환 기능
```
원본: "안녕하세요 #{이름} 원장님!"
↓
홍길동: "안녕하세요 홍길동 원장님!"
김철수: "안녕하세요 김철수 원장님!"
```

### ✅ 예약 발송
- `reserveTime` 파라미터로 원하는 시간 설정
- 형식: `2024-01-20T14:30:00`

### ✅ 자동 메시지 타입 결정
- 90바이트 이하: SMS (단문)
- 91~2000바이트: LMS (장문)

---

## ⚖️ 법적 준비 사항

### 1. 부가통신사업자 신고 (필수)
- **관할**: 과학기술정보통신부
- **대상**: 전국 학원을 대상으로 서비스 확장 시
- **신고 기간**: 사업 개시 전

### 2. 080 수신거부 서비스 (광고성 문자 필수)
- 광고성 문자 발송 시 수신거부 번호 포함 의무
- **예시**: `[광고] 꾸메땅학원입니다. 무료상담: 1234-5678 / 수신거부: 080-1234-5678`
- 알리고에서 080 번호 신청 가능

### 3. 이용약관 및 개인정보처리방침
- 문자 발송 시 사용자 책임 명시
- 스팸 방지 정책 게시
- 개인정보 수집 및 이용 동의

---

## 🧪 테스트 방법

### 로컬 테스트
```bash
# 1. 환경 변수 설정
echo "ALIGO_API_KEY=your_key" >> .dev.vars
echo "ALIGO_USER_ID=your_id" >> .dev.vars

# 2. 마이그레이션 적용
npm run db:migrate:local

# 3. 빌드
npm run build

# 4. PM2로 시작
pm2 start ecosystem.config.cjs

# 5. API 테스트
curl -X POST http://localhost:3000/api/sms/sender/verify \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"phoneNumber":"010-1234-5678","method":"mobile"}'
```

### 프로덕션 테스트
```bash
# 1. 환경 변수 설정
npx wrangler pages secret put ALIGO_API_KEY --project-name superplace
npx wrangler pages secret put ALIGO_USER_ID --project-name superplace

# 2. 마이그레이션 적용
npm run db:migrate:prod

# 3. 배포
npm run deploy

# 4. API 테스트
curl -X POST https://superplace-academy.pages.dev/api/sms/sender/verify \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"phoneNumber":"010-1234-5678","method":"mobile"}'
```

---

## 📝 TODO: UI 개발

### 1. 발신번호 관리 페이지
- [ ] 발신번호 목록 표시
- [ ] 발신번호 추가 (인증 요청)
- [ ] 발신번호 삭제

### 2. 문자 작성 페이지
- [ ] 메시지 입력창 (바이트 수 실시간 표시)
- [ ] SMS/LMS 자동 구분
- [ ] 엑셀 업로드 기능
- [ ] 치환 메시지 미리보기
- [ ] 예약 발송 시간 설정
- [ ] 발송 버튼

### 3. 발송 내역 페이지
- [ ] 발송 내역 테이블
- [ ] 상태별 필터 (성공/실패)
- [ ] 날짜별 검색
- [ ] 수신자별 상세 내역

### 4. 포인트 관리 페이지
- [ ] 현재 포인트 잔액 표시
- [ ] 입금 신청
- [ ] 포인트 거래 내역

---

## 🚀 다음 단계

1. **알리고 API 키 발급** ⬅️ **지금 해야 할 일**
2. **발신번호 인증 UI 개발**
3. **문자 작성 UI 개발**
4. **엑셀 업로드 기능 개발**
5. **발송 내역 UI 개발**
6. **080 수신거부 서비스 신청**
7. **부가통신사업자 신고**

---

## 📚 참고 자료

- **알리고 SMS API 문서**: https://smartsms.aligo.in/admin/api/spec.html
- **발신번호 인증 API**: https://apis.aligo.in/sender/
- **문자 발송 API**: https://apis.aligo.in/send/
- **GitHub Repository**: https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage

---

## 🆘 문제 해결

### Q: 알리고 API 인증 실패
- **원인**: API Key 또는 User ID가 잘못됨
- **해결**: 알리고 대시보드에서 API 키 재확인

### Q: 포인트가 차감되었는데 발송 실패
- **원인**: 알리고 API 응답이 실패
- **해결**: 자동 환불됨. SMS 로그에서 실패 사유 확인

### Q: 발신번호 인증이 안 됨
- **원인**: 인증 절차 미완료
- **해결**: 휴대폰 문자 또는 ARS 전화로 인증 완료

---

**작성일**: 2024-01-13  
**작성자**: AI Developer  
**버전**: 1.0
