// QR 코드 생성 API
app.post('/api/landing/generate-qr', async (c) => {
  try {
    const { landing_slug } = await c.req.json()
    
    if (!landing_slug) {
      return c.json({ success: false, error: '랜딩페이지 slug가 필요합니다.' }, 400)
    }
    
    // 랜딩페이지 URL 생성
    const landingUrl = `https://superplace-academy.pages.dev/l/${landing_slug}`
    
    // QR 코드 생성 (qrcode.react 또는 외부 API 사용)
    // 여기서는 간단하게 외부 API를 사용합니다
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(landingUrl)}`
    
    return c.json({
      success: true,
      qr_url: qrApiUrl,
      landing_url: landingUrl,
      message: 'QR 코드가 생성되었습니다.'
    })
  } catch (err) {
    console.error('QR generation error:', err)
    return c.json({ success: false, error: 'QR 코드 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 랜딩페이지 신청자 목록 조회 API
app.get('/api/landing/:slug/submissions', async (c) => {
  try {
    const slug = c.req.param('slug')
    
    // 인증된 사용자 확인
    const userHeaderBase64 = c.req.header('X-User-Data-Base64')
    let user = null
    if (userHeaderBase64) {
      try {
        const userDataStr = atob(userHeaderBase64)
        user = JSON.parse(userDataStr)
      } catch (e) {
        console.warn('Failed to decode user data:', e)
      }
    }
    
    if (!user) {
      return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
    }
    
    // 랜딩페이지 소유자 확인
    const landing = await c.env.DB.prepare(`
      SELECT id, user_id, title FROM landing_pages WHERE slug = ?
    `).bind(slug).first()
    
    if (!landing) {
      return c.json({ success: false, error: '랜딩페이지를 찾을 수 없습니다.' }, 404)
    }
    
    if (landing.user_id !== user.id) {
      return c.json({ success: false, error: '권한이 없습니다.' }, 403)
    }
    
    // 신청자 목록 조회
    const submissions = await c.env.DB.prepare(`
      SELECT id, name, phone, email, message, created_at, status
      FROM landing_submissions
      WHERE landing_page_id = ?
      ORDER BY created_at DESC
    `).bind(landing.id).all()
    
    return c.json({
      success: true,
      landing_title: landing.title,
      submissions: submissions.results || [],
      total: submissions.results?.length || 0
    })
  } catch (err) {
    console.error('Get submissions error:', err)
    return c.json({ success: false, error: '신청자 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 랜딩페이지 신청자 데이터 저장 API (기존에 없다면)
app.post('/api/landing/:slug/submit', async (c) => {
  try {
    const slug = c.req.param('slug')
    const { name, phone, email, message } = await c.req.json()
    
    if (!name || !phone) {
      return c.json({ success: false, error: '이름과 전화번호는 필수입니다.' }, 400)
    }
    
    // 랜딩페이지 확인
    const landing = await c.env.DB.prepare(`
      SELECT id, title FROM landing_pages WHERE slug = ?
    `).bind(slug).first()
    
    if (!landing) {
      return c.json({ success: false, error: '랜딩페이지를 찾을 수 없습니다.' }, 404)
    }
    
    // 신청 데이터 저장
    await c.env.DB.prepare(`
      INSERT INTO landing_submissions (landing_page_id, name, phone, email, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)
    `).bind(landing.id, name, phone, email || null, message || null).run()
    
    return c.json({
      success: true,
      message: '신청이 완료되었습니다.'
    })
  } catch (err) {
    console.error('Submit landing error:', err)
    return c.json({ success: false, error: '신청 중 오류가 발생했습니다.' }, 500)
  }
})

// 신청자 관리 페이지
app.get('/landing/:slug/admin', async (c) => {
  const slug = c.req.param('slug')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>신청자 관리 - 슈퍼플레이스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * { font-family: 'Pretendard Variable', sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-xl font-bold text-gray-900">신청자 관리</h1>
                    <a href="/dashboard" class="text-purple-600 hover:text-purple-700">
                        <i class="fas fa-arrow-left mr-2"></i>대시보드로
                    </a>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-6 py-8">
            <!-- Stats Cards -->
            <div class="grid md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl p-6 shadow-sm border">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">전체 신청</p>
                            <p id="totalCount" class="text-3xl font-bold text-gray-900">0</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-6 shadow-sm border">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">신규 신청</p>
                            <p id="newCount" class="text-3xl font-bold text-green-600">0</p>
                        </div>
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user-plus text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-6 shadow-sm border">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">연락 완료</p>
                            <p id="contactedCount" class="text-3xl font-bold text-purple-600">0</p>
                        </div>
                        <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-phone text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-6 shadow-sm border">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">등록 완료</p>
                            <p id="registeredCount" class="text-3xl font-bold text-orange-600">0</p>
                        </div>
                        <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-check-circle text-orange-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Landing Page Info -->
            <div class="bg-white rounded-xl p-6 shadow-sm border mb-8">
                <h2 id="landingTitle" class="text-xl font-bold text-gray-900 mb-2">로딩 중...</h2>
                <div class="flex items-center gap-4">
                    <a id="landingLink" href="#" target="_blank" class="text-purple-600 hover:underline">
                        <i class="fas fa-external-link-alt mr-2"></i>랜딩페이지 보기
                    </a>
                    <button onclick="downloadQR()" class="text-green-600 hover:underline">
                        <i class="fas fa-qrcode mr-2"></i>QR 코드 다운로드
                    </button>
                </div>
            </div>

            <!-- Submissions Table -->
            <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div class="px-6 py-4 border-b bg-gray-50">
                    <h3 class="text-lg font-bold text-gray-900">신청자 목록</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">번호</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">이름</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">연락처</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">이메일</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">신청일</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">상태</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">메시지</th>
                            </tr>
                        </thead>
                        <tbody id="submissionsTable" class="divide-y divide-gray-200">
                            <tr>
                                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                                    로딩 중...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            const slug = '${slug}';
            let submissions = [];

            async function loadData() {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (!user.id) {
                        alert('로그인이 필요합니다.');
                        window.location.href = '/login';
                        return;
                    }

                    const response = await fetch(\`/api/landing/\${slug}/submissions\`, {
                        headers: {
                            'X-User-Data-Base64': btoa(JSON.stringify(user))
                        }
                    });

                    const data = await response.json();
                    
                    if (!data.success) {
                        alert('오류: ' + data.error);
                        return;
                    }

                    submissions = data.submissions;
                    
                    // Update title and link
                    document.getElementById('landingTitle').textContent = data.landing_title || '랜딩페이지';
                    const landingUrl = \`https://superplace-academy.pages.dev/l/\${slug}\`;
                    document.getElementById('landingLink').href = landingUrl;

                    // Update stats
                    document.getElementById('totalCount').textContent = submissions.length;
                    document.getElementById('newCount').textContent = submissions.filter(s => s.status === 'new').length;
                    document.getElementById('contactedCount').textContent = submissions.filter(s => s.status === 'contacted').length;
                    document.getElementById('registeredCount').textContent = submissions.filter(s => s.status === 'registered').length;

                    // Render table
                    renderTable();
                } catch (err) {
                    console.error('Load error:', err);
                    alert('데이터 로딩 중 오류가 발생했습니다.');
                }
            }

            function renderTable() {
                const tbody = document.getElementById('submissionsTable');
                
                if (submissions.length === 0) {
                    tbody.innerHTML = \`
                        <tr>
                            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                                아직 신청자가 없습니다.
                            </td>
                        </tr>
                    \`;
                    return;
                }

                tbody.innerHTML = submissions.map((sub, index) => {
                    const statusColors = {
                        new: 'bg-green-100 text-green-800',
                        contacted: 'bg-purple-100 text-purple-800',
                        registered: 'bg-orange-100 text-orange-800'
                    };
                    const statusTexts = {
                        new: '신규',
                        contacted: '연락완료',
                        registered: '등록완료'
                    };
                    
                    return \`
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 text-sm text-gray-900">\${submissions.length - index}</td>
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">\${sub.name}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">\${sub.phone}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">\${sub.email || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">\${new Date(sub.created_at).toLocaleDateString('ko-KR')}</td>
                            <td class="px-6 py-4">
                                <span class="px-3 py-1 rounded-full text-xs font-medium \${statusColors[sub.status] || 'bg-gray-100 text-gray-800'}">
                                    \${statusTexts[sub.status] || sub.status}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-600">\${sub.message || '-'}</td>
                        </tr>
                    \`;
                }).join('');
            }

            async function downloadQR() {
                try {
                    const response = await fetch('/api/landing/generate-qr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ landing_slug: slug })
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        // QR 코드 이미지를 다운로드
                        const link = document.createElement('a');
                        link.href = data.qr_url;
                        link.download = \`landing-\${slug}-qr.png\`;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        alert('QR 코드가 다운로드됩니다!');
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (err) {
                    console.error('QR download error:', err);
                    alert('QR 코드 생성 중 오류가 발생했습니다.');
                }
            }

            // Load data on page load
            loadData();
        </script>
    </body>
    </html>
  `)
})

// landing_submissions 테이블 초기화 API
app.post('/api/admin/init-landing-submissions', async (c) => {
  try {
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS landing_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landing_page_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        message TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id)
      )
    `).run()
    
    await c.env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_landing_submissions_page_id ON landing_submissions(landing_page_id)
    `).run()
    
    await c.env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_landing_submissions_status ON landing_submissions(status)
    `).run()
    
    return c.json({
      success: true,
      message: 'landing_submissions 테이블이 생성되었습니다.'
    })
  } catch (err) {
    console.error('Init landing_submissions error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})
