#!/bin/bash
echo "=== 실제 선생님 권한 테스트 ==="

# 1. 선생님 계정 확인
echo "1. 선생님 계정 목록 확인"
curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq '.teachers[] | {id, name, email}'

echo ""
echo "2. 선생님 ID 2의 권한 확인"
curl -s "https://superplace-academy.pages.dev/api/teachers/2/permissions?directorId=1" | jq '.'

echo ""
echo "3. 선생님 계정으로 학생 목록 조회 테스트"
# Base64로 선생님 user data 인코딩 (teacherId=2)
USER_DATA='{"id":2,"user_type":"teacher","role":"teacher"}'
USER_DATA_BASE64=$(echo -n "$USER_DATA" | base64)
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $USER_DATA_BASE64" | jq '.students | length'
echo "학생 수"

echo ""
echo "4. 원장 계정으로 학생 목록 조회 테스트"
USER_DATA='{"id":1,"user_type":"director","role":"director"}'
USER_DATA_BASE64=$(echo -n "$USER_DATA" | base64)
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $USER_DATA_BASE64" | jq '.students | length'
echo "학생 수"

