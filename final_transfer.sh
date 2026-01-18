#!/bin/bash

echo "🔄 최종 데이터 이전 시작..."
echo ""

echo "========================================"
echo "1. admin (ID=1) 계정의 반 확인"
echo "========================================"
ADMIN_CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/admin/get-user-classes?email=admin@superplace.co.kr")
echo "$ADMIN_CLASSES" | jq '.'

ADMIN_CLASS_COUNT=$(echo "$ADMIN_CLASSES" | jq '.classes | length')
echo ""
echo "✅ admin 계정 반: ${ADMIN_CLASS_COUNT}개"

if [ "$ADMIN_CLASS_COUNT" -gt 0 ]; then
    echo ""
    echo "📋 admin 계정의 반 목록:"
    echo "$ADMIN_CLASSES" | jq -r '.classes[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
    
    # 모든 class ID 추출
    CLASS_IDS=$(echo "$ADMIN_CLASSES" | jq -r '.classes[].id' | jq -R -s -c 'split("\n") | map(select(length > 0) | tonumber)')
    
    echo ""
    echo "========================================"
    echo "2. kumetang (ID=7) 계정으로 이전"
    echo "========================================"
    
    TRANSFER=$(curl -s "https://superplace-academy.pages.dev/api/admin/transfer-classes" \
      -X POST \
      -H "Content-Type: application/json" \
      -d "{\"fromEmail\":\"admin@superplace.co.kr\",\"toEmail\":\"kumetang@gmail.com\",\"classIds\":$CLASS_IDS}")
    
    echo "$TRANSFER" | jq '.'
    
    if echo "$TRANSFER" | jq -e '.success' > /dev/null 2>&1; then
        echo ""
        echo "✅ 이전 완료!"
        echo ""
        echo "📊 이전된 반:"
        echo "$TRANSFER" | jq -r '.transferred[] | "  [\(.classId)] \(.className) - 학생 \(.studentCount)명"'
    fi
fi

echo ""
echo "========================================"
echo "3. kumetang 계정 최종 확인"
echo "========================================"
sleep 2
KUMETANG_FINAL=$(curl -s "https://superplace-academy.pages.dev/api/classes?userId=7")
echo "$KUMETANG_FINAL" | jq '.'

FINAL_COUNT=$(echo "$KUMETANG_FINAL" | jq '.classes | length')
echo ""
echo "✅ kumetang 계정 최종 반: ${FINAL_COUNT}개"

if [ "$FINAL_COUNT" -gt 0 ]; then
    echo ""
    echo "📋 반 목록 (처음 10개):"
    echo "$KUMETANG_FINAL" | jq -r '.classes[0:10] | .[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
fi

echo ""
echo "========================================"
echo "✅ 최종 이전 완료!"
echo "========================================"
echo ""
echo "🌐 확인 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""

