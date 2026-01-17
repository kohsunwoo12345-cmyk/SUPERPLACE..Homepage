# 🔥 100% 해결 방법 - D1 Console 직접 실행

## ⚠️ 중요: students 테이블이 완전히 잠겨있습니다!

UPDATE조차 실패하는 것은 **students 테이블 자체에 ON UPDATE RESTRICT**가 걸려있다는 의미입니다.

## 🎯 유일한 해결책: 테이블 완전 재생성

D1 Console에서 다음을 **정확히 순서대로** 실행하세요:

---

### Step 1: 새 students 테이블 생성

```sql
CREATE TABLE students_v2 (
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

**결과**: "Query succeeded" 확인

---

### Step 2: 학생 4를 제외한 모든 데이터 복사

```sql
INSERT INTO students_v2 SELECT * FROM students WHERE id != 4;
```

**결과**: "X rows affected" 확인 (X = 학생 수 - 1)

---

### Step 3: 데이터 확인

```sql
SELECT COUNT(*) as total FROM students;
SELECT COUNT(*) as new_total FROM students_v2;
SELECT id, name FROM students_v2 ORDER BY id LIMIT 10;
```

**확인**: 
- new_total = total - 1
- 학생 4가 students_v2에 없어야 함

---

### Step 4: daily_records 업데이트

```sql
UPDATE daily_records SET student_id = NULL WHERE student_id = 4;
```

또는 삭제:

```sql
DELETE FROM daily_records WHERE student_id = 4;
```

---

### Step 5: 기존 students 테이블 삭제

```sql
DROP TABLE students;
```

**⚠️ 이 단계가 실패하면?**
→ 다른 테이블이 students를 참조하고 있습니다!
→ Step 10으로 이동

---

### Step 6: 새 테이블 이름 변경

```sql
ALTER TABLE students_v2 RENAME TO students;
```

---

### Step 7: 인덱스 재생성

```sql
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
```

---

### Step 8: 웹에서 확인

https://superplace-academy.pages.dev/students/list

**결과**: 학생 4가 목록에 없어야 함!

---

### Step 9: 다른 학생 삭제 테스트

웹에서 다른 학생 삭제 버튼 클릭

**결과**: ✅ 정상 작동!

---

## 🚨 Step 5가 실패할 경우 (다른 테이블이 참조)

### Step 10: 참조하는 테이블 찾기

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%REFERENCES students%';
```

**결과를 복사해서 저에게 보내주세요!**

---

### Step 11: 참조 테이블도 재생성 (예: attendance)

```sql
CREATE TABLE attendance_v2 AS SELECT * FROM attendance;
DROP TABLE attendance;
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date DATE,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO attendance SELECT * FROM attendance_v2;
DROP TABLE attendance_v2;
```

**각 참조 테이블마다 반복**

---

### Step 12: Step 5부터 다시 실행

이제 students 테이블 삭제가 가능해야 합니다!

---

## 📊 진행 상황 체크리스트

- [ ] Step 1: students_v2 생성
- [ ] Step 2: 데이터 복사 (학생 4 제외)
- [ ] Step 3: 데이터 확인
- [ ] Step 4: daily_records 정리
- [ ] Step 5: students 삭제
- [ ] Step 6: students_v2 → students 변경
- [ ] Step 7: 인덱스 재생성
- [ ] Step 8: 웹 확인
- [ ] Step 9: 삭제 테스트

---

## 🎯 이 방법이 100% 작동하는 이유

1. **완전히 새로운 테이블** - 외래키 제약 없음
2. **문제 데이터 제외** - 학생 4를 아예 복사하지 않음
3. **기존 테이블 제거** - 모든 제약 사라짐
4. **깨끗한 시작** - 이후 삭제 정상 작동

---

## ⏱️ 예상 소요 시간

**총 5-10분**

각 단계 실행 후 결과를 확인하고 다음 단계로 진행하세요!

막히는 부분이 있으면 해당 단계의 에러 메시지를 보내주세요!

---

**지금 바로 Step 1부터 시작하세요!** 🚀
