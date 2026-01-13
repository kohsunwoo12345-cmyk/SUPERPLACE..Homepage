#!/bin/bash

# 알리고 SMS API 테스트 스크립트

echo "📱 알리고 SMS API 테스트"
echo "=========================="
echo ""

# 테스트 1: 단일 수신자
echo "🧪 테스트 1: 단일 수신자 SMS 발송"
curl -X POST https://superplace-academy.pages.dev/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "receivers": ["010-8739-9697"],
    "message": "[꾸메땅학원] SMS API 테스트 메시지입니다. 정상 작동 확인!"
  }' | jq .

echo ""
echo "=========================="
echo ""

# 테스트 2: 발송 내역 조회
echo "🧪 테스트 2: 발송 내역 조회"
curl -X GET "https://superplace-academy.pages.dev/api/sms/logs?userId=1" \
  -H "Content-Type: application/json" | jq .

echo ""
echo "=========================="
echo "✅ 테스트 완료!"
