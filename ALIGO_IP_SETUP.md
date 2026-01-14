# 알리고 IP 인증 오류 해결 가이드

## ❌ 현재 문제
```
result_code: -101
message: "인증오류입니다.-IP"
```

알리고 API에서 IP 인증 오류가 발생하고 있습니다. 이는 보안을 위해 특정 IP만 API를 사용하도록 제한하는 기능입니다.

---

## 🔧 해결 방법

### **방법 1: 모든 IP 허용 (개발/테스트용 권장)**

1. **알리고 관리자 페이지 접속**
   - URL: https://smartsms.aligo.in/
   - 로그인: wangholy / 비밀번호

2. **API 설정 메뉴**
   - 좌측 메뉴 → "API 관리" 또는 "API 설정"
   - "IP 필터링" 또는 "IP 제한" 메뉴 찾기

3. **IP 제한 해제**
   - "모든 IP 허용" 또는 "IP 제한 없음" 선택
   - 저장

4. **설정 완료**
   - 설정 후 5분 정도 대기
   - API 재테스트

---

### **방법 2: 특정 IP만 허용 (프로덕션용 권장)**

#### **추가해야 할 IP 목록:**

**개발 서버 (샌드박스):**
```
현재 샌드박스 IP를 확인해야 합니다.
```

**Cloudflare Pages (프로덕션):**
```
Cloudflare는 동적 IP를 사용하므로 IP 범위를 등록해야 합니다.
참고: https://www.cloudflare.com/ips/

IPv4 범위 예시:
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
```

**설정 방법:**
1. 알리고 관리자 페이지 접속
2. API 설정 → IP 필터링
3. "허용 IP 추가" 클릭
4. 위 IP 범위를 하나씩 추가
5. 저장

---

## 🧪 테스트 방법

### **1. IP 설정 확인 후 테스트**

```bash
# 알리고 API 직접 테스트 (testmode_yn=Y)
curl -X POST "https://apis.aligo.in/send/" \
  --data-urlencode "key=4bbi3l27pb5qh11tkujl578bttz6vb5j" \
  --data-urlencode "user_id=wangholy" \
  --data-urlencode "sender=01087399697" \
  --data-urlencode "receiver=01087399697" \
  --data-urlencode "msg=테스트 메시지입니다." \
  --data-urlencode "testmode_yn=Y"
```

**성공 응답:**
```json
{
    "result_code": 1,
    "message": "",
    "msg_id": 123456789,
    "success_cnt": 1,
    "error_cnt": 0,
    "msg_type": "SMS"
}
```

### **2. 발송가능건수 조회**

```bash
curl -X POST "https://apis.aligo.in/remain/" \
  --data-urlencode "key=4bbi3l27pb5qh11tkujl578bttz6vb5j" \
  --data-urlencode "user_id=wangholy"
```

**성공 응답:**
```json
{
    "result_code": 1,
    "message": "",
    "SMS_CNT": 5555,
    "LMS_CNT": 1930,
    "MMS_CNT": 833
}
```

---

## 📱 우리 시스템에서 테스트

IP 설정이 완료되면 다음 명령어로 시스템 테스트:

```bash
# 1. 개발 서버 재시작
cd /home/user/webapp
pm2 restart webapp

# 2. SMS 테스트 발송
curl -X POST "http://localhost:3000/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [{"name": "테스트", "phone": "01087399697"}],
    "message": "시스템 테스트 메시지입니다."
  }'
```

---

## 🎯 권장 설정

### **개발 단계 (현재)**
- ✅ **모든 IP 허용** 설정
- 빠른 개발 및 테스트 가능
- IP 관리 불필요

### **프로덕션 단계 (서비스 오픈 후)**
- ✅ **Cloudflare IP 범위만 허용**
- 보안 강화
- 무단 사용 방지

---

## 💡 추가 참고사항

### **알리고 고객센터**
- 전화: 1577-6556
- 이메일: cs@aligosoft.com
- 운영시간: 평일 09:00-18:00

### **IP 확인 방법**
```bash
# 현재 서버의 외부 IP 확인
curl ifconfig.me
```

### **Cloudflare Pages IP 정보**
- 공식 문서: https://www.cloudflare.com/ips/
- IP 범위는 주기적으로 업데이트됨
- 최신 IP 범위를 확인하여 등록 필요

---

## ✅ 체크리스트

- [ ] 알리고 관리자 페이지 로그인
- [ ] API 설정 → IP 필터링 메뉴 찾기
- [ ] "모든 IP 허용" 설정 (개발용) 또는 Cloudflare IP 추가 (프로덕션용)
- [ ] 설정 저장 후 5분 대기
- [ ] 알리고 API 직접 테스트
- [ ] 발송가능건수 조회 테스트
- [ ] 시스템 SMS 발송 테스트
- [ ] 테스트 모드 (testmode_yn=Y) 확인
- [ ] 실제 발송 테스트

---

IP 설정이 완료되면 저에게 알려주세요! 그러면 전체 시스템 테스트를 진행하겠습니다! 😊
