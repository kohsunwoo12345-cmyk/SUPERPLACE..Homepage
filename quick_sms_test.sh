#!/bin/bash

# SMS 발송 시스템 빠른 테스트 스크립트
# 사용법: ./quick_sms_test.sh

echo "🚀 SMS 발송 시스템 테스트 시작"
echo "================================"
echo ""

BASE_URL="https://3000-iou7tv72zio2g94q2suey-2b54fc91.sandbox.novita.ai"

echo "📍 테스트 서버: $BASE_URL"
echo ""

# 1. DB 초기화
echo "1️⃣ DB 초기화 중..."
INIT_RESULT=$(curl -s -X POST "$BASE_URL/api/init-db")
echo "   ✅ $(echo $INIT_RESULT | jq -r '.message')"
echo ""

# 2. 포인트 충전
echo "2️⃣ 포인트 충전 중 (10,000P)..."
CHARGE_RESULT=$(curl -s -X POST "$BASE_URL/api/points/charge" \
  -H 'Content-Type: application/json' \
  -d '{"userId": 1, "amount": 10000}')
BALANCE=$(echo $CHARGE_RESULT | jq -r '.balance')
echo "   ✅ 현재 잔액: ${BALANCE}P"
echo ""

# 3. 발신번호 등록
echo "3️⃣ 발신번호 등록 중 (010-8739-9697)..."
SENDER_RESULT=$(curl -s -X POST "$BASE_URL/api/sms/sender/register" \
  -H 'Content-Type: application/json' \
  -d '{"userId": 1, "phoneNumber": "010-8739-9697", "verificationMethod": "aligo_website"}')
SENDER_MSG=$(echo $SENDER_RESULT | jq -r '.message')
if [ "$SENDER_MSG" != "null" ]; then
  echo "   ✅ $SENDER_MSG"
else
  echo "   ℹ️  발신번호 이미 등록되어 있음"
fi
echo ""

# 4. SMS 발송
echo "4️⃣ SMS 발송 테스트 중..."
SMS_RESULT=$(curl -s -X POST "$BASE_URL/api/sms/send" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [{"phone": "010-8739-9697", "name": "테스트"}],
    "message": "[슈퍼플레이스] SMS API 테스트 메시지입니다!"
  }')

SUCCESS=$(echo $SMS_RESULT | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
  MESSAGE=$(echo $SMS_RESULT | jq -r '.message')
  SENT_COUNT=$(echo $SMS_RESULT | jq -r '.sentCount')
  TOTAL_COST=$(echo $SMS_RESULT | jq -r '.totalCost')
  REMAINING=$(echo $SMS_RESULT | jq -r '.remainingBalance')
  
  echo "   ✅ $MESSAGE"
  echo "   📤 발송 건수: ${SENT_COUNT}건"
  echo "   💰 사용 포인트: ${TOTAL_COST}P"
  echo "   💳 남은 잔액: ${REMAINING}P"
else
  ERROR=$(echo $SMS_RESULT | jq -r '.error')
  echo "   ❌ 발송 실패: $ERROR"
fi
echo ""

echo "================================"
echo "✅ 테스트 완료!"
echo ""
echo "📱 웹 UI에서 테스트하기:"
echo "   $BASE_URL/sms/compose"
echo ""
echo "📚 자세한 가이드:"
echo "   - SMS_FIX_COMPLETE.md"
echo "   - FINAL_SMS_SOLUTION.md"
echo ""
