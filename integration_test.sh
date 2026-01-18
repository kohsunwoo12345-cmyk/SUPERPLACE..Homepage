#!/bin/bash

echo "🔥 100% 통합 테스트 시작..."
echo ""

sleep 30

USER_ID=7

echo "========================================"
echo "1. /api/classes/list 테스트"
echo "========================================"
CLASSES_LIST=$(curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=$USER_ID&userType=director")
LIST_COUNT=$(echo "$CLASSES_LIST" | jq '.classes | length')
echo "✅ 반 개수: ${LIST_COUNT}개"

if [ "$LIST_COUNT" -gt 0 ]; then
    echo "$CLASSES_LIST" | jq -r '.classes[0:3] | .[] | "  [\(.id)] \(.name) - 학생 \(.student_count)명"'
fi

echo ""
echo "========================================"
echo "2. /api/classes 테스트"
echo "========================================"
CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/classes?userId=$USER_ID")
CLASSES_COUNT=$(echo "$CLASSES" | jq '.classes | length')
echo "✅ 반 개수: ${CLASSES_COUNT}개"

if [ "$CLASSES_COUNT" -gt 0 ]; then
    echo "$CLASSES" | jq -r '.classes[0:3] | .[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
fi

echo ""
echo "========================================"
echo "3. 반 추가 테스트"
echo "========================================"
NEW_CLASS=$(curl -s "https://superplace-academy.pages.dev/api/classes" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"academyId\":$USER_ID,\"className\":\"통합테스트반\",\"grade\":\"통합\",\"description\":\"100%통합테스트\"}")

echo "$NEW_CLASS" | jq '.'

if echo "$NEW_CLASS" | jq -e '.success' > /dev/null 2>&1; then
    NEW_ID=$(echo "$NEW_CLASS" | jq -r '.classId')
    echo ""
    echo "✅ 반 추가 성공! ID: $NEW_ID"
    
    # 반 삭제 테스트
    echo ""
    echo "========================================"
    echo "4. 반 삭제 테스트"
    echo "========================================"
    sleep 2
    DELETE_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/classes/${NEW_ID}?userId=$USER_ID" -X DELETE)
    echo "$DELETE_RESULT" | jq '.'
    
    if echo "$DELETE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ 반 삭제 성공!"
    else
        echo "❌ 반 삭제 실패"
    fi
else
    echo "❌ 반 추가 실패"
fi

echo ""
echo "========================================"
echo "5. 최종 반 개수 확인"
echo "========================================"
sleep 2
FINAL_LIST=$(curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=$USER_ID&userType=director")
FINAL_COUNT=$(echo "$FINAL_LIST" | jq '.classes | length')

FINAL_CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/classes?userId=$USER_ID")
FINAL_COUNT2=$(echo "$FINAL_CLASSES" | jq '.classes | length')

echo "/api/classes/list: ${FINAL_COUNT}개"
echo "/api/classes: ${FINAL_COUNT2}개"

echo ""
echo "========================================"
echo "✅ 통합 테스트 완료!"
echo "========================================"
echo ""
echo "📊 결과:"
echo "   • /api/classes/list: ${LIST_COUNT}개 → ${FINAL_COUNT}개"
echo "   • /api/classes: ${CLASSES_COUNT}개 → ${FINAL_COUNT2}개"
echo ""

if [ "$FINAL_COUNT" -eq "$FINAL_COUNT2" ]; then
    echo "🎉 두 API가 완벽하게 통합되었습니다!"
else
    echo "⚠️  API 간 차이가 있습니다."
fi

echo ""
echo "🌐 확인 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""

