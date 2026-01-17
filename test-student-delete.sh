#!/bin/bash

echo "🧪 학생 삭제 기능 테스트"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  테스트 학생 추가..."
ADD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/students" \
  -H "Content-Type: application/json" \
  -H "X-User-Data-Base64: eyJpZCI6MX0=" \
  -d '{
    "name": "삭제테스트학생",
    "grade": "중1",
    "parent_name": "학부모",
    "parent_phone": "010-0000-0000",
    "subjects": "수학, 영어"
  }')

if echo "$ADD_RESPONSE" | grep -q '"success":true'; then
    STUDENT_ID=$(echo "$ADD_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo "   ✅ 학생 추가 성공 (ID: $STUDENT_ID)"
else
    echo "   ❌ 학생 추가 실패"
    echo "   Response: $ADD_RESPONSE"
    exit 1
fi

echo ""
echo "2️⃣  학생 삭제 테스트..."
DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/students/${STUDENT_ID}")

if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ 학생 삭제 성공!"
    echo "   Response: $DELETE_RESPONSE"
else
    echo "   ❌ 학생 삭제 실패"
    echo "   Response: $DELETE_RESPONSE"
    exit 1
fi

echo ""
echo "✅ 모든 테스트 통과!"
echo ""
echo "🔗 학생 관리 페이지:"
echo "   ${BASE_URL}/students"
