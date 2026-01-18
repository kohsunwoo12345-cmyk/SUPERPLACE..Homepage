#!/bin/bash
echo "=== 테스트 데이터 생성 ==="

echo "1. 반 3개 생성"
for i in {1..3}; do
  curl -s -X POST "https://superplace-academy.pages.dev/api/classes/create" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"테스트반${i}\",\"description\":\"테스트용\",\"userId\":1,\"gradeLevel\":\"${i}학년\",\"maxStudents\":20}" \
    | jq '{success, classId, message}'
done

echo ""
echo "2. 생성된 반 목록 확인"
curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=1&userType=director" | jq '.classes[] | {id, name}'

echo ""
echo "3. 김선생(ID 18)에게 반 1 배정"
curl -s -X POST "https://superplace-academy.pages.dev/api/teachers/18/permissions" \
  -H "Content-Type: application/json" \
  -d '{"directorId":1,"permissions":{"canViewAllStudents":false,"canWriteDailyReports":true,"assignedClasses":[1]}}' \
  | jq '.'

echo ""
echo "4. 김선생 권한 확인"
curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '.permissions'

