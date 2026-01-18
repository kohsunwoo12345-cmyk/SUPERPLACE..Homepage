# 선생님 관리 페이지 (/teachers) 현황 보고

## 📋 요청사항
**요청**: https://superplace-academy.pages.dev/teachers 페이지에 학생관리 탭의 선생님 관리와 **100% 똑같은 기능** 구현

## ✅ 현재 상태
**배포 URL**: https://superplace-academy.pages.dev/teachers
**최신 커밋**: ea4ea40 (debug: Add comprehensive logging to teacher permission save function)
**날짜**: 2026-01-18 03:25 KST

## 🔍 현재 배포된 기능 분석

### 현재 있는 기능
1. **통계 카드** (3개)
   - 전체 선생님 수
   - 반 배정 완료 수
   - 미배정 수

2. **선생님 목록 테이블**
   - 이름, 이메일, 전화번호, 담당 반, 학생 수
   - 반 배정 버튼
   - 삭제 버튼

3. **선생님 추가 모달**
   - 기본 정보 입력 (이름, 이메일, 전화번호, 담당 반)

4. **반 배정 모달**
   - 담당 반 입력

### 현재 없는 기능 (학생관리 대시보드에는 있음)
1. ❌ **학원 인증 코드**
   - 코드 표시, 복사, 재생성 기능
   - 선생님 등록 페이지 링크

2. ❌ **승인 대기 중 섹션**
   - 승인 대기 중인 선생님 신청 목록
   - 승인/거절 버튼

3. ❌ **권한 설정 모달**
   - 전체 학생 조회 권한 체크박스
   - 일일 성과 작성 권한 체크박스
   - 반 배정 체크박스 리스트

4. ❌ **등록된 선생님 카드 스타일**
   - 현재는 테이블 형식
   - 학생관리에서는 카드 형식으로 표시

5. ❌ **선생님 추가 시 계정 자동 생성**
   - 이메일/비밀번호 입력
   - 초기 비밀번호 설정

## 🎯 필요한 작업

### 1. 인증 코드 섹션 추가
```html
<div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
    <h3>학원 인증 코드</h3>
    <span id="verificationCode">------</span>
    <button onclick="copyVerificationCode()">복사</button>
    <button onclick="regenerateVerificationCode()">재생성</button>
</div>
```

### 2. 승인 대기 섹션 추가
```html
<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
    <h3>승인 대기 중</h3>
    <span id="pendingBadge">0</span>
    <div id="pendingList">...</div>
</div>
```

### 3. 권한 설정 모달 추가
```html
<div id="permissionsModal">
    <form id="permissionsForm">
        <input type="checkbox" id="canViewAllStudents">
        <input type="checkbox" id="canWriteDailyReports">
        <div id="classesCheckboxList">...</div>
    </form>
</div>
```

### 4. JavaScript 함수 추가
- `loadVerificationCode()`
- `copyVerificationCode()`
- `regenerateVerificationCode()`
- `loadPendingApplications()`
- `approveApplication(id, name)`
- `rejectApplication(id, name)`
- `showTeacherPermissions(teacherId, teacherName)`
- `closePermissionsModal()`
- permissions form submit handler

### 5. 선생님 목록 UI 변경
- 테이블 → 카드 스타일
- 권한 설정 버튼 추가

## 🔧 구현 방법

### Option 1: 직접 수정
`src/index.tsx` 24336번 줄부터의 `/teachers` 라우트를 완전히 교체

### Option 2: 컴포넌트 공유
`/students` 대시보드의 선생님 관리 섹션을 별도 파일로 분리하고 import

## 📊 우선순위

### High Priority (필수)
1. ✅ 인증 코드 섹션
2. ✅ 승인 대기 섹션  
3. ✅ 권한 설정 모달
4. ✅ 선생님 추가 시 계정 생성

### Medium Priority (개선)
1. ⚠️ UI 스타일 통일 (카드 형식)
2. ⚠️ 통계 카드 개선

## 🚀 다음 단계
1. **코드 수정**: `/teachers` 페이지를 `/students` 선생님 관리 섹션과 100% 동일하게 교체
2. **빌드**: `npm run build`
3. **배포**: `git push origin main`
4. **테스트**: 배포된 페이지에서 모든 기능 검증

## 📝 참고 파일
- `/students` 대시보드 선생님 관리: `src/index.tsx` 24841-25640번 줄
- `/teachers` 페이지: `src/index.tsx` 24336-24723번 줄

## 현재 작업 상태: ⏸️ 대기 중
원격 저장소에 최신 커밋이 있어 충돌 발생. 최신 코드 확인 후 작업 필요.
