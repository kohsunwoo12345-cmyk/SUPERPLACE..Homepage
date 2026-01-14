-- 관리자(user_id=1)에게 모든 권한 부여
-- 프로덕션 배포 후 수동 실행 필요

INSERT OR IGNORE INTO user_permissions (user_id, program_key, granted_by, is_active) VALUES
(1, 'search_volume', 1, 1),
(1, 'sms', 1, 1),
(1, 'landing_builder', 1, 1),
(1, 'analytics', 1, 1);
