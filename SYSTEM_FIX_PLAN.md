# 학원 관리 시스템 전면 수정 계획

## 현재 문제점
1. 선생님이 원장님의 플랜/구독 정보를 공유하지 않음
2. 선생님 대시보드에 학생 수/반 수가 표시되지 않음
3. 선생님 등록 기능이 제대로 작동하지 않음
4. academy_id 기반 데이터 조회가 일관되지 않음

## 수정 계획

### 1. 데이터베이스 구조 확인
- users 테이블: academy_id, parent_user_id, user_type 컬럼 확인
- subscriptions 테이블: academy_id 연결 확인
- students 테이블: academy_id로 조회
- classes 테이블: academy_id로 조회

### 2. 구독 시스템 수정
- 학원장이 플랜 구매 시 academy_id = 학원장 id로 저장
- 선생님 등록 시 parent_user_id = 학원장 id, academy_id = 학원장 id로 설정
- 구독 조회 시 선생님은 academy_id로 학원장의 구독 정보 조회

### 3. API 수정 사항
- `/api/subscriptions/status`: academy_id 기반 조회 추가
- `/api/subscriptions/usage`: academy_id 기반 사용량 조회
- `/api/students`: academy_id 우선 사용
- `/api/classes`: academy_id 우선 사용
- `/api/teachers/add`: academy_id 자동 설정

### 4. 대시보드 수정
- 선생님도 academy_id 기반으로 데이터 조회
- 플랜 정보는 academy_id의 구독 정보 표시
- 사용량은 academy_id 전체의 사용량 표시
- 권한에 따라 필터링 (배정된 반만 보기)

### 5. 선생님 등록 수정
- 등록 시 자동으로 academy_id, parent_user_id 설정
- 권한 기본값 설정
- 플랜 자동 상속
