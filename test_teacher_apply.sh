#!/bin/bash

# 테스트 데이터
EMAIL="newteacher@test.com"
PASSWORD="test1234!"
NAME="김선생"
PHONE="010-1234-5678"
ACADEMY_NAME="슈퍼플레이스 학원"
VERIFICATION_CODE="APXE7J"

echo "=== 선생님 등록 API 테스트 ==="
echo ""
echo "요청 데이터:"
echo "Email: $EMAIL"
echo "Name: $NAME"
echo "Academy: $ACADEMY_NAME"
echo "Code: $VERIFICATION_CODE"
echo ""

# API 호출
RESPONSE=$(curl -s -X POST "https://superplace-academy.pages.dev/api/teachers/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\",
    \"phone\": \"$PHONE\",
    \"academyName\": \"$ACADEMY_NAME\",
    \"verificationCode\": \"$VERIFICATION_CODE\"
  }")

echo "응답:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
