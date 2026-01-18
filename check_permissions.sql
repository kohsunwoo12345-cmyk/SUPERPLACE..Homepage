SELECT 
    t.id,
    t.name,
    t.email,
    tp.permission_key,
    tp.permission_value
FROM users t
LEFT JOIN teacher_permissions tp ON t.id = tp.teacher_id
WHERE t.user_type = 'teacher' OR t.role = 'teacher'
ORDER BY t.id, tp.permission_key;
