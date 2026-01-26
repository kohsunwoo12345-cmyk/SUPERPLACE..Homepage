# 🚨 긴급: 꾸메땅학원 학생 목록이 안 보이는 문제 해결

## 🔴 문제 상황
- 꾸메땅학원 원장님/선생님 계정에서 학생 목록이 **비어있음**
- 다른 학원 계정에서도 학생이 안 보임 (이건 정상)

## 🔍 원인
DB에 학생 데이터의 `academy_id`가 잘못 설정되어 있어서 필터링 쿼리에서 조회되지 않음

---

## ✅ 즉시 해결 방법

### 🔥 방법 1: Cloudflare D1 Console (가장 빠름!)

#### 1단계: D1 Console 접속
```
https://dash.cloudflare.com
→ Workers & Pages 
→ D1 
→ 데이터베이스 선택
→ Console 탭
```

#### 2단계: 현재 상태 확인

먼저 꾸메땅학원 사용자 ID를 확인:
```sql
SELECT id, email, academy_name, academy_id, role 
FROM users 
WHERE academy_name LIKE '%꾸메땅%' 
ORDER BY id;
```

**결과 예시:**
```
id=1, academy_name='꾸메땅학원', academy_id=1
```
→ 꾸메땅학원의 academy_id는 **1**입니다 (보통 첫 번째 사용자)

#### 3단계: 학생 데이터 확인
```sql
-- 학생들의 현재 academy_id 확인
SELECT id, name, academy_id, class_id, status
FROM students 
WHERE status != 'deleted' OR status IS NULL
ORDER BY id DESC
LIMIT 20;
```

#### 4단계: academy_id 수정 (핵심!)

**방법 A: class 기반 수정 (권장)**
```sql
UPDATE students 
SET academy_id = (
  SELECT COALESCE(c.academy_id, c.user_id) 
  FROM classes c 
  WHERE c.id = students.class_id
  LIMIT 1
)
WHERE class_id IS NOT NULL 
  AND class_id IN (SELECT id FROM classes);
```

**방법 B: 꾸메땅학원으로 강제 설정** (모든 학생이 꾸메땅학원인 경우)
```sql
-- ⚠️ 주의: 이 방법은 모든 학생을 꾸메땅학원(academy_id=1)으로 설정합니다!
UPDATE students 
SET academy_id = 1 
WHERE academy_id IS NULL OR academy_id != 1;
```

#### 5단계: 결과 확인
```sql
-- 수정 후 확인
SELECT s.id, s.name, s.academy_id, c.class_name, c.academy_id as class_academy_id
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.status != 'deleted' OR s.status IS NULL
ORDER BY s.id DESC
LIMIT 20;
```

**✅ 정상 결과:**
- 모든 학생의 `academy_id` = 1 (꾸메땅학원)
- `academy_id`와 `class_academy_id`가 일치

#### 6단계: 학원별 학생 수 확인
```sql
SELECT 
  u.id as academy_id,
  u.academy_name,
  COUNT(s.id) as student_count
FROM users u
LEFT JOIN students s ON u.id = s.academy_id
WHERE u.role = 'director' OR u.user_type = 'director'
GROUP BY u.id, u.academy_name
ORDER BY student_count DESC;
```

---

### 🔧 방법 2: Wrangler CLI

```bash
cd /home/user/webapp

# 1. 사용자 확인
export CLOUDFLARE_API_TOKEN="rF5DqCzMKhz5ERsV8zXIF6yHG2CcaJ-IV0LktvIP"
npx wrangler d1 execute DB --command="SELECT id, academy_name, academy_id FROM users WHERE academy_name LIKE '%꾸메땅%'" --remote

# 2. 학생 academy_id 수정
npx wrangler d1 execute DB --file=./migrations/fix_kumetang_students.sql --remote

# 3. 확인
npx wrangler d1 execute DB --command="SELECT academy_id, COUNT(*) FROM students GROUP BY academy_id" --remote
```

---

## 🧪 테스트 방법

### 1. SQL 실행 완료 후
```
URL: https://superplace-academy.pages.dev/students
로그인: 꾸메땅학원 계정
```

### 2. 확인 사항
- ✅ 꾸메땅학원 학생 목록이 보임
- ✅ 학생 수가 정상적으로 표시됨
- ✅ 학생 정보 클릭 가능

### 3. 다른 학원 계정 테스트 (있는 경우)
- ✅ 해당 학원의 학생만 보임
- ❌ 꾸메땅학원 학생이 보이면 안됨

---

## 📋 문제 해결 체크리스트

- [ ] D1 Console 접속
- [ ] 꾸메땅학원 사용자 ID 확인 (보통 1)
- [ ] 학생 데이터의 현재 academy_id 확인
- [ ] academy_id 수정 SQL 실행
- [ ] 결과 확인 (모든 학생이 academy_id=1)
- [ ] 웹사이트에서 테스트 (학생 목록 보이는지)

---

## 🚨 빠른 해결 (가장 간단한 방법)

만약 **모든 학생이 꾸메땅학원 소속**이라면:

```sql
-- D1 Console에서 이것만 실행하세요!
UPDATE students SET academy_id = 1;
```

그러고 나서 즉시 테스트:
```
https://superplace-academy.pages.dev/students
```

---

## 💡 추가 정보

### 왜 이런 문제가 발생했나?
1. 학생 추가 시 academy_id가 잘못 설정됨 (이미 수정 완료)
2. 기존 DB 데이터에 잘못된 academy_id가 남아있음 → **지금 수정 필요!**

### 코드는 이미 수정됨 ✅
- 앞으로 추가되는 학생은 올바른 academy_id 설정
- 기존 데이터만 수정하면 100% 해결!

---

**실행 우선순위**: 🔴 즉시 실행 필요  
**예상 시간**: 2-3분  
**난이도**: ⭐⭐ (SQL 복사 & 붙여넣기만 하면 됨)
