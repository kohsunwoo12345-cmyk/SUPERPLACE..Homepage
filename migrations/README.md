# D1 데이터베이스 마이그레이션 가이드

## 1. Cloudflare Dashboard에서 마이그레이션 실행

### 방법 1: Cloudflare Dashboard에서 직접 실행 (추천)
1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. Workers & Pages → D1 데이터베이스 선택
3. "Console" 탭으로 이동
4. 아래 SQL을 복사하여 실행:

```sql
-- schedule_days: 수업 요일 (예: "월, 수, 금")
ALTER TABLE classes ADD COLUMN schedule_days TEXT;

-- start_time: 수업 시작 시간 (예: "14:00")
ALTER TABLE classes ADD COLUMN start_time TEXT;

-- end_time: 수업 종료 시간 (예: "16:00")
ALTER TABLE classes ADD COLUMN end_time TEXT;
```

5. "Execute" 버튼 클릭
6. 성공 메시지 확인

### 방법 2: Wrangler CLI 사용
```bash
# D1 데이터베이스 목록 확인
npx wrangler d1 list

# 마이그레이션 실행 (데이터베이스 이름을 실제 이름으로 변경)
npx wrangler d1 execute <DATABASE_NAME> --file=./migrations/0001_add_schedule_columns.sql

# 또는 로컬에서 테스트
npx wrangler d1 execute <DATABASE_NAME> --local --file=./migrations/0001_add_schedule_columns.sql
```

## 2. 마이그레이션 확인

마이그레이션 실행 후 아래 SQL로 컬럼이 추가되었는지 확인:

```sql
PRAGMA table_info(classes);
```

다음 컬럼들이 보여야 합니다:
- schedule_days (TEXT)
- start_time (TEXT)
- end_time (TEXT)

## 3. 기존 데이터 업데이트 (선택사항)

기존 반들에 기본값을 설정하고 싶다면:

```sql
-- 예시: 모든 반에 기본 시간 설정
UPDATE classes 
SET start_time = '09:00', 
    end_time = '11:00',
    schedule_days = '월, 수, 금'
WHERE start_time IS NULL;
```

## 주의사항

- 마이그레이션 실행 전에 반드시 데이터베이스 백업 권장
- 프로덕션 환경에서는 서비스 다운타임이 없을 수 있으니 안전하게 실행
- SQLite의 ALTER TABLE은 열 추가만 지원하며, 열 삭제나 타입 변경은 테이블 재생성 필요
