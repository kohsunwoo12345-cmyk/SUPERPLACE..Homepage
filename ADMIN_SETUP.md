# 관리자 계정 설정 가이드

## 📌 관리자 계정이란?

관리자 계정은 다음 기능에 접근할 수 있는 특별한 권한을 가진 계정입니다:
- 전체 사용자 목록 조회 및 관리
- 문의 내역 확인 및 상태 변경
- 시스템 통계 확인
- 사용자 권한 변경

## 🔧 관리자 계정 생성 방법

### 방법 1: 회원가입 후 DB에서 직접 권한 부여 (추천)

1. **일반 회원가입 진행**
   - 웹사이트에서 `/signup` 페이지 접속
   - 관리자로 사용할 이메일로 회원가입
   - 예: `admin@superplace.kr`

2. **DB에서 role을 admin으로 변경**
   ```bash
   # 로컬 개발 환경
   npx wrangler d1 execute webapp-production --local --command="UPDATE users SET role = 'admin' WHERE email = 'admin@superplace.kr'"
   
   # 프로덕션 환경
   npx wrangler d1 execute webapp-production --command="UPDATE users SET role = 'admin' WHERE email = 'admin@superplace.kr'"
   ```

3. **관리자 권한 확인**
   ```bash
   # 로컬 개발 환경
   npx wrangler d1 execute webapp-production --local --command="SELECT email, name, role FROM users WHERE role = 'admin'"
   ```

### 방법 2: DB에 직접 관리자 계정 삽입

```bash
# 로컬 개발 환경
npx wrangler d1 execute webapp-production --local --command="INSERT INTO users (email, password, name, role) VALUES ('admin@superplace.kr', 'admin1234', '관리자', 'admin')"

# 프로덕션 환경  
npx wrangler d1 execute webapp-production --command="INSERT INTO users (email, password, name, role) VALUES ('admin@superplace.kr', 'admin1234', '관리자', 'admin')"
```

⚠️ **주의**: 실제 운영 환경에서는 반드시 비밀번호를 해시화해야 합니다!

## 🔐 관리자 로그인

1. `/login` 페이지 접속
2. 관리자 이메일과 비밀번호 입력
3. 로그인 후 자동으로 `/admin/dashboard`로 이동

## 📊 관리자 페이지 구조

```
/admin/dashboard    - 관리자 메인 대시보드 (통계)
/admin/users        - 사용자 관리
/admin/contacts     - 문의 관리
/admin/settings     - 시스템 설정
```

## 🧪 테스트용 관리자 계정

**개발/테스트 환경용:**
- 이메일: `admin@superplace.kr`
- 비밀번호: `admin1234`

⚠️ **프로덕션에서는 반드시 비밀번호를 변경하세요!**

## 🔄 권한 변경

일반 사용자를 관리자로 승격:
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com'
```

관리자를 일반 사용자로 강등:
```sql
UPDATE users SET role = 'member' WHERE email = 'admin@example.com'
```

## 📝 역할(Role) 설명

- `member`: 일반 회원 (학원장님들)
- `admin`: 관리자 (전체 시스템 관리 권한)
