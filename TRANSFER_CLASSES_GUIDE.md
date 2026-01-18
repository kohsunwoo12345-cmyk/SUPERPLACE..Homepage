# 관리자 반 → kumetang@gmail.com 이전 가이드

## ✅ 배포 완료
- **배포 URL**: https://superplace-academy.pages.dev
- **최신 배포**: https://64a2a3cb.superplace-academy.pages.dev
- **배포 일시**: 2026-01-18

---

## 🎯 목적
관리자 계정(또는 다른 계정)의 반들을 kumetang@gmail.com 계정으로 이전

---

## 📋 실행 방법

### 1단계: 사이트 접속
https://superplace-academy.pages.dev

### 2단계: 개발자 도구 열기
- Windows/Linux: `F12` 또는 `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

### 3단계: 콘솔 탭 선택
개발자 도구에서 "Console" 탭을 클릭

### 4단계: 스크립트 실행

아래 코드를 복사하여 콘솔에 붙여넣고 Enter:

```javascript
// 관리자(user_id=1)의 반들을 kumetang@gmail.com으로 이전
fetch('/api/admin/transfer-classes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromUserId: 1,  // 관리자 또는 원본 사용자 ID
    toEmail: 'kumetang@gmail.com'  // 대상 이메일
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ 이전 완료:', data);
  alert(`성공: ${data.message}`);
})
.catch(err => {
  console.error('❌ 오류:', err);
  alert('오류 발생: ' + err.message);
});
```

---

## 📊 예상 응답

### 성공 시
```json
{
  "success": true,
  "message": "5개의 반이 kumetang@gmail.com로 이전되었습니다.",
  "transferred": 5,
  "target_user": {
    "id": 2,
    "email": "kumetang@gmail.com",
    "name": "김꾸메"
  },
  "details": [
    {
      "id": 1,
      "name": "초등 5학년 수학반",
      "from_user_id": 1,
      "to_user_id": 2,
      "to_email": "kumetang@gmail.com"
    },
    {
      "id": 2,
      "name": "중등 1학년 영어반",
      "from_user_id": 1,
      "to_user_id": 2,
      "to_email": "kumetang@gmail.com"
    }
    // ... 더 많은 반들
  ]
}
```

### 이전할 반이 없는 경우
```json
{
  "success": true,
  "message": "이전할 반이 없습니다.",
  "transferred": 0
}
```

### 오류 발생 시
```json
{
  "success": false,
  "error": "대상 사용자를 찾을 수 없습니다."
}
```

---

## 🔍 확인 방법

### kumetang@gmail.com 계정으로 확인
1. kumetang@gmail.com 계정으로 로그인
2. `/teachers/manage` 페이지 접속
3. **"반 목록"** 섹션 확인
4. ✅ 이전된 반들이 표시되어야 함

### 관리자 계정으로 확인
1. 관리자 계정으로 로그인
2. `/teachers/manage` 페이지 접속
3. **"반 목록"** 섹션 확인
4. ✅ 이전한 반들이 **사라져야 함**

---

## 🔄 다른 사용자 ID에서 이전하려면

관리자가 아닌 다른 사용자의 반을 이전하려면 `fromUserId`를 변경:

```javascript
fetch('/api/admin/transfer-classes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromUserId: 3,  // 원본 사용자 ID 변경
    toEmail: 'kumetang@gmail.com'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 📝 로그 확인

실행 시 콘솔에 다음과 같은 로그가 표시됩니다:

```
🔄 [TransferClasses] Transfer request: {fromUserId: 1, toEmail: "kumetang@gmail.com"}
👤 [TransferClasses] Target user: {id: 2, email: "kumetang@gmail.com", name: "김꾸메"}
📚 [TransferClasses] Found 5 classes to transfer
✅ [TransferClasses] Transferred class 1 (초등 5학년 수학반): user_id 1 → 2
✅ [TransferClasses] Transferred class 2 (중등 1학년 영어반): user_id 1 → 2
✅ [TransferClasses] Transferred class 3 (고등 1학년 수학반): user_id 1 → 2
✅ [TransferClasses] Transferred class 4 (초등 6학년 과학반): user_id 1 → 2
✅ [TransferClasses] Transferred class 5 (중등 2학년 국어반): user_id 1 → 2
```

---

## ⚠️ 주의사항

1. **되돌릴 수 없음**: 한 번 이전하면 되돌릴 수 없습니다
2. **백업 권장**: 중요한 데이터는 미리 백업하세요
3. **한 번만 실행**: 같은 스크립트를 여러 번 실행하지 마세요
4. **확인 필수**: 실행 후 반드시 두 계정에서 확인하세요

---

## 🔧 API 정보

### 엔드포인트
`POST /api/admin/transfer-classes`

### 요청 바디
```json
{
  "fromUserId": 1,
  "toEmail": "kumetang@gmail.com"
}
```

### 동작
1. `toEmail`로 대상 사용자 조회
2. `fromUserId`의 모든 반 조회 (`WHERE user_id = ?`)
3. 각 반의 `user_id`를 대상 사용자 ID로 변경
4. 이전된 반 목록 반환

### 영향을 받는 테이블
- `classes` 테이블의 `user_id` 컬럼만 변경
- `teacher_id`, `name`, `description` 등 다른 정보는 유지

---

## 🎉 실행 결과

이 스크립트를 실행하면:

1. ✅ 관리자 계정의 모든 반이 kumetang@gmail.com으로 이전
2. ✅ kumetang@gmail.com 로그인 시 반 목록에 표시
3. ✅ 관리자 계정에서는 해당 반들이 사라짐
4. ✅ 권한 설정 모달에서 이전된 반들을 선택 가능
5. ✅ 학생, 일일 성과 등 모든 관련 데이터 유지

---

**지금 바로 실행하세요!** 🚀

## 빠른 실행 (복사 후 콘솔에 붙여넣기)

\`\`\`javascript
fetch('/api/admin/transfer-classes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fromUserId: 1, toEmail: 'kumetang@gmail.com' })
})
.then(r => r.json())
.then(data => {
  console.log('✅ 결과:', data);
  alert(data.message);
});
\`\`\`
