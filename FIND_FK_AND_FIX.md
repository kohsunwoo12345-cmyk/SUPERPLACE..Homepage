# 🔍 외래키 찾기 및 제거 방법

## Step 1: REFERENCES 있는 테이블 찾기

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql LIKE '%REFERENCES%' ORDER BY name;
```

**이 결과를 저에게 보내주세요!**

---

## Step 2: student_id 포함 테이블 확인

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%student_id%' ORDER BY name;
```

**이 결과도 저에게 보내주세요!**

---

## Step 3: 각 테이블 구조 확인

### attendance 테이블
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance';
```

### grades 테이블
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='grades';
```

### counseling 테이블
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='counseling';
```

### learning_reports 테이블
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='learning_reports';
```

---

## 🛠️ 해결 방법: 문제 테이블 재생성

위 쿼리 결과에서 **REFERENCES students**가 발견되면:

### 예시: attendance 테이블에 외래키가 있는 경우

```sql
CREATE TABLE attendance_backup AS SELECT * FROM attendance;

DROP TABLE attendance;

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  ...
);

INSERT INTO attendance SELECT * FROM attendance_backup;

DROP TABLE attendance_backup;
```

---

## 🚀 빠른 해결: 모든 관련 테이블 재생성

### 1단계: 백업
```sql
CREATE TABLE attendance_backup AS SELECT * FROM attendance WHERE 1=1;
CREATE TABLE grades_backup AS SELECT * FROM grades WHERE 1=1;
CREATE TABLE counseling_backup AS SELECT * FROM counseling WHERE 1=1;
CREATE TABLE learning_reports_backup AS SELECT * FROM learning_reports WHERE 1=1;
```

### 2단계: 삭제
```sql
DROP TABLE attendance;
DROP TABLE grades;
DROP TABLE counseling;
DROP TABLE learning_reports;
```

### 3단계: 재생성 (외래키 없이)

**attendance:**
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**grades:**
```sql
CREATE TABLE grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT,
  score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**counseling:**
```sql
CREATE TABLE counseling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**learning_reports:**
```sql
CREATE TABLE learning_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  report_date DATE,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4단계: 데이터 복원
```sql
INSERT INTO attendance SELECT * FROM attendance_backup;
INSERT INTO grades SELECT * FROM grades_backup;
INSERT INTO counseling SELECT * FROM counseling_backup;
INSERT INTO learning_reports SELECT * FROM learning_reports_backup;
```

### 5단계: 백업 삭제
```sql
DROP TABLE attendance_backup;
DROP TABLE grades_backup;
DROP TABLE counseling_backup;
DROP TABLE learning_reports_backup;
```

### 6단계: 테스트
```sql
DELETE FROM students WHERE id = 4;
```

---

## ⚡ 더 빠른 방법: 테이블 스키마 확인 후 선택적 재생성

**먼저 Step 1, 2의 결과를 보내주세요!**

그러면 정확히 **어떤 테이블에 외래키가 있는지** 알려드리고,  
**그 테이블만 재생성**하는 정확한 SQL을 드릴게요!

---

## 📋 체크리스트

- [ ] Step 1 실행 (REFERENCES 찾기)
- [ ] Step 2 실행 (student_id 찾기)
- [ ] 결과를 저에게 보내기
- [ ] 문제 테이블 재생성
- [ ] DELETE 테스트

**Step 1, 2의 결과를 보내주세요!**
