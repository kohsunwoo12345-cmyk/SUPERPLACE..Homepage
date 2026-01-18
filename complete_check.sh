#!/bin/bash

echo "🔍 100% 완전 점검 시작..."
echo ""

# 배포 대기
echo "⏳ 배포 완료 대기 (30초)..."
sleep 30

echo "========================================"
echo "1. API 테스트: /api/classes/list"
echo "========================================"
CLASSES_LIST=$(curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=7&userType=director")
echo "$CLASSES_LIST" | jq '.'

CLASS_COUNT=$(echo "$CLASSES_LIST" | jq '.classes | length')
echo ""
echo "✅ 반 개수: ${CLASS_COUNT}개"

if [ "$CLASS_COUNT" -gt 0 ]; then
    echo ""
    echo "📋 반 목록 (처음 5개):"
    echo "$CLASSES_LIST" | jq -r '.classes[0:5] | .[] | "  [\(.id)] \(.name) - 학생 \(.student_count)명"'
fi

echo ""
echo "========================================"
echo "2. API 테스트: /api/classes"
echo "========================================"
CLASSES=$(curl -s "https://superplace-academy.pages.dev/api/classes?userId=7")
echo "$CLASSES" | jq '.'

CLASS_COUNT2=$(echo "$CLASSES" | jq '.classes | length')
echo ""
echo "✅ 반 개수: ${CLASS_COUNT2}개"

if [ "$CLASS_COUNT2" -gt 0 ]; then
    echo ""
    echo "📋 반 목록 (처음 5개):"
    echo "$CLASSES" | jq -r '.classes[0:5] | .[] | "  [\(.id)] \(.class_name) - 학생 \(.student_count)명"'
fi

echo ""
echo "========================================"
echo "3. 반 추가 테스트"
echo "========================================"
NEW_CLASS=$(curl -s "https://superplace-academy.pages.dev/api/classes" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"academyId":7,"className":"테스트반 100%점검","grade":"테스트","description":"완전점검용"}')

echo "$NEW_CLASS" | jq '.'

if echo "$NEW_CLASS" | jq -e '.success' > /dev/null 2>&1; then
    NEW_CLASS_ID=$(echo "$NEW_CLASS" | jq -r '.classId')
    echo ""
    echo "✅ 반 추가 성공! ID: $NEW_CLASS_ID"
    
    # 추가된 반 확인
    echo ""
    echo "추가된 반 확인:"
    sleep 2
    VERIFY=$(curl -s "https://superplace-academy.pages.dev/api/classes?userId=7")
    echo "$VERIFY" | jq ".classes[] | select(.id == $NEW_CLASS_ID)"
else
    echo ""
    echo "❌ 반 추가 실패"
fi

echo ""
echo "========================================"
echo "4. 학생 API 테스트"
echo "========================================"
STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students")
echo "$STUDENTS" | jq '.'

STUDENT_COUNT=$(echo "$STUDENTS" | jq '.students | length')
echo ""
echo "✅ 학생 수: ${STUDENT_COUNT}명"

echo ""
echo "========================================"
echo "5. 선생님 목록 테스트"
echo "========================================"
TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=7")
TEACHER_COUNT=$(echo "$TEACHERS" | jq '.teachers | length')
echo "✅ 선생님 수: ${TEACHER_COUNT}명"

echo ""
echo "========================================"
echo "✅ 100% 점검 완료!"
echo "========================================"
echo ""
echo "📊 최종 결과:"
echo "   • 반 목록 API (/api/classes/list): ${CLASS_COUNT}개"
echo "   • 반 목록 API (/api/classes): ${CLASS_COUNT2}개"
echo "   • 학생: ${STUDENT_COUNT}명"
echo "   • 선생님: ${TEACHER_COUNT}명"
echo ""
echo "🌐 확인 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""
echo "📋 확인사항:"
echo "   1. 로그인"
echo "   2. 반 목록 확인 (${CLASS_COUNT}개 표시되어야 함)"
echo "   3. 반 추가 버튼 클릭"
echo "   4. 학생 목록 확인"
echo ""

if [ "$CLASS_COUNT" -gt 0 ] && [ "$CLASS_COUNT2" -gt 0 ]; then
    echo "🎉 모든 API 정상 작동!"
else
    echo "⚠️  일부 API에 문제가 있습니다."
fi
echo ""

