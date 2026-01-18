#!/bin/bash
echo "🔧 === teacher_classes 에러 수정 및 테스트 ==="
echo ""

echo "⏳ 배포 대기 (2분)..."
sleep 120

echo ""
echo "1️⃣ teacher_classes 테이블 생성"
FIX_RESPONSE=$(curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error")
echo "$FIX_RESPONSE" | jq '.'

if echo "$FIX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ teacher_classes 테이블 생성 성공"
else
  echo "❌ teacher_classes 테이블 생성 실패"
  exit 1
fi

echo ""
echo "⏳ 테이블 생성 후 대기 (10초)..."
sleep 10

echo ""
echo "══════════════════════════════════════════════════"
echo "2️⃣ 선생님(ID 18)으로 학생 조회 재시도"
echo "══════════════════════════════════════════════════"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)

RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  STUDENT_COUNT=$(echo "$RESPONSE" | jq -r '.students | length')
  echo ""
  echo "✅ ✅ ✅  성공! 조회된 학생 수: $STUDENT_COUNT"
  
  if [ "$STUDENT_COUNT" -gt 0 ]; then
    echo ""
    echo "학생 목록:"
    echo "$RESPONSE" | jq -r '.students[] | "  • \(.name) - 반: \(.class_id // "미배정")"'
  fi
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo ""
  echo "❌ 실패: $ERROR"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "3️⃣ 원장(ID 1)으로 학생 조회"
echo "══════════════════════════════════════════════════"
DIRECTOR_DATA='{"id":1,"user_type":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)

DIRECTOR_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER")

DIRECTOR_COUNT=$(echo "$DIRECTOR_RESPONSE" | jq -r '.students | length')
echo "✅ 원장 계정 조회 학생 수: $DIRECTOR_COUNT"

echo ""
echo "══════════════════════════════════════════════════"
echo "4️⃣ 결과 비교"
echo "══════════════════════════════════════════════════"
if [ -n "$STUDENT_COUNT" ]; then
  echo "• 원장: $DIRECTOR_COUNT명"
  echo "• 선생님: $STUDENT_COUNT명"
  
  if [ "$STUDENT_COUNT" -le "$DIRECTOR_COUNT" ]; then
    echo ""
    echo "✅ ✅ ✅  권한 필터링 정상 작동!"
  fi
fi

echo ""
echo "🏁 완료"
