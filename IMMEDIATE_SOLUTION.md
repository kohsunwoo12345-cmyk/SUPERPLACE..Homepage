# 🚨 즉시 실행 가능: 반 소유권 해결 스크립트

## 현재 상태
- **배포 진행 중**: 새로운 API가 아직 배포되지 않았습니다
- **예상 시간**: 5-10분 후 자동 배포 완료
- **임시 해결책**: 현재 API로도 해결 가능합니다!

## ⚡ 지금 바로 실행 (현재 배포된 버전으로)

### 방법 1: Kumetang 계정으로 직접 반 생성

가장 간단하고 빠른 방법입니다!

```javascript
// https://superplace-academy.pages.dev 접속
// F12 → 콘솔 탭에서 실행

// kumetang@gmail.com 계정으로 로그인 후:
async function createClassForKumetang() {
  try {
    const result = await fetch('/api/classes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '초등 5학년 수학반',
        description: 'kumetang 학원 수학반',
        userId: 7,  // kumetang의 user_id
        gradeLevel: '초등 5학년',
        subject: '수학',
        maxStudents: 20
      })
    });
    
    const data = await result.json();
    console.log('결과:', data);
    
    if (data.success) {
      alert(`✅ 성공! 반이 생성되었습니다.\nID: ${data.classId}`);
      
      // 페이지 새로고침하여 반 목록 확인
      setTimeout(() => {
        window.location.href = '/teachers/manage';
      }, 1000);
    } else {
      alert(`❌ 실패: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error('오류:', error);
    alert(`오류: ${error.message}`);
  }
}

// 실행!
createClassForKumetang();
```

### 방법 2: 여러 반 한번에 생성

```javascript
// kumetang@gmail.com 계정으로 로그인 후:
async function createMultipleClasses() {
  const classes = [
    { name: '초등 5학년 수학반', grade: '초등 5학년', subject: '수학' },
    { name: '초등 6학년 수학반', grade: '초등 6학년', subject: '수학' },
    { name: '중등 1학년 영어반', grade: '중등 1학년', subject: '영어' },
    { name: '중등 2학년 영어반', grade: '중등 2학년', subject: '영어' },
    { name: '고등 1학년 수학반', grade: '고등 1학년', subject: '수학' }
  ];
  
  console.log(`총 ${classes.length}개의 반을 생성합니다...`);
  
  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    
    try {
      const result = await fetch('/api/classes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cls.name,
          description: `kumetang 학원 ${cls.subject}반`,
          userId: 7,  // kumetang
          gradeLevel: cls.grade,
          subject: cls.subject,
          maxStudents: 20
        })
      });
      
      const data = await result.json();
      
      if (data.success) {
        console.log(`✅ [${i+1}/${classes.length}] ${cls.name} 생성 완료 (ID: ${data.classId})`);
      } else {
        console.error(`❌ [${i+1}/${classes.length}] ${cls.name} 생성 실패:`, data.error);
      }
    } catch (error) {
      console.error(`❌ [${i+1}/${classes.length}] ${cls.name} 오류:`, error.message);
    }
    
    // 각 요청 사이 약간의 지연
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('🎉 모든 반 생성 완료!');
  alert('모든 반 생성이 완료되었습니다! 페이지를 새로고침합니다.');
  
  setTimeout(() => {
    window.location.href = '/teachers/manage';
  }, 1000);
}

// 실행!
createMultipleClasses();
```

### 방법 3: 현재 상태 확인 후 자동 생성

```javascript
// 어떤 계정이든 로그인 후:
async function autoCreateIfNeeded() {
  console.log('📊 현재 상태를 확인합니다...');
  
  try {
    // kumetang의 반 확인
    const kumetangResult = await fetch('/api/classes/list?userId=7&userType=director');
    const kumetangData = await kumetangResult.json();
    
    const kumetangClassCount = kumetangData.classes?.length || 0;
    console.log(`kumetang@gmail.com: ${kumetangClassCount}개의 반`);
    
    if (kumetangClassCount > 0) {
      console.log('✅ kumetang은 이미 반을 소유하고 있습니다!');
      alert(`kumetang은 이미 ${kumetangClassCount}개의 반을 소유하고 있습니다.`);
      return;
    }
    
    // 반이 없으면 생성
    console.log('⚠️ kumetang에게 반이 없습니다. 반을 생성합니다...');
    
    const createResult = await fetch('/api/classes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '초등 5학년 수학반',
        description: '자동 생성된 kumetang 학원 수학반',
        userId: 7,
        gradeLevel: '초등 5학년',
        subject: '수학',
        maxStudents: 20
      })
    });
    
    const createData = await createResult.json();
    
    if (createData.success) {
      console.log('✅ 반 생성 완료:', createData);
      alert(`✅ 반이 생성되었습니다!\nID: ${createData.classId}\n페이지를 새로고침합니다.`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      console.error('❌ 반 생성 실패:', createData.error);
      alert(`❌ 반 생성 실패: ${createData.error}`);
    }
  } catch (error) {
    console.error('오류 발생:', error);
    alert(`오류: ${error.message}`);
  }
}

// 실행!
autoCreateIfNeeded();
```

## 🔍 현재 상태 진단만 하기

```javascript
// 관리자, kumetang 둘 다 확인
async function checkBothUsers() {
  console.log('='.repeat(60));
  console.log('📊 반 소유 현황 조회');
  console.log('='.repeat(60));
  
  try {
    // 1. 관리자 (userId=1)
    const adminResult = await fetch('/api/classes/list?userId=1&userType=director');
    const adminData = await adminResult.json();
    const adminCount = adminData.classes?.length || 0;
    
    console.log(`\n👤 관리자 (admin@superplace.co.kr, userId=1)`);
    console.log(`   반 개수: ${adminCount}개`);
    if (adminCount > 0) {
      adminData.classes.forEach(cls => {
        console.log(`   - ${cls.name} (ID: ${cls.id})`);
      });
    }
    
    // 2. kumetang (userId=7)
    const kumetangResult = await fetch('/api/classes/list?userId=7&userType=director');
    const kumetangData = await kumetangResult.json();
    const kumetangCount = kumetangData.classes?.length || 0;
    
    console.log(`\n👤 Kumetang (kumetang@gmail.com, userId=7)`);
    console.log(`   반 개수: ${kumetangCount}개`);
    if (kumetangCount > 0) {
      kumetangData.classes.forEach(cls => {
        console.log(`   - ${cls.name} (ID: ${cls.id})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 요약');
    console.log('='.repeat(60));
    console.log(`관리자: ${adminCount}개`);
    console.log(`Kumetang: ${kumetangCount}개`);
    
    if (adminCount > 0 && kumetangCount === 0) {
      console.log('\n💡 추천: 관리자의 반을 kumetang으로 이전하세요.');
      console.log('   (새 API 배포 완료 후 가능)');
    } else if (adminCount === 0 && kumetangCount === 0) {
      console.log('\n💡 추천: kumetang 계정으로 새 반을 생성하세요.');
      console.log('   (위의 createClassForKumetang() 실행)');
    } else if (kumetangCount > 0) {
      console.log('\n✅ Kumetang은 이미 반을 소유하고 있습니다!');
    }
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 실행!
checkBothUsers();
```

## 📱 UI에서 직접 생성하기

kumetang@gmail.com 계정으로 로그인 후:

1. `/teachers/manage` 페이지로 이동
2. "반 생성" 버튼 클릭
3. 반 정보 입력:
   - 반 이름: 초등 5학년 수학반
   - 학년: 초등 5학년
   - 과목: 수학
   - 최대 학생 수: 20
4. "생성" 버튼 클릭

## ⏰ 새 API 배포 완료 후 (5-10분 후)

배포가 완료되면 다음 고급 기능을 사용할 수 있습니다:

```javascript
// 1. 모든 반 조회
fetch('/api/admin/classes/all').then(r => r.json()).then(console.log);

// 2. 관리자 → kumetang 이전
fetch('/api/admin/transfer-classes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromUserId: 1,
    toEmail: 'kumetang@gmail.com'
  })
}).then(r => r.json()).then(console.log);

// 3. kumetang에게 직접 반 생성
fetch('/api/admin/classes/create-for-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetEmail: 'kumetang@gmail.com',
    className: '새 반',
    gradeLevel: '초등',
    subject: '수학'
  })
}).then(r => r.json()).then(console.log);
```

## 🎯 핵심 요약

**지금 당장 해결책**:
1. kumetang@gmail.com으로 로그인
2. 위의 `createClassForKumetang()` 스크립트 실행
3. 반 생성 완료!

**왜 이렇게 하는가?**:
- 새 API가 배포 중이므로 현재 API 사용
- 가장 간단하고 확실한 방법
- 5분 안에 완료 가능

**배포 완료 후**:
- 더 강력한 관리 API 사용 가능
- 일괄 이전, 대량 생성 등 자동화 가능
- 시각적 관리 도구 사용 가능

---

**작성 시간**: 2026-01-18 08:15 UTC
**즉시 실행 가능**: ✅
**배포 대기 중**: 🕐 5-10분 후 완료 예상
