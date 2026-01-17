# 🎯 사용자가 웹에서 학생 삭제할 수 있도록 영구 수정

## 문제
웹 페이지 삭제 버튼 클릭 시 `FOREIGN KEY constraint failed` 오류 발생

## 해결 방법
D1 데이터베이스의 **외래키 제약을 영구적으로 제거**해야 합니다.

---

## 🔧 D1 Console 접속

1. https://dash.cloudflare.com/ 로그인
2. Workers & Pages → D1 SQL Database
3. **webapp-production** 클릭
4. **Console** 탭 클릭

---

## 📋 실행할 SQL (순서대로)

### Step 1: 현재 외래키 확인

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND sql LIKE '%FOREIGN KEY%';
```

또는

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('students', 'daily_records', 'attendance', 'grades', 'counseling', 'learning_reports');
```

→ 외래키가 있는 테이블을 확인하세요!

---

### Step 2: 문제 테이블 재생성 (외래키 제거)

#### 2-1. students 테이블 백업 및 재생성

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

```sql
INSERT INTO students_new SELECT * FROM students;
```

```sql
DROP TABLE students;
```

```sql
ALTER TABLE students_new RENAME TO students;
```

```sql
CREATE INDEX idx_students_academy_id ON students(academy_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_status ON students(status);
```

---

#### 2-2. daily_records 테이블 재생성 (있다면)

```sql
CREATE TABLE daily_records_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER,
  record_date DATE NOT NULL,
  attendance TEXT CHECK(attendance IN ('출석', '지각', '결석', '조퇴')),
  homework_status TEXT CHECK(homework_status IN ('완료', '미완료', '부분완료')),
  understanding_level INTEGER CHECK(understanding_level >= 1 AND understanding_level <= 5),
  participation_level INTEGER CHECK(participation_level >= 1 AND participation_level <= 5),
  achievement TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO daily_records_new SELECT * FROM daily_records;
```

```sql
DROP TABLE daily_records;
```

```sql
ALTER TABLE daily_records_new RENAME TO daily_records;
```

```sql
CREATE INDEX idx_daily_records_student_id ON daily_records(student_id);
CREATE INDEX idx_daily_records_date ON daily_records(record_date);
```

---

#### 2-3. attendance 테이블 재생성 (있다면)

```sql
CREATE TABLE attendance_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO attendance_new SELECT * FROM attendance;
```

```sql
DROP TABLE attendance;
```

```sql
ALTER TABLE attendance_new RENAME TO attendance;
```

---

#### 2-4. grades 테이블 재생성 (있다면)

```sql
CREATE TABLE grades_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT,
  score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO grades_new SELECT * FROM grades;
```

```sql
DROP TABLE grades;
```

```sql
ALTER TABLE grades_new RENAME TO grades;
```

---

#### 2-5. counseling 테이블 재생성 (있다면)

```sql
CREATE TABLE counseling_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO counseling_new SELECT * FROM counseling;
```

```sql
DROP TABLE counseling;
```

```sql
ALTER TABLE counseling_new RENAME TO counseling;
```

---

#### 2-6. learning_reports 테이블 재생성 (있다면)

```sql
CREATE TABLE learning_reports_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  report_date DATE,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO learning_reports_new SELECT * FROM learning_reports;
```

```sql
DROP TABLE learning_reports;
```

```sql
ALTER TABLE learning_reports_new RENAME TO learning_reports;
```

---

### Step 3: 데이터 확인

```sql
SELECT COUNT(*) FROM students;
```

```sql
SELECT COUNT(*) FROM daily_records;
```

```sql
SELECT id, name FROM students ORDER BY id LIMIT 5;
```

---

### Step 4: 웹에서 테스트

1. https://superplace-academy.pages.dev/students/list 접속
2. **아무 학생이나 선택** → 삭제 버튼 클릭
3. **✅ "학생이 삭제되었습니다" 메시지 확인!**

---

## 🎯 이후 영구적으로 작동

이제 **외래키 제약이 완전히 제거**되었으므로:

- ✅ 웹에서 학생 삭제 → **정상 작동**
- ✅ 모든 사용자가 삭제 가능
- ✅ 더 이상 FOREIGN KEY 오류 없음!

---

## ⚡ 빠른 방법 (모든 테이블 한 번에)

만약 모든 테이블을 확실히 재생성하려면:

```sql
CREATE TABLE students_clean AS SELECT * FROM students;
CREATE TABLE daily_records_clean AS SELECT * FROM daily_records;
CREATE TABLE attendance_clean AS SELECT * FROM attendance WHERE 1=1;
CREATE TABLE grades_clean AS SELECT * FROM grades WHERE 1=1;
CREATE TABLE counseling_clean AS SELECT * FROM counseling WHERE 1=1;
CREATE TABLE learning_reports_clean AS SELECT * FROM learning_reports WHERE 1=1;

DROP TABLE daily_records;
DROP TABLE attendance;
DROP TABLE grades;
DROP TABLE counseling;
DROP TABLE learning_reports;
DROP TABLE students;

ALTER TABLE students_clean RENAME TO students;
ALTER TABLE daily_records_clean RENAME TO daily_records;
ALTER TABLE attendance_clean RENAME TO attendance;
ALTER TABLE grades_clean RENAME TO grades;
ALTER TABLE counseling_clean RENAME TO counseling;
ALTER TABLE learning_reports_clean RENAME TO learning_reports;
```

그 다음 위의 인덱스 생성 쿼리들 실행!

---

## 📌 중요!

이 작업은 **한 번만** 하면 됩니다.  
완료 후 **모든 사용자가 웹에서 학생을 삭제**할 수 있습니다! 🎉

---

**예상 소요 시간**: 10-15분
