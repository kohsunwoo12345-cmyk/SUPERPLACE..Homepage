#!/bin/bash
echo "=== Cloudflare Pages 배포 상태 확인 ==="
echo ""

echo "1. GitHub 최신 커밋"
git log --oneline -1

echo ""
echo "2. Cloudflare Pages에 teacher_classes 참조 확인"
curl -s "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: eyJpZCI6MTgsInVzZXJfdHlwZSI6InRlYWNoZXIiLCJwYXJlbnRfdXNlcl9pZCI6MX0=" | jq -r '.error'

echo ""
echo "3. 로컬 빌드에 teacher_classes 참조 확인"
if grep -q "teacher_classes" dist/_worker.js 2>/dev/null; then
  echo "❌ 로컬 빌드에 teacher_classes 존재"
else
  echo "✅ 로컬 빌드에 teacher_classes 없음"
fi

echo ""
echo "4. 소스 코드에 teacher_classes 참조 확인"
if grep -r "teacher_classes" src/ 2>/dev/null | grep -v ".DISABLED"; then
  echo "❌ 소스 코드에 teacher_classes 존재"
else
  echo "✅ 소스 코드에 teacher_classes 없음"
fi

echo ""
echo "5. student-routes.ts 상태"
if [ -f src/student-routes.ts ]; then
  echo "❌ student-routes.ts가 활성화되어 있음"
elif [ -f src/student-routes.ts.DISABLED ]; then
  echo "✅ student-routes.ts가 비활성화되어 있음"
else
  echo "⚠️  student-routes.ts 파일을 찾을 수 없음"
fi
