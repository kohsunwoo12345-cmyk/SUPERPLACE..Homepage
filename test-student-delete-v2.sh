#!/bin/bash

echo "🧪 학생 삭제 기능 테스트 v2"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  테스트 학생 추가..."
ADD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/students" \
  -H "Content-Type: application/json" \
  -H "X-User-Data-Base64: eyJpZCI6MX0=" \
  -d '{
    "name": "삭제테스트학생",
    "grade": "중1",
    "school": "테스트중학교",
    "parent_name": "학부모",
    "parent_phone": "010-0000-0000",
    "subjects": "수학, 영어",
    "notes": "테스트용"
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
    echo "   메시지: $(echo "$DELETE_RESPONSE" | grep -o '"message":"[^"]*"')"
else
    echo "   ❌ 학생 삭제 실패"
    echo "   Response: $DELETE_RESPONSE"
    
    # 오류 확인
    if echo "$DELETE_RESPONSE" | grep -q "FOREIGN KEY"; then
        echo "   ⚠️  여전히 FOREIGN KEY 오류 발생"
        echo "   → daily_records 테이블 확인 필요"
    fi
    exit 1
fi

echo ""
echo "✅ 모든 테스트 통과!"
echo ""
echo "📝 결과:"
echo "   - 학생 추가: ✅"
echo "   - 학생 삭제: ✅"
echo "   - FOREIGN KEY 제약 조건: 해결됨 ✅"
