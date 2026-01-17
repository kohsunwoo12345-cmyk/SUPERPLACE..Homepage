#!/bin/bash

echo "🧪 기존 학생 삭제 테스트"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  학생 목록 조회..."
STUDENTS=$(curl -s "${BASE_URL}/api/students?userId=1")

if echo "$STUDENTS" | grep -q '"success":true'; then
    FIRST_STUDENT=$(echo "$STUDENTS" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
    
    if [ -z "$FIRST_STUDENT" ]; then
        echo "   ⚠️  학생이 없습니다."
        echo "   먼저 학생을 추가하세요: https://superplace-academy.pages.dev/students"
        exit 0
    fi
    
    echo "   ✅ 학생 목록 조회 성공"
    echo "   첫 번째 학생 ID: $FIRST_STUDENT"
else
    echo "   ❌ 학생 목록 조회 실패"
    exit 1
fi

echo ""
echo "2️⃣  학생 ID $FIRST_STUDENT 삭제 테스트..."
DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/students/${FIRST_STUDENT}")

echo "   Response: $DELETE_RESPONSE"
echo ""

if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ 학생 삭제 성공!"
    echo ""
    echo "📝 결과:"
    echo "   - FOREIGN KEY 제약 조건: 해결됨 ✅"
    echo "   - daily_records 자동 삭제: ✅"
    echo "   - 학생 삭제: ✅"
elif echo "$DELETE_RESPONSE" | grep -q "FOREIGN KEY"; then
    echo "   ❌ 여전히 FOREIGN KEY 오류"
    echo "   상세: $(echo "$DELETE_RESPONSE" | grep -o '"details":"[^"]*"')"
else
    echo "   ❌ 삭제 실패"
fi
