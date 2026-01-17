// Cloudflare Workers 직접 배포용 스크립트
const fs = require('fs');
const path = require('path');

// dist/_worker.js 읽기
const workerCode = fs.readFileSync(path.join(__dirname, 'dist/_worker.js'), 'utf8');

console.log('Worker file size:', workerCode.length);
console.log('Contains loadDeposits:', workerCode.includes('loadDeposits'));
console.log('Contains submitDeposit:', workerCode.includes('submitDeposit'));

// 검증 성공 메시지
if (workerCode.includes('loadDeposits') && workerCode.includes('submitDeposit')) {
  console.log('✅ Worker file is correct!');
  process.exit(0);
} else {
  console.log('❌ Worker file is incorrect!');
  process.exit(1);
}
