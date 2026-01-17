# 🔍 선생님 등록 오류 디버깅 가이드

## ✅ **배포 완료**

- **URL**: https://superplace-academy.pages.dev
- **배포 ID**: f2ecce21
- **배포 일시**: 2026-01-17 17:10 KST
- **변경**: 상세한 에러 로그 추가

---

## 🔍 **에러 확인 방법**

### **1. 브라우저 콘솔 열기**

1. https://superplace-academy.pages.dev/signup 접속
2. **F12** 키 누르기 (또는 우클릭 → 검사)
3. **Console** 탭 클릭
4. 콘솔 비우기 (Clear 버튼)

### **2. 선생님 등록 시도**

1. "선생님" 선택
2. 모든 정보 입력
   - 이메일
   - 비밀번호
   - 이름
   - 연락처
   - 인증 코드
   - 학원 이름
3. "선생님 등록 신청" 클릭

### **3. 에러 메시지 확인**

#### **화면에 표시되는 메시지**
```
오류: 등록 신청 중 오류가 발생했습니다.

상세: [여기에 상세 에러 메시지]
```

#### **콘솔에 표시되는 로그**
```javascript
[TeacherApply] Error: [에러 메시지]
[TeacherApply] Error stack: [스택 트레이스]
[TeacherApply] Error message: [상세 메시지]
Error details: { success: false, error: "...", details: "..." }
```

---

## 🎯 **예상 에러 및 해결 방법**

### **에러 1: "no such table: academy_verification_codes"**

**원인**: 테이블이 생성되지 않음

**해결**: Turso DB에서 SQL 실행
```sql
CREATE TABLE IF NOT EXISTS academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON academy_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON academy_verification_codes(code);
```

### **에러 2: "no such table: teacher_applications"**

**원인**: teacher_applications 테이블 없음

**해결**: Turso DB에서 SQL 실행
```sql
CREATE TABLE IF NOT EXISTS teacher_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT NOT NULL,
  director_email TEXT,
  verification_code TEXT,
  status TEXT DEFAULT 'pending',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER,
  reject_reason TEXT,
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_applications_status ON teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_email ON teacher_applications(email);
```

### **에러 3: "no such column: code"**

**원인**: academy_verification_codes 테이블에 code 컬럼 없음

**해결**: 테이블 재생성
```sql
DROP TABLE IF EXISTS academy_verification_codes;

CREATE TABLE academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_verification_codes_user ON academy_verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON academy_verification_codes(code);

-- 테스트 코드 생성
INSERT INTO academy_verification_codes (user_id, code, is_active, created_at)
SELECT id, 'ABC123', 1, datetime('now')
FROM users 
WHERE email = 'director@test.com';
```

### **에러 4: "유효하지 않은 인증 코드"**

**원인**: 인증 코드가 DB에 없음

**해결**: Turso DB에서 코드 생성
```sql
-- 코드 확인
SELECT * FROM academy_verification_codes WHERE code = 'ABC123';

-- 없으면 생성
INSERT INTO academy_verification_codes (user_id, code, is_active, created_at)
SELECT id, 'ABC123', 1, datetime('now')
FROM users 
WHERE email = 'director@test.com';
```

---

## 🚀 **전체 테이블 재생성 (확실한 방법)**

Turso DB에서 아래 SQL 전체 실행:

```sql
-- 1. 기존 테이블 삭제
DROP TABLE IF EXISTS academy_verification_codes;
DROP TABLE IF EXISTS teacher_applications;

-- 2. academy_verification_codes 생성
CREATE TABLE academy_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_verification_codes_user ON academy_verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON academy_verification_codes(code);

-- 3. teacher_applications 생성
CREATE TABLE teacher_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  academy_name TEXT NOT NULL,
  director_email TEXT,
  verification_code TEXT,
  status TEXT DEFAULT 'pending',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER,
  reject_reason TEXT,
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

CREATE INDEX idx_teacher_applications_status ON teacher_applications(status);
CREATE INDEX idx_teacher_applications_email ON teacher_applications(email);

-- 4. 테스트 인증 코드 생성
INSERT INTO academy_verification_codes (user_id, code, is_active, created_at)
SELECT id, 'ABC123', 1, datetime('now')
FROM users 
WHERE email = 'director@test.com';

-- 5. 확인
SELECT 
  u.id, u.email, u.name,
  avc.code, avc.is_active
FROM users u
LEFT JOIN academy_verification_codes avc ON u.id = avc.user_id
WHERE u.email = 'director@test.com';
```

---

## 📝 **디버깅 체크리스트**

### **선생님 등록 시도**
- [ ] 1. F12 → Console 탭 열기
- [ ] 2. 콘솔 비우기
- [ ] 3. 선생님 정보 입력
- [ ] 4. "선생님 등록 신청" 클릭
- [ ] 5. 화면 에러 메시지 확인
- [ ] 6. 콘솔 로그 확인
- [ ] 7. 에러 메시지 복사

### **에러 메시지 확인 항목**
- [ ] `[TeacherApply] Error:` 로그
- [ ] `Error details:` 객체
- [ ] `details:` 필드 내용
- [ ] `stack:` 스택 트레이스

---

## 🎯 **다음 단계**

1. **위 방법대로 F12 콘솔 열고 시도**
2. **에러 메시지 전체 복사**
3. **에러 메시지 제공**

그러면 정확한 원인을 파악하고 즉시 수정하겠습니다!

---

## 📊 **현재 상태**

- ✅ 상세 에러 로그 추가
- ✅ 프론트엔드 에러 표시 개선
- ✅ 콘솔 로그 강화
- ✅ 배포 완료

**이제 F12 콘솔에서 정확한 에러를 확인할 수 있습니다!** 🔍
