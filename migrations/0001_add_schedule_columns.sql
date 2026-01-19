-- 반(classes) 테이블에 스케줄 관련 컬럼 추가
-- 이 마이그레이션은 schedule_days, start_time, end_time 컬럼을 추가합니다

-- schedule_days: 수업 요일 (예: "월, 수, 금")
ALTER TABLE classes ADD COLUMN schedule_days TEXT;

-- start_time: 수업 시작 시간 (예: "14:00")
ALTER TABLE classes ADD COLUMN start_time TEXT;

-- end_time: 수업 종료 시간 (예: "16:00")
ALTER TABLE classes ADD COLUMN end_time TEXT;
