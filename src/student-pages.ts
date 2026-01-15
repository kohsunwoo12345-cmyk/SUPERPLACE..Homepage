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
            const payload = {
                academyId,
                className: document.getElementById('className').value,
                grade: document.getElementById('grade').value,
                description: document.getElementById('description').value
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
                        <input type="tel" id="studentPhone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="010-1234-5678">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">반 배정</label>
                        <select id="studentClass" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">미배정</option>
                        </select>
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
                        <input type="tel" id="parentPhone" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="010-1234-5678">
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

        async function loadClasses() {
            try {
                const res = await fetch('/api/classes?academyId=' + academyId);
                const data = await res.json();
                if (data.success) {
                    classes = data.classes;
                    
                    // 반 필터 드롭다운 채우기
                    const classFilter = document.getElementById('classFilter');
                    const studentClassSelect = document.getElementById('studentClass');
                    
                    classFilter.innerHTML = '<option value="">전체 학생</option>' +
                        classes.map(c => \`<option value="\${c.id}">\${c.class_name}</option>\`).join('');
                    
                    studentClassSelect.innerHTML = '<option value="">미배정</option>' +
                        classes.map(c => \`<option value="\${c.id}">\${c.class_name}</option>\`).join('');
                    
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
                const matchGrade = !gradeFilter || student.grade === gradeFilter;
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
                                    <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">\${student.grade}</span>
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

        function showAddModal() {
            document.getElementById('modalTitle').textContent = '새 학생 등록';
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
            document.getElementById('enrollmentDate').valueAsDate = new Date();
            document.getElementById('studentModal').classList.remove('hidden');
        }

        function hideModal() {
            document.getElementById('studentModal').classList.add('hidden');
        }

        function editStudent(studentId) {
            const student = allStudents.find(s => s.id === studentId);
            if (!student) return;

            document.getElementById('modalTitle').textContent = '학생 정보 수정';
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentClass').value = student.class_id || '';
            document.getElementById('studentGrade').value = student.grade;
            document.getElementById('enrollmentDate').value = student.enrollment_date;
            document.getElementById('parentName').value = student.parent_name;
            document.getElementById('parentPhone').value = student.parent_phone;
            document.getElementById('studentMemo').value = student.notes || '';
            
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

        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 체크박스에서 선택된 과목 수집
            const selectedSubjects = Array.from(document.querySelectorAll('input[name="subject"]:checked'))
                .map(cb => cb.value);
            
            if (selectedSubjects.length === 0) {
                alert('수강 과목을 최소 1개 이상 선택해주세요.');
                return;
            }
            
            const studentId = document.getElementById('studentId').value;
            const payload = {
                academyId,
                classId: document.getElementById('studentClass').value || null,
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

export default { classesPage, studentsListPage }
