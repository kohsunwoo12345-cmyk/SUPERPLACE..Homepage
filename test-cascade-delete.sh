#!/bin/bash
echo "==========================================="
echo "CASCADE DELETE 테스트"
echo "==========================================="

BASE_URL="https://superplace-academy.pages.dev"

# 1. 학생 목록 조회
echo ""
echo "1️⃣ 학생 목록 조회..."
LIST=$(curl -s "${BASE_URL}/api/students?userId=1")
STUDENT_ID=$(echo "$LIST" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$STUDENT_ID" ]; then
    echo "❌ 학생이 없습니다"
    exit 1
fi

STUDENT_NAME=$(echo "$LIST" | grep -o '"id":'$STUDENT_ID'[^}]*"name":"[^"]*"' | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
echo "✅ 대상 학생: ID $STUDENT_ID - $STUDENT_NAME"

# 2. 학생 삭제 시도
echo ""
echo "2️⃣ 학생 ID $STUDENT_ID 삭제 시도..."
DELETE_RESP=$(curl -s -X DELETE "${BASE_URL}/api/students/${STUDENT_ID}")
echo "응답: $DELETE_RESP"

if echo "$DELETE_RESP" | grep -q '"success":true'; then
    echo "✅✅✅ 삭제 성공!"
else
    echo "❌ 삭제 실패"
    if echo "$DELETE_RESP" | grep -q "FOREIGN KEY"; then
        echo "⚠️  여전히 FOREIGN KEY 오류 발생"
    fi
    echo "$DELETE_RESP"
    exit 1
fi

# 3. 삭제 확인
echo ""
echo "3️⃣ 삭제 확인..."
sleep 2
LIST_AFTER=$(curl -s "${BASE_URL}/api/students?userId=1")

if echo "$LIST_AFTER" | grep -q "\"id\":$STUDENT_ID"; then
    echo "❌ 삭제된 학생이 여전히 목록에 있음"
    exit 1
else
    echo "✅ 삭제된 학생이 목록에서 제거됨"
fi

echo ""
echo "==========================================="
echo "🎉🎉🎉 모든 테스트 통과! 🎉🎉🎉"
echo "==========================================="
echo ""
echo "✅ CASCADE DELETE 성공"
echo "✅ FOREIGN KEY 오류 해결"
echo ""
echo "📱 브라우저에서 직접 테스트:"
echo "   ${BASE_URL}/students/list"
echo ""
