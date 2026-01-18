# 반 소유권 수정 가이드

## 문제 상황
kumetang@gmail.com 계정의 반들이 관리자(또는 다른 사용자)의 반 목록에 나타나는 문제

## 원인
- 반 생성 시 `academy_id` 컬럼을 사용했으나, 실제 테이블은 `user_id` 컬럼을 사용
- 컬럼명 불일치로 인해 잘못된 user_id로 반이 저장됨

## 해결 방법

### 1단계: 배포 완료 확인
✅ 배포 완료: https://superplace-academy.pages.dev
✅ 최신 배포: https://a2d434fe.superplace-academy.pages.dev

### 2단계: 마이그레이션 API 실행

개발자 도구 콘솔(F12)에서 다음 코드를 실행:

```javascript
// kumetang@gmail.com 계정의 반 소유권 수정
fetch('/api/admin/fix-class-ownership', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'kumetang@gmail.com'
  })
}).then(r => r.json()).then(console.log)
```

### 예상 응답
```json
{
  "success": true,
  "message": "3개의 반 소유권이 수정되었습니다.",
  "updated": 3,
  "details": [
    {
      "id": 1,
      "name": "초등 5학년 수학반",
      "old_user_id": 1,
      "new_user_id": 2
    },
    ...
  ]
}
```

### 3단계: 확인

1. **kumetang@gmail.com 계정으로 로그인**
2. `/teachers/manage` 페이지 접속
3. "반 목록" 섹션 확인
4. ✅ 자신의 반이 표시되는지 확인

## 수정된 내용

### API 변경사항

#### GET /api/classes
**Before:**
```sql
WHERE c.academy_id = ?
```

**After:**
```sql
WHERE c.user_id = ?
```

#### POST /api/classes
**Before:**
```sql
INSERT INTO classes (academy_id, class_name, grade, ...)
```

**After:**
```sql
INSERT INTO classes (user_id, name, grade_level, ...)
```

### 새로운 API 추가

#### POST /api/admin/fix-class-ownership
반 소유권을 수정하는 관리자 전용 API

**요청:**
```json
{
  "email": "kumetang@gmail.com"
}
```

**동작:**
1. 이메일로 사용자 ID 조회
2. `teacher_id`가 해당 사용자인 반 찾기
3. `user_id`를 `teacher_id`와 같게 수정

## 향후 반 생성

앞으로 반 생성 시:
- ✅ 자동으로 올바른 `user_id`로 저장됨
- ✅ 사용자별로 반이 완전히 격리됨
- ✅ 권한 설정 모달에서 자신의 반만 표시됨

## 주의사항

⚠️ 마이그레이션 API는 한 번만 실행하세요.
⚠️ 이미 올바른 user_id를 가진 반은 수정되지 않습니다.

## 테스트 방법

### kumetang@gmail.com 계정
1. 로그인
2. `/teachers/manage` 접속
3. "반 목록"에 자신의 반만 표시되는지 확인

### 다른 계정
1. 로그인
2. `/teachers/manage` 접속
3. kumetang 계정의 반이 표시되지 않는지 확인

---

**배포 완료 일시**: 2026-01-18
**배포 URL**: https://a2d434fe.superplace-academy.pages.dev
