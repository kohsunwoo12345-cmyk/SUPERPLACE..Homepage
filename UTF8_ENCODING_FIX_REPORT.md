# UTF-8 인코딩 문제 해결 보고서

## 📅 작업 일시
2026-01-24

## 🐛 발견된 문제

### btoa() InvalidCharacterError
**증상**:
```
InvalidCharacterError: Failed to execute 'btoa' on 'Window': 
The string to be encoded contains characters outside of the Latin1 range.
```

**원인**:
- JavaScript의 `btoa()` 함수는 Latin1 (ISO-8859-1) 문자만 지원
- 한국어 등 UTF-8 문자가 포함된 JSON을 인코딩할 때 에러 발생
- 사용자 정보에 한글 이름이나 학원명이 포함된 경우 발생

**영향받은 페이지**:
1. `/tools/form-manager` - 폼 관리 페이지
2. `/admin/active-sessions` - 실시간 접속자 관리

## ✅ 해결 방법

### UTF-8 안전 Base64 인코딩 함수 추가

```javascript
// UTF-8 safe base64 encoding
function base64Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}
```

**작동 원리**:
1. `encodeURIComponent(str)`: UTF-8 문자를 퍼센트 인코딩 (%xx)
2. `.replace(...)`: 퍼센트 인코딩을 Latin1 문자로 변환
3. `btoa()`: Latin1 문자를 base64로 인코딩

### 적용된 위치

#### 1. Form Manager (`/tools/form-manager`)
```javascript
// Before
const userDataBase64 = btoa(JSON.stringify(user));

// After  
const userDataBase64 = base64Encode(JSON.stringify(user));
```

적용 함수:
- `loadForms()` - 폼 목록 로드 시
- `deleteForm()` - 폼 삭제 시

#### 2. Active Sessions (`/admin/active-sessions`)
```javascript
// Before
const userDataBase64 = btoa(JSON.stringify(user));

// After
const userDataBase64 = base64Encode(JSON.stringify(user));
```

적용 함수:
- `loadActiveSessions()` - 세션 데이터 로드 시

## 🎯 검증 결과

### ✅ Form Manager
- URL: https://superplace-academy.pages.dev/tools/form-manager
- Status: HTTP 200 OK
- 한글 사용자명으로 정상 로드 확인

### ✅ Landing Manager
- URL: https://superplace-academy.pages.dev/tools/landing-manager
- Status: HTTP 200 OK
- btoa 사용하지 않음 (userId만 쿼리 파라미터로 전달)

### ⚠️ Active Sessions
- URL: https://superplace-academy.pages.dev/admin/active-sessions
- Status: HTTP 404 (조사 중)
- 코드는 정상 배포되었으나 라우팅 이슈 가능성

## 📦 배포 정보
- **Commit**: 7c31dcf
- **Build**: ✅ Success (2,328.87 kB)
- **Deploy**: https://34b3d291.superplace-academy.pages.dev
- **Production**: https://superplace-academy.pages.dev

## 🔍 추가 조사 필요
- `/admin/active-sessions` 404 오류 원인
  - 빌드 파일에는 라우트 존재 확인
  - Cloudflare Pages 캐시 문제 가능성
  - 관리자 권한 미들웨어 이슈 가능성

## 📝 권장 사항

### 1. 전역 base64Encode 함수 정의
모든 페이지에서 사용할 수 있도록 공통 함수로 정의:
```javascript
// 공통 유틸리티
window.base64Encode = function(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, 
        (match, p1) => String.fromCharCode('0x' + p1)));
};
```

### 2. 서버 측 디코딩 확인
서버에서 base64 디코딩 시 동일한 방식으로 처리:
```javascript
// Server-side decoding (Node.js)
function base64Decode(str) {
    return decodeURIComponent(
        Array.prototype.map.call(
            atob(str), 
            c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
    );
}
```

### 3. 모든 X-User-Data-Base64 헤더 검토
프로젝트 내 모든 `btoa(JSON.stringify(user))` 패턴을 찾아서 `base64Encode()`로 교체

## ✨ 최종 상태
- ✅ Form Manager: 정상 작동
- ✅ Landing Manager: 정상 작동
- ⚠️ Active Sessions: 404 (추가 조사 필요)
- ✅ UTF-8 인코딩 문제: 해결
- ✅ 빌드 & 배포: 성공
