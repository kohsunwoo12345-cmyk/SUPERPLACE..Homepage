#!/bin/bash
echo "=========================================="
echo "학생 삭제 기능 최종 검증"
echo "=========================================="

BASE_URL="https://superplace-academy.pages.dev"

# 1. 학생 목록 조회
echo ""
echo "1️⃣ 현재 학생 목록 조회..."
LIST_RESPONSE=$(curl -s "${BASE_URL}/api/students?userId=1")
echo "응답: $LIST_RESPONSE"

STUDENT_ID=$(echo "$LIST_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$STUDENT_ID" ]; then
    echo "❌ 삭제할 학생이 없습니다. 먼저 학생을 추가해주세요."
    exit 1
fi

echo "✅ 삭제 대상 학생 ID: $STUDENT_ID"

# 2. 학생 삭제 실행
echo ""
echo "2️⃣ 학생 ID $STUDENT_ID 삭제 시도..."
DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/students/${STUDENT_ID}")
echo "응답: $DELETE_RESPONSE"

if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 학생 삭제 성공!"
else
    echo "❌ 학생 삭제 실패"
    exit 1
fi

# 3. 삭제 후 목록 재조회
echo ""
echo "3️⃣ 삭제 후 학생 목록 재조회..."
sleep 2
LIST_AFTER=$(curl -s "${BASE_URL}/api/students?userId=1")
echo "응답: $LIST_AFTER"

if echo "$LIST_AFTER" | grep -q "\"id\":$STUDENT_ID"; then
    echo "❌ 삭제된 학생이 여전히 목록에 표시됨"
    exit 1
else
    echo "✅ 삭제된 학생이 목록에서 제거됨"
fi

echo ""
echo "=========================================="
echo "✅ 모든 테스트 통과!"
echo "=========================================="
echo ""
echo "📋 학생 관리 페이지: ${BASE_URL}/students"
echo ""
