#!/bin/bash

echo "============================================"
echo "무료 플랜 시스템 전체 테스트"
echo "============================================"
echo ""

BASE_URL="https://superplace-academy.pages.dev"

# 1. 테이블 재생성
echo "1️⃣ 테이블 재생성 (user_id TEXT로 변경)"
echo "----------------------------------------"
INIT=$(curl -s -X POST "${BASE_URL}/api/admin/init-free-plan-table")
echo "Response: $INIT"
echo ""
sleep 2

# 2. 무료 플랜 신청 (테스트 사용자)
echo "2️⃣ 무료 플랜 신청 테스트"
echo "----------------------------------------"
APPLY=$(curl -s -X POST "${BASE_URL}/api/free-plan/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-12345",
    "academyName": "슈퍼테스트 학원",
    "ownerName": "김테스트",
    "email": "test@superplace.co.kr",
    "phone": "010-9999-8888",
    "reason": "무료 플랜 시스템 테스트를 위한 신청입니다"
  }')
echo "Response: $APPLY"
echo ""
sleep 2

# 3. 관리자 신청 목록 확인
echo "3️⃣ 관리자 신청 목록 확인"
echo "----------------------------------------"
REQUESTS=$(curl -s "${BASE_URL}/api/free-plan/requests?adminEmail=admin@superplace.co.kr")
echo "Response: $REQUESTS"
echo ""

# Request ID 추출
REQUEST_ID=$(echo $REQUESTS | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "추출된 Request ID: $REQUEST_ID"
echo ""
sleep 2

# 4. 관리자 승인 테스트
if [ ! -z "$REQUEST_ID" ]; then
    echo "4️⃣ 관리자 승인 테스트 (Request ID: $REQUEST_ID)"
    echo "----------------------------------------"
    APPROVE=$(curl -s -X POST "${BASE_URL}/api/free-plan/approve" \
      -H "Content-Type: application/json" \
      -d "{
        \"requestId\": $REQUEST_ID,
        \"adminEmail\": \"admin@superplace.co.kr\"
      }")
    echo "Response: $APPROVE"
    echo ""
else
    echo "4️⃣ 승인 테스트 건너뜀 (Request ID 없음)"
    echo ""
fi

echo "============================================"
echo "✅ 테스트 완료"
echo "============================================"
echo ""
echo "📊 테스트 요약:"
echo "  - 테이블 재생성: 완료"
echo "  - 신청 제출: 완료"
echo "  - 관리자 조회: 완료"
if [ ! -z "$REQUEST_ID" ]; then
    echo "  - 관리자 승인: 완료 (Request ID: $REQUEST_ID)"
else
    echo "  - 관리자 승인: 건너뜀"
fi
echo ""
echo "🌐 관리자 페이지: ${BASE_URL}/admin/free-plan-requests"
echo "🌐 신청 페이지: ${BASE_URL}/pricing/free"
