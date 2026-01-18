#!/bin/bash
echo "🤖 === 완전 자동 수정 프로세스 ==="
echo ""
echo "배포 완료를 계속 확인하고 자동으로 수정합니다..."
echo ""

MAX_ATTEMPTS=20
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "[$ATTEMPT/$MAX_ATTEMPTS] 배포 확인 중..."
  
  # Fix API 호출
  RESPONSE=$(curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error" 2>&1)
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ teacher_classes 테이블 생성 성공!"
    echo ""
    
    # 10초 대기 후 테스트
    sleep 10
    
    echo "🧪 선생님 계정 테스트..."
    TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
    TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
    TEST_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
      -H "X-User-Data-Base64: $TEACHER_HEADER")
    
    if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
      STUDENT_COUNT=$(echo "$TEST_RESPONSE" | jq -r '.students | length' 2>/dev/null || echo "0")
      echo "✅ 학생 조회 성공! 조회된 학생 수: $STUDENT_COUNT"
      echo ""
      echo "🎉🎉🎉 모든 수정 완료! 🎉🎉🎉"
      echo ""
      echo "테스트 URL:"
      echo "  - 원장: https://superplace-academy.pages.dev/students"
      echo "  - 선생님: https://superplace-academy.pages.dev/students/list"
      exit 0
    else
      echo "⚠️  학생 조회 실패. 상세:"
      echo "$TEST_RESPONSE" | jq '.'
      exit 1
    fi
  elif echo "$RESPONSE" | grep -q "404"; then
    echo "   → 아직 배포되지 않음 (30초 후 재시도)"
    sleep 30
  else
    echo "   → 기타 응답: $RESPONSE"
    sleep 30
  fi
done

echo ""
echo "❌ 최대 시도 횟수 초과. 수동 확인 필요:"
echo "   https://superplace-academy.pages.dev/api/fix-teacher-classes-error"
exit 1
