# 계좌이체 승인 테스트 가이드

## 🚀 배포 정보
- **배포 완료**: 2026-01-20 22:35 (UTC)
- **Git 커밋**: `21416c1`
- **배포 URL**: https://7e07c32b.superplace-academy.pages.dev
- **프로덕션 URL**: https://superplace-academy.pages.dev

## 🔧 수정 사항
### FOREIGN KEY 제약 해결
- **문제**: `subscriptions` 테이블이 `academies(id)`를 FOREIGN KEY로 참조
- **원인**: `academies` 테이블의 AUTOINCREMENT로 인해 명시적 id 삽입 불가
- **해결**: `PRAGMA foreign_keys = OFF/ON`을 사용하여 명시적 id 삽입

### 적용된 로직
```javascript
// 1. FOREIGN KEY 체크 비활성화
await DB.prepare(`PRAGMA foreign_keys = OFF`).run()

// 2. 명시적 id로 academy 생성
await DB.prepare(`
  INSERT OR REPLACE INTO academies (id, academy_name, owner_id, created_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
`).bind(user.id, userName + ' 학원', user.id).run()

// 3. FOREIGN KEY 체크 재활성화
await DB.prepare(`PRAGMA foreign_keys = ON`).run()

// 4. 구독 생성 (academy_id = user.id)
await DB.prepare(`
  INSERT INTO subscriptions (academy_id, plan_name, ...)
  VALUES (?, ?, ...)
`).bind(user.id, planName, ...).run()
```

## ✅ 테스트 체크리스트

### 1단계: 관리자 로그인
- [ ] https://superplace-academy.pages.dev/admin/bank-transfers 접속
- [ ] 관리자 계정으로 로그인 (`admin@superplace.co.kr`)
- [ ] 계좌이체 신청 목록 확인

### 2단계: 승인 실행
- [ ] "승인" 버튼 클릭
- [ ] **예상 결과**: ✅ "계좌이체가 승인되고 구독이 활성화되었습니다."
- [ ] **실패 시**: ❌ "승인 실패: D1_ERROR: FOREIGN KEY constraint failed" (이전 오류)

### 3단계: 콘솔 로그 확인
브라우저 개발자 도구 (F12) → Console 탭에서 확인:

**성공 시 로그**:
```
[Bank Transfer Approve] Using academy_id = user.id: 123
[Bank Transfer Approve] Creating academy with explicit id: 123
[Bank Transfer Approve] Academy created with id: 123
[Bank Transfer Approve] Updated users.academy_id
[Bank Transfer Approve] Deactivated existing subscriptions
[Bank Transfer Approve] Date range: 2026-01-20 to 2026-02-20
[Bank Transfer Approve] Created subscription: 456
[Bank Transfer Approve] Deleted old usage_tracking
[Bank Transfer Approve] Created usage_tracking
[Bank Transfer Approve] Added 4 basic programs for user: 123
```

**실패 시 로그**:
```
❌ 승인 실패: 승인 처리 중 오류가 발생했습니다: D1_ERROR: FOREIGN KEY constraint failed
(anonymous) @ (index):64 Understand this warning
/api/bank-transfer/approve:1  Failed to load resource: 500
```

### 4단계: 사용자 계정으로 확인
- [ ] 승인된 사용자 계정으로 로그인
- [ ] https://superplace-academy.pages.dev/dashboard 접속

**확인 사항**:
1. **구독 정보 표시**
   - [ ] 플랜 이름: "프로 플랜" / "베이직 플랜" 등
   - [ ] 구독 기간: "2026-01-20 ~ 2026-02-20" (1개월)
   - [ ] 구독 상태 표시됨 (빨간 경고 배너 없음)

2. **사용 한도 표시**
   - [ ] 학생: 0/100 (프로 플랜)
   - [ ] AI 리포트: 0/100
   - [ ] 랜딩페이지: 0/140
   - [ ] 선생님: 0/6

3. **마케팅 도구 섹션 표시**
   - [ ] 🔍 네이버 검색량 조회
   - [ ] 👨‍🎓 학생 관리
   - [ ] 🎨 랜딩페이지 생성기
   - [ ] 🤖 AI 학습 분석 리포트

4. **프로그램 접근**
   - [ ] `/students` (학생 관리) 접근 가능
   - [ ] `/tools/ai-learning-report` 접근 가능
   - [ ] `/tools/dashboard-analytics` 접근 가능
   - [ ] `/tools/search-volume` 접근 가능

### 5단계: DB 상태 확인 (선택사항)
관리자 대시보드에서 사용자 상세 정보 확인:
- [ ] `users.academy_id` = `user.id`
- [ ] `subscriptions` 레코드 존재 (`academy_id` = `user.id`)
- [ ] `usage_tracking` 레코드 존재
- [ ] `user_programs` 4개 레코드 존재

## 🔍 문제 해결

### 여전히 FOREIGN KEY 오류가 발생하는 경우

**가능한 원인**:
1. Cloudflare D1에서 PRAGMA 명령이 지원되지 않음
2. 트랜잭션 내에서 PRAGMA가 작동하지 않음
3. 데이터베이스 연결이 FOREIGN KEY 체크를 강제함

**대안**:
1. `subscriptions` 테이블의 FOREIGN KEY 제약 제거
2. `academies` 테이블을 사용하지 않고 구독 시스템 재설계
3. Cloudflare D1 바인딩에서 FOREIGN KEY 체크 비활성화

## 📊 예상 DB 상태

### 승인 전
```
users:
  id: 123, academy_id: NULL

academies:
  (레코드 없음)

subscriptions:
  (레코드 없음)

user_programs:
  (레코드 없음)
```

### 승인 후
```
users:
  id: 123, academy_id: 123

academies:
  id: 123, academy_name: "홍길동 학원", owner_id: 123

subscriptions:
  id: 456, academy_id: 123, plan_name: "프로 플랜", 
  student_limit: 100, status: 'active'

usage_tracking:
  id: 789, academy_id: 123, subscription_id: 456,
  current_students: 0, ai_reports_used: 0, ...

user_programs:
  { user_id: 123, program_route: '/students', enabled: 1 }
  { user_id: 123, program_route: '/tools/ai-learning-report', enabled: 1 }
  { user_id: 123, program_route: '/tools/dashboard-analytics', enabled: 1 }
  { user_id: 123, program_route: '/tools/search-volume', enabled: 1 }
```

## 🎯 성공 기준

### 필수 조건
- ✅ 승인 버튼 클릭 시 오류 없이 성공 메시지 표시
- ✅ 콘솔에 FOREIGN KEY 오류 없음
- ✅ 사용자 대시보드에서 플랜 정보 즉시 표시
- ✅ 마케팅 도구 섹션 표시
- ✅ 4개 프로그램 접근 가능

### 추가 확인
- ✅ 구독 한도 정보 정확함
- ✅ 구독 기간 표시 (1개월)
- ✅ 경고 배너 없음

## 📝 테스트 결과 보고

테스트 완료 후 다음 정보를 제공해주세요:

1. **승인 결과**:
   - [ ] 성공
   - [ ] 실패 (오류 메시지: _________________)

2. **콘솔 로그**:
   ```
   (여기에 콘솔 로그 붙여넣기)
   ```

3. **대시보드 화면**:
   - 스크린샷 또는 표시된 내용 설명

4. **추가 문제**:
   - 발견된 문제점 또는 버그

---

**배포 URL**: https://superplace-academy.pages.dev/admin/bank-transfers
**테스트 시작 시간**: ____________________
**테스트 완료 시간**: ____________________
