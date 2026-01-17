# 다음 단계 쿼리 실행

## ✅ 1단계 완료!

students 테이블 구조 확인 완료 - **외래키 없음**

## 🔍 2단계: 다른 테이블 확인

D1 Console에서 다음 쿼리들을 **하나씩** 실행해주세요:

### 쿼리 1: 모든 테이블 목록 보기
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
```

**결과를 저에게 복사해서 보내주세요!**

---

### 쿼리 2: daily_records 테이블 구조
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_records';
```

---

### 쿼리 3: classes 테이블 구조
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='classes';
```

---

### 쿼리 4: users 테이블 구조 (있다면)
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';
```

---

## 🎯 그 다음: 외래키 비활성화 및 테스트

위 쿼리들의 결과를 확인한 후, 다음을 실행:

### 1. 외래키 비활성화
```sql
PRAGMA foreign_keys = OFF;
```

### 2. 즉시 삭제 테스트
```sql
UPDATE students 
SET status = 'deleted', class_id = NULL, updated_at = CURRENT_TIMESTAMP 
WHERE id = 4;
```

**결과:**
- ✅ "Query succeeded" → 성공!
- ❌ FOREIGN KEY 오류 → 추가 조치 필요

### 3. 확인
```sql
SELECT id, name, status, class_id FROM students WHERE id = 4;
```

---

## 📋 지금까지 확인된 정보

✅ **students 테이블**: 외래키 없음 (REFERENCES 없음)  
❓ **다른 테이블**: 확인 필요 (students.id를 참조할 가능성)

**쿼리 1~4의 결과**를 모두 보내주시면, 정확한 원인을 찾을 수 있습니다!

---

## 🚀 만약 급하다면 (임시 해결)

지금 바로 시도할 수 있는 방법:

```sql
-- 1. 외래키 비활성화
PRAGMA foreign_keys = OFF;

-- 2. 학생 4 삭제
UPDATE students SET status='deleted', class_id=NULL WHERE id=4;

-- 3. 다른 학생도 테스트
UPDATE students SET status='deleted', class_id=NULL WHERE id=3;
```

이게 작동하면:
1. 웹 페이지에서 삭제 버튼 테스트
2. ✅ 작동하면 완료!
3. ❌ 여전히 안 되면 → 쿼리 1~4 결과 필요

---

**다음 단계**: 위 쿼리 1~4 실행 후 결과를 보내주세요!
