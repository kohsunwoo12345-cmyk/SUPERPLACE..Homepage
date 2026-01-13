# 알리고 SMS API 연동 가이드

## 📱 알리고 SMS 시스템 구축 완료

### ✅ 완료된 작업

1. **SMS 발송 API 구현** (`/api/sms/send`)
2. **SMS 발송 내역 조회 API** (`/api/sms/logs`)
3. **데이터베이스 연동** (`sms_history` 테이블)
4. **알리고 API 연동** (API Key 설정 완료)

---

## 🔑 알리고 계정 정보

```
API Key: 4bbi3l27pb5qh11tkujl578bttz6vb5j
```

**⚠️ 추가 필요 정보:**
- **알리고 사용자 ID** (user_id)
- **발신번호** (알리고에 등록된 번호)

---

## 📋 알리고 설정 방법

### 1단계: 알리고 로그인
https://smartsms.aligo.in/

### 2단계: 사용자 ID 확인
1. 로그인 후 **마이페이지** 이동
2. **사용자 ID** 확인 및 복사

### 3단계: 발신번호 등록/확인
1. **발신번호 관리** 메뉴
2. 학원 대표 전화번호 등록
3. 본인인증 완료

---

## 🔧 서버 코드 수정 필요

`/home/user/webapp/src/index.tsx` 파일 12325줄:

```typescript
// 현재 (임시값)
const ALIGO_USER_ID = 'your_aligo_user_id' // ← 수정 필요!
const SENDER_PHONE = '010-0000-0000' // ← 수정 필요!

// 수정 후
const ALIGO_USER_ID = '원장님의_알리고_사용자_ID' // 알리고에서 확인
const SENDER_PHONE = '032-1234-5678' // 학원 대표 전화번호
```

---

## 📡 API 사용법

### SMS 발송 API

**엔드포인트:** `POST /api/sms/send`

**요청 예시:**
```json
{
  "userId": 1,
  "receivers": ["010-1234-5678", "010-9876-5432"],
  "message": "안녕하세요. 꾸메땅학원입니다. 내일 오후 2시 수업이 있습니다.",
  "subject": "수업 안내" // 선택사항 (LMS/MMS 제목)
}
```

**응답 예시 (성공):**
```json
{
  "success": true,
  "message": "문자 발송 성공",
  "data": {
    "sentCount": 2,
    "failCount": 0,
    "msgType": "SMS"
  }
}
```

**응답 예시 (실패):**
```json
{
  "success": false,
  "error": "문자 발송 실패",
  "message": "아이디가 입력되지 않았습니다",
  "resultCode": "-101"
}
```

---

### SMS 발송 내역 조회 API

**엔드포인트:** `GET /api/sms/logs?userId=1`

**응답 예시:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "recipient_phone": "01012345678",
      "message_content": "안녕하세요...",
      "status": "sent",
      "sent_at": "2026-01-13 14:30:00",
      "result_code": "1",
      "result_message": "발송 성공",
      "cost": 20,
      "created_by": 1,
      "created_at": "2026-01-13 14:30:00"
    }
  ]
}
```

---

## 💰 비용 안내

### 알리고 요금제
- **SMS (단문)**: 90자 이하, 건당 약 8-20원
- **LMS (장문)**: 2,000자 이하, 건당 약 40-60원
- **MMS (사진)**: 이미지 포함, 건당 약 150-200원

### 자동 메시지 타입 선택
코드에서 자동으로 결정:
- 90자 이하 → **SMS** (저렴)
- 90자 초과 → **LMS** (비쌈)

---

## 🗄️ 데이터베이스 구조

### sms_history 테이블
```sql
CREATE TABLE sms_history (
  id INTEGER PRIMARY KEY,
  recipient_phone TEXT NOT NULL,      -- 수신자 번호
  message_content TEXT NOT NULL,       -- 메시지 내용
  status TEXT DEFAULT 'pending',       -- 상태: pending/sent/failed
  sent_at DATETIME,                   -- 발송 시간
  result_code TEXT,                   -- 결과 코드
  result_message TEXT,                -- 결과 메시지
  cost INTEGER DEFAULT 0,             -- 비용 (원)
  created_by INTEGER,                 -- 발송자 ID
  created_at DATETIME                 -- 생성 시간
);
```

---

## 🎯 다음 단계

### 1. 알리고 정보 확인
- [ ] 알리고 로그인
- [ ] 사용자 ID 확인
- [ ] 발신번호 등록/확인

### 2. 코드 수정
- [ ] `ALIGO_USER_ID` 업데이트
- [ ] `SENDER_PHONE` 업데이트
- [ ] Git 커밋 & 푸시

### 3. 테스트
- [ ] 테스트 번호로 SMS 발송
- [ ] 발송 내역 확인
- [ ] 비용 확인

### 4. 프론트엔드 UI 구현 (선택)
- [ ] SMS 발송 페이지 제작
- [ ] 수신자 목록 관리
- [ ] 템플릿 관리

---

## 🚨 주의사항

### 발신번호 제한
- 알리고에 **등록된 번호만** 발신 가능
- 미등록 번호 사용 시 발송 실패

### API 호출 제한
- 과도한 호출 시 차단 가능
- 테스트는 소량으로 진행

### 개인정보 보호
- 수신 거부 기능 필수
- 불필요한 광고성 문자 금지

---

## 📞 알리고 고객센터

- **전화**: 1661-5656
- **이메일**: help@aligo.in
- **운영시간**: 평일 09:00-18:00

---

## ✅ 체크리스트

배포 전:
- [ ] 알리고 사용자 ID 확인
- [ ] 발신번호 등록 완료
- [ ] 코드에 정보 업데이트
- [ ] 테스트 발송 성공

배포 후:
- [ ] 실제 환경에서 테스트
- [ ] 발송 내역 DB 확인
- [ ] 비용 모니터링

---

**원장님, 다음 정보를 확인해서 알려주세요:**
1. **알리고 사용자 ID** (로그인 후 마이페이지에서 확인)
2. **발신번호** (학원 대표 전화번호)

정보를 주시면 코드를 즉시 업데이트하겠습니다! 📱
