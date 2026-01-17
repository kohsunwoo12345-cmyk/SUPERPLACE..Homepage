# 🚨 user_type 컬럼 추가 필요

## ❌ **새로운 에러 발생**

```
D1_ERROR: no such column: user_type at offset 24: SQLITE_ERROR
```

## 🔍 **원인**

`users` 테이블에 `user_type` 컬럼이 없음.

## ✅ **해결 방법**

### **Turso DB에서 SQL 실행**

1. https://turso.tech/ 로그인
2. **Databases** → **superplace-academy** 선택
3. **SQL Editor** 클릭
4. 아래 SQL 복사 & 실행

```sql
-- users 테이블에 user_type 컬럼 추가
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director';

-- parent_user_id 컬럼 추가 (선생님 연결용)
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;

-- 기존 사용자들의 user_type 설정
UPDATE users SET user_type = 'director' WHERE user_type IS NULL;

-- 확인
SELECT id, email, name, user_type, parent_user_id, academy_name
FROM users 
LIMIT 10;
```

### **예상 결과**

| id | email | name | user_type | parent_user_id | academy_name |
|----|-------|------|-----------|----------------|--------------|
| 1 | admin@... | 관리자 | director | NULL | 슈퍼플레이스 |

---

## 🧪 **SQL 실행 후 테스트**

### **API 테스트**

```bash
curl -X POST "https://superplace-academy.pages.dev/api/teachers/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newteacher@test.com",
    "password": "test1234!",
    "name": "김선생",
    "phone": "010-1234-5678",
    "academyName": "아무거나",
    "verificationCode": "APXE7J"
  }'
```

### **예상 성공 응답**

```json
{
  "success": true,
  "applicationId": 1,
  "message": "등록 신청이 완료되었습니다. 관리자 원장님의 승인을 기다려주세요.",
  "directorName": "관리자"
}
```

---

## 📋 **전체 마이그레이션 체크리스트**

이 프로젝트에 필요한 모든 테이블과 컬럼:

### **1. users 테이블**
- [x] id
- [x] email
- [x] password
- [x] name
- [x] phone
- [x] role
- [x] academy_name
- [x] academy_location
- [ ] **user_type** (director/teacher) ← 추가 필요
- [ ] **parent_user_id** (선생님의 원장 ID) ← 추가 필요

### **2. academy_verification_codes 테이블**
- [x] id
- [x] user_id
- [x] code
- [x] is_active
- [x] created_at
- [x] expires_at

### **3. teacher_applications 테이블**
- [x] id
- [x] email
- [x] password
- [x] name
- [x] phone
- [x] academy_name
- [x] director_email
- [x] verification_code
- [x] status
- [x] applied_at
- [x] processed_at
- [x] processed_by
- [x] reject_reason

---

## 🚀 **즉시 실행**

1. **Turso DB 접속**
2. **위 SQL 실행**
3. **웹사이트에서 테스트**
   - https://superplace-academy.pages.dev/signup
   - 선생님 선택
   - 정보 입력 (학원명은 아무거나)
   - 인증 코드: `APXE7J`
   - 등록 신청

---

## ✅ **완료 후 확인사항**

- [ ] SQL 실행 완료
- [ ] user_type 컬럼 추가 확인
- [ ] parent_user_id 컬럼 추가 확인
- [ ] 기존 사용자 user_type = 'director' 설정 확인
- [ ] 선생님 등록 테스트 성공

**모든 SQL을 실행한 후 알려주세요!** 🎯
