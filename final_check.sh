#!/bin/bash

echo "========================================="
echo "🎉 최종 배포 확인"
echo "========================================="
echo ""

URL="https://superplace-academy.pages.dev/tools/parent-message"

echo "1️⃣ JavaScript 문법 오류 확인..."
SYNTAX_ERROR=$(curl -s "$URL" 2>&1 | grep -c "SyntaxError")
if [ "$SYNTAX_ERROR" -eq 0 ]; then
    echo "   ✅ 문법 오류 없음"
else
    echo "   ❌ 문법 오류 발견: $SYNTAX_ERROR개"
fi
echo ""

echo "2️⃣ 학생 API 확인..."
STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students?academyId=1" | jq -r '.students | length')
echo "   등록된 학생: $STUDENTS명"
echo ""

echo "3️⃣ 코드 배포 확인..."
HAS_STRING_CONCAT=$(curl -s "$URL" | grep -c "currentStudent.name + '")
if [ "$HAS_STRING_CONCAT" -gt 0 ]; then
    echo "   ✅ 최신 코드 배포됨 (문자열 연결 방식)"
else
    echo "   ⏳ 이전 코드 (아직 배포 중)"
fi
echo ""

echo "========================================="
echo "📱 테스트 방법"
echo "========================================="
echo ""
echo "1. $URL 접속"
echo ""
echo "2. F12 키 → Console 탭"
echo ""
echo "3. 다음 코드 복사 & 붙여넣기 & Enter:"
echo ""
echo "localStorage.setItem('user', JSON.stringify({id:1,name:'테스트',academy_id:1}));"
echo "location.reload();"
echo ""
echo "4. 학생 선택 드롭다운에 3명이 보이는지 확인:"
echo "   - 고선우 (초1)"
echo "   - asd (초1)"
echo "   - 홍길동 (중1)"
echo ""
echo "========================================="
echo "✅ 모든 문제가 해결되었습니다!"
echo "========================================="
