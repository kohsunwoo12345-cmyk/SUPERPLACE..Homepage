# 🚨 최후의 해결 방법 - 학생 4 직접 제거

## 상황

코드 레벨에서는 더 이상 해결할 수 없습니다.  
**D1 Console에서 직접 작업**해야 합니다.

## 🎯 D1 Console 접속

1. https://dash.cloudflare.com/ 로그인
2. Workers & Pages → D1 SQL Database
3. **webapp-production** 클릭
4. **Console** 탭 클릭

## 🔧 실행할 SQL (하나씩 복사해서 실행)

### 방법 1: 강제 삭제 (권장)

```sql
PRAGMA foreign_keys = OFF;
```

```sql
DELETE FROM daily_records WHERE student_id = 4;
```

```sql
DELETE FROM attendance WHERE student_id = 4;
```

```sql
DELETE FROM grades WHERE student_id = 4;
```

```sql
DELETE FROM counseling WHERE student_id = 4;
```

```sql
DELETE FROM learning_reports WHERE student_id = 4;
```

```sql
DELETE FROM students WHERE id = 4;
```

```sql
SELECT * FROM students WHERE id = 4;
```
→ 결과: 0 rows (학생 4가 없어야 함)

```sql
PRAGMA foreign_keys = ON;
```

---

### 방법 2: 테이블 재생성 (방법 1 실패 시)

```sql
CREATE TABLE students_clean AS SELECT * FROM students WHERE id != 4;
```

```sql
DROP TABLE students;
```

```sql
ALTER TABLE students_clean RENAME TO students;
```

```sql
CREATE INDEX idx_students_academy_id ON students(academy_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_status ON students(status);
```

---

## ✅ 성공 확인

D1 Console에서:
```sql
SELECT COUNT(*) as total FROM students;
SELECT id, name FROM students ORDER BY id;
```

웹 페이지:
https://superplace-academy.pages.dev/students/list

→ 학생 4가 없어야 함!

---

## 🔥 지금 바로 실행하세요!

**방법 1을 먼저 시도**하고, 실패하면 **방법 2**를 사용하세요.

각 SQL을 **하나씩** 복사해서 D1 Console에 붙여넣고 실행하면 됩니다!
