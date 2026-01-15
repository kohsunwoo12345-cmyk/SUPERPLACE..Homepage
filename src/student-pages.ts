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
                            <option value="초등">초등</option>
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

export default { classesPage }
