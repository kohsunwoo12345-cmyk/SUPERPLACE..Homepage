#!/bin/bash
echo "=== 배포 대기 및 최종 테스트 ==="
echo ""
echo "⏳ GitHub → Cloudflare Pages 배포 대기 중..."
echo "   예상 시간: 2-3분"
echo ""

for i in {1..6}; do
  echo "   대기 중... $((i*30))초"
  sleep 30
done

echo ""
echo "✅ 배포 완료 예상 시간 경과"
echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "1️⃣ 선생님(ID 18) 권한 확인"
echo "=" | tr '=' '-' | head -c 60; echo ""
curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '.'

echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "2️⃣ 선생님(ID 18)으로 학생 목록 조회 (배정된 반만 보여야 함)"
echo "=" | tr '=' '-' | head -c 60; echo ""
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")
echo "$RESPONSE" | jq '.'

echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "3️⃣ 에러 확인"
echo "=" | tr '=' '-' | head -c 60; echo ""
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  if [ "$ERROR" != "null" ]; then
    echo "❌ 에러 발생: $ERROR"
  else
    echo "✅ 에러 없음"
  fi
else
  echo "✅ 에러 없음"
fi

echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "4️⃣ 학생 수 확인"
echo "=" | tr '=' '-' | head -c 60; echo ""
STUDENT_COUNT=$(echo "$RESPONSE" | jq -r '.students | length')
echo "조회된 학생 수: $STUDENT_COUNT"

echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "5️⃣ 원장(ID 1)으로 학생 목록 조회 (모든 학생 보여야 함)"
echo "=" | tr '=' '-' | head -c 60; echo ""
DIRECTOR_DATA='{"id":1,"user_type":"director","role":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)
DIRECTOR_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER")
DIRECTOR_COUNT=$(echo "$DIRECTOR_RESPONSE" | jq -r '.students | length')
echo "원장 계정 조회 학생 수: $DIRECTOR_COUNT"

echo ""
echo "=" | tr '=' '-' | head -c 60; echo ""
echo "✅ 최종 테스트 완료"
echo "=" | tr '=' '-' | head -c 60; echo ""
