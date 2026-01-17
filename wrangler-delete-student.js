// Wrangler를 통한 직접 D1 명령 실행 스크립트

const commands = [
  // 1. 외래키 비활성화
  "PRAGMA foreign_keys = OFF",
  
  // 2. 모든 관련 테이블에서 student_id = 4 삭제
  "DELETE FROM daily_records WHERE student_id = 4",
  "DELETE FROM attendance WHERE student_id = 4",
  "DELETE FROM grades WHERE student_id = 4",
  "DELETE FROM counseling WHERE student_id = 4",
  "DELETE FROM learning_reports WHERE student_id = 4",
  
  // 3. 학생 삭제
  "DELETE FROM students WHERE id = 4",
  
  // 4. 외래키 다시 활성화
  "PRAGMA foreign_keys = ON"
];

console.log("Execute these commands in D1 Console:");
commands.forEach((cmd, i) => {
  console.log(`\n${i+1}. ${cmd};`);
});
