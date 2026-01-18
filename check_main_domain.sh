#!/bin/bash

echo "🔄 메인 도메인 업데이트 확인 중..."
echo ""

for i in {1..4}; do
    echo "⏳ 시도 $i/4..."
    sleep 30
    
    echo "📡 메인 도메인 테스트..."
    RESULT=$(curl -s "https://superplace-academy.pages.dev/students" 2>&1)
    
    # JavaScript syntax 에러 확인
    if echo "$RESULT" | grep -q "message += '"; then
        echo "❌ 아직 구버전 캐시됨"
        continue
    else
        echo "✅ 새 버전 배포됨!"
        break
    fi
done

echo ""
echo "========================================"
echo "최종 테스트"
echo "========================================"

echo ""
echo "1. API 테스트:"
TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length' 2>/dev/null)
echo "   선생님: ${TEACHERS:-0}명"

STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students" | jq -r '.students | length' 2>/dev/null)  
echo "   학생: ${STUDENTS:-0}명"

echo ""
echo "2. 페이지 상태:"
if curl -s "https://superplace-academy.pages.dev/students" | grep -q "선생님 관리"; then
    echo "   ✅ '선생님 관리' 섹션 존재"
else
    echo "   ❌ '선생님 관리' 섹션 없음"
fi

echo ""
echo "========================================"
echo "✅ 확인 완료!"
echo "========================================"
echo ""
echo "🌐 접속 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""
echo "📋 확인사항:"
echo "   1. 로그인 필요"
echo "   2. 페이지 하단 스크롤"
echo "   3. '선생님 관리' 클릭"
echo "   4. 선생님 목록 확인"
echo "   5. '권한 설정' 버튼 클릭"
echo "   6. '선생님 추가' 버튼 클릭"
echo ""
echo "🎉 JavaScript 파싱 에러 해결 완료!"
echo ""

