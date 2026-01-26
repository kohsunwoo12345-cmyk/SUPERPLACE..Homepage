# 학생 데이터 학원별 분리 수정 가이드

## 🔴 문제 상황
모든 사용자의 대시보드에서 학생 목록이 **꾸메땅학원의 데이터베이스**로 통일되어 보이는 문제가 발생했습니다.

각 사용자(학원)마다 자신의 학생 데이터만 보여야 하는데, 현재는 모든 학생이 같은 `academy_id`를 가지고 있어서 발생한 문제입니다.

## ✅ 해결 방법

### 1. 코드 수정 완료
- **파일**: `src/index.tsx` (26730번 줄)
- **변경 내용**: 학생 추가 시 `academy_id` 설정 로직 수정
  ```typescript
  // 이전: userData.id || userData.academy_id
  // 수정: userData.academy_id || userData.id  ✅
  ```
- **효과**: 앞으로 추가되는 학생은 올바른 `academy_id`가 설정됩니다.

### 2. 기존 데이터 수정 필요
기존에 등록된 학생들의 `academy_id`를 수정해야 합니다.

#### 방법 A: Cloudflare D1 콘솔에서 직접 실행 (권장)

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com
   - Workers & Pages → D1 데이터베이스 선택

2. **쿼리 실행**
   - "Console" 탭 선택
   - 아래 SQL 복사하여 실행:

```sql
-- 학생의 academy_id를 해당 반(class)의 academy_id로 수정
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

3. **결과 확인**
```sql
-- 업데이트된 학생 데이터 확인
SELECT s.id, s.name, s.academy_id, c.class_name, c.academy_id as class_academy_id
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY s.id DESC
LIMIT 50;
```

#### 방법 B: wrangler CLI 사용

```bash
cd /home/user/webapp

# D1 데이터베이스에 SQL 실행
npx wrangler d1 execute DB --file=./migrations/fix_student_academy_id.sql --remote
```

### 3. 배포
수정된 코드를 배포합니다:

```bash
cd /home/user/webapp
npm run build
npm run deploy
```

## 🔍 확인 방법

1. **각 사용자로 로그인**하여 대시보드 확인
2. **자신의 학생만** 보이는지 확인
3. **다른 학원의 학생이 보이지 않는지** 확인

## 📋 체크리스트

- [x] 코드 수정 완료 (`src/index.tsx`)
- [ ] 데이터베이스 마이그레이션 실행 (위 방법 A 또는 B)
- [ ] 코드 배포
- [ ] 각 사용자 계정으로 테스트

## 🚨 주의사항

1. **데이터베이스 백업**: 마이그레이션 전에 D1 데이터베이스 백업 권장
2. **운영 시간**: 사용자가 적은 시간대에 실행 권장
3. **테스트 환경**: 가능하면 개발 환경에서 먼저 테스트

## 💡 기술적 설명

### 문제의 원인
```typescript
// 문제가 있던 코드
finalAcademyId = userData.id || userData.academy_id
```
- **원장님**: `userData.id` = `userData.academy_id` (같은 값)
- **선생님**: `userData.id` = 선생님 본인 ID, `userData.academy_id` = 소속 학원 ID

따라서 `userData.id`를 먼저 체크하면 선생님이 학생을 추가할 때 **선생님 본인의 ID**가 `academy_id`로 설정되는 문제가 발생합니다.

### 해결 방법
```typescript
// 수정된 코드
finalAcademyId = userData.academy_id || userData.id
```
- **원장님**: `userData.academy_id` 사용 (원장님 본인 ID와 동일)
- **선생님**: `userData.academy_id` 사용 (소속 학원 ID)

이제 모든 경우에 올바른 학원 ID가 설정됩니다! ✅

## 📞 지원
문제가 계속 발생하면 시스템 로그를 확인하거나 개발팀에 문의하세요.
