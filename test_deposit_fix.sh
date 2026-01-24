#!/bin/bash

BASE_URL="https://superplace-academy.pages.dev"

echo "=== 입금 포인트 계산 수정 테스트 ==="
echo ""

# 1. 테스트 사용자 생성 (test-deposit-user)
echo "1. 테스트 사용자 생성..."
curl -s -X POST "$BASE_URL/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deposit-test-'$(date +%s)'@test.com",
    "password": "test1234",
    "name": "입금테스트사용자",
    "academy_id": null
  }' | jq '.'

echo ""
echo "2. 사용자 로그인..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deposit-test@test.com",
    "password": "test1234"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

echo ""
echo "3. 현재 잔액 확인..."
if [ -n "$USER_ID" ]; then
  BALANCE_BEFORE=$(curl -s "$BASE_URL/api/users/$USER_ID" | jq -r '.balance // 0')
  echo "현재 잔액: $BALANCE_BEFORE P"
fi

echo ""
echo "4. 입금 신청 테스트 (20,000 포인트)..."
DEPOSIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/deposit/request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-deposit",
    "userEmail": "deposit-test@test.com",
    "userName": "입금테스트",
    "amount": 20000,
    "totalAmount": 22000,
    "vat": 2000
  }')

echo "$DEPOSIT_RESPONSE" | jq '.'
REQUEST_ID=$(echo "$DEPOSIT_RESPONSE" | jq -r '.requestId // empty')

echo ""
echo "=== 테스트 요약 ==="
echo "• 충전 신청 포인트: 20,000 P"
echo "• 입금 금액 (VAT 포함): 22,000 원"
echo "• 기대 결과: 승인 후 정확히 20,000 P 적립"
echo "• 요청 ID: $REQUEST_ID"
echo ""
echo "관리자 승인 후 확인:"
echo "  - 입금 관리: $BASE_URL/admin/deposits"
echo "  - 승인 API: POST $BASE_URL/api/admin/deposit/requests/$REQUEST_ID/process"
echo ""
