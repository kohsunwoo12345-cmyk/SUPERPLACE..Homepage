#!/bin/bash

echo "🔄 반 이전 작업 시작..."
echo ""

# 배포 대기
echo "⏳ 배포 완료 대기 (30초)..."
sleep 30

echo "========================================"
echo "1. admin@superplace.co.kr 계정 정보 확인"
echo "========================================" 

ADMIN_INFO=$(curl -s "https://superplace-academy.pages.dev/api/admin/get-user-classes?email=admin@superplace.co.kr")
echo "$ADMIN_INFO" | jq '.'

if echo "$ADMIN_INFO" | jq -e '.success' > /dev/null 2>&1; then
    ADMIN_CLASS_COUNT=$(echo "$ADMIN_INFO" | jq '.classes | length')
    echo ""
    echo "✅ admin 계정 반 개수: $ADMIN_CLASS_COUNT"
    
    if [ "$ADMIN_CLASS_COUNT" -gt 0 ]; then
        echo ""
        echo "📋 admin 계정의 반 목록:"
        echo "$ADMIN_INFO" | jq -r '.classes[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
        
        # 모든 class ID 추출
        CLASS_IDS=$(echo "$ADMIN_INFO" | jq -r '.classes[].id' | jq -R -s -c 'split("\n") | map(select(length > 0) | tonumber)')
        
        echo ""
        echo "========================================"
        echo "2. kumetang@gmail.com 계정으로 이전"
        echo "========================================"
        
        TRANSFER_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/admin/transfer-classes" \
          -X POST \
          -H "Content-Type: application/json" \
          -d "{\"fromEmail\":\"admin@superplace.co.kr\",\"toEmail\":\"kumetang@gmail.com\",\"classIds\":$CLASS_IDS}")
        
        echo "$TRANSFER_RESULT" | jq '.'
        
        if echo "$TRANSFER_RESULT" | jq -e '.success' > /dev/null 2>&1; then
            echo ""
            echo "✅ 이전 완료!"
            echo ""
            echo "📊 이전된 반:"
            echo "$TRANSFER_RESULT" | jq -r '.transferred[] | "  [\(.classId)] \(.className) - 학생 \(.studentCount)명"'
        else
            echo ""
            echo "❌ 이전 실패"
        fi
    else
        echo ""
        echo "⚠️  admin 계정에 반이 없습니다."
    fi
else
    echo ""
    echo "❌ admin 계정을 찾을 수 없습니다."
fi

echo ""
echo "========================================"
echo "3. kumetang@gmail.com 계정 확인"
echo "========================================"

KUMETANG_INFO=$(curl -s "https://superplace-academy.pages.dev/api/admin/get-user-classes?email=kumetang@gmail.com")
echo "$KUMETANG_INFO" | jq '.'

if echo "$KUMETANG_INFO" | jq -e '.success' > /dev/null 2>&1; then
    KUMETANG_CLASS_COUNT=$(echo "$KUMETANG_INFO" | jq '.classes | length')
    echo ""
    echo "✅ kumetang 계정 반 개수: $KUMETANG_CLASS_COUNT"
    
    if [ "$KUMETANG_CLASS_COUNT" -gt 0 ]; then
        echo ""
        echo "📋 kumetang 계정의 반 목록:"
        echo "$KUMETANG_INFO" | jq -r '.classes[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
    fi
fi

echo ""
echo "========================================"
echo "✅ 작업 완료!"
echo "========================================"
echo ""
echo "🌐 확인 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""
echo "📋 확인사항:"
echo "   1. 로그인"
echo "   2. 반 목록 확인"
echo "   3. 각 반의 학생 수 확인"
echo ""

