import { Hono } from 'hono';

const landingRoutes = new Hono();

// Landing Builder Page
landingRoutes.get('/tools/landing-builder', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>랜딩페이지 생성기 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/airbnb.css">
        <script src="https://cdn.jsdelivr.net/npm/flatpickr"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ko.js"><\/script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
          .gradient-purple { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <span class="text-xl font-bold text-gray-900">랜딩페이지 생성기</span>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/landing-manager" class="text-gray-600 hover:text-purple-600">내 랜딩페이지</a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-4xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-gray-900 mb-3">🎨 AI 랜딩페이지 생성기</h1>
                    <p class="text-lg text-gray-600">간단한 정보만 입력하면 완성된 랜딩페이지를 만들어드립니다</p>
                </div>

                <!-- 템플릿 선택 -->
                <div class="bg-white rounded-xl p-8 border border-gray-200 mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">1️⃣ 템플릿 선택</h2>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button onclick="selectTemplate('academy-intro')" class="template-btn group p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-xl transition-all duration-300 text-left bg-white">
                            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🏫</div>
                            <div class="font-bold text-lg mb-2 text-gray-900 group-hover:text-purple-600 transition-colors">학원 소개 페이지</div>
                            <p class="text-sm text-gray-600 leading-relaxed">학원의 강점과 특징을 효과적으로 홍보</p>
                        </button>
                        <button onclick="selectTemplate('program-promo')" class="template-btn group p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-left bg-white">
                            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📚</div>
                            <div class="font-bold text-lg mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">프로그램 홍보</div>
                            <p class="text-sm text-gray-600 leading-relaxed">특정 프로그램 등록을 유도하는 페이지</p>
                        </button>
                        <button onclick="selectTemplate('event-promo')" class="template-btn group p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-xl transition-all duration-300 text-left bg-white">
                            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🎉</div>
                            <div class="font-bold text-lg mb-2 text-gray-900 group-hover:text-green-600 transition-colors">이벤트 홍보</div>
                            <p class="text-sm text-gray-600 leading-relaxed">할인, 무료체험 등 이벤트 페이지</p>
                        </button>
                    </div>
                </div>

                <!-- 폼 영역 -->
                <div id="formArea" class="hidden bg-white rounded-xl p-8 border border-gray-200 mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">2️⃣ 정보 입력</h2>
                    <form id="landingForm">
                        <div id="formContent"></div>
                        <button type="submit" class="w-full mt-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all">
                            ✨ 랜딩페이지 생성하기
                        </button>
                    </form>
                </div>

                <!-- 성공 모달 -->
                <div id="successModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                        <div class="text-center mb-6">
                            <div class="text-6xl mb-4">✅</div>
                            <h2 class="text-3xl font-bold text-gray-900 mb-2">완성!</h2>
                            <p class="text-gray-600">랜딩페이지가 생성되었습니다</p>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">공유 링크</label>
                                <div class="flex gap-2">
                                    <input type="text" id="shareUrl" readonly class="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                                    <button onclick="copyUrl()" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                                        📋 복사
                                    </button>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <a id="previewBtn" href="#" target="_blank" class="flex-1 text-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                                    👁️ 미리보기
                                </a>
                                <a href="/tools/landing-manager" class="flex-1 text-center py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700">
                                    📁 관리 페이지
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
        let selectedTemplate = '';
        let user = null;

        const userData = localStorage.getItem('user');
        if (!userData) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
        } else {
            user = JSON.parse(userData);
        }

        function logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
            window.location.href = '/';
        }

        function selectTemplate(type) {
            selectedTemplate = type;
            document.querySelectorAll('.template-btn').forEach(btn => {
                btn.classList.remove('border-purple-600', 'bg-purple-50');
            });
            event.currentTarget.classList.add('border-purple-600', 'bg-purple-50');
            
            showForm(type);
        }

        function showForm(type) {
            const forms = {
                'academy-intro': '<div class="space-y-4"><div><label class="block text-sm font-medium text-gray-900 mb-2">학원명 *</label><input type="text" name="academyName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">위치 *</label><input type="text" name="location" placeholder="예: 인천 서구 청라동" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">한 줄 소개 *</label><input type="text" name="features" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">연락처 *</label><input type="text" name="contact" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div></div>',
                'program-promo': '<div class="space-y-4"><div><label class="block text-sm font-medium text-gray-900 mb-2">프로그램명 *</label><input type="text" name="programName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">대상 *</label><input type="text" name="target" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">가격 *</label><input type="text" name="price" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div></div>',
                'event-promo': '<div class="space-y-4"><div><label class="block text-sm font-medium text-gray-900 mb-2">이벤트명 *</label><input type="text" name="eventName" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">기간 *</label><input type="text" name="period" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></div><div><label class="block text-sm font-medium text-gray-900 mb-2">혜택 *</label><textarea name="benefits" rows="3" required class="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea></div></div>'
            };

            document.getElementById('formContent').innerHTML = forms[type] || forms['academy-intro'];
            document.getElementById('formArea').classList.remove('hidden');
            document.getElementById('formArea').scrollIntoView({ behavior: 'smooth' });
        }

        document.getElementById('landingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.template = selectedTemplate;
            data.userId = user.id;

            try {
                const response = await fetch('/api/landing/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    const shareUrl = window.location.origin + result.url;
                    document.getElementById('shareUrl').value = shareUrl;
                    document.getElementById('previewBtn').href = result.url;
                    document.getElementById('successModal').classList.remove('hidden');
                } else {
                    alert(result.error || '랜딩페이지 생성에 실패했습니다.');
                }
            } catch (error) {
                alert('오류가 발생했습니다: ' + error.message);
            }
        });

        function copyUrl() {
            const urlInput = document.getElementById('shareUrl');
            urlInput.select();
            document.execCommand('copy');
            alert('링크가 복사되었습니다!');
        }
        <\/script>
    </body>
    </html>
  `);
});

// Landing Manager Page
landingRoutes.get('/tools/landing-manager', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 랜딩페이지 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <span class="text-xl font-bold text-gray-900">내 랜딩페이지</span>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/landing-builder" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ 새로 만들기</a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-6xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">📁 내 랜딩페이지</h1>
                    <p class="text-gray-600">생성한 랜딩페이지를 관리하세요</p>
                </div>

                <!-- Pages List -->
                <div id="pagesList" class="space-y-4">
                    <div class="text-center py-12 text-gray-500">로딩중...</div>
                </div>
            </div>
        </div>

        <script>
        let user = null;

        const userData = localStorage.getItem('user');
        if (!userData) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
        } else {
            user = JSON.parse(userData);
            loadPages();
        }

        function logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
            window.location.href = '/';
        }

        async function loadPages() {
            try {
                const response = await fetch('/api/landing/my-pages?userId=' + user.id);
                const result = await response.json();
                
                if (result.success && result.pages) {
                    const pagesHtml = result.pages.map(page => {
                        const shareUrl = window.location.origin + '/landing/' + page.slug;
                        return '<div class="bg-white rounded-xl p-6 border border-gray-200">' +
                            '<div class="flex justify-between items-start mb-4">' +
                            '<div class="flex-1">' +
                            '<h3 class="text-xl font-bold text-gray-900 mb-2">' + page.title + '</h3>' +
                            '<p class="text-sm text-gray-500">조회수: ' + (page.view_count || 0) + '회</p>' +
                            '<p class="text-xs text-gray-400 mt-1">' + new Date(page.created_at).toLocaleDateString() + '</p>' +
                            '</div>' +
                            '<div class="flex gap-2">' +
                            '<a href="/landing/' + page.slug + '" target="_blank" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">미리보기</a>' +
                            '<button onclick="showQR(\\'' + page.slug + '\\')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">QR 코드</button>' +
                            '<button onclick="deletePage(' + page.id + ')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">삭제</button>' +
                            '</div>' +
                            '</div>' +
                            '<div class="flex gap-2">' +
                            '<input type="text" value="' + shareUrl + '" readonly class="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm">' +
                            '<button onclick="copyToClipboard(\\'' + shareUrl + '\\')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">복사</button>' +
                            '</div>' +
                            '</div>';
                    }).join('');
                    
                    document.getElementById('pagesList').innerHTML = pagesHtml || '<div class="text-center py-12 text-gray-500">생성된 랜딩페이지가 없습니다.</div>';
                } else {
                    document.getElementById('pagesList').innerHTML = '<div class="text-center py-12 text-gray-500">생성된 랜딩페이지가 없습니다.</div>';
                }
            } catch (error) {
                console.error('페이지 로드 실패:', error);
                document.getElementById('pagesList').innerHTML = '<div class="text-center py-12 text-red-500">로드 실패</div>';
            }
        }

        function showQR(slug) {
            const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(window.location.origin + '/landing/' + slug);
            window.open(qrUrl, '_blank', 'width=400,height=400');
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('링크가 복사되었습니다!');
            }).catch(err => {
                console.error('복사 실패:', err);
            });
        }

        async function deletePage(id) {
            if (!confirm('정말 삭제하시겠습니까?')) return;

            try {
                const response = await fetch('/api/landing/' + id + '?userId=' + user.id, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    alert('삭제되었습니다.');
                    loadPages();
                } else {
                    alert('삭제 실패: ' + result.error);
                }
            } catch (error) {
                alert('오류 발생: ' + error.message);
            }
        }
        <\/script>
    </body>
    </html>
  `);
});

export default landingRoutes;
