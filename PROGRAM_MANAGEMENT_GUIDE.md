# 📚 교육 프로그램 관리 시스템

## 🎯 개요
관리자가 교육 프로그램을 등록/수정/삭제할 수 있는 시스템입니다.
사용자는 `/programs` 페이지에서 등록된 프로그램을 확인할 수 있습니다.

## 📍 주요 페이지

### 사용자용
- **프로그램 목록**: https://superplace-academy.pages.dev/programs

### 관리자용
- **프로그램 관리**: https://superplace-academy.pages.dev/admin/programs
  - 프로그램 목록 조회
  - 신규 프로그램 등록
  - 기존 프로그램 수정
  - 프로그램 삭제
  - 노출 순서 변경

## 🗄️ 데이터베이스 구조

### `programs` 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 고유 ID (자동 증가) |
| program_id | TEXT | 프로그램 식별자 (slug) |
| name | TEXT | 프로그램 이름 |
| description | TEXT | 짧은 설명 |
| detail_description | TEXT | 상세 설명 |
| image_url | TEXT | 이미지 URL |
| price | INTEGER | 가격 (원) |
| sessions | INTEGER | 회차 수 |
| duration_days | INTEGER | 진행 기간 (일) |
| features | TEXT | 주요 특징 (JSON 배열) |
| type | TEXT | 타입 (consulting/service) |
| status | TEXT | 상태 (active/inactive) |
| display_order | INTEGER | 노출 순서 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |
| created_by | INTEGER | 생성자 ID |

## 📝 사용 방법

### 1. DB 초기화 (최초 1회)
```
https://superplace-academy.pages.dev/api/programs/init-db
```
- 관리자 로그인 후 접속
- programs 테이블 생성
- 기본 프로그램 데이터 삽입

### 2. 프로그램 등록
1. 관리자 대시보드 → 프로그램 관리
2. "신규 프로그램 등록" 버튼 클릭
3. 정보 입력:
   - 프로그램 ID (예: naver-place-max)
   - 프로그램 이름
   - 짧은 설명
   - 상세 설명
   - 가격
   - 회차 수
   - 주요 특징 (쉼표로 구분)
   - 프로그램 타입
   - 노출 순서
4. "등록하기" 버튼 클릭

### 3. 프로그램 수정
1. 프로그램 목록에서 수정할 프로그램의 "수정" 버튼 클릭
2. 정보 수정
3. "저장하기" 버튼 클릭

### 4. 프로그램 삭제
1. 프로그램 목록에서 삭제할 프로그램의 "삭제" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 클릭

## 🔧 API 엔드포인트

### 프로그램 조회
```
GET /api/programs
```
- 모든 활성 프로그램 목록 반환
- display_order 순으로 정렬

### 프로그램 등록 (관리자 전용)
```
POST /api/admin/programs
Content-Type: application/json

{
  "program_id": "program-slug",
  "name": "프로그램 이름",
  "description": "짧은 설명",
  "detail_description": "상세 설명",
  "price": 1000000,
  "sessions": 6,
  "features": ["특징1", "특징2"],
  "type": "consulting",
  "display_order": 1
}
```

### 프로그램 수정 (관리자 전용)
```
PUT /api/admin/programs/:id
Content-Type: application/json

{
  "name": "수정된 이름",
  "price": 1500000,
  ...
}
```

### 프로그램 삭제 (관리자 전용)
```
DELETE /api/admin/programs/:id
```

## 🎨 기능

### 사용자용
- ✅ 프로그램 목록 카드 뷰
- ✅ 가격 자동 포맷 (1,210,000원)
- ✅ 프로그램 상세 정보 모달
- ✅ 반응형 디자인

### 관리자용
- ✅ 프로그램 CRUD (등록/조회/수정/삭제)
- ✅ 노출 순서 관리
- ✅ 상태 관리 (활성/비활성)
- ✅ 실시간 미리보기

## 📅 배포 정보
- **구현 완료**: 2026-01-28
- **배포 URL**: https://superplace-academy.pages.dev

---

**문의**: 시스템 관련 문의사항은 개발팀에 연락하세요.
