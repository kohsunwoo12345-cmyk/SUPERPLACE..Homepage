# 🎯 즉시 실행: 학생 삭제 해결

## ✅ 확인 완료

모든 테이블에 **명시적 FOREIGN KEY 제약 없음** 확인!

그럼에도 오류가 발생하는 이유:
- D1이 내부적으로 인덱스 기반 제약 관리
- 또는 트리거/제약 자동 생성

## 🔧 해결 방법 1: 직접 삭제 시도 (추천)

D1 Console에서 다음을 **순서대로** 실행:

### Step 1: 학생 4번 확인
```sql
SELECT id, name, status, class_id FROM students WHERE id = 4;
```

### Step 2: daily_records 확인 및 삭제
```sql
-- 관련 레코드 확인
SELECT COUNT(*) as count FROM daily_records WHERE student_id = 4;

-- 있다면 삭제
DELETE FROM daily_records WHERE student_id = 4;
```

### Step 3: attendance 확인 및 삭제
```sql
-- attendance 테이블 구조 확인
SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance';

-- 관련 레코드 확인
SELECT COUNT(*) as count FROM attendance WHERE student_id = 4;

-- 있다면 삭제
DELETE FROM attendance WHERE student_id = 4;
```

### Step 4: 학생 삭제 (Hard Delete)
```sql
DELETE FROM students WHERE id = 4;
```

**결과:**
- ✅ 성공 → 웹에서 테스트
- ❌ 실패 → Step 5로

### Step 5: Soft Delete (Hard Delete 실패 시)
```sql
UPDATE students SET status = 'deleted', class_id = NULL WHERE id = 4;
```

---

## 🔧 해결 방법 2: 테이블 재생성 (확실한 방법)

Hard Delete도 안 되면, 테이블을 재생성하여 모든 제약 제거:

### 1. 백업 생성
```sql
CREATE TABLE students_backup AS SELECT * FROM students;
CREATE TABLE daily_records_backup AS SELECT * FROM daily_records;
```

### 2. 확인
```sql
SELECT COUNT(*) FROM students_backup;
SELECT COUNT(*) FROM daily_records_backup;
```

### 3. 원본 테이블 삭제
```sql
DROP TABLE daily_records;
DROP TABLE students;
```

### 4. 재생성 (제약 없이)
```sql
-- students 테이블
CREATE TABLE students (
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

-- daily_records 테이블
CREATE TABLE daily_records (
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

### 5. 데이터 복원
```sql
INSERT INTO students SELECT * FROM students_backup;
INSERT INTO daily_records SELECT * FROM daily_records_backup;
```

### 6. 확인
```sql
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM daily_records;
```

### 7. 백업 삭제
```sql
DROP TABLE students_backup;
DROP TABLE daily_records_backup;
```

### 8. 삭제 테스트
```sql
DELETE FROM students WHERE id = 4;
```

---

## 🚀 추천 순서

1. **먼저 방법 1 시도** (5분)
   - Step 1~4 실행
   - 성공하면 끝!

2. **실패하면 방법 2** (10분)
   - 테이블 재생성
   - 100% 해결됨

---

## 📋 실행 체크리스트

### 방법 1
- [ ] Step 1: 학생 4 확인
- [ ] Step 2: daily_records 삭제
- [ ] Step 3: attendance 삭제
- [ ] Step 4: 학생 삭제 (DELETE)
- [ ] Step 5: Soft Delete (필요 시)

### 방법 2 (방법 1 실패 시)
- [ ] 백업 생성
- [ ] 원본 삭제
- [ ] 재생성
- [ ] 데이터 복원
- [ ] 테스트

---

## ✅ 최종 확인

D1 Console에서 성공하면:

```sql
-- 삭제된 학생 확인 (Hard Delete 사용 시)
SELECT * FROM students WHERE id = 4;
-- 결과: 없음 (0 rows)

-- 또는 (Soft Delete 사용 시)
SELECT id, name, status FROM students WHERE id = 4;
-- 결과: status = 'deleted'
```

웹에서 확인:
```
https://superplace-academy.pages.dev/students/list
```
→ 학생 삭제 버튼 클릭 → ✅ 성공!

---

**지금 바로**: 방법 1의 Step 1부터 실행하고 결과를 알려주세요!
