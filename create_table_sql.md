# teacher_classes 테이블 생성 SQL

Cloudflare D1 Dashboard에서 다음 SQL을 실행하세요:

```sql
CREATE TABLE IF NOT EXISTS teacher_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, class_id)
);
```

## 실행 방법

1. Cloudflare Dashboard 접속
2. Workers & Pages → D1 Database 선택
3. 해당 데이터베이스 선택
4. Console 탭에서 위 SQL 실행

## 또는 브라우저에서 직접:

```
https://superplace-academy.pages.dev/api/fix-teacher-classes-error
```

이 URL을 브라우저에서 열면 자동으로 테이블이 생성됩니다.
