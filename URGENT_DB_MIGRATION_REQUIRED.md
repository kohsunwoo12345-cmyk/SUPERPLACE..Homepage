# 🚨 긴급: 학생 데이터 격리 수정 - 즉시 실행 필요

## ⚠️ 중요도: CRITICAL - 법적 이슈 관련

**상황**: 현재 모든 사용자의 대시보드에서 꾸메땅학원의 학생 데이터가 보이는 상태
**위험**: 개인정보 유출로 인한 법적 책임 발생 가능
**조치**: 즉시 DB 마이그레이션 실행 필요

---

## ✅ 1단계: 코드 배포 완료 (이미 완료됨)

- ✅ 수정된 코드가 main 브랜치에 머지됨
- ✅ Cloudflare Pages에 자동 배포 진행 중
- ✅ 앞으로 추가되는 학생은 올바른 academy_id가 설정됨

**배포 상태 확인**: https://dash.cloudflare.com → Workers & Pages → superplace-academy

---

## 🔥 2단계: 즉시 DB 마이그레이션 실행 (긴급!)

### 방법 1: Cloudflare D1 Console (권장 - 가장 빠름)

1. **Cloudflare Dashboard 접속**
   ```
   https://dash.cloudflare.com
   ```

2. **D1 데이터베이스 선택**
   - Workers & Pages → D1
   - 데이터베이스 이름 클릭

3. **Console 탭에서 SQL 실행**
   
   아래 SQL을 복사해서 실행:

```sql
-- 🔥 긴급 수정: 학생 데이터의 academy_id 수정
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

4. **결과 확인**

```sql
-- 수정된 학생 데이터 확인
SELECT s.id, s.name, s.academy_id, c.class_name, c.academy_id as class_academy_id
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.status != 'deleted' OR s.status IS NULL
ORDER BY s.id DESC
LIMIT 50;
```

**확인 사항:**
- 각 학생의 `academy_id`와 `class_academy_id`가 일치하는지 확인
- 서로 다른 학원의 학생들이 다른 `academy_id`를 가지는지 확인

---

### 방법 2: Wrangler CLI (개발 환경이 있는 경우)

```bash
cd /home/user/webapp

# D1 데이터베이스에 마이그레이션 실행
npx wrangler d1 execute DB --file=./migrations/fix_student_academy_id.sql --remote

# 결과 확인
npx wrangler d1 execute DB --command="SELECT s.id, s.name, s.academy_id, c.class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id ORDER BY s.id DESC LIMIT 20" --remote
```

---

## 🧪 3단계: 즉시 테스트 (마이그레이션 완료 후)

### 테스트 절차:

1. **꾸메땅학원 계정으로 로그인**
   - 학생 목록에 꾸메땅학원 학생만 보이는지 확인
   - 다른 학원 학생이 보이면 **문제 있음!**

2. **다른 학원 계정으로 로그인** (있는 경우)
   - 해당 학원의 학생만 보이는지 확인
   - 꾸메땅학원 학생이 보이면 **문제 있음!**

3. **선생님 계정으로 로그인** (있는 경우)
   - 자신이 속한 학원의 학생만 보이는지 확인

### 테스트 URL:
```
https://superplace-academy.pages.dev/students
```

---

## 📊 4단계: 최종 확인 쿼리

D1 Console에서 실행하여 데이터 격리 상태 확인:

```sql
-- 학원별 학생 수 확인
SELECT 
  u.id as academy_id,
  u.academy_name,
  COUNT(s.id) as student_count
FROM users u
LEFT JOIN students s ON u.id = s.academy_id
WHERE u.role = 'director' OR u.user_type = 'director'
GROUP BY u.id, u.academy_name
ORDER BY student_count DESC;

-- 잘못된 academy_id가 있는지 확인 (있으면 안됨!)
SELECT 
  s.id,
  s.name,
  s.academy_id as student_academy_id,
  c.academy_id as class_academy_id,
  '❌ MISMATCH' as status
FROM students s
INNER JOIN classes c ON s.class_id = c.id
WHERE s.academy_id != c.academy_id
  AND (s.status IS NULL OR s.status != 'deleted');
```

**예상 결과:**
- 두 번째 쿼리에서 **0건**이 나와야 정상!
- 만약 결과가 있으면 다시 마이그레이션 실행 필요

---

## 🚨 문제 발생 시 즉시 연락

마이그레이션 실행 중 오류가 발생하거나
테스트에서 문제가 발견되면 **즉시** 개발팀에 연락하세요.

---

## 📝 체크리스트

- [x] 코드 수정 완료
- [x] 코드 배포 완료
- [ ] **DB 마이그레이션 실행 ⬅️ 지금 즉시 실행!**
- [ ] 꾸메땅학원 계정 테스트
- [ ] 다른 학원 계정 테스트 (있는 경우)
- [ ] 최종 확인 쿼리 실행

---

## 💡 기술 설명

### 문제 원인
학생 추가 시 `userData.id || userData.academy_id` 순서로 체크하여,
선생님이 학생을 추가하면 선생님 본인의 ID가 academy_id로 설정됨.

### 해결
1. **코드**: `userData.academy_id || userData.id`로 순서 변경 ✅
2. **DB**: 기존 잘못된 데이터를 class의 academy_id로 수정 ⬅️ 지금 실행 필요!

---

**마지막 업데이트**: 2026-01-26
**우선순위**: 🔴 CRITICAL - 즉시 실행 필요
