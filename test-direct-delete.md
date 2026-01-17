# D1 Console에서 직접 테스트

## 1️⃣ D1 Console에서 실행

```sql
-- 학생 4 삭제
DELETE FROM students WHERE id = 4;
```

**질문**: 이 쿼리가 성공했나요?
- ✅ "Query succeeded" → D1에서는 성공
- ❌ FOREIGN KEY 오류 → D1에서도 실패

---

## 2️⃣ 만약 D1에서 성공했다면

문제는 **웹 애플리케이션 코드**에 있습니다!

### 확인 방법

```sql
-- 학생 목록 확인
SELECT id, name, status FROM students ORDER BY id;
```

학생 4가 없어졌나요?
- ✅ 없어짐 → D1 삭제 성공, 웹 코드 문제
- ❌ 여전히 있음 → D1 삭제 실패

---

## 3️⃣ 학생 ID 확인

```sql
-- 현재 존재하는 학생 ID들
SELECT id, name FROM students ORDER BY id LIMIT 10;
```

**이 결과를 저에게 보내주세요!**

---

## 4️⃣ 다른 학생으로 테스트

```sql
-- 예: 학생 ID 3 삭제
DELETE FROM students WHERE id = 3;

-- 확인
SELECT id, name FROM students WHERE id = 3;
```

성공했나요?

