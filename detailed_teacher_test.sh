#!/bin/bash
echo "=== 선생님 계정 상세 테스트 ==="

TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)

echo "선생님 데이터: $TEACHER_DATA"
echo "Base64 헤더: $TEACHER_HEADER"
echo ""

echo "API 호출 결과:"
RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

echo "$RESPONSE" | jq '.'

echo ""
echo "=== 에러 확인 ==="
echo "$RESPONSE" | jq '.error'

echo ""
echo "=== 성공 여부 ==="
echo "$RESPONSE" | jq '.success'
