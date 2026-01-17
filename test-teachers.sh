#!/bin/bash

echo "🎯 선생님 관리 기능 완전 테스트"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

echo "1️⃣  페이지 접근 테스트..."
TITLE=$(curl -s "${BASE_URL}/teachers" | grep -o "<title>.*</title>")
if [[ "$TITLE" == *"선생님 관리"* ]]; then
    echo "   ✅ 페이지 로드: OK"
else
    echo "   ❌ 페이지 로드: FAIL"
    exit 1
fi

echo ""
echo "2️⃣  선생님 추가 테스트..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/teachers/add" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트선생님'$(date +%s)'",
    "email": "test'$(date +%s)'@teacher.com",
    "phone": "010-9999-8888",
    "assigned_class": "테스트반",
    "user_id": 1
  }')

SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')
if [ ! -z "$SUCCESS" ]; then
    echo "   ✅ 선생님 추가: OK"
    TEACHER_ID=$(echo "$RESPONSE" | grep -o '"teacherId":[0-9]*' | grep -o '[0-9]*')
    echo "   📝 추가된 선생님 ID: $TEACHER_ID"
else
    echo "   ❌ 선생님 추가: FAIL"
    echo "   Response: $RESPONSE"
    exit 1
fi

echo ""
echo "3️⃣  선생님 목록 조회 테스트..."
LIST_RESPONSE=$(curl -s "${BASE_URL}/api/teachers?userId=1")
LIST_SUCCESS=$(echo "$LIST_RESPONSE" | grep -o '"success":true')
if [ ! -z "$LIST_SUCCESS" ]; then
    echo "   ✅ 목록 조회: OK"
    TEACHER_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"name"' | wc -l)
    echo "   📊 선생님 수: $TEACHER_COUNT명"
else
    echo "   ❌ 목록 조회: FAIL"
    echo "   Response: $LIST_RESPONSE"
    exit 1
fi

echo ""
echo "4️⃣  반 배정 테스트..."
if [ ! -z "$TEACHER_ID" ]; then
    ASSIGN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/teachers/${TEACHER_ID}/assign-class" \
      -H "Content-Type: application/json" \
      -d '{"assigned_class": "2학년 B반"}')
    
    ASSIGN_SUCCESS=$(echo "$ASSIGN_RESPONSE" | grep -o '"success":true')
    if [ ! -z "$ASSIGN_SUCCESS" ]; then
        echo "   ✅ 반 배정: OK"
    else
        echo "   ❌ 반 배정: FAIL"
        echo "   Response: $ASSIGN_RESPONSE"
    fi
fi

echo ""
echo "5️⃣  선생님 삭제 테스트..."
if [ ! -z "$TEACHER_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/teachers/${TEACHER_ID}")
    DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | grep -o '"success":true')
    if [ ! -z "$DELETE_SUCCESS" ]; then
        echo "   ✅ 선생님 삭제: OK"
    else
        echo "   ❌ 선생님 삭제: FAIL"
        echo "   Response: $DELETE_RESPONSE"
    fi
fi

echo ""
echo "✅ 모든 테스트 완료!"
echo ""
echo "🔗 선생님 관리 페이지:"
echo "   ${BASE_URL}/teachers"
