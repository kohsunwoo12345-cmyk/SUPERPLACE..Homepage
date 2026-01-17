#!/bin/bash

echo "🧪 빠른 테스트"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  페이지 접근..."
curl -s "${BASE_URL}/teachers" > /tmp/teachers-page.html
if grep -q "currentUserId" /tmp/teachers-page.html; then
    echo "   ✅ 새 코드 배포됨"
else
    echo "   ⏳ 아직 구 버전 (대기 필요)"
fi

echo ""
echo "2️⃣  선생님 추가 테스트..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/teachers/add" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "최종테스트'$(date +%s)'",
    "email": "final-test-'$(date +%s)'@test.com",
    "phone": "010-0000-0000",
    "assigned_class": "최종테스트반",
    "user_id": 1
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ API 작동: 선생님 추가 성공"
    TEACHER_ID=$(echo "$RESPONSE" | grep -o '"teacherId":[0-9]*' | grep -o '[0-9]*')
    echo "   📝 ID: $TEACHER_ID"
else
    echo "   ❌ API 실패"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "🔗 테스트 URL:"
echo "   ${BASE_URL}/teachers"
echo "   ${BASE_URL}/teachers?userId=1"
