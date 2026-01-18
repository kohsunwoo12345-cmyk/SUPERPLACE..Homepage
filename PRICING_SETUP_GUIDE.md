# 요금제 및 결제 시스템 설정 가이드

## 🎉 완료된 작업

### 1. 요금제 페이지 구현
- **URL**: https://superplace-academy.pages.dev/pricing
- **3가지 요금제 플랜**:
  - 베이직: ₩99,000/월 (소규모 학원)
  - 프로: ₩199,000/월 (중대형 학원, 추천)
  - 엔터프라이즈: ₩399,000/월 (대형 학원 & 프랜차이즈)

### 2. PG사 연동
- **사용 PG**: 아임포트 (iamport)
- **결제 수단**: 신용카드, 체크카드, 계좌이체, 가상계좌

### 3. DB 테이블
- **subscriptions**: 구독 정보 저장
- **payments**: 결제 내역 저장

### 4. API 엔드포인트
- `POST /api/payment/verify` - 결제 검증 및 구독 생성
- `GET /api/subscription/:userId` - 사용자 구독 정보 조회
- `GET /api/payments/:userId` - 결제 내역 조회
- `POST /api/subscription/:subscriptionId/cancel` - 구독 취소
- `POST /api/admin/init-payment-tables` - DB 테이블 초기화

---

## ⚙️ 설정 방법

### 1단계: DB 테이블 생성

**방법 1: Postman 사용**
```
POST https://superplace-academy.pages.dev/api/admin/init-payment-tables
```

**방법 2: curl 사용**
```bash
curl -X POST https://superplace-academy.pages.dev/api/admin/init-payment-tables
```

**방법 3: 브라우저 개발자 도구**
```javascript
fetch('https://superplace-academy.pages.dev/api/admin/init-payment-tables', {
  method: 'POST'
}).then(r => r.json()).then(console.log)
```

성공 응답:
```json
{
  "success": true,
  "message": "결제 관련 테이블이 성공적으로 생성되었습니다 (subscriptions, payments)"
}
```

### 2단계: 아임포트 가맹점 등록

1. **아임포트 회원가입**: https://www.iamport.kr/
2. **가맹점 식별코드 발급**
3. **코드 수정**:
   - 파일: `src/index.tsx` 
   - 위치: 요금제 페이지 script 섹션
   - 수정 필요:
   ```javascript
   // 현재 (테스트)
   IMP.init('imp00000000');
   
   // 변경 (실제 가맹점 코드)
   IMP.init('imp12345678'); // 발급받은 실제 코드
   ```

4. **PG사 설정**:
   ```javascript
   // 기본값: KG이니시스
   pg: 'html5_inicis'
   
   // 다른 PG사 사용 시:
   // pg: 'kakaopay'      // 카카오페이
   // pg: 'tosspayments'  // 토스페이먼츠
   // pg: 'nice'          // 나이스페이
   ```

### 3단계: 결제 검증 강화 (운영 환경)

현재는 간단한 검증만 구현되어 있습니다. 운영 환경에서는 아임포트 API를 통한 검증이 필요합니다:

**src/index.tsx 수정 위치**: `app.post('/api/payment/verify'...` 함수 내부

```typescript
// 아임포트 액세스 토큰 발급
const getToken = await fetch('https://api.iamport.kr/users/getToken', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imp_key: 'YOUR_API_KEY',
    imp_secret: 'YOUR_API_SECRET'
  })
})
const { access_token } = await getToken.json()

// 결제 정보 검증
const paymentData = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
  headers: { 'Authorization': access_token }
})
const payment = await paymentData.json()

// 금액 검증
if (payment.response.amount !== amount) {
  throw new Error('결제 금액이 일치하지 않습니다')
}
```

---

## 🔒 환경 변수 설정 (권장)

Cloudflare Pages 환경 변수에 아임포트 키를 등록하세요:

1. Cloudflare Pages 대시보드 접속
2. 프로젝트 선택 > Settings > Environment variables
3. 추가할 변수:
   - `IAMPORT_API_KEY` = 발급받은 REST API 키
   - `IAMPORT_API_SECRET` = 발급받은 REST API Secret

코드에서 사용:
```typescript
const { IAMPORT_API_KEY, IAMPORT_API_SECRET } = c.env
```

---

## 📊 DB 테이블 구조

### subscriptions 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT | 구독 ID (PRIMARY KEY) |
| user_id | INTEGER | 사용자 ID |
| plan_type | TEXT | 플랜 종류 (basic/pro/enterprise) |
| amount | INTEGER | 결제 금액 |
| start_date | TEXT | 구독 시작일 |
| end_date | TEXT | 구독 종료일 |
| status | TEXT | 상태 (active/cancelled) |
| merchant_uid | TEXT | 주문 번호 |
| imp_uid | TEXT | 아임포트 결제 고유번호 |
| created_at | TEXT | 생성일시 |

### payments 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT | 결제 ID (PRIMARY KEY) |
| subscription_id | TEXT | 구독 ID |
| user_id | INTEGER | 사용자 ID |
| amount | INTEGER | 결제 금액 |
| payment_method | TEXT | 결제 수단 |
| merchant_uid | TEXT | 주문 번호 |
| imp_uid | TEXT | 아임포트 결제 고유번호 |
| status | TEXT | 상태 (completed/failed) |
| created_at | TEXT | 생성일시 |

---

## 🧪 테스트 방법

### 1. 요금제 페이지 접속
```
https://superplace-academy.pages.dev/pricing
```

### 2. 로그인 필수
결제 버튼 클릭 시 로그인하지 않은 경우 자동으로 로그인 페이지로 이동합니다.

### 3. 테스트 결제
아임포트 테스트 모드에서는 실제 결제 없이 테스트 가능합니다.

### 4. 구독 정보 확인
```javascript
// 브라우저 콘솔에서 실행
const user = JSON.parse(localStorage.getItem('currentUser'))
fetch(`/api/subscription/${user.id}`)
  .then(r => r.json())
  .then(console.log)
```

---

## 🎨 커스터마이징

### 요금제 가격 변경
`src/index.tsx` 파일에서 다음 부분 수정:

```html
<!-- 베이직 플랜 -->
<span class="text-5xl font-bold text-gray-900">₩99,000</span>
<!-- 수정 -->
<span class="text-5xl font-bold text-gray-900">₩새로운가격</span>
```

### 요금제 기능 수정
각 플랜의 체크리스트 항목을 자유롭게 추가/수정할 수 있습니다.

---

## 🚨 주의사항

1. **테스트 환경**: 현재 `imp00000000`는 테스트 가맹점 코드입니다. 실제 결제를 받으려면 실제 가맹점 코드로 변경해야 합니다.

2. **결제 검증**: 운영 환경에서는 반드시 아임포트 API를 통한 서버 측 검증을 구현해야 합니다.

3. **보안**: API 키와 시크릿은 절대 클라이언트에 노출되지 않도록 환경 변수로 관리하세요.

4. **구독 만료**: 자동 갱신 및 만료 처리 로직은 별도로 구현이 필요합니다 (cron job 등).

---

## 📞 문의

- 이메일: wangholy1@naver.com
- 전화: 010-8739-9697

---

## 📝 변경 이력

- **2026-01-18**: 
  - 요금제 페이지 생성
  - 결제 시스템 구현
  - DB 테이블 설계
  - API 엔드포인트 구현
  - 배포 완료
