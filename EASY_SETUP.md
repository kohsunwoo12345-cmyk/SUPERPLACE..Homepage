# 🚀 초간단 설치 가이드 (비개발자용)

## 📱 3단계로 끝!

---

## 1단계: Turso 웹사이트 로그인

### 👉 https://turso.tech/ 접속

1. 오른쪽 위 **"Sign in"** 버튼 클릭
2. **"Continue with GitHub"** 클릭
3. GitHub 계정으로 로그인

---

## 2단계: 데이터베이스 열기

### 왼쪽 메뉴에서:

1. **"Databases"** 클릭
2. `webapp-production` 찾기 (또는 `superplace-academy`)
3. 클릭해서 열기

---

## 3단계: SQL 실행

### SQL Editor에서:

1. 상단 탭에서 **"SQL Editor"** 또는 **"Console"** 클릭

2. 아래 코드 **전체 복사** (Ctrl+A → Ctrl+C)

```sql
-- ============================================
-- 간단 설치 (복사해서 붙여넣기!)
-- ============================================

ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'director';
ALTER TABLE users ADD COLUMN parent_user_id INTEGER;

UPDATE users SET user_type = 'director' WHERE user_type IS NULL;

CREATE TABLE IF NOT EXISTS academy_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS teacher_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verification_code TEXT NOT NULL,
    academy_name TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    director_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (id, email, password, name, phone, academy_name, academy_location, user_type, role, points, created_at)
VALUES (999, 'director@test.com', 'test1234!', '김원장', '010-1234-5678', '슈퍼플레이스 학원', '서울 강남구', 'director', 'member', 0, datetime('now'));

INSERT OR IGNORE INTO academy_verification_codes (user_id, code, is_active)
VALUES (999, 'ABC123', 1);

SELECT '✅ 설치 완료!' as status;
```

3. SQL Editor에 **붙여넣기** (Ctrl+V)

4. **"Run"** 또는 **"Execute"** 버튼 클릭

5. 아래에 `✅ 설치 완료!` 메시지가 보이면 성공!

---

## ✅ 완료!

### 이제 사용 가능한 테스트 계정:

**원장님 계정:**
```
이메일: director@test.com
비밀번호: test1234!
인증코드: ABC123
```

### 사이트에서 로그인 테스트:

👉 https://superplace-academy.pages.dev/login

---

## 🎯 다음에 할 일

1. **로그인 테스트**
   - 위 테스트 계정으로 로그인

2. **선생님 등록 테스트**
   - 인증코드 `ABC123` 사용
   - 학원명 정확히 입력: `슈퍼플레이스 학원`

3. **실제 사용**
   - 학생 등록
   - 반 생성
   - 선생님 추가

---

## 💡 에러가 나도 괜찮아요!

- "column already exists" → 정상! 이미 있는 컬럼이라는 뜻
- "UNIQUE constraint failed" → 정상! 이미 있는 데이터라는 뜻

**마지막에 "✅ 설치 완료!" 메시지만 보이면 성공입니다!**

---

## 📞 문제가 생기면?

1. 페이지 새로고침 후 다시 시도
2. 다른 브라우저로 시도
3. 시크릿 모드로 시도

---

**이게 끝입니다! 정말 간단하죠? 🎉**
