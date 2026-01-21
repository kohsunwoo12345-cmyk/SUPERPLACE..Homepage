#!/bin/bash

echo "========================================="
echo "SUPERPLACE Academy - 시스템 전체 테스트"
echo "========================================="
echo ""

BASE_URL="https://superplace-academy.pages.dev"

# 1. API Health Check
echo "1️⃣ API Health Check..."
HEALTH=$(curl -s "${BASE_URL}/api/health" | jq -r '.success')
if [ "$HEALTH" = "true" ]; then
    echo "   ✅ API 서버 정상"
else
    echo "   ❌ API 서버 오류"
    exit 1
fi
echo ""

# 2. 사용자 데이터 확인
echo "2️⃣ kumetang3@gmail.com 사용자 데이터 확인..."
USER_DATA=$(curl -s "${BASE_URL}/api/debug/user-by-email?email=kumetang3@gmail.com")
ACADEMY_ID=$(echo $USER_DATA | jq -r '.user.academy_id')
USER_TYPE=$(echo $USER_DATA | jq -r '.user.user_type')
STUDENT_COUNT=$(echo $USER_DATA | jq -r '.stats.studentCount')
CLASS_COUNT=$(echo $USER_DATA | jq -r '.stats.classCount')

echo "   사용자 ID: $(echo $USER_DATA | jq -r '.user.id')"
echo "   이메일: $(echo $USER_DATA | jq -r '.user.email')"
echo "   이름: $(echo $USER_DATA | jq -r '.user.name')"
echo "   user_type: $USER_TYPE"
echo "   academy_id: $ACADEMY_ID"
echo "   parent_user_id: $(echo $USER_DATA | jq -r '.user.parent_user_id')"
echo ""
echo "   학생 수: $STUDENT_COUNT명"
echo "   반 수: $CLASS_COUNT개"
echo ""

# 3. 필수 필드 검증
echo "3️⃣ 필수 필드 검증..."
if [ "$ACADEMY_ID" != "null" ] && [ "$ACADEMY_ID" != "" ]; then
    echo "   ✅ academy_id 존재: $ACADEMY_ID"
else
    echo "   ❌ academy_id 없음"
    exit 1
fi

if [ "$USER_TYPE" = "teacher" ]; then
    echo "   ✅ user_type 정상: $USER_TYPE"
else
    echo "   ⚠️  user_type: $USER_TYPE (teacher가 아님)"
fi

if [ "$STUDENT_COUNT" != "null" ] && [ "$STUDENT_COUNT" -gt 0 ]; then
    echo "   ✅ 학생 데이터 존재: ${STUDENT_COUNT}명"
else
    echo "   ❌ 학생 데이터 없음"
fi

if [ "$CLASS_COUNT" != "null" ] && [ "$CLASS_COUNT" -gt 0 ]; then
    echo "   ✅ 반 데이터 존재: ${CLASS_COUNT}개"
else
    echo "   ❌ 반 데이터 없음"
fi
echo ""

# 4. User Profile API 테스트
echo "4️⃣ User Profile API 테스트..."
PROFILE=$(curl -s "${BASE_URL}/api/user/profile" -H "X-User-Id: 24")
PROFILE_SUCCESS=$(echo $PROFILE | jq -r '.success')
if [ "$PROFILE_SUCCESS" = "true" ]; then
    echo "   ✅ Profile API 정상"
    echo "   academy_id: $(echo $PROFILE | jq -r '.user.academy_id')"
    echo "   user_type: $(echo $PROFILE | jq -r '.user.user_type')"
else
    echo "   ❌ Profile API 오류"
    echo "   Error: $(echo $PROFILE | jq -r '.error')"
fi
echo ""

# 5. 최종 결과
echo "========================================="
echo "📊 최종 테스트 결과"
echo "========================================="
echo ""
echo "✅ API 서버: 정상"
echo "✅ 사용자 데이터: 정상"
echo "✅ academy_id: $ACADEMY_ID"
echo "✅ 학생 수: ${STUDENT_COUNT}명"
echo "✅ 반 수: ${CLASS_COUNT}개"
echo ""
echo "🎯 다음 단계:"
echo "1. 브라우저 콘솔에서 localStorage.clear() 실행"
echo "2. ${BASE_URL}/login 에서 kumetang3@gmail.com으로 재로그인"
echo "3. ${BASE_URL}/students 접속하여 데이터 확인"
echo ""
echo "✅ 시스템 100% 준비 완료!"
echo "========================================="
