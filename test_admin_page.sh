#!/bin/bash

echo "==================================="
echo "관리자 페이지 테스트"
echo "==================================="
echo ""

BASE_URL="https://superplace-academy.pages.dev"

# 1. 테이블 초기화
echo "1️⃣ 테이블 초기화..."
curl -s -X POST "${BASE_URL}/api/admin/init-free-plan-table" | python3 -m json.tool
echo ""
sleep 1

# 2. 테스트 신청 3개 생성
echo "2️⃣ 테스트 신청 3개 생성..."
for i in 1 2 3; do
  echo "신청 $i 생성 중..."
  curl -s -X POST "${BASE_URL}/api/free-plan/apply" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"test-user-$i\",
      \"academyName\": \"테스트 학원 $i\",
      \"ownerName\": \"테스트 원장 $i\",
      \"email\": \"test$i@example.com\",
      \"phone\": \"010-1234-567$i\",
      \"reason\": \"무료 플랜 신청 사유 테스트 $i\"
    }" | python3 -m json.tool
  echo ""
  sleep 1
done

# 3. 관리자 페이지에서 목록 조회
echo "3️⃣ 관리자 페이지 목록 조회..."
REQUESTS=$(curl -s "${BASE_URL}/api/free-plan/requests?adminEmail=admin@superplace.co.kr")
echo "$REQUESTS" | python3 -m json.tool
echo ""

# 4. 페이지 HTML 확인
echo "4️⃣ 관리자 페이지 HTML 확인..."
curl -s "${BASE_URL}/admin/free-plan-requests" | grep -o "<title>[^<]*</title>"
echo ""

echo "==================================="
echo "✅ 테스트 완료"
echo "==================================="
echo ""
echo "📍 관리자 페이지: ${BASE_URL}/admin/free-plan-requests"
