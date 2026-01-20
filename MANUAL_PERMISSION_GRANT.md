# 권한 수동 부여 스크립트

## User 2에게 권한 수동 부여

```bash
# 각 권한을 하나씩 부여
for perm in landing_builder ai_learning_report student_management sms_sender; do
  curl -X POST "https://superplace-academy.pages.dev/api/admin/grant-permission" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": 2,
      \"programKey\": \"$perm\",
      \"adminId\": 1,
      \"expiresAt\": null
    }"
  echo ""
  sleep 1
done
```

## 확인
```bash
curl -s "https://superplace-academy.pages.dev/api/user/permissions?userId=2" | jq '.permissions'
```
