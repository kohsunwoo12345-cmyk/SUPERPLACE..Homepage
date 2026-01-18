# 선생님 권한 시스템 테스트 계획

## 테스트 시나리오

### 1. 원장님 계정으로 반 생성
- [ ] 원장님 대시보드 접속
- [ ] 반 생성 버튼 클릭
- [ ] 반 정보 입력 (이름, 학년, 설명)
- [ ] 반 생성 완료 확인

### 2. 선생님 계정 생성
- [ ] 선생님 추가 버튼 클릭
- [ ] 선생님 정보 입력 (이름, 이메일, 전화번호)
- [ ] 선생님 계정 생성 완료

### 3. 선생님에게 권한 부여
- [ ] 선생님 목록에서 "권한 설정" 클릭
- [ ] 반 배정: 생성한 반 체크
- [ ] 일일 성과 작성 권한: 체크
- [ ] 권한 저장 완료

### 4. 선생님 계정으로 로그인
- [ ] 선생님 계정으로 로그아웃 후 로그인
- [ ] 배정된 반의 학생만 조회 가능
- [ ] 배정되지 않은 반의 학생은 조회 불가
- [ ] 일일 성과 작성 가능

## 수정이 필요한 부분

### 1. 반 생성 API
- [x] `/api/classes/create` - user_id 기반으로 저장

### 2. 반 조회 API
- [x] `/api/classes/list` - user_id 기반으로 조회
- [x] 선생님: teacher_id로 필터링
- [x] 원장님: user_id로 필터링

### 3. 권한 저장 API
- [x] `/api/teachers/:id/permissions` - teacher_permissions 테이블 사용
- [x] assignedClasses를 JSON 배열로 저장

### 4. 학생 조회 API
- [ ] 선생님 로그인 시 assignedClasses만 조회
- [ ] canViewAllStudents 권한 체크

### 5. 일일 성과 API
- [ ] 선생님의 canWriteDailyReports 권한 체크
- [ ] assignedClasses에 속한 학생만 작성 가능
