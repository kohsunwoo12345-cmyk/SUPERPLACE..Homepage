#!/bin/bash

echo "🔍 즉시 테스트 시작..."
echo ""

echo "========================================"
echo "1. API 테스트"
echo "========================================"
echo "선생님 목록 API:"
RESULT=$(curl -s "https://09cb2217.superplace-academy.pages.dev/api/teachers/list?directorId=1")
echo "$RESULT" | jq -r 'if .success then "✅ API 성공: \(.teachers | length)명" else "❌ API 실패: \(.error)" end'

echo ""
echo "처음 3명:"
echo "$RESULT" | jq -r '.teachers[0:3] | .[] | "  • \(.name) - \(.email)"'

echo ""
echo "========================================"
echo "2. 학생 목록 API"
echo "========================================"
STUDENTS=$(curl -s "https://09cb2217.superplace-academy.pages.dev/api/students")
echo "$STUDENTS" | jq -r 'if .success then "✅ API 성공: \(.students | length)명" else "❌ API 실패: \(.error)" end'

echo ""
echo "========================================"
echo "3. 페이지 로드 테스트"
echo "========================================"
PAGE=$(curl -s "https://09cb2217.superplace-academy.pages.dev/students")
if echo "$PAGE" | grep -q "선생님 관리"; then
    echo "✅ 페이지에 '선생님 관리' 섹션 존재"
else
    echo "❌ '선생님 관리' 섹션 없음"
fi

if echo "$PAGE" | grep -q "loadTeachersList"; then
    echo "✅ loadTeachersList 함수 존재"
else
    echo "❌ loadTeachersList 함수 없음"
fi

if echo "$PAGE" | grep -q "showTeacherPermissions"; then
    echo "✅ showTeacherPermissions 함수 존재"
else
    echo "❌ showTeacherPermissions 함수 없음"
fi

echo ""
echo "========================================"
echo "✅ 테스트 완료!"
echo "========================================"
echo ""
echo "🌐 바로 접속 가능한 URL:"
echo "   https://09cb2217.superplace-academy.pages.dev/students"
echo "   또는"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   이메일: kumetang@gmail.com"
echo "   비밀번호: 1234"
echo ""
echo "📋 확인 사항:"
echo "   1. 로그인 후 페이지 하단으로 스크롤"
echo "   2. '선생님 관리' 카드 클릭"
echo "   3. 선생님 목록 확인 (10명)"
echo "   4. '권한 설정' 버튼 클릭 테스트"
echo "   5. '선생님 추가' 버튼 클릭 테스트"
echo ""

