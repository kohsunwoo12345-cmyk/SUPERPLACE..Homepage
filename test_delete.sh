#!/bin/bash
# Test delete API with director credentials
USER_DATA='{"id":7,"email":"kumetang@gmail.com","academy_id":7,"user_type":"director"}'
ENCODED=$(echo -n "$USER_DATA" | base64)

echo "Testing delete API for student ID 17 (ㄴㅁㅇㅁㄴ)..."
curl -X DELETE "https://superplace-academy.pages.dev/api/students/17" \
  -H "X-User-Data-Base64: $ENCODED" \
  -H "Content-Type: application/json" \
  -s | jq '.'

echo ""
echo "Checking if student 17 was deleted..."
curl -s "https://superplace-academy.pages.dev/api/debug/students/7" | jq '[.students[] | select(.id == 17)] | .[0] | {id, name, status}'
