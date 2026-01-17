#!/bin/bash

echo "🎯 최종 배포 테스트"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  Teachers 페이지 확인..."
TITLE=$(curl -s "${BASE_URL}/teachers" | grep -o "<title>.*</title>")
if [[ "$TITLE" == *"선생님 관리"* ]]; then
    echo "   ✅ 페이지 타이틀: OK"
else
    echo "   ❌ 페이지 타이틀: FAIL"
    exit 1
fi

echo "2️⃣  페이지 요소 확인..."
CONTENT=$(curl -s "${BASE_URL}/teachers")

if echo "$CONTENT" | grep -q "선생님 추가"; then
    echo "   ✅ '선생님 추가' 버튼: OK"
else
    echo "   ❌ '선생님 추가' 버튼: FAIL"
fi

if echo "$CONTENT" | grep -q "전체 선생님"; then
    echo "   ✅ 통계 카드: OK"
else
    echo "   ❌ 통계 카드: FAIL"
fi

if echo "$CONTENT" | grep -q "loadTeachers"; then
    echo "   ✅ JavaScript 함수: OK"
else
    echo "   ❌ JavaScript 함수: FAIL"
fi

echo "3️⃣  API 엔드포인트 확인..."
API_RESPONSE=$(curl -s "${BASE_URL}/api/teachers?userId=999")
if echo "$API_RESPONSE" | grep -q "success"; then
    echo "   ✅ GET /api/teachers: OK"
else
    echo "   ❌ GET /api/teachers: FAIL"
fi

echo ""
echo "✅ 배포 완료!"
echo "   URL: ${BASE_URL}/teachers"
echo "   Preview: https://7a402ea7.superplace-academy.pages.dev/teachers"
