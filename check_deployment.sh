#!/bin/bash

echo "🔄 Cloudflare Pages 배포 확인 중..."
echo ""

MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "[$ATTEMPT/$MAX_ATTEMPTS] 배포 상태 확인 중..."
    
    # API 테스트
    RESPONSE=$(curl -s -X POST "https://superplace-academy.pages.dev/api/teachers/apply" \
      -H "Content-Type: application/json" \
      -d '{"email":"deploy-test@test.com","password":"test1234!","name":"배포테스트","phone":"010-0000-0000","academyName":"테스트학원","verificationCode":"APXE7J"}')
    
    # 학원명 불일치 에러가 사라졌는지 확인
    if echo "$RESPONSE" | grep -q "학원명을 확인해주세요"; then
        echo "❌ 아직 이전 버전 (학원명 검증 있음)"
    else
        echo "✅ 새 버전 배포 완료!"
        echo ""
        echo "응답:"
        echo "$RESPONSE" | jq '.'
        exit 0
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "   15초 후 재시도..."
        sleep 15
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "⏱️ 배포 대기 시간 초과"
echo "수동으로 확인하세요: https://superplace-academy.pages.dev/signup"
