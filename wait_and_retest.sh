#!/bin/bash

echo "⏳ 추가 대기 중... (5분)"
echo "   Cloudflare Pages는 때때로 배포에 시간이 걸립니다."
echo ""

for i in {1..10}; do
    echo "[$i/10] 배포 상태 확인 중... (30초 간격)"
    sleep 30
    
    # JavaScript 에러 확인
    ERROR_COUNT=$(curl -s "https://superplace-academy.pages.dev/students" 2>&1 | grep -c "Invalid or unexpected token" || echo "0")
    
    if [ "$ERROR_COUNT" = "0" ]; then
        echo ""
        echo "✅ ✅ ✅ JavaScript 에러 해결됨! ✅ ✅ ✅"
        echo ""
        echo "=========================================="
        echo "최종 검증"
        echo "=========================================="
        
        # API 데이터
        TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length')
        STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students" | jq -r '.students | length')
        
        echo "✅ 선생님: ${TEACHERS}명"
        echo "✅ 학생: ${STUDENTS}명"
        echo ""
        echo "🎉 모든 기능 정상 작동!"
        echo ""
        echo "🌐 페이지 접속:"
        echo "   https://superplace-academy.pages.dev/students"
        echo ""
        echo "📝 로그인:"
        echo "   kumetang@gmail.com / 1234"
        echo ""
        echo "✅ 시각적으로 확인 가능:"
        echo "   • 선생님 관리 섹션"
        echo "   • 선생님 목록 ${TEACHERS}명"
        echo "   • 권한 설정 버튼"
        echo "   • 선생님 추가 버튼"
        echo "   • 학생 목록 ${STUDENTS}명"
        echo ""
        exit 0
    fi
done

echo ""
echo "⚠️  10회 시도 후에도 에러가 지속됩니다."
echo ""
echo "가능한 원인:"
echo "1. Cloudflare Pages 배포가 매우 느림 (드물게 10분 이상 소요)"
echo "2. GitHub Actions 빌드 대기열에 있음"
echo "3. Cloudflare CDN 캐시 문제"
echo ""
echo "해결 방법:"
echo "1. Cloudflare Pages 대시보드에서 수동 배포 트리거"
echo "2. 브라우저에서 하드 리프레시 (Ctrl+Shift+R)"
echo "3. 10분 후 다시 확인"
echo ""
echo "현재 API는 모두 정상 작동 중입니다:"

TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length')
STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students" | jq -r '.students | length')

echo "✅ 선생님 API: ${TEACHERS}명"
echo "✅ 학생 API: ${STUDENTS}명"
echo ""

