# 선생님 권한 시스템 완전 구현

## 📌 요구사항
1. **권한이 없는 선생님**: `/students` 페이지에 아무것도 표시하지 않음
2. **권한이 있는 선생님**: 배정된 반의 학생만 볼 수 있고, 일일 성과 기록 추가 가능

---

## ✅ 구현 완료

### 1. 권한 체크 로직
```javascript
// assignedClasses가 비어있으면 권한 없음
const hasAnyPermission = userPermissions && 
                        userPermissions.assignedClasses && 
                        userPermissions.assignedClasses.length > 0;

// canViewAllStudents가 true면 전체 권한
const hasFullAccess = userPermissions && 
                     userPermissions.canViewAllStudents === true;
```

### 2. UI 표시 규칙

#### 📊 카드 표시 매트릭스

| 카드 | 원장님 | 선생님 (권한 없음) | 선생님 (배정된 반) | 선생님 (전체 권한) |
|------|--------|-------------------|-------------------|-------------------|
| **선생님 관리** | ✅ 표시 | ❌ 숨김 | ❌ 숨김 | ❌ 숨김 |
| **반 관리** | ✅ 표시 | ❌ 숨김 | ❌ 숨김 | ✅ 표시 |
| **학생 목록** | ✅ 표시 (전체) | ❌ 숨김 | ✅ 표시 (배정된 반만) | ✅ 표시 (전체) |
| **과목 관리** | ✅ 표시 | ❌ 숨김 | ❌ 숨김 | ✅ 표시 |
| **일일 성과** | ✅ 표시 (전체) | ❌ 숨김 | ✅ 표시 (배정된 반만) | ✅ 표시 (전체) |

---

## 🔐 권한 레벨

### Level 0: 권한 없음
- **조건**: `assignedClasses.length === 0`
- **표시**: "권한이 필요합니다" 메시지만 표시
- **접근 가능**: 없음

### Level 1: 배정된 반만
- **조건**: `assignedClasses.length > 0 && canViewAllStudents === false`
- **표시**: 학생 목록, 일일 성과 카드
- **접근 가능**: 배정된 반의 학생만

### Level 2: 전체 권한
- **조건**: `canViewAllStudents === true`
- **표시**: 반 관리, 학생 목록, 과목 관리, 일일 성과 카드
- **접근 가능**: 모든 학생 (선생님 관리 제외)

---

## 🎯 시나리오별 동작

### 시나리오 1: 선생님 신규 등록 (권한 없음)
1. 원장님이 선생님 계정 생성
2. 선생님이 로그인
3. `/students` 페이지 접속
4. **결과**: 
   ```
   🔒 권한이 필요합니다
   원장님이 권한을 부여하면 학생 관리 기능을 사용할 수 있습니다.
   ```

### 시나리오 2: 선생님에게 반 배정
1. 원장님이 선생님 권한 설정
2. "반 배정" 섹션에서 "A반" 체크 ✅
3. 저장
4. 선생님이 `/students` 페이지 새로고침
5. **결과**:
   - ✅ 학생 목록 카드 표시 (A반 학생만)
   - ✅ 일일 성과 카드 표시 (A반 학생만)
   - ❌ 반 관리 카드 숨김
   - ❌ 과목 관리 카드 숨김

### 시나리오 3: 선생님에게 전체 권한 부여
1. 원장님이 선생님 권한 설정
2. "전체 학생 조회" 체크 ✅
3. 저장
4. 선생님이 `/students` 페이지 새로고침
5. **결과**:
   - ✅ 반 관리 카드 표시
   - ✅ 학생 목록 카드 표시 (전체 학생)
   - ✅ 과목 관리 카드 표시
   - ✅ 일일 성과 카드 표시 (전체 학생)
   - ❌ 선생님 관리 카드 숨김 (여전히)

---

## 🔍 코드 상세

### applyTeacherRestrictions() 함수

```javascript
function applyTeacherRestrictions() {
    // 1. 권한 확인
    const hasAnyPermission = userPermissions && 
                            userPermissions.assignedClasses && 
                            userPermissions.assignedClasses.length > 0;
    const hasFullAccess = userPermissions && 
                         userPermissions.canViewAllStudents === true;
    
    // 2. 선생님 관리 카드 항상 숨김
    const teacherCard = document.getElementById('teacherManagementCard');
    if (teacherCard) {
        teacherCard.style.display = 'none';
    }
    
    // 3. 권한이 없으면 모든 카드 숨기고 메시지 표시
    if (!hasAnyPermission && !hasFullAccess) {
        // 모든 카드 숨김
        const classCard = document.querySelector('a[href="/students/classes"]');
        const studentCard = document.querySelector('a[href="/students/list"]');
        const courseCard = document.querySelector('a[href="/students/courses"]');
        const dailyCard = document.querySelector('a[href="/students/daily-record"]');
        
        if (classCard) classCard.style.display = 'none';
        if (studentCard) studentCard.style.display = 'none';
        if (courseCard) courseCard.style.display = 'none';
        if (dailyCard) dailyCard.style.display = 'none';
        
        // 권한 없음 메시지 표시
        const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 max-w-md mx-auto">
                        <i class="fas fa-lock text-5xl text-yellow-600 mb-4"></i>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">권한이 필요합니다</h3>
                        <p class="text-gray-600">원장님이 권한을 부여하면 학생 관리 기능을 사용할 수 있습니다.</p>
                    </div>
                </div>
            `;
        }
        return; // 더 이상 처리하지 않음
    }
    
    // 4. 반 관리와 과목 관리는 전체 권한이 있을 때만
    const classCard = document.querySelector('a[href="/students/classes"]');
    if (classCard) {
        classCard.style.display = hasFullAccess ? 'block' : 'none';
    }
    
    const courseCard = document.querySelector('a[href="/students/courses"]');
    if (courseCard) {
        courseCard.style.display = hasFullAccess ? 'block' : 'none';
    }
    
    // 5. 학생 목록과 일일 성과는 권한이 있으면 표시
    const studentCard = document.querySelector('a[href="/students/list"]');
    if (studentCard) {
        studentCard.style.display = (hasAnyPermission || hasFullAccess) ? 'block' : 'none';
    }
    
    const dailyCard = document.querySelector('a[href="/students/daily-record"]');
    if (dailyCard) {
        dailyCard.style.display = (hasAnyPermission || hasFullAccess) ? 'block' : 'none';
    }
}
```

---

## 🔗 API 연동

### GET /api/teachers/:teacherId/permissions
선생님의 권한 정보를 조회합니다.

**Response**:
```json
{
  "success": true,
  "permissions": {
    "canViewAllStudents": false,
    "canWriteDailyReports": true,
    "assignedClasses": [1, 2, 3]  // 배정된 반 ID 배열
  }
}
```

### PUT /api/teachers/:teacherId/permissions
선생님의 권한을 업데이트합니다.

**Request**:
```json
{
  "directorId": 1,
  "permissions": {
    "canViewAllStudents": true,
    "canWriteDailyReports": true,
    "assignedClasses": [1, 2, 3]
  }
}
```

---

## 📊 데이터 필터링

### /api/students (학생 목록)
- **원장님**: 모든 학생 반환
- **선생님 (전체 권한)**: 모든 학생 반환
- **선생님 (배정된 반)**: `assignedClasses`에 포함된 반의 학생만 반환
- **선생님 (권한 없음)**: 빈 배열 반환

### /api/daily-records (일일 성과)
- **원장님**: 모든 기록 반환
- **선생님 (전체 권한)**: 모든 기록 반환
- **선생님 (배정된 반)**: 배정된 반의 학생 기록만 반환
- **선생님 (권한 없음)**: 빈 배열 반환

---

## 🚀 배포 정보

- **커밋**: `b91cdee` → `fb0c02f`
- **커밋 메시지**: "feat: Hide all cards on /students page for teachers without any permissions"
- **배포 URL**: https://superplace-academy.pages.dev/students
- **배포 날짜**: 2026-01-18 (KST)

---

## 🧪 테스트 방법

### 테스트 1: 권한 없는 선생님
```bash
1. 선생님 계정으로 로그인
2. https://superplace-academy.pages.dev/students 접속
3. 개발자 콘솔 확인:
   - "❌ No permissions - hiding ALL cards"
   - "✅ Displayed: No permission message"
4. 화면 확인:
   - 🔒 아이콘과 "권한이 필요합니다" 메시지 표시
   - 모든 카드 숨김
```

### 테스트 2: 배정된 반이 있는 선생님
```bash
1. 원장님 계정으로 선생님에게 반 배정
2. 선생님 계정으로 로그인
3. /students 페이지 접속
4. 개발자 콘솔 확인:
   - "hasAnyPermission (assigned classes): true"
   - "✅ Showing: Student list (has permission)"
   - "✅ Showing: Daily records (has permission)"
5. 화면 확인:
   - ✅ 학생 목록 카드 표시
   - ✅ 일일 성과 카드 표시
   - ❌ 반 관리 카드 숨김
   - ❌ 과목 관리 카드 숨김
```

### 테스트 3: 전체 권한이 있는 선생님
```bash
1. 원장님이 "전체 학생 조회" 권한 부여
2. 선생님 계정으로 로그인
3. /students 페이지 접속
4. 개발자 콘솔 확인:
   - "hasFullAccess (canViewAllStudents): true"
   - "✅ Showing: Class management (full access)"
   - "✅ Showing: Course management (full access)"
5. 화면 확인:
   - ✅ 반 관리 카드 표시
   - ✅ 학생 목록 카드 표시
   - ✅ 과목 관리 카드 표시
   - ✅ 일일 성과 카드 표시
   - ❌ 선생님 관리 카드 숨김
```

---

## 📁 관련 파일

- **메인 파일**: `/home/user/webapp/src/index.tsx`
- **함수 위치**: 라인 25546-25671 (`applyTeacherRestrictions`)
- **권한 로드**: 라인 25508-25544 (`loadTeacherPermissions`)
- **초기화**: 라인 25449-25506 (`initializePage`)

---

## 🎉 완료 사항

- ✅ 권한 없는 선생님: 모든 카드 숨김 + 권한 요청 메시지 표시
- ✅ 배정된 반만 있는 선생님: 학생 목록 + 일일 성과만 표시
- ✅ 전체 권한 있는 선생님: 선생님 관리 제외한 모든 카드 표시
- ✅ 원장님: 모든 카드 표시
- ✅ 빌드 및 배포 완료
- ✅ 문서화 완료

---

**작성일**: 2026-01-18  
**작성자**: AI Assistant  
**상태**: ✅ 완료
