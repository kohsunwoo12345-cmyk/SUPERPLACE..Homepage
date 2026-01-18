#!/bin/bash

echo "🔍 계정 정보 확인 중..."
echo ""

# admin@superplace.co.kr 계정 확인
echo "========================================"
echo "1. admin@superplace.co.kr 계정"
echo "========================================"

ADMIN_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@superplace.co.kr","password":"admin123"}')

echo "로그인 결과:"
echo "$ADMIN_RESULT" | jq '.'

if echo "$ADMIN_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    ADMIN_ID=$(echo "$ADMIN_RESULT" | jq -r '.user.id')
    echo ""
    echo "✅ admin 계정 ID: $ADMIN_ID"
    
    # admin 계정의 반 목록
    echo ""
    echo "admin 계정의 반 목록:"
    ADMIN_CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=$ADMIN_ID&userType=director")
    echo "$ADMIN_CLASSES" | jq '.classes[] | {id, class_name, student_count}'
else
    echo "❌ admin 계정 로그인 실패"
fi

echo ""
echo "========================================"
echo "2. kumetang@gmail.com 계정"
echo "========================================"

KUMETANG_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"kumetang@gmail.com","password":"1234"}')

echo "로그인 결과:"
echo "$KUMETANG_RESULT" | jq '.'

if echo "$KUMETANG_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    KUMETANG_ID=$(echo "$KUMETANG_RESULT" | jq -r '.user.id')
    echo ""
    echo "✅ kumetang 계정 ID: $KUMETANG_ID"
    
    # kumetang 계정의 반 목록
    echo ""
    echo "kumetang 계정의 반 목록:"
    KUMETANG_CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=$KUMETANG_ID&userType=director")
    echo "$KUMETANG_CLASSES" | jq '.classes[] | {id, class_name, student_count}'
else
    echo "❌ kumetang 계정 로그인 실패"
fi

echo ""
echo "========================================"
echo "✅ 확인 완료!"
echo "========================================"

