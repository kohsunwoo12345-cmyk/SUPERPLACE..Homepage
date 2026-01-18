#!/bin/bash
echo "=== 선생님 ID 18 (김선생) 테스트 ==="

echo "1. 김선생 권한 확인"
curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '.'

echo ""
echo "2. 김선생으로 학생 목록 조회"
USER_DATA='{"id":18,"user_type":"teacher","role":"teacher","parent_user_id":1}'
USER_DATA_BASE64=$(echo -n "$USER_DATA" | base64)
echo "User Data Base64: $USER_DATA_BASE64"
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $USER_DATA_BASE64" | jq '.'

