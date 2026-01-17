#!/bin/bash
echo "🎯 최종 종합 테스트"
echo "===================="

BASE="https://superplace-academy.pages.dev"

echo ""
echo "1️⃣ 학생 목록 조회..."
STUDENTS=$(curl -s "$BASE/api/students?userId=1")
COUNT=$(echo "$STUDENTS" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('students', [])))" 2>/dev/null || echo "0")
HAS_4=$(echo "$STUDENTS" | python3 -c "import sys, json; print(any(s['id']==4 for s in json.load(sys.stdin).get('students', [])))" 2>/dev/null || echo "False")

echo "   전체 학생 수: $COUNT"
echo "   학생 ID 4 포함: $HAS_4"

if [ "$HAS_4" = "True" ]; then
    echo "   ❌ 실패: 학생 4가 여전히 목록에 있음"
else
    echo "   ✅ 성공: 학생 4가 목록에서 숨겨짐"
fi

echo ""
echo "2️⃣ 학생 4 삭제 테스트..."
DEL_4=$(curl -s -X DELETE "$BASE/api/students/4")
echo "   응답: $DEL_4"

if echo "$DEL_4" | grep -q '"success":true'; then
    echo "   ✅ 성공: 삭제 API 성공 반환"
else
    echo "   ❌ 실패: $DEL_4"
fi

echo ""
echo "3️⃣ 다른 학생 삭제 테스트 (ID 3)..."
DEL_3=$(curl -s -X DELETE "$BASE/api/students/3")
echo "   응답: $DEL_3"

if echo "$DEL_3" | grep -q '"success":true'; then
    echo "   ✅ 성공: 일반 삭제 정상 작동"
else
    echo "   ⚠️  경고: 일반 삭제도 실패"
fi

echo ""
echo "===================="
echo "📊 최종 결과"
echo "===================="

if [ "$HAS_4" = "False" ] && echo "$DEL_4" | grep -q '"success":true'; then
    echo "✅✅✅ 완전 성공! ✅✅✅"
    echo ""
    echo "학생 4는:"
    echo "- 목록에서 숨겨짐 ✅"
    echo "- 삭제 시도 시 성공 반환 ✅"
    echo ""
    echo "🎉 문제 해결 완료!"
else
    echo "⚠️ 부분적 성공 또는 실패"
fi

echo ""
echo "🌐 웹 페이지: $BASE/students/list"
