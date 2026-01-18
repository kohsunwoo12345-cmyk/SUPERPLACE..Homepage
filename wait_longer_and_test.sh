#!/bin/bash
echo "🕐 === 배포 완료 대기 및 최종 테스트 ==="
echo ""

echo "⏳ 3분 대기..."
sleep 180

echo ""
echo "1️⃣ Fix API 호출"
curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error" | jq '.'

echo ""
echo "⏳ 10초 대기..."
sleep 10

echo ""
echo "2️⃣ 선생님 계정 테스트"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER" | jq '.'

echo ""
echo "🏁 완료"
