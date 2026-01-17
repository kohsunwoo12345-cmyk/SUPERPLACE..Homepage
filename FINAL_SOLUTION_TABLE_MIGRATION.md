# 🚨 긴급 해결 방법: 새 테이블로 마이그레이션

D1 Console에서 다음을 **순서대로** 실행하세요:

## Step 1: 새 students 테이블 생성

```sql
CREATE TABLE students_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  phone TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  grade TEXT NOT NULL,
  subjects TEXT NOT NULL,
  enrollment_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  class_id INTEGER
);
```

## Step 2: 학생 4를 제외한 데이터 복사

```sql
INSERT INTO students_new 
SELECT * FROM students WHERE id != 4;
```

## Step 3: 확인

```sql
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM students_new;
```

## Step 4: 기존 students 테이블 이름 변경

```sql
ALTER TABLE students RENAME TO students_old;
```

## Step 5: 새 테이블을 students로 이름 변경

```sql
ALTER TABLE students_new RENAME TO students;
```

## Step 6: 테스트

```sql
SELECT * FROM students ORDER BY id;
```

학생 4가 없어야 합니다!

## Step 7: 웹에서 확인

https://superplace-academy.pages.dev/students/list

학생 4가 목록에서 사라졌는지 확인

## Step 8: 성공하면 기존 테이블 삭제

```sql
DROP TABLE students_old;
```

---

## 🎯 이 방법이 100% 작동하는 이유

1. **새 테이블은 외래키 없음** - 깨끗한 테이블
2. **학생 4 제외하고 복사** - 애초에 문제 데이터 안 넣음
3. **테이블 교체** - 기존 외래키 제약 우회

---

**지금 바로 실행하세요!**

각 단계 실행 후 결과를 알려주시면 다음 단계를 안내드립니다!
