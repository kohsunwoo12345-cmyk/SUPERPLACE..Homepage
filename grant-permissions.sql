-- User 2에게 필요한 권한 부여
INSERT OR IGNORE INTO user_permissions (user_id, program_key, granted_by, is_active, created_at) VALUES
(2, 'sms_sender', 'system', 1, datetime('now')),
(2, 'parent_message', 'system', 1, datetime('now')),
(2, 'blog_writer', 'system', 1, datetime('now')),
(2, 'dashboard_analytics', 'system', 1, datetime('now')),
(2, 'keyword_analyzer', 'system', 1, datetime('now')),
(2, 'review_template', 'system', 1, datetime('now')),
(2, 'ad_copy_generator', 'system', 1, datetime('now')),
(2, 'photo_optimizer', 'system', 1, datetime('now')),
(2, 'competitor_analysis', 'system', 1, datetime('now')),
(2, 'blog_checklist', 'system', 1, datetime('now')),
(2, 'content_calendar', 'system', 1, datetime('now')),
(2, 'consultation_script', 'system', 1, datetime('now')),
(2, 'place_optimization', 'system', 1, datetime('now')),
(2, 'roi_calculator', 'system', 1, datetime('now'));
