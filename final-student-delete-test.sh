#!/bin/bash
echo "=========================================="
echo "최종 학생 삭제 기능 테스트"
echo "=========================================="

BASE_URL="https://superplace-academy.pages.dev"

# 1. 학생 목록 조회
echo ""
echo "1️⃣ 학생 목록 조회..."
LIST=$(curl -s "${BASE_URL}/api/students?userId=1")
echo "$LIST" | grep -o '"id":[0-9]*,"academy_id":[0-9]*,"name":"[^"]*"' | head -3
STUDENT_ID=$(echo "$LIST" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$STUDENT_ID" ]; then
    echo "❌ 학생이 없습니다"
    exit 1
fi

echo "✅ 대상 학생 ID: $STUDENT_ID"

# 2. 학생 삭제
echo ""
echo "2️⃣ 학생 ID $STUDENT_ID 삭제..."
DELETE_RESP=$(curl -s -X DELETE "${BASE_URL}/api/students/${STUDENT_ID}")
echo "응답: $DELETE_RESP"

if echo "$DELETE_RESP" | grep -q '"success":true'; then
    echo "✅ 삭제 성공!"
else
    echo "❌ 삭제 실패"
    echo "$DELETE_RESP"
    exit 1
fi

# 3. 삭제 확인
echo ""
echo "3️⃣ 삭제 확인 (3초 대기)..."
sleep 3
LIST_AFTER=$(curl -s "${BASE_URL}/api/students?userId=1")

if echo "$LIST_AFTER" | grep -q "\"id\":$STUDENT_ID"; then
    echo "⚠️  삭제된 학생이 목록에 여전히 표시됨 (예상치 못한 동작)"
    exit 1
else
    echo "✅ 삭제된 학생이 목록에서 제거됨"
fi

echo ""
echo "=========================================="
echo "✅✅✅ 모든 테스트 통과! ✅✅✅"
echo "=========================================="
echo ""
echo "📱 학생 관리 페이지에서 직접 테스트하세요:"
echo "   ${BASE_URL}/students"
echo ""
