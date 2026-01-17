# D1 Console 쿼리 (주석 제거 버전)

D1 Console에 다음 쿼리를 **하나씩** 복사해서 실행해주세요:

## 1️⃣ 학생 4 삭제 시도

```sql
DELETE FROM students WHERE id = 4;
```

**결과를 알려주세요:**
- ✅ "Query succeeded" 
- ❌ "FOREIGN KEY constraint failed"

---

## 2️⃣ attendance 테이블 구조 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance';
```

---

## 3️⃣ grades 테이블 구조 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='grades';
```

---

## 4️⃣ counseling 테이블 구조 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='counseling';
```

---

## 5️⃣ learning_reports 테이블 구조 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='learning_reports';
```

---

## 6️⃣ 모든 테이블의 CREATE TABLE 문 보기

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql LIKE '%REFERENCES%' ORDER BY name;
```

이 쿼리는 **REFERENCES가 포함된 테이블**만 찾습니다!

---

## 🎯 중요!

**1번 쿼리(DELETE)의 결과**가 가장 중요합니다!

- ✅ 성공하면: 애플리케이션 코드 문제
- ❌ 실패하면: 2~6번 쿼리로 외래키 찾기

결과를 알려주세요!
