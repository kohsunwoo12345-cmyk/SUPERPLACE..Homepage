// 학생 관리 시스템 프론트엔드 페이지들

export const classesPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>반 관리 - 꾸메땅학원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <a href="/students" class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-2"></i>돌아가기
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">🏫 반 관리</h1>
                </div>
                <button onclick="showAddModal()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                    <i class="fas fa-plus mr-2"></i>새 반 추가
                </button>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div id="classList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="text-center text-gray-500 py-8">로딩 중...</div>
        </div>
    </div>

    <!-- 추가/수정 모달 -->
    <div id="classModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 id="modalTitle" class="text-2xl font-bold mb-6">새 반 추가</h2>
            <form id="classForm">
                <input type="hidden" id="classId">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">반 이름 *</label>
                        <input type="text" id="className" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="예: 중1-A반">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학년</label>
                        <select id="grade" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="">선택하세요</option>
                            <option value="초1">초1</option>
                            <option value="초2">초2</option>
                            <option value="초3">초3</option>
                            <option value="초4">초4</option>
                            <option value="초5">초5</option>
                            <option value="초6">초6</option>
                            <option value="중1">중1</option>
                            <option value="중2">중2</option>
                            <option value="중3">중3</option>
                            <option value="고1">고1</option>
                            <option value="고2">고2</option>
                            <option value="고3">고3</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">수업 요일 *</label>
                        <div class="grid grid-cols-4 gap-2">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="월" id="day-mon">
                                <span class="text-sm">월</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="화" id="day-tue">
                                <span class="text-sm">화</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="수" id="day-wed">
                                <span class="text-sm">수</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="목" id="day-thu">
                                <span class="text-sm">목</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="금" id="day-fri">
                                <span class="text-sm">금</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="토" id="day-sat">
                                <span class="text-sm">토</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="schedule-day rounded text-purple-600 focus:ring-purple-500" value="일" id="day-sun">
                                <span class="text-sm">일</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">수업 시간</label>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">시작 시간</label>
                                <input type="time" id="startTime" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">종료 시간</label>
                                <input type="time" id="endTime" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">설명</label>
                        <textarea id="description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="반에 대한 간단한 설명"></textarea>
                    </div>
                </div>
                <div class="flex space-x-3 mt-6">
                    <button type="submit" class="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
                        저장
                    </button>
                    <button type="button" onclick="hideModal()" class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400">
                        취소
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const academyId = 1;
        let classes = [];

        async function loadClasses() {
            try {
                const res = await fetch('/api/classes?academyId=' + academyId);
                const data = await res.json();
                if (data.success) {
                    classes = data.classes;
                    renderClasses();
                }
            } catch (error) {
                console.error('반 목록 로딩 실패:', error);
            }
        }

        function renderClasses() {
            const container = document.getElementById('classList');
            if (classes.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12">등록된 반이 없습니다.<br>새 반을 추가해보세요!</div>';
                return;
            }

            container.innerHTML = classes.map(cls => \`
                <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">\${cls.class_name}</h3>
                            <p class="text-sm text-gray-500">\${cls.grade || '학년 미지정'}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="editClass(\${cls.id})" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteClass(\${cls.id}, '\${cls.class_name}')" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    \${cls.schedule_days ? \`
                        <div class="mb-2">
                            <span class="text-xs text-gray-500"><i class="fas fa-calendar mr-1"></i>수업 요일:</span>
                            <span class="text-sm font-medium text-purple-600 ml-1">\${cls.schedule_days}</span>
                        </div>
                    \` : ''}
                    \${cls.start_time && cls.end_time ? \`
                        <div class="mb-3">
                            <span class="text-xs text-gray-500"><i class="fas fa-clock mr-1"></i>수업 시간:</span>
                            <span class="text-sm font-medium text-blue-600 ml-1">\${cls.start_time} - \${cls.end_time}</span>
                        </div>
                    \` : ''}
                    <p class="text-gray-600 mb-4 text-sm">\${cls.description || '설명 없음'}</p>
                    <div class="flex justify-between items-center pt-4 border-t">
                        <span class="text-sm text-gray-500">
                            <i class="fas fa-users mr-2"></i>학생 \${cls.student_count}명
                        </span>
                        <a href="/students/list?classId=\${cls.id}" class="text-purple-600 hover:text-purple-800 font-medium">
                            학생 보기 →
                        </a>
                    </div>
                </div>
            \`).join('');
        }

        function showAddModal() {
            document.getElementById('modalTitle').textContent = '새 반 추가';
            document.getElementById('classForm').reset();
            document.getElementById('classId').value = '';
            document.getElementById('classModal').classList.remove('hidden');
        }

        function hideModal() {
            document.getElementById('classModal').classList.add('hidden');
        }

        function editClass(classId) {
            const cls = classes.find(c => c.id === classId);
            if (!cls) return;

            document.getElementById('modalTitle').textContent = '반 수정';
            document.getElementById('classId').value = cls.id;
            document.getElementById('className').value = cls.class_name;
            document.getElementById('grade').value = cls.grade || '';
            document.getElementById('description').value = cls.description || '';
            
            // 요일 체크박스 설정
            document.querySelectorAll('.schedule-day').forEach(cb => cb.checked = false);
            if (cls.schedule_days) {
                const days = cls.schedule_days.split(',').map(d => d.trim());
                days.forEach(day => {
                    const checkbox = document.querySelector(\`.schedule-day[value="\${day}"]\`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // 시간 설정
            document.getElementById('startTime').value = cls.start_time || '';
            document.getElementById('endTime').value = cls.end_time || '';
            
            document.getElementById('classModal').classList.remove('hidden');
        }

        async function deleteClass(classId, className) {
            if (!confirm(\`"\${className}" 반을 삭제하시겠습니까?\\n\\n⚠️ 이 반의 학생들은 반 배정이 해제됩니다.\`)) return;

            try {
                const res = await fetch('/api/classes/' + classId, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    alert('반이 삭제되었습니다.');
                    loadClasses();
                } else {
                    alert('삭제 실패: ' + data.error);
                }
            } catch (error) {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }

        document.getElementById('classForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const classId = document.getElementById('classId').value;
            
            // 선택된 요일 수집
            const selectedDays = Array.from(document.querySelectorAll('.schedule-day:checked'))
                .map(cb => cb.value);
            
            const payload = {
                academyId,
                className: document.getElementById('className').value,
                grade: document.getElementById('grade').value,
                description: document.getElementById('description').value,
                scheduleDays: selectedDays.join(', '),
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value
            };

            try {
                const url = classId ? '/api/classes/' + classId : '/api/classes';
                const method = classId ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    alert(classId ? '반이 수정되었습니다.' : '새 반이 추가되었습니다.');
                    hideModal();
                    loadClasses();
                } else {
                    alert('저장 실패: ' + data.error);
                }
            } catch (error) {
                alert('저장 중 오류가 발생했습니다.');
            }
        });

        loadClasses();
    </script>
</body>
</html>
`

export const studentsListPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>학생 목록 - 꾸메땅학원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <a href="/students" class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-2"></i>돌아가기
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">👨‍🎓 학생 목록</h1>
                </div>
                <button onclick="showAddModal()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    <i class="fas fa-user-plus mr-2"></i>새 학생 등록
                </button>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- 필터 및 검색 -->
        <div class="bg-white rounded-xl shadow p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">반 필터</label>
                    <select id="classFilter" onchange="loadStudents()" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">전체 학생</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">학년 필터</label>
                    <select id="gradeFilter" onchange="filterStudents()" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">전체 학년</option>
                        <option value="초1">초1</option>
                        <option value="초2">초2</option>
                        <option value="초3">초3</option>
                        <option value="초4">초4</option>
                        <option value="초5">초5</option>
                        <option value="초6">초6</option>
                        <option value="중1">중1</option>
                        <option value="중2">중2</option>
                        <option value="중3">중3</option>
                        <option value="고1">고1</option>
                        <option value="고2">고2</option>
                        <option value="고3">고3</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">검색</label>
                    <input type="text" id="searchInput" oninput="filterStudents()" placeholder="이름, 학부모 이름, 전화번호..." class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
        </div>

        <!-- 학생 목록 -->
        <div id="studentsList" class="space-y-4">
            <div class="text-center text-gray-500 py-8">로딩 중...</div>
        </div>
    </div>

    <!-- 학생 추가/수정 모달 -->
    <div id="studentModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div class="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 my-8">
            <h2 id="modalTitle" class="text-2xl font-bold mb-6">새 학생 등록</h2>
            <form id="studentForm">
                <input type="hidden" id="studentId">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- 학생 기본 정보 -->
                    <div class="col-span-2 border-b pb-4 mb-2">
                        <h3 class="text-lg font-semibold text-gray-800">📋 학생 정보</h3>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학생 이름 *</label>
                        <input type="text" id="studentName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="홍길동">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학생 연락처</label>
                        <input type="tel" id="studentPhone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="010-1234-5678" maxlength="13">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">반 배정 (최대 3개)</label>
                        <div id="classCheckboxes" class="grid grid-cols-1 gap-2 p-3 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                            <!-- 반 목록이 동적으로 로드됩니다 -->
                        </div>
                        <input type="hidden" id="studentClasses">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학년 *</label>
                        <select id="studentGrade" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">선택하세요</option>
                            <option value="초1">초1</option>
                            <option value="초2">초2</option>
                            <option value="초3">초3</option>
                            <option value="초4">초4</option>
                            <option value="초5">초5</option>
                            <option value="초6">초6</option>
                            <option value="중1">중1</option>
                            <option value="중2">중2</option>
                            <option value="중3">중3</option>
                            <option value="고1">고1</option>
                            <option value="고2">고2</option>
                            <option value="고3">고3</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">수강 과목 *</label>
                        <div id="subjectsCheckboxes" class="grid grid-cols-2 gap-2 p-3 border border-gray-300 rounded-lg">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="영어" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">영어</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="수학" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">수학</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="과학" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">과학</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="국어" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">국어</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="프로그램1" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">프로그램1</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="프로그램2" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">프로그램2</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="프로그램3" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">프로그램3</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="프로그램4" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">프로그램4</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="subject" value="프로그램5" class="w-4 h-4 text-blue-600">
                                <span class="text-sm">프로그램5</span>
                            </label>
                        </div>
                        <input type="hidden" id="studentSubjects" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">등록일 *</label>
                        <input type="date" id="enrollmentDate" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- 학부모 정보 -->
                    <div class="col-span-2 border-b pb-4 mb-2 mt-4">
                        <h3 class="text-lg font-semibold text-gray-800">👨‍👩‍👧 학부모 정보</h3>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학부모 이름 *</label>
                        <input type="text" id="parentName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="홍길동">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">학부모 연락처 *</label>
                        <input type="tel" id="parentPhone" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="010-1234-5678" maxlength="13">
                    </div>
                    
                    <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">메모</label>
                        <textarea id="studentMemo" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="특이사항이나 기타 메모"></textarea>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button type="submit" class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                        저장
                    </button>
                    <button type="button" onclick="hideModal()" class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400">
                        취소
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const academyId = 1;
        let students = [];
        let allStudents = [];
        let classes = [];

        // 전화번호 포맷팅 함수
        function formatPhoneNumber(value) {
            // 숫자만 추출
            const numbers = value.replace(/[^0-9]/g, '');
            
            // 010-1234-5678 형식으로 변환
            if (numbers.length <= 3) {
                return numbers;
            } else if (numbers.length <= 7) {
                return numbers.slice(0, 3) + '-' + numbers.slice(3);
            } else if (numbers.length <= 11) {
                return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7);
            } else {
                // 11자리 넘어가면 자르기
                return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
            }
        }

        async function loadClasses() {
            try {
                const res = await fetch('/api/classes?academyId=' + academyId);
                const data = await res.json();
                if (data.success) {
                    classes = data.classes;
                    
                    // 반 필터 드롭다운 채우기
                    const classFilter = document.getElementById('classFilter');
                    classFilter.innerHTML = '<option value="">전체 학생</option>' +
                        classes.map(c => \`<option value="\${c.id}">\${c.class_name}</option>\`).join('');
                    
                    // 반 배정 체크박스 채우기
                    const classCheckboxes = document.getElementById('classCheckboxes');
                    classCheckboxes.innerHTML = classes.map(c => \`
                        <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input type="checkbox" name="classCheckbox" value="\${c.id}" class="w-4 h-4 text-blue-600">
                            <span class="text-sm">\${c.class_name}</span>
                        </label>
                    \`).join('');
                    
                    // 체크박스 변경 이벤트 리스너 추가 (최대 3개 제한)
                    document.querySelectorAll('input[name="classCheckbox"]').forEach(checkbox => {
                        checkbox.addEventListener('change', function() {
                            const checkedCount = document.querySelectorAll('input[name="classCheckbox"]:checked').length;
                            if (checkedCount > 3) {
                                this.checked = false;
                                alert('반 배정은 최대 3개까지 가능합니다.');
                            }
                        });
                    });
                    
                    // URL 파라미터에서 classId 확인
                    const urlParams = new URLSearchParams(window.location.search);
                    const classId = urlParams.get('classId');
                    if (classId) {
                        classFilter.value = classId;
                    }
                }
            } catch (error) {
                console.error('반 목록 로딩 실패:', error);
            }
        }

        async function loadStudents() {
            try {
                const classId = document.getElementById('classFilter').value;
                let url = '/api/students?academyId=' + academyId;
                if (classId) url += '&classId=' + classId;
                
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    allStudents = data.students;
                    students = allStudents;
                    filterStudents();
                }
            } catch (error) {
                console.error('학생 목록 로딩 실패:', error);
            }
        }

        function filterStudents() {
            const gradeFilter = document.getElementById('gradeFilter').value;
            const searchText = document.getElementById('searchInput').value.toLowerCase();
            
            students = allStudents.filter(student => {
                // current_grade 또는 grade 사용
                const displayGrade = student.current_grade || student.grade;
                const matchGrade = !gradeFilter || displayGrade === gradeFilter;
                const matchSearch = !searchText || 
                    student.name.toLowerCase().includes(searchText) ||
                    (student.parent_name && student.parent_name.toLowerCase().includes(searchText)) ||
                    (student.phone && student.phone.includes(searchText)) ||
                    (student.parent_phone && student.parent_phone.includes(searchText));
                
                return matchGrade && matchSearch;
            });
            
            renderStudents();
        }

        function renderStudents() {
            const container = document.getElementById('studentsList');
            if (students.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 py-12 bg-white rounded-xl">학생이 없습니다.<br>새 학생을 등록해보세요!</div>';
                return;
            }

            container.innerHTML = students.map(student => \`
                <div class="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
                    <div class="flex justify-between items-start">
                        <div class="flex items-start space-x-4 flex-1">
                            <div class="bg-blue-100 text-blue-600 rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold flex-shrink-0">
                                \${student.name.charAt(0)}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center space-x-3 mb-2">
                                    <h3 class="text-xl font-bold text-gray-900">\${student.name}</h3>
                                    <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                                        \${student.current_grade || student.grade}
                                        \${student.current_grade && student.current_grade !== student.entry_grade ? '<i class="fas fa-arrow-up ml-1 text-xs"></i>' : ''}
                                    </span>
                                    \${student.entry_grade && student.current_grade && student.current_grade !== student.entry_grade ? \`<span class="text-xs text-gray-400">(\${student.entry_grade}→\${student.current_grade})</span>\` : ''}
                                    \${student.class_name ? \`<span class="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">\${student.class_name}</span>\` : ''}
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                    <div><i class="fas fa-phone mr-2"></i>학생: \${student.phone || '미등록'}</div>
                                    <div><i class="fas fa-book mr-2"></i>\${student.subjects}</div>
                                    <div><i class="fas fa-user mr-2"></i>학부모: \${student.parent_name}</div>
                                    <div><i class="fas fa-mobile-alt mr-2"></i>\${student.parent_phone}</div>
                                </div>
                                \${student.notes ? \`<div class="mt-2 text-sm text-gray-500"><i class="fas fa-sticky-note mr-2"></i>\${student.notes}</div>\` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2 ml-4">
                            <a href="/students/detail/\${student.id}" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                <i class="fas fa-chart-line mr-1"></i>상세
                            </a>
                            <button onclick="editStudent(\${student.id})" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteStudent(\${student.id}, '\${student.name}')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        async function showAddModal() {
            document.getElementById('modalTitle').textContent = '새 학생 등록';
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
            document.getElementById('enrollmentDate').valueAsDate = new Date();
            
            // 체크박스 초기화
            document.querySelectorAll('input[name="subject"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('input[name="classCheckbox"]').forEach(cb => cb.checked = false);
            
            // 최신 반 목록 로드
            await loadClasses();
            
            document.getElementById('studentModal').classList.remove('hidden');
        }

        function hideModal() {
            document.getElementById('studentModal').classList.add('hidden');
        }

        async function editStudent(studentId) {
            const student = allStudents.find(s => s.id === studentId);
            if (!student) return;

            document.getElementById('modalTitle').textContent = '학생 정보 수정';
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentGrade').value = student.grade;
            document.getElementById('enrollmentDate').value = student.enrollment_date;
            document.getElementById('parentName').value = student.parent_name;
            document.getElementById('parentPhone').value = student.parent_phone;
            document.getElementById('studentMemo').value = student.notes || '';
            
            // 최신 반 목록 로드
            await loadClasses();
            
            // 반 배정 체크박스 설정
            document.querySelectorAll('input[name="classCheckbox"]').forEach(cb => cb.checked = false);
            if (student.class_id) {
                // class_id가 쉼표로 구분된 문자열일 수 있음
                const classIds = String(student.class_id).split(',').map(id => id.trim());
                classIds.forEach(classId => {
                    const checkbox = document.querySelector(\`input[name="classCheckbox"][value="\${classId}"]\`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // 체크박스 초기화 후 선택된 과목 체크
            document.querySelectorAll('input[name="subject"]').forEach(cb => cb.checked = false);
            const subjects = student.subjects.split(',').map(s => s.trim());
            subjects.forEach(subject => {
                const checkbox = document.querySelector(\`input[name="subject"][value="\${subject}"]\`);
                if (checkbox) checkbox.checked = true;
            });
            
            document.getElementById('studentModal').classList.remove('hidden');
        }

        async function deleteStudent(studentId, studentName) {
            if (!confirm(\`"\${studentName}" 학생을 삭제하시겠습니까?\\n\\n⚠️ 모든 성과 기록도 함께 삭제됩니다.\`)) return;

            try {
                const res = await fetch('/api/students/' + studentId, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    alert('학생이 삭제되었습니다.');
                    loadStudents();
                } else {
                    alert('삭제 실패: ' + data.error);
                }
            } catch (error) {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }

        // 전화번호 입력 필드에 포맷팅 적용
        document.getElementById('studentPhone').addEventListener('input', function(e) {
            e.target.value = formatPhoneNumber(e.target.value);
        });
        
        document.getElementById('parentPhone').addEventListener('input', function(e) {
            e.target.value = formatPhoneNumber(e.target.value);
        });

        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 체크박스에서 선택된 과목 수집
            const selectedSubjects = Array.from(document.querySelectorAll('input[name="subject"]:checked'))
                .map(cb => cb.value);
            
            if (selectedSubjects.length === 0) {
                alert('수강 과목을 최소 1개 이상 선택해주세요.');
                return;
            }
            
            // 체크박스에서 선택된 반 수집
            const selectedClasses = Array.from(document.querySelectorAll('input[name="classCheckbox"]:checked'))
                .map(cb => cb.value);
            
            const studentId = document.getElementById('studentId').value;
            const payload = {
                academyId,
                classId: selectedClasses.length > 0 ? selectedClasses.join(',') : null,
                name: document.getElementById('studentName').value,
                phone: document.getElementById('studentPhone').value,
                parentName: document.getElementById('parentName').value,
                parentPhone: document.getElementById('parentPhone').value,
                grade: document.getElementById('studentGrade').value,
                subjects: selectedSubjects.join(', '),
                enrollmentDate: document.getElementById('enrollmentDate').value,
                memo: document.getElementById('studentMemo').value
            };

            try {
                const url = studentId ? '/api/students/' + studentId : '/api/students';
                const method = studentId ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    alert(studentId ? '학생 정보가 수정되었습니다.' : '새 학생이 등록되었습니다.');
                    hideModal();
                    loadStudents();
                } else {
                    alert('저장 실패: ' + data.error);
                }
            } catch (error) {
                alert('저장 중 오류가 발생했습니다.');
                console.error(error);
            }
        });

        // 초기 로드
        (async () => {
            await loadClasses();
            await loadStudents();
        })();
    </script>
</body>
</html>
`

export const dailyRecordPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>일일 성과 기록 - 꾸메땅학원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .calendar-day { cursor: pointer; transition: all 0.2s; }
        .calendar-day:hover { background-color: #e0e7ff; }
        .calendar-day.selected { background-color: #818cf8; color: white; }
        .calendar-day.today { border: 2px solid #6366f1; }
        .calendar-day.has-record { background-color: #dbeafe; }
    </style>
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <a href="/students" class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-2"></i>돌아가기
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">📅 일일 성과 기록</h1>
                </div>
                <div class="flex items-center space-x-3">
                    <span id="selectedDateDisplay" class="text-lg font-semibold text-gray-700"></span>
                    <button onclick="showRecordModal()" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-plus mr-2"></i>성과 기록 추가
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 달력 -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <button onclick="previousMonth()" class="p-2 hover:bg-gray-100 rounded">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h2 id="calendarTitle" class="text-xl font-bold text-gray-900"></h2>
                        <button onclick="nextMonth()" class="p-2 hover:bg-gray-100 rounded">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-7 gap-1 text-center text-sm">
                        <div class="font-semibold text-red-500">일</div>
                        <div class="font-semibold">월</div>
                        <div class="font-semibold">화</div>
                        <div class="font-semibold">수</div>
                        <div class="font-semibold">목</div>
                        <div class="font-semibold">금</div>
                        <div class="font-semibold text-blue-500">토</div>
                    </div>
                    <div id="calendarDays" class="grid grid-cols-7 gap-1 mt-2"></div>
                </div>

                <!-- 빠른 통계 -->
                <div class="bg-white rounded-xl shadow-lg p-6 mt-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">📊 이번 달 통계</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">총 기록 수</span>
                            <span id="monthlyTotal" class="font-bold text-blue-600">0건</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">평균 출석률</span>
                            <span id="monthlyAttendance" class="font-bold text-green-600">0%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 선택된 날짜의 기록 목록 -->
            <div class="lg:col-span-2">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h2 class="text-xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-list mr-2"></i><span id="recordDateTitle">오늘의 기록</span>
                    </h2>
                    <div id="recordsList" class="space-y-4">
                        <div class="text-center text-gray-500 py-12">날짜를 선택하면 기록이 표시됩니다.</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 성과 기록 추가/수정 모달 -->
    <div id="recordModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
                <h2 id="recordModalTitle" class="text-2xl font-bold mb-6 sticky top-0 bg-white pb-4 border-b">성과 기록 추가</h2>
                <form id="recordForm">
                <input type="hidden" id="recordId">
                
                <div class="space-y-6">
                    <!-- 기본 정보 -->
                    <div class="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 class="text-lg font-semibold text-gray-900">기본 정보</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">학생 선택 *</label>
                            <select id="recordStudent" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="">선택하세요</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">반 선택</label>
                            <select id="recordClass" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="">선택하세요</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">출석</label>
                            <div class="grid grid-cols-4 gap-2">
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                    <input type="radio" name="attendance" value="출석" class="mr-2">
                                    <span class="text-sm font-medium">✅ 출석</span>
                                </label>
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-yellow-50 has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50">
                                    <input type="radio" name="attendance" value="지각" class="mr-2">
                                    <span class="text-sm font-medium">⏰ 지각</span>
                                </label>
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-red-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                                    <input type="radio" name="attendance" value="결석" class="mr-2">
                                    <span class="text-sm font-medium">❌ 결석</span>
                                </label>
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-orange-50 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                                    <input type="radio" name="attendance" value="조퇴" class="mr-2">
                                    <span class="text-sm font-medium">🏃 조퇴</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- 수업 섹션 -->
                    <div class="bg-blue-50 p-4 rounded-lg space-y-4">
                        <h3 class="text-lg font-semibold text-blue-900">📚 오늘 수업은 어땠나요?</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">학습 개념</label>
                            <input type="text" id="lessonConcept" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="예: 이차방정식, 현재완료 시제 등">
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">이해도 (1~5)</label>
                                <div class="flex items-center space-x-2">
                                    <input type="range" id="lessonUnderstanding" min="1" max="5" value="3" class="flex-1">
                                    <span id="lessonUnderstandingValue" class="text-xl font-bold text-blue-600 w-8 text-center">3</span>
                                </div>
                                <div class="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>낮음</span>
                                    <span>높음</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">참여도 (1~5)</label>
                                <div class="flex items-center space-x-2">
                                    <input type="range" id="lessonParticipation" min="1" max="5" value="3" class="flex-1">
                                    <span id="lessonParticipationValue" class="text-xl font-bold text-purple-600 w-8 text-center">3</span>
                                </div>
                                <div class="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>낮음</span>
                                    <span>높음</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">수업 성과/특이사항</label>
                            <textarea id="lessonAchievement" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="수업 내용과 학생의 반응을 기록하세요"></textarea>
                        </div>
                    </div>

                    <!-- 숙제 섹션 -->
                    <div class="bg-purple-50 p-4 rounded-lg space-y-4">
                        <h3 class="text-lg font-semibold text-purple-900">✏️ 오늘 숙제는 어땠나요?</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">숙제 완성도</label>
                            <div class="grid grid-cols-3 gap-2">
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                    <input type="radio" name="homework" value="완료" class="mr-2">
                                    <span class="text-sm font-medium">✅ 완료</span>
                                </label>
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-yellow-50 has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50">
                                    <input type="radio" name="homework" value="부분완료" class="mr-2">
                                    <span class="text-sm font-medium">⚠️ 부분</span>
                                </label>
                                <label class="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-red-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                                    <input type="radio" name="homework" value="미완료" class="mr-2">
                                    <span class="text-sm font-medium">❌ 미완료</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">숙제 내용</label>
                            <input type="text" id="homeworkContent" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="예: 수학 문제 풀이 10문제, 영어 단어 외우기 등">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">숙제 성과/특이사항</label>
                            <textarea id="homeworkAchievement" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="숙제 수행 상황과 결과를 기록하세요"></textarea>
                        </div>
                    </div>

                    <!-- 추가 메모 -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">추가 메모</label>
                        <textarea id="recordMemo" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="기타 전달사항이나 메모"></textarea>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button type="submit" class="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                        저장
                    </button>
                    <button type="button" onclick="hideRecordModal()" class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400">
                        취소
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const academyId = 1;
        let currentDate = new Date();
        let selectedDate = new Date();
        let students = [];
        let classes = [];
        let records = [];
        let monthlyRecords = [];
        
        // 로컬 스토리지에서 사용자 정보 가져오기
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id;
        const userType = currentUser.user_type || 'director'; // 기본값은 원장님

        // 슬라이더 값 표시
        document.getElementById('lessonUnderstanding').addEventListener('input', (e) => {
            document.getElementById('lessonUnderstandingValue').textContent = e.target.value;
        });
        document.getElementById('lessonParticipation').addEventListener('input', (e) => {
            document.getElementById('lessonParticipationValue').textContent = e.target.value;
        });

        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return \`\${year}-\${month}-\${day}\`;
        }

        function formatDateKorean(date) {
            return \`\${date.getFullYear()}년 \${date.getMonth() + 1}월 \${date.getDate()}일\`;
        }

        async function loadStudents() {
            try {
                // 권한 기반 학생 목록 조회
                let url = '/api/students?academyId=' + academyId;
                if (userId) {
                    url += '&userId=' + userId + '&userType=' + userType;
                }
                
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    students = data.students;
                    const select = document.getElementById('recordStudent');
                    select.innerHTML = '<option value="">선택하세요</option>' +
                        students.map(s => \`<option value="\${s.id}">\${s.name} (\${s.grade})</option>\`).join('');
                }
            } catch (error) {
                console.error('학생 목록 로딩 실패:', error);
            }
        }

        async function loadClasses() {
            try {
                const res = await fetch('/api/classes?academyId=' + academyId);
                const data = await res.json();
                if (data.success) {
                    classes = data.classes;
                    const select = document.getElementById('recordClass');
                    select.innerHTML = '<option value="">선택하세요</option>' +
                        classes.map(c => \`<option value="\${c.id}">\${c.class_name}</option>\`).join('');
                }
            } catch (error) {
                console.error('반 목록 로딩 실패:', error);
            }
        }

        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            document.getElementById('calendarTitle').textContent = \`\${year}년 \${month + 1}월\`;
            
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            const container = document.getElementById('calendarDays');
            container.innerHTML = '';
            
            // 빈 칸
            for (let i = 0; i < firstDay; i++) {
                container.innerHTML += '<div></div>';
            }
            
            // 날짜
            const today = new Date();
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = formatDate(date);
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const hasRecord = monthlyRecords.some(r => r.record_date === dateStr);
                
                let classes = 'calendar-day p-2 rounded text-center';
                if (isToday) classes += ' today';
                if (isSelected) classes += ' selected';
                if (hasRecord) classes += ' has-record';
                
                container.innerHTML += \`<div class="\${classes}" onclick="selectDate(new Date(\${year}, \${month}, \${day}))">\${day}</div>\`;
            }
        }

        function previousMonth() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            loadMonthlyRecords();
        }

        function nextMonth() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            loadMonthlyRecords();
        }

        function selectDate(date) {
            selectedDate = date;
            document.getElementById('selectedDateDisplay').textContent = formatDateKorean(date);
            document.getElementById('recordDateTitle').textContent = formatDateKorean(date) + '의 기록';
            renderCalendar();
            loadRecords();
        }

        async function loadRecords() {
            try {
                const dateStr = formatDate(selectedDate);
                const res = await fetch('/api/daily-records?date=' + dateStr);
                const data = await res.json();
                if (data.success) {
                    records = data.records;
                    renderRecords();
                }
            } catch (error) {
                console.error('기록 로딩 실패:', error);
            }
        }

        async function loadMonthlyRecords() {
            try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const startDate = \`\${year}-\${String(month + 1).padStart(2, '0')}-01\`;
                const endDate = \`\${year}-\${String(month + 1).padStart(2, '0')}-31\`;
                
                const res = await fetch(\`/api/daily-records?startDate=\${startDate}&endDate=\${endDate}\`);
                const data = await res.json();
                if (data.success) {
                    monthlyRecords = data.records;
                    
                    // 통계 계산
                    document.getElementById('monthlyTotal').textContent = monthlyRecords.length + '건';
                    const attendanceCount = monthlyRecords.filter(r => r.attendance === '출석').length;
                    const attendanceRate = monthlyRecords.length > 0 
                        ? Math.round((attendanceCount / monthlyRecords.length) * 100) 
                        : 0;
                    document.getElementById('monthlyAttendance').textContent = attendanceRate + '%';
                    
                    renderCalendar();
                }
            } catch (error) {
                console.error('월간 기록 로딩 실패:', error);
            }
        }

        function renderRecords() {
            const container = document.getElementById('recordsList');
            if (records.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 py-12">이 날짜에 기록된 성과가 없습니다.</div>';
                return;
            }

            container.innerHTML = records.map(record => {
                const attendanceColor = {
                    '출석': 'bg-green-100 text-green-800',
                    '지각': 'bg-yellow-100 text-yellow-800',
                    '결석': 'bg-red-100 text-red-800',
                    '조퇴': 'bg-orange-100 text-orange-800'
                }[record.attendance] || 'bg-gray-100 text-gray-800';

                const homeworkColor = {
                    '완료': 'bg-green-100 text-green-800',
                    '부분완료': 'bg-yellow-100 text-yellow-800',
                    '미완료': 'bg-red-100 text-red-800'
                }[record.homework_status] || 'bg-gray-100 text-gray-800';

                return \`
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-gray-900">\${record.student_name}</h3>
                                <p class="text-sm text-gray-500">\${record.class_name || '반 미지정'}</p>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="editRecord(\${record.id})" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteRecord(\${record.id}, '\${record.student_name}')" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <!-- 출석 -->
                        <div class="mb-3">
                            \${record.attendance ? \`<span class="px-3 py-1 rounded-full text-sm font-medium \${attendanceColor}">\${record.attendance}</span>\` : ''}
                        </div>

                        <!-- 수업 정보 -->
                        \${record.lesson_concept || record.lesson_understanding || record.lesson_participation || record.lesson_achievement ? \`
                        <div class="bg-blue-50 p-3 rounded-lg mb-3">
                            <h4 class="font-semibold text-blue-900 mb-2">📚 수업</h4>
                            \${record.lesson_concept ? \`<p class="text-sm text-gray-700 mb-1">개념: \${record.lesson_concept}</p>\` : ''}
                            <div class="flex gap-2 mb-2">
                                \${record.lesson_understanding ? \`<span class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">이해도 \${record.lesson_understanding}/5</span>\` : ''}
                                \${record.lesson_participation ? \`<span class="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">참여도 \${record.lesson_participation}/5</span>\` : ''}
                            </div>
                            \${record.lesson_achievement ? \`<p class="text-sm text-gray-700">성과: \${record.lesson_achievement}</p>\` : ''}
                        </div>
                        \` : ''}

                        <!-- 숙제 정보 -->
                        \${record.homework_status || record.homework_content || record.homework_achievement ? \`
                        <div class="bg-purple-50 p-3 rounded-lg mb-3">
                            <h4 class="font-semibold text-purple-900 mb-2">✏️ 숙제</h4>
                            \${record.homework_status ? \`<span class="px-3 py-1 rounded-full text-sm font-medium \${homeworkColor}">\${record.homework_status}</span>\` : ''}
                            \${record.homework_content ? \`<p class="text-sm text-gray-700 mt-2">내용: \${record.homework_content}</p>\` : ''}
                            \${record.homework_achievement ? \`<p class="text-sm text-gray-700 mt-1">성과: \${record.homework_achievement}</p>\` : ''}
                        </div>
                        \` : ''}

                        <!-- 추가 메모 -->
                        \${record.memo ? \`<p class="text-sm text-gray-600"><strong>메모:</strong> \${record.memo}</p>\` : ''}
                    </div>
                \`;
            }).join('');
        }

        async function showRecordModal() {
            document.getElementById('recordModalTitle').textContent = formatDateKorean(selectedDate) + ' 성과 기록 추가';
            document.getElementById('recordForm').reset();
            document.getElementById('recordId').value = '';
            document.getElementById('lessonUnderstanding').value = 3;
            document.getElementById('lessonParticipation').value = 3;
            document.getElementById('lessonUnderstandingValue').textContent = '3';
            document.getElementById('lessonParticipationValue').textContent = '3';
            
            await loadStudents();
            await loadClasses();
            
            document.getElementById('recordModal').classList.remove('hidden');
            
            // 모달을 맨 위로 스크롤 (setTimeout으로 DOM 업데이트 후 실행)
            setTimeout(() => {
                const modal = document.getElementById('recordModal');
                const modalContent = modal.querySelector('.bg-white.rounded-xl');
                
                // 외부 모달 오버레이 스크롤
                if (modal) {
                    modal.scrollTop = 0;
                }
                
                // 내부 컨텐츠 컨테이너 스크롤
                if (modalContent) {
                    modalContent.scrollTop = 0;
                }
                
                // 모든 overflow-y-auto 요소 스크롤
                const scrollables = modal.querySelectorAll('.overflow-y-auto');
                scrollables.forEach(el => {
                    el.scrollTop = 0;
                });
            }, 0);
        }

        function hideRecordModal() {
            document.getElementById('recordModal').classList.add('hidden');
        }

        async function editRecord(recordId) {
            const record = records.find(r => r.id === recordId);
            if (!record) return;

            await loadStudents();
            await loadClasses();

            document.getElementById('recordModalTitle').textContent = '성과 기록 수정';
            document.getElementById('recordId').value = record.id;
            document.getElementById('recordStudent').value = record.student_id;
            document.getElementById('recordClass').value = record.class_id || '';
            
            if (record.attendance) {
                document.querySelector(\`input[name="attendance"][value="\${record.attendance}"]\`).checked = true;
            }
            
            // 수업 정보
            document.getElementById('lessonConcept').value = record.lesson_concept || '';
            if (record.lesson_understanding) {
                document.getElementById('lessonUnderstanding').value = record.lesson_understanding;
                document.getElementById('lessonUnderstandingValue').textContent = record.lesson_understanding;
            }
            if (record.lesson_participation) {
                document.getElementById('lessonParticipation').value = record.lesson_participation;
                document.getElementById('lessonParticipationValue').textContent = record.lesson_participation;
            }
            document.getElementById('lessonAchievement').value = record.lesson_achievement || '';
            
            // 숙제 정보
            if (record.homework_status) {
                document.querySelector(\`input[name="homework"][value="\${record.homework_status}"]\`).checked = true;
            }
            document.getElementById('homeworkContent').value = record.homework_content || '';
            document.getElementById('homeworkAchievement').value = record.homework_achievement || '';
            
            document.getElementById('recordMemo').value = record.memo || '';
            document.getElementById('recordModal').classList.remove('hidden');
            
            // 모달을 맨 위로 스크롤 (setTimeout으로 DOM 업데이트 후 실행)
            setTimeout(() => {
                const modal = document.getElementById('recordModal');
                const modalContent = modal.querySelector('.bg-white.rounded-xl');
                
                // 외부 모달 오버레이 스크롤
                if (modal) {
                    modal.scrollTop = 0;
                }
                
                // 내부 컨텐츠 컨테이너 스크롤
                if (modalContent) {
                    modalContent.scrollTop = 0;
                }
                
                // 모든 overflow-y-auto 요소 스크롤
                const scrollables = modal.querySelectorAll('.overflow-y-auto');
                scrollables.forEach(el => {
                    el.scrollTop = 0;
                });
            }, 0);
        }

        async function deleteRecord(recordId, studentName) {
            if (!confirm(\`\${studentName} 학생의 성과 기록을 삭제하시겠습니까?\`)) return;

            try {
                const res = await fetch('/api/daily-records/' + recordId, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    alert('기록이 삭제되었습니다.');
                    loadRecords();
                    loadMonthlyRecords();
                } else {
                    alert('삭제 실패: ' + data.error);
                }
            } catch (error) {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }

        document.getElementById('recordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const recordId = document.getElementById('recordId').value;
            const attendance = document.querySelector('input[name="attendance"]:checked');
            const homework = document.querySelector('input[name="homework"]:checked');
            
            const payload = {
                studentId: document.getElementById('recordStudent').value,
                classId: document.getElementById('recordClass').value || null,
                recordDate: formatDate(selectedDate),
                attendance: attendance ? attendance.value : null,
                lessonConcept: document.getElementById('lessonConcept').value || null,
                lessonUnderstanding: parseInt(document.getElementById('lessonUnderstanding').value),
                lessonParticipation: parseInt(document.getElementById('lessonParticipation').value),
                lessonAchievement: document.getElementById('lessonAchievement').value || null,
                homeworkStatus: homework ? homework.value : null,
                homeworkContent: document.getElementById('homeworkContent').value || null,
                homeworkAchievement: document.getElementById('homeworkAchievement').value || null,
                memo: document.getElementById('recordMemo').value
            };

            try {
                const url = recordId ? '/api/daily-records/' + recordId : '/api/daily-records';
                const method = recordId ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    alert(recordId ? '기록이 수정되었습니다.' : '기록이 추가되었습니다.');
                    hideRecordModal();
                    loadRecords();
                    loadMonthlyRecords();
                } else {
                    alert('저장 실패: ' + data.error);
                }
            } catch (error) {
                alert('저장 중 오류가 발생했습니다.');
                console.error(error);
            }
        });

        // 초기 로드
        (async () => {
            selectDate(new Date());
            await loadMonthlyRecords();
            await loadStudents();
            await loadCourses();
        })();
    </script>
</body>
</html>
`

export const studentDetailPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>학생 상세 - 꾸메땅학원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <a href="/students/list" class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-2"></i>학생 목록
                    </a>
                    <h1 id="pageTitle" class="text-2xl font-bold text-gray-900">학생 상세</h1>
                </div>
                <div class="flex space-x-3">
                    <a href="/students/daily-record" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-calendar-check mr-2"></i>성과 기록
                    </a>
                    <button onclick="sendSMS()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-sms mr-2"></i>학부모 문자
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div id="loadingMessage" class="text-center text-gray-500 py-12">로딩 중...</div>
        
        <div id="studentContent" class="hidden">
            <!-- 학생 프로필 -->
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-xl p-8 mb-6 text-white">
                <div class="flex items-center space-x-6">
                    <div class="bg-white text-blue-600 rounded-full w-24 h-24 flex items-center justify-center text-4xl font-bold">
                        <span id="studentInitial"></span>
                    </div>
                    <div class="flex-1">
                        <h2 id="studentName" class="text-3xl font-bold mb-2"></h2>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="opacity-80">학년</span>
                                <p id="studentGrade" class="font-semibold text-lg"></p>
                            </div>
                            <div>
                                <span class="opacity-80">반</span>
                                <p id="studentClass" class="font-semibold text-lg"></p>
                            </div>
                            <div>
                                <span class="opacity-80">수강 과목</span>
                                <p id="studentSubjects" class="font-semibold text-lg"></p>
                            </div>
                            <div>
                                <span class="opacity-80">등록일</span>
                                <p id="enrollmentDate" class="font-semibold text-lg"></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 학부모 정보 & 연락처 -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">👨‍👩‍👧 학부모 정보</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <span class="text-sm text-gray-500">학부모 이름</span>
                        <p id="parentName" class="text-lg font-semibold text-gray-900"></p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">학부모 연락처</span>
                        <p id="parentPhone" class="text-lg font-semibold text-gray-900"></p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">학생 연락처</span>
                        <p id="studentPhone" class="text-lg font-semibold text-gray-900"></p>
                    </div>
                </div>
                <div id="studentNotes" class="mt-4 p-4 bg-yellow-50 rounded-lg hidden">
                    <span class="text-sm text-gray-500">메모</span>
                    <p id="notesContent" class="text-gray-900 mt-1"></p>
                </div>
            </div>

            <!-- 통계 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">출석률</span>
                        <i class="fas fa-calendar-check text-green-500 text-2xl"></i>
                    </div>
                    <p id="attendanceRate" class="text-3xl font-bold text-green-600">-%</p>
                    <p class="text-sm text-gray-500 mt-1">총 <span id="attendanceDays">0</span>일</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">과제 완성률</span>
                        <i class="fas fa-tasks text-blue-500 text-2xl"></i>
                    </div>
                    <p id="homeworkRate" class="text-3xl font-bold text-blue-600">-%</p>
                    <p class="text-sm text-gray-500 mt-1">완료 <span id="homeworkCompleted">0</span>건</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">평균 이해도</span>
                        <i class="fas fa-brain text-purple-500 text-2xl"></i>
                    </div>
                    <p id="avgUnderstanding" class="text-3xl font-bold text-purple-600">-</p>
                    <p class="text-sm text-gray-500 mt-1">5점 만점</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600">평균 참여도</span>
                        <i class="fas fa-hand-paper text-orange-500 text-2xl"></i>
                    </div>
                    <p id="avgParticipation" class="text-3xl font-bold text-orange-600">-</p>
                    <p class="text-sm text-gray-500 mt-1">5점 만점</p>
                </div>
            </div>

            <!-- 기간 선택 -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div class="flex items-center space-x-4">
                    <label class="text-sm font-medium text-gray-700">기간 선택:</label>
                    <select id="periodSelect" onchange="loadStats()" class="px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="7">최근 7일</option>
                        <option value="30" selected>최근 30일</option>
                        <option value="90">최근 90일</option>
                        <option value="all">전체 기간</option>
                    </select>
                </div>
            </div>

            <!-- 성과 그래프 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">📈 이해도 & 참여도 추이</h3>
                    <canvas id="levelChart"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">📊 출석 & 과제 현황</h3>
                    <canvas id="statusChart"></canvas>
                </div>
            </div>

            <!-- 최근 성과 기록 타임라인 -->
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">📝 최근 성과 기록</h3>
                <div id="recentRecords" class="space-y-4"></div>
            </div>
        </div>
    </div>

    <script>
        const studentId = window.location.pathname.split('/').pop();
        const academyId = 1;
        let student = null;
        let stats = null;
        let records = [];
        let levelChart = null;
        let statusChart = null;

        async function loadStudent() {
            try {
                const res = await fetch('/api/students/' + studentId);
                const data = await res.json();
                if (data.success) {
                    student = data.student;
                    renderStudent();
                } else {
                    document.getElementById('loadingMessage').innerHTML = '<div class="text-center text-red-500 py-12">학생 정보를 찾을 수 없습니다.</div>';
                }
            } catch (error) {
                console.error('학생 정보 로딩 실패:', error);
                document.getElementById('loadingMessage').innerHTML = '<div class="text-center text-red-500 py-12">오류가 발생했습니다.</div>';
            }
        }

        function renderStudent() {
            document.getElementById('pageTitle').textContent = student.name + ' 학생';
            document.getElementById('studentInitial').textContent = student.name.charAt(0);
            document.getElementById('studentName').textContent = student.name;
            document.getElementById('studentGrade').textContent = student.grade;
            document.getElementById('studentClass').textContent = student.class_name || '미배정';
            document.getElementById('studentSubjects').textContent = student.subjects;
            document.getElementById('enrollmentDate').textContent = student.enrollment_date;
            document.getElementById('parentName').textContent = student.parent_name;
            document.getElementById('parentPhone').textContent = student.parent_phone;
            document.getElementById('studentPhone').textContent = student.phone || '미등록';
            
            if (student.notes) {
                document.getElementById('studentNotes').classList.remove('hidden');
                document.getElementById('notesContent').textContent = student.notes;
            }

            document.getElementById('loadingMessage').classList.add('hidden');
            document.getElementById('studentContent').classList.remove('hidden');
        }

        async function loadStats() {
            try {
                const period = document.getElementById('periodSelect').value;
                let startDate, endDate = new Date().toISOString().split('T')[0];
                
                if (period === 'all') {
                    startDate = student.enrollment_date;
                } else {
                    const date = new Date();
                    date.setDate(date.getDate() - parseInt(period));
                    startDate = date.toISOString().split('T')[0];
                }

                const res = await fetch(\`/api/students/\${studentId}/stats?startDate=\${startDate}&endDate=\${endDate}\`);
                const data = await res.json();
                if (data.success) {
                    stats = data.stats;
                    renderStats();
                }

                // 전체 기록도 로드
                const recordsRes = await fetch(\`/api/daily-records?studentId=\${studentId}&startDate=\${startDate}&endDate=\${endDate}\`);
                const recordsData = await recordsRes.json();
                if (recordsData.success) {
                    records = recordsData.records;
                    renderRecords();
                    renderCharts();
                }
            } catch (error) {
                console.error('통계 로딩 실패:', error);
            }
        }

        function renderStats() {
            const totalRecords = parseInt(stats.total_records) || 0;
            const attendanceCount = parseInt(stats.attendance_count) || 0;
            const homeworkCompleted = parseInt(stats.homework_completed) || 0;
            const avgUnderstanding = parseFloat(stats.avg_understanding) || 0;
            const avgParticipation = parseFloat(stats.avg_participation) || 0;

            const attendanceRate = totalRecords > 0 ? Math.round((attendanceCount / totalRecords) * 100) : 0;
            const homeworkRate = totalRecords > 0 ? Math.round((homeworkCompleted / totalRecords) * 100) : 0;

            document.getElementById('attendanceRate').textContent = attendanceRate + '%';
            document.getElementById('attendanceDays').textContent = attendanceCount;
            document.getElementById('homeworkRate').textContent = homeworkRate + '%';
            document.getElementById('homeworkCompleted').textContent = homeworkCompleted;
            document.getElementById('avgUnderstanding').textContent = avgUnderstanding > 0 ? avgUnderstanding.toFixed(1) : '-';
            document.getElementById('avgParticipation').textContent = avgParticipation > 0 ? avgParticipation.toFixed(1) : '-';
        }

        function renderRecords() {
            const container = document.getElementById('recentRecords');
            if (records.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 py-8">기록이 없습니다.</div>';
                return;
            }

            const sortedRecords = [...records].sort((a, b) => new Date(b.record_date) - new Date(a.record_date)).slice(0, 10);

            container.innerHTML = sortedRecords.map(record => {
                const date = new Date(record.record_date);
                const dateStr = \`\${date.getMonth() + 1}월 \${date.getDate()}일\`;

                const attendanceColor = {
                    '출석': 'bg-green-100 text-green-800',
                    '지각': 'bg-yellow-100 text-yellow-800',
                    '결석': 'bg-red-100 text-red-800',
                    '조퇴': 'bg-orange-100 text-orange-800'
                }[record.attendance] || 'bg-gray-100 text-gray-800';

                return \`
                    <div class="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                        <div class="flex-shrink-0 text-center">
                            <div class="text-sm text-gray-500">\${dateStr}</div>
                            <div class="text-2xl font-bold text-gray-900">\${date.getDate()}</div>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="font-semibold text-gray-900">\${record.course_name || '과목 미지정'}</span>
                                \${record.attendance ? \`<span class="px-2 py-1 rounded-full text-xs font-medium \${attendanceColor}">\${record.attendance}</span>\` : ''}
                            </div>
                            <div class="flex items-center space-x-3 text-sm text-gray-600 mb-2">
                                \${record.homework_status ? \`<span>📝 과제: \${record.homework_status}</span>\` : ''}
                                \${record.understanding_level ? \`<span>💡 이해도: \${record.understanding_level}/5</span>\` : ''}
                                \${record.participation_level ? \`<span>✋ 참여도: \${record.participation_level}/5</span>\` : ''}
                            </div>
                            \${record.achievement ? \`<p class="text-sm text-gray-700">\${record.achievement}</p>\` : ''}
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function renderCharts() {
            // 이해도 & 참여도 추이
            const dates = records.map(r => {
                const d = new Date(r.record_date);
                return \`\${d.getMonth() + 1}/\${d.getDate()}\`;
            }).reverse();
            const understanding = records.map(r => r.understanding_level || 0).reverse();
            const participation = records.map(r => r.participation_level || 0).reverse();

            if (levelChart) levelChart.destroy();
            const levelCtx = document.getElementById('levelChart').getContext('2d');
            levelChart = new Chart(levelCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: '이해도',
                            data: understanding,
                            borderColor: 'rgb(147, 51, 234)',
                            backgroundColor: 'rgba(147, 51, 234, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: '참여도',
                            data: participation,
                            borderColor: 'rgb(249, 115, 22)',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, max: 5 }
                    }
                }
            });

            // 출석 & 과제 현황
            const attendanceData = {
                '출석': records.filter(r => r.attendance === '출석').length,
                '지각': records.filter(r => r.attendance === '지각').length,
                '결석': records.filter(r => r.attendance === '결석').length,
                '조퇴': records.filter(r => r.attendance === '조퇴').length
            };

            const homeworkData = {
                '완료': records.filter(r => r.homework_status === '완료').length,
                '부분완료': records.filter(r => r.homework_status === '부분완료').length,
                '미완료': records.filter(r => r.homework_status === '미완료').length
            };

            if (statusChart) statusChart.destroy();
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            statusChart = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: ['출석', '지각', '결석', '조퇴', '과제완료', '과제부분', '과제미완'],
                    datasets: [{
                        label: '횟수',
                        data: [
                            attendanceData['출석'],
                            attendanceData['지각'],
                            attendanceData['결석'],
                            attendanceData['조퇴'],
                            homeworkData['완료'],
                            homeworkData['부분완료'],
                            homeworkData['미완료']
                        ],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(156, 163, 175, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        function sendSMS() {
            if (!student) return;
            window.location.href = \`/sms/compose?phone=\${student.parent_phone}&name=\${student.parent_name}\`;
        }

        // 초기 로드
        (async () => {
            await loadStudent();
            await loadStats();
        })();
    </script>
</body>
</html>
`

export const coursesPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>과목 관리 - 꾸메땅학원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-green {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto p-6">
        <!-- 헤더 -->
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">📚 과목 관리</h1>
                <p class="text-gray-600">학원에서 운영하는 과목을 관리하세요</p>
            </div>
            <div class="flex gap-3">
                <a href="/students" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <i class="fas fa-arrow-left mr-2"></i>돌아가기
                </a>
                <button onclick="showAddModal()" class="px-4 py-2 gradient-green text-white rounded-lg hover:shadow-lg transition">
                    <i class="fas fa-plus mr-2"></i>과목 추가
                </button>
            </div>
        </div>

        <!-- 통계 카드 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">전체 과목</span>
                    <i class="fas fa-book text-green-500 text-2xl"></i>
                </div>
                <div id="totalCourses" class="text-3xl font-bold text-gray-900">0개</div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">수강 학생</span>
                    <i class="fas fa-users text-blue-500 text-2xl"></i>
                </div>
                <div id="totalStudents" class="text-3xl font-bold text-gray-900">0명</div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">진행중인 수업</span>
                    <i class="fas fa-chalkboard-teacher text-purple-500 text-2xl"></i>
                </div>
                <div id="activeClasses" class="text-3xl font-bold text-gray-900">0개</div>
            </div>
        </div>

        <!-- 과목 목록 -->
        <div class="bg-white rounded-xl shadow">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-bold text-gray-900">과목 목록</h2>
            </div>
            <div id="coursesList" class="p-6">
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-book text-4xl mb-4 text-gray-300"></i>
                    <p>등록된 과목이 없습니다. 과목을 추가해주세요.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- 과목 추가/수정 모달 -->
    <div id="courseModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-gray-200">
                <h2 id="modalTitle" class="text-2xl font-bold text-gray-900">과목 추가</h2>
            </div>
            <form id="courseForm" class="p-6 space-y-6">
                <input type="hidden" id="courseId">
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        과목명 <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="courseName" required 
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="예: 영어, 수학, 프로그램1">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        과목 설명
                    </label>
                    <textarea id="courseDescription" rows="4"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="과목에 대한 설명을 입력하세요"></textarea>
                </div>

                <div class="flex gap-3 pt-4">
                    <button type="submit" class="flex-1 px-6 py-3 gradient-green text-white rounded-lg font-bold hover:shadow-lg transition">
                        <i class="fas fa-check mr-2"></i>저장
                    </button>
                    <button type="button" onclick="closeModal()" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition">
                        취소
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentUser = null;
        let allCourses = [];

        // 로그인 체크
        window.addEventListener('DOMContentLoaded', async () => {
            const userData = localStorage.getItem('user');
            if (!userData) {
                alert('로그인이 필요합니다.');
                window.location.href = '/login';
                return;
            }
            currentUser = JSON.parse(userData);
            await loadCourses();
        });

        // 과목 목록 로드
        async function loadCourses() {
            try {
                const response = await fetch(\`/api/courses?academyId=\${currentUser.id}\`);
                const data = await response.json();

                if (data.success) {
                    allCourses = data.courses || [];
                    renderCourses();
                    updateStats();
                }
            } catch (error) {
                console.error('과목 로드 실패:', error);
            }
        }

        // 과목 렌더링
        function renderCourses() {
            const container = document.getElementById('coursesList');
            
            if (allCourses.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-book text-4xl mb-4 text-gray-300"></i>
                        <p>등록된 과목이 없습니다. 과목을 추가해주세요.</p>
                    </div>
                \`;
                return;
            }

            container.innerHTML = \`
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    \${allCourses.map(course => \`
                        <div class="border-2 border-gray-200 rounded-xl p-4 hover:border-green-400 transition">
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-book text-green-500 text-xl"></i>
                                    <h3 class="font-bold text-lg text-gray-900">\${course.course_name}</h3>
                                </div>
                                <div class="flex gap-1">
                                    <button onclick="editCourse(\${course.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteCourse(\${course.id}, '\${course.course_name}')" class="p-2 text-red-600 hover:bg-red-50 rounded">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            \${course.description ? \`
                                <p class="text-sm text-gray-600 mb-3">\${course.description}</p>
                            \` : ''}
                            <div class="flex items-center justify-between text-sm text-gray-500">
                                <span><i class="fas fa-users mr-1"></i>수강생 0명</span>
                                <span class="text-xs text-gray-400">\${new Date(course.created_at).toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>
                    \`).join('')}
                </div>
            \`;
        }

        // 통계 업데이트
        function updateStats() {
            document.getElementById('totalCourses').textContent = allCourses.length + '개';
            // 수강 학생과 진행중인 수업은 추후 구현
            document.getElementById('totalStudents').textContent = '0명';
            document.getElementById('activeClasses').textContent = '0개';
        }

        // 모달 열기
        function showAddModal() {
            document.getElementById('modalTitle').textContent = '과목 추가';
            document.getElementById('courseForm').reset();
            document.getElementById('courseId').value = '';
            document.getElementById('courseModal').classList.remove('hidden');
        }

        // 모달 닫기
        function closeModal() {
            document.getElementById('courseModal').classList.add('hidden');
        }

        // 과목 수정
        function editCourse(courseId) {
            const course = allCourses.find(c => c.id === courseId);
            if (!course) return;

            document.getElementById('modalTitle').textContent = '과목 수정';
            document.getElementById('courseId').value = course.id;
            document.getElementById('courseName').value = course.course_name;
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseModal').classList.remove('hidden');
        }

        // 과목 삭제
        async function deleteCourse(courseId, courseName) {
            if (!confirm(\`'\${courseName}' 과목을 삭제하시겠습니까?\`)) return;

            try {
                const response = await fetch(\`/api/courses/\${courseId}?academyId=\${currentUser.id}\`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    alert('과목이 삭제되었습니다.');
                    await loadCourses();
                } else {
                    alert(data.error || '삭제 실패');
                }
            } catch (error) {
                console.error('삭제 실패:', error);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }

        // 폼 제출
        document.getElementById('courseForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const courseId = document.getElementById('courseId').value;
            const data = {
                academy_id: currentUser.id,
                course_name: document.getElementById('courseName').value,
                description: document.getElementById('courseDescription').value
            };

            try {
                let response;
                if (courseId) {
                    // 수정
                    response = await fetch(\`/api/courses/\${courseId}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                } else {
                    // 추가
                    response = await fetch('/api/courses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                }

                const result = await response.json();

                if (result.success) {
                    alert(courseId ? '과목이 수정되었습니다.' : '과목이 추가되었습니다.');
                    closeModal();
                    await loadCourses();
                } else {
                    alert(result.error || '저장 실패');
                }
            } catch (error) {
                console.error('저장 실패:', error);
                alert('저장 중 오류가 발생했습니다.');
            }
        });

        // 모달 외부 클릭 시 닫기
        document.getElementById('courseModal').addEventListener('click', (e) => {
            if (e.target.id === 'courseModal') {
                closeModal();
            }
        });
    </script>
</body>
</html>
`

export default { classesPage, studentsListPage, dailyRecordPage, studentDetailPage, coursesPage }
