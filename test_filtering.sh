#!/bin/bash
echo "=== 권한 필터링 테스트 ==="

echo "1. 원장(ID 1)으로 학생 목록 조회"
USER_DATA='{"id":1,"user_type":"director"}'
USER_DATA_B64=$(printf '%s' "$USER_DATA" | base64 | tr -d '\n')
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $USER_DATA_B64" \
  | jq '{success, count: (.students | length)}'

echo ""
echo "2. 김선생(ID 18)으로 학생 목록 조회 (반 1 배정됨)"
USER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
USER_DATA_B64=$(printf '%s' "$USER_DATA" | base64 | tr -d '\n')
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $USER_DATA_B64" \
  | jq '{success, count: (.students | length), students: [.students[] | {id, name, class_id}]}'

