#!/bin/bash

echo "========================================="
echo "🧪 학생 연동 및 SMS 발송 전체 테스트"
echo "========================================="
echo ""

BASE_URL="https://superplace-academy.pages.dev"

# 1. 학생 목록 확인
echo "1️⃣ 학생 목록 확인..."
STUDENTS=$(curl -s "$BASE_URL/api/students?academyId=1")
STUDENT_COUNT=$(echo $STUDENTS | jq -r '.students | length')
echo "   등록된 학생 수: $STUDENT_COUNT명"
echo $STUDENTS | jq -r '.students[] | "   - \(.name) (\(.grade), \(.class_name))"'
echo ""

# 2. 발신번호 확인
echo "2️⃣ 발신번호 확인..."
SENDERS=$(curl -s "$BASE_URL/api/sms/senders" -H "X-User-Id: 1")
echo "   응답: $SENDERS"
echo ""

# 3. 발신번호 등록 시도
echo "3️⃣ 발신번호 등록 시도..."
REGISTER_RESULT=$(curl -s -X POST "$BASE_URL/api/sms/sender/register" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "phoneNumber": "010-8739-9697",
    "verificationMethod": "aligo_website"
  }')
echo "   결과: $REGISTER_RESULT"
echo ""

# 4. 환경 변수 테스트 (SMS 발송 시도)
echo "4️⃣ SMS 발송 테스트..."
SMS_RESULT=$(curl -s -X POST "$BASE_URL/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "senderId": 1,
    "receivers": [
      {"name": "테스트", "phone": "010-8739-9697"}
    ],
    "message": "[테스트] 자동화 테스트 메시지"
  }')
echo "   결과: $SMS_RESULT"
echo ""

# 5. 결과 분석
echo "========================================="
echo "📊 테스트 결과 요약"
echo "========================================="
echo ""

if [ "$STUDENT_COUNT" -gt 0 ]; then
    echo "✅ 학생 목록: 정상 ($STUDENT_COUNT명)"
else
    echo "❌ 학생 목록: 비어있음"
fi

if echo "$SENDERS" | grep -q "success.*true"; then
    echo "✅ 발신번호 API: 정상"
else
    echo "⚠️  발신번호 API: 확인 필요"
fi

if echo "$SMS_RESULT" | grep -q "success.*true"; then
    echo "✅ SMS 발송: 성공!"
elif echo "$SMS_RESULT" | grep -q "포인트"; then
    echo "⚠️  SMS 발송: 포인트 부족"
elif echo "$SMS_RESULT" | grep -q "발신번호"; then
    echo "⚠️  SMS 발송: 발신번호 미등록"
elif echo "$SMS_RESULT" | grep -q "API"; then
    echo "❌ SMS 발송: 환경 변수 설정 필요"
else
    echo "❌ SMS 발송: 실패 - $SMS_RESULT"
fi

echo ""
echo "========================================="
echo "📖 문제 해결 방법은 TROUBLESHOOTING_GUIDE.md 참고"
echo "========================================="
