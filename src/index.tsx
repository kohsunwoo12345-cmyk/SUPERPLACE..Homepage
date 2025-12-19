import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ========================================
// API Routes
// ========================================

// 문의 접수 API
app.post('/api/contact', async (c) => {
  try {
    const { name, email, phone, academy_name, message } = await c.req.json()
    
    // 유효성 검사
    if (!name || !email || !phone || !message) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // DB 저장
    const result = await c.env.DB.prepare(`
      INSERT INTO contacts (name, email, phone, academy_name, message)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, email, phone, academy_name || '', message).run()

    return c.json({ 
      success: true, 
      message: '문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Contact submission error:', error)
    return c.json({ success: false, error: '문의 접수 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원가입 API
app.post('/api/signup', async (c) => {
  try {
    const { email, password, name, phone, academy_name } = await c.req.json()
    
    if (!email || !password || !name) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 이메일 중복 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()

    if (existing) {
      return c.json({ success: false, error: '이미 가입된 이메일입니다.' }, 400)
    }

    // 비밀번호 해싱 (실제로는 bcrypt 등 사용 권장)
    const hashedPassword = password // TODO: 실제 프로젝트에서는 해싱 필요

    // DB 저장
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password, name, phone, academy_name, role)
      VALUES (?, ?, ?, ?, ?, 'member')
    `).bind(email, hashedPassword, name, phone || '', academy_name || '').run()

    return c.json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 로그인 API
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    // 사용자 조회
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role FROM users WHERE email = ? AND password = ?
    `).bind(email, password).first()

    if (!user) {
      return c.json({ success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401)
    }

    return c.json({ 
      success: true, 
      message: '로그인 성공',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 문의 목록 조회 API (관리자용)
app.get('/api/contacts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM contacts ORDER BY created_at DESC LIMIT 50
    `).all()

    return c.json({ success: true, contacts: results })
  } catch (error) {
    console.error('Fetch contacts error:', error)
    return c.json({ success: false, error: '문의 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// AI 학부모 메시지 생성 API
app.post('/api/generate-parent-message', async (c) => {
  try {
    const { studentName, grade, subject, shortMessage } = await c.req.json()
    
    if (!studentName || !grade || !subject || !shortMessage) {
      return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // OpenAI API 호출
    const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json({ success: false, error: 'AI 서비스 설정이 필요합니다.' }, 500)
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 학원 원장님입니다. 학부모님께 학생의 학습 현황을 따뜻하고 격려하는 말투로 전달하는 메시지를 작성합니다.

규칙:
1. 존댓말 사용 (학부모님께)
2. 따뜻하고 긍정적인 톤
3. 구체적인 칭찬 포함
4. 앞으로의 학습 방향 제시
5. 200-300자 정도의 적절한 길이
6. 이모지 2-3개 자연스럽게 사용
7. 학부모님이 안심하고 신뢰할 수 있는 내용`
          },
          {
            role: 'user',
            content: `학생 이름: ${studentName}
학년: ${grade}
과목: ${subject}
원장님의 짧은 메모: ${shortMessage}

위 정보를 바탕으로 학부모님께 보낼 따뜻한 메시지를 작성해주세요.`
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('OpenAI API error:', data)
      return c.json({ success: false, error: 'AI 메시지 생성 중 오류가 발생했습니다.' }, 500)
    }

    const generatedMessage = data.choices[0]?.message?.content || ''

    return c.json({ 
      success: true, 
      message: generatedMessage,
      metadata: {
        studentName,
        grade,
        subject,
        originalMessage: shortMessage
      }
    })
  } catch (error) {
    console.error('Generate message error:', error)
    return c.json({ success: false, error: '메시지 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// AI 블로그 글 생성 API
app.post('/api/generate-blog-post', async (c) => {
  try {
    const { topic, keywords, tone } = await c.req.json()
    
    if (!topic) {
      return c.json({ success: false, error: '주제를 입력해주세요.' }, 400)
    }

    const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json({ success: false, error: 'AI 서비스 설정이 필요합니다.' }, 500)
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `당신은 학원 마케팅 전문 블로그 작가입니다. 네이버 블로그 SEO에 최적화된 글을 작성합니다.

글쓰기 원칙:
1. 제목: 검색 키워드를 포함한 매력적인 제목
2. 서론: 독자의 관심을 끄는 공감 내용
3. 본론: 구체적이고 실용적인 정보 (3-5가지 핵심 포인트)
4. 결론: 행동을 유도하는 마무리
5. 키워드: 자연스럽게 3-5회 반복
6. 길이: 1500-2000자
7. 톤: ${tone || '친근하고 전문적인'}
8. 문단: 3-4문장으로 구성, 가독성 높게
9. 이모지 적절히 사용`
          },
          {
            role: 'user',
            content: `블로그 주제: ${topic}
${keywords ? `포함할 키워드: ${keywords}` : ''}

위 주제로 네이버 블로그에 올릴 글을 작성해주세요.
제목, 서론, 본론, 결론을 명확히 구분해서 작성해주세요.`
          }
        ],
        temperature: 0.9,
        max_tokens: 2500
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('OpenAI API error:', data)
      return c.json({ success: false, error: 'AI 블로그 글 생성 중 오류가 발생했습니다.' }, 500)
    }

    const generatedPost = data.choices[0]?.message?.content || ''

    return c.json({ 
      success: true, 
      content: generatedPost,
      metadata: {
        topic,
        keywords,
        tone,
        wordCount: generatedPost.length
      }
    })
  } catch (error) {
    console.error('Generate blog post error:', error)
    return c.json({ success: false, error: '블로그 글 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// ========================================
// Page Routes
// ========================================

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>우리는 슈퍼플레이스다 - 학원 마케팅 전문</title>
        <meta name="description" content="네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅 전문 교육">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          
          :root {
            --primary: #7c3aed;
            --primary-dark: #5b21b6;
            --accent: #fb923c;
            --accent-dark: #f97316;
          }
          
          body {
            background: #ffffff;
            color: #1f2937;
          }
          
          .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px -8px rgba(124, 58, 237, 0.15);
          }
          
          .animate-fade-in {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .animate-fade-in.visible {
            opacity: 1;
            transform: translateY(0);
          }
          
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          
          .gradient-orange {
            background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          }
          
          .section-light {
            background: #fafafa;
          }
          
          .text-balance {
            text-wrap: balance;
          }
        </style>
    </head>
    <body>
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-10" onerror="this.style.display='none'">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </div>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium hover:shadow-lg transition-all">
                            로그인
                        </a>
                    </div>
                    <div class="md:hidden">
                        <button id="mobile-menu-btn" class="text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile menu -->
            <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100">
                <div class="px-6 py-4 space-y-2">
                    <a href="/" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">홈</a>
                    <a href="/programs" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">교육 프로그램</a>
                    <a href="/success" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">성공 사례</a>
                    <a href="/contact" class="block px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-xl transition">문의하기</a>
                    <a href="/login" class="block px-4 py-3 gradient-purple text-white rounded-xl text-center font-medium">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="pt-32 pb-32 px-6 bg-white relative overflow-hidden">
            <div class="absolute inset-0 z-0">
                <div class="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-purple-100 to-transparent rounded-full blur-3xl opacity-30"></div>
                <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-orange-100 to-transparent rounded-full blur-3xl opacity-30"></div>
            </div>
            <div class="max-w-7xl mx-auto relative z-10">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <!-- Left: Text Content -->
                    <div class="animate-fade-in">
                        <div class="inline-block mb-6 px-5 py-2.5 bg-purple-50 rounded-full text-purple-700 text-sm font-medium border border-purple-100">
                            학원 마케팅의 새로운 기준
                        </div>
                        <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            학원장님의 성공,<br>
                            <span class="text-purple-600">우리가 함께합니다</span>
                        </h1>
                        <p class="text-xl text-gray-600 mb-10 leading-relaxed">
                            네이버 플레이스 1위, 블로그 상위노출, 퍼널 마케팅까지<br>
                            <span class="text-gray-900 font-medium">500개 학원이 검증</span>한 실전 마케팅 노하우
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 mb-12">
                            <a href="/contact" class="gradient-purple text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                                무료 상담 신청하기
                            </a>
                            <a href="/programs" class="bg-white text-purple-600 border-2 border-purple-200 px-10 py-4 rounded-full text-lg font-medium hover:border-purple-400 hover:bg-purple-50 transition-all text-center">
                                교육 프로그램 보기
                            </a>
                        </div>
                    </div>
                    
                    <!-- Right: Hero Image -->
                    <div class="animate-fade-in" style="transition-delay: 0.2s">
                        <div class="relative rounded-3xl overflow-hidden shadow-2xl">
                            <img src="https://sspark.genspark.ai/cfimages?u1=lr2PgsjvJYOtAUFJfXxlSFL3%2Fxn4A%2Fp4N%2FiD4RDqwc8zC35yqZ6POCnT3YuvehzHp8ysrzZXSmYZACr2cMnHD%2B2YYus6nyD72VCciIm1cGtUgP4Q%2BNOsAHzUzardGCwfVO3CTcFez%2BXdhrQ0C8f5iVUwu6GpvNSpLpm1vY0RbunLx%2FxKu6XmZA%3D%3D&u2=CLc1bHiOVvIvQBdT&width=1200" 
                                 alt="밝은 햇살이 드는 현대적인 교실에서 공부하는 학생들" 
                                 class="w-full h-auto object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-20">
                    
                    <!-- Stats -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-12 border-t border-gray-100">
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-purple-600 mb-2">500+</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">교육 수료 학원</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-orange-500 mb-2">95%</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">만족도</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-purple-600 mb-2">24/7</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">커뮤니티 운영</div>
                        </div>
                        <div class="text-center">
                            <div class="text-4xl lg:text-5xl font-bold text-orange-500 mb-2">1:1</div>
                            <div class="text-sm lg:text-base text-gray-600 font-medium">맞춤 컨설팅</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Services Section -->
        <section class="py-32 px-6 section-light">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-20 animate-fade-in">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        핵심 교육 프로그램
                    </h2>
                    <p class="text-xl text-gray-600">
                        실전에서 바로 적용 가능한 학원 마케팅 전략
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
                    <!-- Service 1 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.1s">
                        <div class="h-48 overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=vMhNikAhDjldJKiA1oydH8DuWnx9kRjEqcQRgbKwHZoVvBq1%2FHK%2FYhQfglxz%2Fwb5LEg2UKyL1UfLk0k6vaec5egh%2Bqd85AjSsfPO%2BWL5LKaFP2bactXC%2BeQhOWeBSRbsGQ8zvm%2Ff6Ach%2B15D&u2=Bt4S4brSTSUhd7oz&width=600" 
                                 alt="네이버 플레이스 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">네이버 플레이스<br>상위노출</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                지역 검색 1위 달성을 위한 실전 노하우. 키워드 분석부터 리뷰 관리까지 완벽하게 마스터합니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>키워드 최적화 전략</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>리뷰 관리 시스템</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>지역 SEO 완벽 가이드</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Service 2 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.2s">
                        <div class="h-48 overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=fXpKtsGwElEXmGHyi6UNt10fIT%2FczX6OhKUc7BNWLjteVobiDvJ7S9B7Saz22NQvbxNzJ4U55qYCFamlfPhjCUJQGtZv71VZ9hv4VcxNtc594Wg1XLbV%2F7FyGg%3D%3D&u2=IU78ucMbZ0EApodp&width=600" 
                                 alt="블로그 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">블로그<br>상위노출</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                네이버 블로그 검색 최상위 진입 전략. SEO 최적화와 콘텐츠 기획의 모든 것을 배웁니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>검색 알고리즘 완벽 이해</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>효과적인 글쓰기 기법</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>콘텐츠 전략 수립</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Service 3 -->
                    <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.3s">
                        <div class="h-48 overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=05QcxAjVo9k3MQHSqiUPn994iSMiXIzJg3KL56rk5KDOI%2Bcnz4jNCm%2BN8IWImXBhB8hEJScPkQqn%2FFiLlhT1vFo%2F7wqalUJM&u2=YeavfPPWfJ84GVHy&width=600" 
                                 alt="퍼널 마케팅" 
                                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
                        </div>
                        <div class="p-8">
                            <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center mb-4">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">퍼널<br>마케팅</h3>
                            <p class="text-gray-600 mb-6 leading-relaxed">
                                상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                            </p>
                            <ul class="space-y-3 text-gray-700">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>고객 여정 완벽 설계</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>마케팅 자동화 도구</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span>전환율 극대화 전략</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Us Section -->
        <section class="py-32 px-6 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-20 animate-fade-in">
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        왜 우리를 선택해야 할까요?
                    </h2>
                    <p class="text-xl text-gray-600">
                        현업 학원장이 직접 가르치는 실전 마케팅 교육
                    </p>
                </div>

                <div class="grid lg:grid-cols-2 gap-8 mb-20">
                    <!-- Left: Image Grid -->\n                    <div class="grid grid-cols-2 gap-4 animate-fade-in">
                        <div class="col-span-2 rounded-2xl overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=oN4UyWPdeAnPHGAuOl9u3ofPC4RFl6RqarrwUpvaLiPTm7mh2Lobo%2F4wTKiEG0Gvb59tAroNlqzwB6uxIgeDcFIisxkpK%2ByvzoLOBRUwq3wAPg%3D%3D&u2=Rn455fc046%2BoFW1M&width=1200" 
                                 alt="함께 공부하는 학생들" 
                                 class="w-full h-72 object-cover">
                        </div>
                        <div class="rounded-2xl overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=1RD4sGY%2Bj%2FjVEiNnMp02RJ56JfOtx4T5bs1GgjUg6GEd4uGzK1AKFOOoq6XOkJFszy3jtO4RLD7Ryw%2FKFPEMm1AoG8OlqkQ9hJGNA7p4XK4RtA%3D%3D&u2=F%2B3PvGjIdbBbGmsf&width=800" 
                                 alt="도서관에서 학습하는 학생들" 
                                 class="w-full h-48 object-cover">
                        </div>
                        <div class="rounded-2xl overflow-hidden">
                            <img src="https://sspark.genspark.ai/cfimages?u1=jrigc7hbpDQlc0ndcd0CI4xg%2FTgfegGGDHZTWXZd65zSnxkNxB8cITZ%2FxJbI5sgTLPkpd4LkzWQ5jLAbmq41VVI0WvzqGiOZ%2BIsnYwxcCUzPoMZvbl%2F7dvCbB4sm1oeP%2BEn1sJ8nvKk%2BkIjcPdULWHRkfHpSU%2F5w&u2=RrPeTMJGJ6oB5lsw&width=800" 
                                 alt="현대적인 디지털 학습 환경" 
                                 class="w-full h-48 object-cover">
                        </div>
                    </div>
                    
                    <!-- Right: Features -->
                    <div class="space-y-6 animate-fade-in" style="transition-delay: 0.1s">
                        <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    01
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        현업 학원장의 살아있는 노하우
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        꾸메땅학원을 운영하며 직접 검증한 실전 전략. 이론이 아닌 경험에서 우러나온 진짜 노하우를 배웁니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-orange rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    02
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        24/7 커뮤니티 & 오프라인 모임
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        오픈채팅방에서 실시간 소통하고, 정기 오프라인 모임에서 전국 학원장님들과 네트워킹하세요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                                    03
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                                        500개 학원이 검증한 성과
                                    </h3>
                                    <p class="text-gray-600 leading-relaxed">
                                        500개 이상 학원의 실제 성공 사례와 95% 만족도가 증명하는 확실한 효과를 경험하세요.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Testimonial -->
                <div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-12 lg:p-16 max-w-5xl mx-auto animate-fade-in shadow-2xl">
                    <div class="flex items-start gap-6 mb-8">
                        <svg class="w-12 h-12 text-white/80 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                    </div>
                    <p class="text-2xl lg:text-3xl text-white leading-relaxed mb-10 font-medium">
                        플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 <span class="text-orange-300 font-bold">2배 이상</span> 늘었습니다. 실전 노하우가 정말 대단합니다!
                    </p>
                    <div class="flex items-center gap-5">
                        <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                            김
                        </div>
                        <div>
                            <div class="font-bold text-white text-xl">김OO 원장님</div>
                            <div class="text-white/80">서울 강남구 영어학원</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-32 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center animate-fade-in">
                <h2 class="text-4xl lg:text-6xl font-bold text-white mb-8 text-balance">
                    학원 성장의 시작,<br>
                    지금 바로 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-12 leading-relaxed">
                    무료 상담으로 우리 학원에 딱 맞는 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        무료 상담 신청하기
                    </a>
                    <a href="/programs" class="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-white hover:text-purple-600 transition-all">
                        교육 프로그램 보기
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-50 text-gray-600 py-20 px-6 border-t border-gray-100">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div class="flex items-center space-x-2 mb-4">
                            <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-8" onerror="this.style.display='none'">
                            <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                        </div>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            학원 마케팅의 새로운 기준
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">서비스</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/programs" class="hover:text-purple-600 transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-purple-600 transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-purple-600 transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">회사</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/about" class="hover:text-purple-600 transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">연락처</h4>
                        <ul class="space-y-3 text-sm">
                            <li>인천광역시 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용 가능</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
                    <p>&copy; 2024 우리는 슈퍼플레이스다. All rights reserved.</p>
                </div>
            </div>
        </footer>

        <script>
            // Mobile menu toggle
            document.getElementById('mobile-menu-btn').addEventListener('click', function() {
                const menu = document.getElementById('mobile-menu');
                menu.classList.toggle('hidden');
            });

            // Smooth scroll animations
            const observeElements = () => {
                const elements = document.querySelectorAll('.animate-fade-in');
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: '0px 0px -60px 0px'
                });
                
                elements.forEach(element => observer.observe(element));
            };

            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
                observeElements();
                
                // Add visible class to hero immediately
                document.querySelector('section .animate-fade-in')?.classList.add('visible');
            });
        </script>
    </body>
    </html>
  `)
})

// 문의하기 페이지
app.get('/contact', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>문의하기 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-10" onerror="this.style.display='none'">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium hover:shadow-lg transition-all">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Contact Form Section -->
        <section class="pt-32 pb-24 px-6">
            <div class="max-w-3xl mx-auto">
                <div class="text-center mb-12">
                    <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">무료 상담 신청</h1>
                    <p class="text-xl text-gray-600">학원에 맞는 맞춤 마케팅 전략을 상담해드립니다</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8 lg:p-12">
                    <form id="contactForm" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이름 <span class="text-red-500">*</span></label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일 <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처 <span class="text-red-500">*</span></label>
                            <input type="tel" name="phone" required placeholder="010-0000-0000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명</label>
                            <input type="text" name="academy_name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">문의 내용 <span class="text-red-500">*</span></label>
                            <textarea name="message" required rows="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"></textarea>
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all">
                            문의 접수하기
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>
                </div>

                <div class="mt-12 grid md:grid-cols-3 gap-6">
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">이메일</div>
                        <div class="text-sm text-gray-600 mt-1">contact@superplace.kr</div>
                    </div>
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">위치</div>
                        <div class="text-sm text-gray-600 mt-1">인천광역시 서구</div>
                    </div>
                    <div class="text-center p-6 bg-gray-50 rounded-xl">
                        <svg class="w-10 h-10 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="font-medium text-gray-900">상담 시간</div>
                        <div class="text-sm text-gray-600 mt-1">평일 10:00 - 18:00</div>
                    </div>
                </div>
            </div>
        </section>

        <script>
            document.getElementById('contactForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    academy_name: formData.get('academy_name'),
                    message: formData.get('message')
                }

                try {
                    const response = await fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        e.target.reset()
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '문의 접수 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 로그인 페이지
app.get('/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>로그인 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-6 py-12">
            <div class="max-w-md w-full">
                <div class="text-center mb-10">
                    <a href="/" class="inline-block mb-6">
                        <span class="text-2xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">로그인</h1>
                    <p class="text-gray-600">학원 마케팅 교육에 오신 것을 환영합니다</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8">
                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일</label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">비밀번호</label>
                            <input type="password" name="password" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all">
                            로그인
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        계정이 없으신가요? <a href="/signup" class="text-purple-600 hover:text-purple-700 font-medium">회원가입</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    email: formData.get('email'),
                    password: formData.get('password')
                }

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        localStorage.setItem('user', JSON.stringify(result.user))
                        setTimeout(() => {
                            window.location.href = '/dashboard'
                        }, 1000)
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '로그인 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 회원가입 페이지
app.get('/signup', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회원가입 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-6 py-12">
            <div class="max-w-md w-full">
                <div class="text-center mb-10">
                    <a href="/" class="inline-block mb-6">
                        <span class="text-2xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
                    <p class="text-gray-600">학원 마케팅 교육을 시작해보세요</p>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 p-8">
                    <form id="signupForm" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이름 <span class="text-red-500">*</span></label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">이메일 <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">비밀번호 <span class="text-red-500">*</span></label>
                            <input type="password" name="password" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                            <p class="text-xs text-gray-500 mt-1">최소 6자 이상</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">연락처</label>
                            <input type="tel" name="phone" placeholder="010-0000-0000" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-900 mb-2">학원명</label>
                            <input type="text" name="academy_name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition">
                        </div>

                        <button type="submit" class="w-full gradient-purple text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all">
                            회원가입
                        </button>

                        <div id="message" class="hidden mt-4 p-4 rounded-xl"></div>
                    </form>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        이미 계정이 있으신가요? <a href="/login" class="text-purple-600 hover:text-purple-700 font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('signupForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const formData = new FormData(e.target)
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    phone: formData.get('phone'),
                    academy_name: formData.get('academy_name')
                }

                try {
                    const response = await fetch('/api/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })

                    const result = await response.json()
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')

                    if (result.success) {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200'
                        messageEl.textContent = result.message
                        setTimeout(() => {
                            window.location.href = '/login'
                        }, 1500)
                    } else {
                        messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                        messageEl.textContent = result.error
                    }
                } catch (error) {
                    const messageEl = document.getElementById('message')
                    messageEl.classList.remove('hidden')
                    messageEl.className = 'mt-4 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200'
                    messageEl.textContent = '회원가입 중 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 교육 프로그램 페이지
app.get('/programs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>교육 프로그램 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .gradient-orange {
            background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-purple-600 font-medium">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <section class="pt-32 pb-20 px-6">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">교육 프로그램</h1>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    실전 경험을 바탕으로 한 체계적인 학원 마케팅 교육
                </p>
            </div>
        </section>

        <!-- Programs -->
        <section class="pb-24 px-6">
            <div class="max-w-7xl mx-auto space-y-20">
                <!-- Program 1 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">프로그램 01</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">네이버 플레이스 상위노출</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            지역 검색 1위를 차지하는 실전 노하우. 학원 위치 기반 최적화 전략으로 신규 학생 유입을 극대화합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">키워드 분석 및 최적화</div>
                                    <div class="text-gray-600 text-sm">학원에 맞는 최적의 키워드 발굴</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">리뷰 관리 전략</div>
                                    <div class="text-gray-600 text-sm">긍정적인 리뷰 확보 및 관리</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">지역 SEO 완벽 가이드</div>
                                    <div class="text-gray-600 text-sm">지역 기반 검색 최적화</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-purple text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-12 border border-purple-100">
                        <div class="text-6xl mb-6">📍</div>
                        <div class="space-y-3 text-gray-700">
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>교육 기간</span>
                                <span class="font-semibold">4주</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>수강 방식</span>
                                <span class="font-semibold">온라인 + 오프라인</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>난이도</span>
                                <span class="font-semibold">초급-중급</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Program 2 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div class="order-2 lg:order-1">
                        <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-12 border border-orange-100">
                            <div class="text-6xl mb-6">📝</div>
                            <div class="space-y-3 text-gray-700">
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>교육 기간</span>
                                    <span class="font-semibold">4주</span>
                                </div>
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>수강 방식</span>
                                    <span class="font-semibold">온라인</span>
                                </div>
                                <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                    <span>난이도</span>
                                    <span class="font-semibold">초급-중급</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="order-1 lg:order-2">
                        <div class="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">프로그램 02</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">블로그 상위노출</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            네이버 블로그 검색 상위권 진입 전략. SEO 최적화부터 콘텐츠 기획까지 체계적으로 학습합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">검색 알고리즘 이해</div>
                                    <div class="text-gray-600 text-sm">네이버 검색 원리 완벽 마스터</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">콘텐츠 작성 기법</div>
                                    <div class="text-gray-600 text-sm">효과적인 블로그 글쓰기</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">효과적인 포스팅 전략</div>
                                    <div class="text-gray-600 text-sm">주기적인 콘텐츠 발행 전략</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-orange text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                </div>

                <!-- Program 3 -->
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">프로그램 03</div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">퍼널 마케팅</h2>
                        <p class="text-xl text-gray-600 mb-8">
                            상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">고객 여정 설계</div>
                                    <div class="text-gray-600 text-sm">상담-등록까지 프로세스 최적화</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">자동화 도구 활용</div>
                                    <div class="text-gray-600 text-sm">효율적인 마케팅 자동화</div>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <svg class="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <div>
                                    <div class="font-semibold text-gray-900">전환율 최적화</div>
                                    <div class="text-gray-600 text-sm">상담-등록 전환율 극대화</div>
                                </div>
                            </div>
                        </div>
                        <a href="/contact" class="inline-block gradient-purple text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl transition">
                            문의하기
                        </a>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-12 border border-purple-100">
                        <div class="text-6xl mb-6">⚡</div>
                        <div class="space-y-3 text-gray-700">
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>교육 기간</span>
                                <span class="font-semibold">6주</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>수강 방식</span>
                                <span class="font-semibold">온라인 + 1:1 컨설팅</span>
                            </div>
                            <div class="flex justify-between items-center p-4 bg-white rounded-xl">
                                <span>난이도</span>
                                <span class="font-semibold">중급-고급</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-24 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-6">
                    무료 상담으로 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-10">
                    우리 학원에 맞는 교육 프로그램을 추천해드립니다
                </p>
                <a href="/contact" class="inline-block bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:-translate-y-1 transition">
                    무료 상담 신청
                </a>
            </div>
        </section>
    </body>
    </html>
  `)
})

// 성공 사례 페이지
app.get('/success', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>성공 사례 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-purple-600 font-medium">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <section class="pt-32 pb-20 px-6">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">성공 사례</h1>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    500개 이상의 학원이 우리와 함께 성장했습니다
                </p>
            </div>
        </section>

        <!-- Success Stories -->
        <section class="pb-24 px-6">
            <div class="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Story 1 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">2배</div>
                            <div class="text-sm text-gray-600">신규 문의 증가</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 2배 이상 늘었습니다. 실전 노하우가 정말 대단합니다!
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">김</div>
                        <div>
                            <div class="font-bold text-gray-900">김OO 원장님</div>
                            <div class="text-sm text-gray-600">서울 강남구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 2 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">1위</div>
                            <div class="text-sm text-gray-600">네이버 플레이스</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        키워드 분석과 리뷰 관리 전략을 배운 후 우리 학원이 지역 검색 1위에 올랐어요. 등록 문의가 끊이지 않습니다.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">박</div>
                        <div>
                            <div class="font-bold text-gray-900">박OO 원장님</div>
                            <div class="text-sm text-gray-600">부산 해운대구 수학학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 3 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">3배</div>
                            <div class="text-sm text-gray-600">블로그 유입</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        블로그 마케팅 강의를 듣고 콘텐츠 전략을 바꿨더니 블로그 유입이 3배로 늘었습니다. 학부모님들의 신뢰도 높아졌어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">이</div>
                        <div>
                            <div class="font-bold text-gray-900">이OO 원장님</div>
                            <div class="text-sm text-gray-600">대전 유성구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 4 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">40%</div>
                            <div class="text-sm text-gray-600">전환율 상승</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        퍼널 마케팅 시스템을 구축한 후 상담-등록 전환율이 40% 상승했습니다. 자동화로 업무 효율도 크게 개선됐어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">최</div>
                        <div>
                            <div class="font-bold text-gray-900">최OO 원장님</div>
                            <div class="text-sm text-gray-600">인천 서구 종합학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 5 -->
                <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-purple-600 mb-2">50명</div>
                            <div class="text-sm text-gray-600">신규 등록</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        교육 이수 후 6개월 만에 신규 등록 학생이 50명 늘었습니다. 학원 운영이 안정화되고 매출도 크게 증가했어요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-purple-100">
                        <div class="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center text-white font-bold">정</div>
                        <div>
                            <div class="font-bold text-gray-900">정OO 원장님</div>
                            <div class="text-sm text-gray-600">광주 북구 영어학원</div>
                        </div>
                    </div>
                </div>

                <!-- Story 6 -->
                <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
                    <div class="flex items-start gap-4 mb-6">
                        <svg class="w-10 h-10 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                        <div>
                            <div class="text-3xl font-bold text-orange-500 mb-2">95%</div>
                            <div class="text-sm text-gray-600">재등록률</div>
                        </div>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">
                        마케팅 자동화와 학부모 소통 전략을 배운 후 재등록률이 95%로 올랐습니다. 학생 관리도 훨씬 체계적이에요.
                    </p>
                    <div class="flex items-center gap-3 pt-4 border-t border-orange-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">강</div>
                        <div>
                            <div class="font-bold text-gray-900">강OO 원장님</div>
                            <div class="text-sm text-gray-600">수원 영통구 수학학원</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Stats -->
        <section class="py-24 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">숫자로 보는 성과</h2>
                    <p class="text-xl text-gray-600">데이터가 증명하는 확실한 효과</p>
                </div>
                <div class="grid md:grid-cols-4 gap-8">
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">500+</div>
                        <div class="text-gray-600">교육 수료 학원</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">95%</div>
                        <div class="text-gray-600">만족도</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">2.5배</div>
                        <div class="text-gray-600">평균 문의 증가</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-2">85%</div>
                        <div class="text-gray-600">재수강률</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-24 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-6">
                    다음 성공 사례의 주인공은 원장님입니다
                </h2>
                <p class="text-xl text-white/90 mb-10">
                    지금 바로 시작하세요
                </p>
                <a href="/contact" class="inline-block bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:-translate-y-1 transition">
                    무료 상담 신청
                </a>
            </div>
        </section>
    </body>
    </html>
  `)
})

// 대시보드 페이지
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>대시보드 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">학원장 대시보드</span>
                    </div>
                    <div class="flex items-center space-x-6">
                        <span id="userName" class="text-gray-700"></span>
                        <button onclick="logout()" class="text-gray-600 hover:text-purple-600 transition">로그아웃</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="pt-32 pb-24 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-2">안녕하세요, <span id="userNameDisplay"></span>님!</h1>
                    <p class="text-xl text-gray-600">학원 마케팅 현황을 확인하세요</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid md:grid-cols-4 gap-6 mb-12">
                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">수강 중인 프로그램</div>
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">3개</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">완료한 과제</div>
                            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">12/15</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">학습 진행률</div>
                            <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">80%</div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-600">1:1 컨설팅</div>
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                        </div>
                        <div class="text-3xl font-bold text-gray-900">2회</div>
                    </div>
                </div>

                <!-- Marketing Tools -->
                <div class="mb-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 마케팅 도구</h2>
                    <div class="grid md:grid-cols-2 gap-6">
                        <a href="/tools/parent-message" class="block bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">학부모 소통 시스템</h3>
                                    <p class="text-purple-100 text-sm">AI 메시지 자동 생성</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                간단한 메모만 작성하면 AI가 따뜻한 메시지로 변환해드립니다. 학부모님과의 소통이 더욱 편리해집니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>

                        <a href="/tools/blog-writer" class="block bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">블로그 작성 도구</h3>
                                    <p class="text-orange-100 text-sm">SEO 최적화 글 생성</p>
                                </div>
                            </div>
                            <p class="text-white/90 leading-relaxed mb-4">
                                주제만 입력하면 네이버 SEO에 최적화된 블로그 글을 자동으로 생성합니다. 상위노출을 위한 필수 도구입니다.
                            </p>
                            <div class="flex items-center text-white font-medium">
                                <span>바로 사용하기</span>
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Content Grid -->
                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- My Programs -->
                    <div class="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">수강 중인 프로그램</h2>
                        <div class="space-y-4">
                            <div class="p-5 bg-purple-50 rounded-xl border border-purple-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">네이버 플레이스 상위노출</div>
                                        <div class="text-sm text-gray-600">진행률 90%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-purple-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: 90%"></div>
                                </div>
                            </div>

                            <div class="p-5 bg-orange-50 rounded-xl border border-orange-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">블로그 상위노출</div>
                                        <div class="text-sm text-gray-600">진행률 75%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-orange-500 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-orange-200 rounded-full h-2">
                                    <div class="bg-orange-500 h-2 rounded-full" style="width: 75%"></div>
                                </div>
                            </div>

                            <div class="p-5 bg-purple-50 rounded-xl border border-purple-100">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="font-bold text-gray-900 mb-1">퍼널 마케팅</div>
                                        <div class="text-sm text-gray-600">진행률 60%</div>
                                    </div>
                                    <span class="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">진행중</span>
                                </div>
                                <div class="w-full bg-purple-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: 60%"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div class="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">바로가기</h2>
                        <div class="space-y-3">
                            <a href="/programs" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">교육 프로그램</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/success" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">성공 사례</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/contact" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">1:1 상담 신청</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>

                            <a href="/" class="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div class="flex items-center">
                                    <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                    <span class="font-medium text-gray-900">메인 페이지</span>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Check authentication
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            if (!user) {
                window.location.href = '/login'
            } else {
                document.getElementById('userName').textContent = user.name
                document.getElementById('userNameDisplay').textContent = user.name
            }

            function logout() {
                localStorage.removeItem('user')
                window.location.href = '/'
            }
        </script>
    </body>
    </html>
  `)
})

// 학부모 소통 시스템 페이지
app.get('/tools/parent-message', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학부모 소통 시스템 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                    </a>
                    <div class="flex items-center space-x-6">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/parent-message" class="text-purple-600 font-medium">학부모 소통</a>
                        <a href="/tools/blog-writer" class="text-gray-600 hover:text-purple-600">블로그 작성</a>
                        <a href="/logout" class="text-gray-600 hover:text-purple-600">로그아웃</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="pt-24 pb-12 px-6">
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">📱 학부모 소통 시스템</h1>
                    <p class="text-xl text-gray-600">간단한 메모만 작성하면 AI가 따뜻한 메시지로 변환해드립니다</p>
                </div>

                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- 입력 폼 -->
                    <div class="bg-white rounded-2xl shadow-lg p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">학생 정보 입력</h2>
                        
                        <form id="messageForm" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학생 이름 *</label>
                                <input type="text" id="studentName" required 
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                       placeholder="예: 김민수">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">학년 *</label>
                                <select id="grade" required
                                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                    <option value="">학년 선택</option>
                                    <option value="초등 1학년">초등 1학년</option>
                                    <option value="초등 2학년">초등 2학년</option>
                                    <option value="초등 3학년">초등 3학년</option>
                                    <option value="초등 4학년">초등 4학년</option>
                                    <option value="초등 5학년">초등 5학년</option>
                                    <option value="초등 6학년">초등 6학년</option>
                                    <option value="중등 1학년">중등 1학년</option>
                                    <option value="중등 2학년">중등 2학년</option>
                                    <option value="중등 3학년">중등 3학년</option>
                                    <option value="고등 1학년">고등 1학년</option>
                                    <option value="고등 2학년">고등 2학년</option>
                                    <option value="고등 3학년">고등 3학년</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">과목 *</label>
                                <select id="subject" required
                                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                    <option value="">과목 선택</option>
                                    <option value="영어">영어</option>
                                    <option value="수학">수학</option>
                                    <option value="국어">국어</option>
                                    <option value="과학">과학</option>
                                    <option value="사회">사회</option>
                                    <option value="논술">논술</option>
                                    <option value="코딩">코딩</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">간단한 메모 (2줄 정도) *</label>
                                <textarea id="shortMessage" required rows="4"
                                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                                          placeholder="예: 오늘 수업에서 적극적으로 발표했음. 영어 단어 암기력이 좋아지고 있음."></textarea>
                                <p class="text-sm text-gray-500 mt-2">💡 간단하게 작성하시면 AI가 학부모님께 전달할 따뜻한 메시지로 변환합니다</p>
                            </div>

                            <button type="submit" 
                                    class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    id="generateBtn">
                                <span id="btnText">✨ AI 메시지 생성하기</span>
                                <span id="btnLoading" class="hidden items-center justify-center">
                                    <span class="loading mr-2"></span>
                                    생성 중...
                                </span>
                            </button>
                        </form>
                    </div>

                    <!-- 생성된 메시지 -->
                    <div class="bg-white rounded-2xl shadow-lg p-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">생성된 메시지</h2>
                        
                        <div id="resultArea" class="hidden">
                            <div class="bg-purple-50 border-l-4 border-purple-600 rounded-lg p-6 mb-6">
                                <div class="flex items-start gap-3 mb-4">
                                    <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                    </div>
                                    <div class="flex-1">
                                        <div class="font-bold text-gray-900 mb-1" id="studentInfo"></div>
                                        <div class="text-sm text-gray-600" id="subjectInfo"></div>
                                    </div>
                                </div>
                                
                                <div id="generatedMessage" class="text-gray-800 leading-relaxed whitespace-pre-wrap"></div>
                            </div>

                            <div class="flex gap-3">
                                <button onclick="copyMessage()" 
                                        class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition">
                                    📋 복사하기
                                </button>
                                <button onclick="resetForm()" 
                                        class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
                                    🔄 새로 작성
                                </button>
                            </div>
                        </div>

                        <div id="emptyState" class="text-center py-16">
                            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                </svg>
                            </div>
                            <p class="text-gray-500">왼쪽 폼을 작성하고<br>메시지를 생성해보세요</p>
                        </div>
                    </div>
                </div>

                <!-- 사용 가이드 -->
                <div class="mt-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">💡 사용 가이드</h3>
                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">1️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">학생 정보 입력</h4>
                            <p class="text-sm text-gray-600">이름, 학년, 과목을 선택하고 간단한 메모를 2줄 정도 작성하세요</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">2️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">AI가 자동 변환</h4>
                            <p class="text-sm text-gray-600">AI가 학부모님께 전달할 따뜻하고 격려하는 메시지로 변환합니다</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">3️⃣</div>
                            <h4 class="font-bold text-gray-900 mb-2">복사해서 전송</h4>
                            <p class="text-sm text-gray-600">생성된 메시지를 복사해서 카톡이나 문자로 학부모님께 전송하세요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let generatedMessageText = '';

            document.getElementById('messageForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const studentName = document.getElementById('studentName').value;
                const grade = document.getElementById('grade').value;
                const subject = document.getElementById('subject').value;
                const shortMessage = document.getElementById('shortMessage').value;

                // 버튼 로딩 상태
                const btn = document.getElementById('generateBtn');
                const btnText = document.getElementById('btnText');
                const btnLoading = document.getElementById('btnLoading');
                
                btn.disabled = true;
                btnText.classList.add('hidden');
                btnLoading.classList.remove('hidden');
                btnLoading.classList.add('flex');

                try {
                    const response = await fetch('/api/generate-parent-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            studentName,
                            grade,
                            subject,
                            shortMessage
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        generatedMessageText = data.message;
                        
                        // 결과 표시
                        document.getElementById('studentInfo').textContent = studentName + ' 학생';
                        document.getElementById('subjectInfo').textContent = grade + ' · ' + subject;
                        document.getElementById('generatedMessage').textContent = data.message;
                        
                        document.getElementById('emptyState').classList.add('hidden');
                        document.getElementById('resultArea').classList.remove('hidden');
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('메시지 생성 중 오류가 발생했습니다.');
                } finally {
                    btn.disabled = false;
                    btnText.classList.remove('hidden');
                    btnLoading.classList.add('hidden');
                }
            });

            function copyMessage() {
                navigator.clipboard.writeText(generatedMessageText).then(() => {
                    alert('✅ 메시지가 복사되었습니다!\\n\\n카톡이나 문자로 학부모님께 전송하세요.');
                });
            }

            function resetForm() {
                document.getElementById('messageForm').reset();
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('resultArea').classList.add('hidden');
                generatedMessageText = '';
            }
        </script>
    </body>
    </html>
  `)
})

// 블로그 작성 도구 페이지
app.get('/tools/blog-writer', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>블로그 작성 도구 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                    </a>
                    <div class="flex items-center space-x-6">
                        <a href="/dashboard" class="text-gray-600 hover:text-purple-600">대시보드</a>
                        <a href="/tools/parent-message" class="text-gray-600 hover:text-purple-600">학부모 소통</a>
                        <a href="/tools/blog-writer" class="text-purple-600 font-medium">블로그 작성</a>
                        <a href="/logout" class="text-gray-600 hover:text-purple-600">로그아웃</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="pt-24 pb-12 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">✍️ AI 블로그 작성 도구</h1>
                    <p class="text-xl text-gray-600">주제만 입력하면 SEO 최적화된 블로그 글을 자동으로 생성합니다</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-8">
                    <!-- 입력 폼 -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
                            <h2 class="text-2xl font-bold text-gray-900 mb-6">글 정보 입력</h2>
                            
                            <form id="blogForm" class="space-y-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">주제 *</label>
                                    <input type="text" id="topic" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                           placeholder="예: 초등 영어 학습법">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">키워드 (선택)</label>
                                    <input type="text" id="keywords"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                           placeholder="예: 영어학원, 초등영어">
                                    <p class="text-xs text-gray-500 mt-1">쉼표로 구분</p>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-900 mb-2">톤 앤 매너</label>
                                    <select id="tone"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                        <option value="친근하고 전문적인">친근하고 전문적인</option>
                                        <option value="따뜻하고 공감하는">따뜻하고 공감하는</option>
                                        <option value="전문적이고 신뢰감 있는">전문적이고 신뢰감 있는</option>
                                        <option value="유머러스하고 재미있는">유머러스하고 재미있는</option>
                                    </select>
                                </div>

                                <button type="submit" 
                                        class="w-full gradient-purple text-white py-4 rounded-xl text-lg font-medium hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        id="generateBtn">
                                    <span id="btnText">✨ 블로그 글 생성하기</span>
                                    <span id="btnLoading" class="hidden items-center justify-center">
                                        <span class="loading mr-2"></span>
                                        생성 중... (30초 소요)
                                    </span>
                                </button>

                                <div class="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                                    💡 AI가 제목, 서론, 본론, 결론을 포함한 완성된 블로그 글을 작성합니다
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- 생성된 블로그 글 -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-2xl shadow-lg p-8 min-h-[600px]">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-bold text-gray-900">생성된 블로그 글</h2>
                                <div id="wordCount" class="hidden text-sm text-gray-500"></div>
                            </div>
                            
                            <div id="resultArea" class="hidden">
                                <div id="generatedBlog" class="prose max-w-none">
                                    <!-- 생성된 블로그 내용 -->
                                </div>

                                <div class="mt-8 flex gap-3">
                                    <button onclick="copyBlog()" 
                                            class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition">
                                        📋 전체 복사하기
                                    </button>
                                    <button onclick="resetForm()" 
                                            class="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
                                        🔄 새로 작성
                                    </button>
                                </div>
                            </div>

                            <div id="emptyState" class="text-center py-24">
                                <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </div>
                                <p class="text-gray-500 text-lg">주제를 입력하고<br>블로그 글을 생성해보세요</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 블로그 작성 팁 -->
                <div class="mt-12 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">📝 블로그 SEO 팁</h3>
                    <div class="grid md:grid-cols-4 gap-6">
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">🎯</div>
                            <h4 class="font-bold text-gray-900 mb-2">키워드 선택</h4>
                            <p class="text-sm text-gray-600">검색량이 많은 키워드를 자연스럽게 3-5회 반복</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">📏</div>
                            <h4 class="font-bold text-gray-900 mb-2">적절한 길이</h4>
                            <p class="text-sm text-gray-600">1500-2000자가 SEO에 가장 효과적</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">🖼️</div>
                            <h4 class="font-bold text-gray-900 mb-2">이미지 추가</h4>
                            <p class="text-sm text-gray-600">2-3장의 관련 이미지로 가독성 향상</p>
                        </div>
                        <div class="bg-white rounded-xl p-6">
                            <div class="text-3xl mb-3">⏰</div>
                            <h4 class="font-bold text-gray-900 mb-2">꾸준한 포스팅</h4>
                            <p class="text-sm text-gray-600">주 2-3회 규칙적인 업로드가 중요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let generatedBlogText = '';

            document.getElementById('blogForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const topic = document.getElementById('topic').value;
                const keywords = document.getElementById('keywords').value;
                const tone = document.getElementById('tone').value;

                // 버튼 로딩 상태
                const btn = document.getElementById('generateBtn');
                const btnText = document.getElementById('btnText');
                const btnLoading = document.getElementById('btnLoading');
                
                btn.disabled = true;
                btnText.classList.add('hidden');
                btnLoading.classList.remove('hidden');
                btnLoading.classList.add('flex');

                try {
                    const response = await fetch('/api/generate-blog-post', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            topic,
                            keywords,
                            tone
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        generatedBlogText = data.content;
                        
                        // 결과 표시 (줄바꿈을 <br>로 변환)
                        const formattedContent = data.content
                            .replace(/\\n\\n/g, '</p><p class="mb-4">')
                            .replace(/\\n/g, '<br>');
                        
                        document.getElementById('generatedBlog').innerHTML = 
                            '<div class="text-gray-800 leading-relaxed"><p class="mb-4">' + 
                            formattedContent + 
                            '</p></div>';
                        
                        document.getElementById('wordCount').textContent = 
                            '총 ' + data.metadata.wordCount + '자';
                        document.getElementById('wordCount').classList.remove('hidden');
                        
                        document.getElementById('emptyState').classList.add('hidden');
                        document.getElementById('resultArea').classList.remove('hidden');

                        // 상단으로 스크롤
                        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        alert('오류: ' + data.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('블로그 글 생성 중 오류가 발생했습니다.');
                } finally {
                    btn.disabled = false;
                    btnText.classList.remove('hidden');
                    btnLoading.classList.add('hidden');
                }
            });

            function copyBlog() {
                navigator.clipboard.writeText(generatedBlogText).then(() => {
                    alert('✅ 블로그 글이 복사되었습니다!\\n\\n네이버 블로그에 붙여넣기 하세요.');
                });
            }

            function resetForm() {
                document.getElementById('blogForm').reset();
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('resultArea').classList.add('hidden');
                document.getElementById('wordCount').classList.add('hidden');
                generatedBlogText = '';
            }
        </script>
    </body>
    </html>
  `)
})

// 회사 소개 페이지
app.get('/about', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회사 소개 - 우리는 슈퍼플레이스다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          .gradient-purple {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <a href="/" class="flex items-center space-x-3">
                        <span class="text-xl font-bold text-gray-900">우리는 슈퍼플레이스다</span>
                    </a>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium">성공 사례</a>
                        <a href="/about" class="text-purple-600 font-medium">회사 소개</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium">문의하기</a>
                        <a href="/login" class="gradient-purple text-white px-6 py-2.5 rounded-full font-medium">로그인</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="pt-32 pb-20 px-6 bg-gradient-to-br from-purple-50 to-white">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                    우리는<br>
                    <span class="text-purple-600">슈퍼플레이스다</span>
                </h1>
                <p class="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    현업 학원장이 직접 운영하며<br>
                    전국 500개 학원의 성공을 함께한<br>
                    <span class="font-bold text-gray-900">학원 마케팅 전문 교육 기업</span>입니다
                </p>
            </div>
        </section>

        <!-- Story Section -->
        <section class="py-20 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 class="text-4xl font-bold text-gray-900 mb-6">우리의 시작</h2>
                        <div class="space-y-4 text-lg text-gray-600 leading-relaxed">
                            <p>
                                인천 서구에서 <strong class="text-gray-900">꾸메땅학원</strong>을 운영하던 우리 부부는 
                                처음에는 학생 모집에 큰 어려움을 겪었습니다.
                            </p>
                            <p>
                                하지만 네이버 플레이스 최적화, 블로그 마케팅, 퍼널 시스템을 
                                직접 공부하고 적용하면서 <strong class="text-purple-600">놀라운 변화</strong>를 경험했습니다.
                            </p>
                            <p>
                                3개월 만에 신규 문의가 2배 증가했고,<br>
                                1년 만에 학원 규모가 3배로 성장했습니다.
                            </p>
                            <p class="text-gray-900 font-bold">
                                "이 노하우를 다른 학원장님들과 나누고 싶다"<br>
                                그렇게 '우리는 슈퍼플레이스다'가 시작되었습니다.
                            </p>
                        </div>
                    </div>
                    <div class="bg-purple-50 rounded-3xl p-12">
                        <div class="space-y-8">
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2020년 초</h3>
                                    <p class="text-gray-600">꾸메땅학원 개원, 학생 모집 어려움</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2020년 중반</h3>
                                    <p class="text-gray-600">플레이스 마케팅 독학, 1위 달성</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2021년</h3>
                                    <p class="text-gray-600">오픈채팅방 시작, 노하우 공유</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                                <div>
                                    <h3 class="font-bold text-gray-900 mb-2">2022년~현재</h3>
                                    <p class="text-gray-600">전국 500개 학원 교육 진행</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Values Section -->
        <section class="py-20 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">우리의 가치</h2>
                    <p class="text-xl text-gray-600">슈퍼플레이스를 만드는 3가지 원칙</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">실전 경험</h3>
                        <p class="text-gray-600 leading-relaxed">
                            이론이 아닌 우리가 직접 학원을 운영하며 검증한 
                            실전 마케팅 노하우만 전달합니다
                        </p>
                    </div>

                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">커뮤니티</h3>
                        <p class="text-gray-600 leading-relaxed">
                            오픈채팅방과 오프라인 모임을 통해 
                            전국 학원장님들과 함께 성장합니다
                        </p>
                    </div>

                    <div class="bg-white rounded-3xl p-10 text-center">
                        <div class="w-20 h-20 gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">지속 성장</h3>
                        <p class="text-gray-600 leading-relaxed">
                            일회성 교육이 아닌 지속적인 콘텐츠 업데이트와 
                            실시간 Q&A로 계속 함께합니다
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Achievements Section -->
        <section class="py-20 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">우리의 성과</h2>
                    <p class="text-xl text-gray-600">숫자로 증명하는 실전 노하우</p>
                </div>

                <div class="grid md:grid-cols-4 gap-8">
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-3">500+</div>
                        <div class="text-lg text-gray-700 font-medium">교육 수료 학원</div>
                        <div class="text-sm text-gray-500 mt-2">전국 각지의 학원</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-orange-500 mb-3">95%</div>
                        <div class="text-lg text-gray-700 font-medium">만족도</div>
                        <div class="text-sm text-gray-500 mt-2">실제 효과 체감</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-purple-600 mb-3">24/7</div>
                        <div class="text-lg text-gray-700 font-medium">커뮤니티 운영</div>
                        <div class="text-sm text-gray-500 mt-2">실시간 질의응답</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-orange-500 mb-3">4년+</div>
                        <div class="text-lg text-gray-700 font-medium">운영 경험</div>
                        <div class="text-sm text-gray-500 mt-2">축적된 노하우</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Team Section -->
        <section class="py-20 px-6 bg-gradient-to-br from-purple-50 to-blue-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">대표 소개</h2>
                    <p class="text-xl text-gray-600">현업 학원장이 직접 가르칩니다</p>
                </div>

                <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    <div class="bg-white rounded-3xl p-10">
                        <div class="w-32 h-32 gradient-purple rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span class="text-5xl text-white font-bold">김</span>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">김 원장님</h3>
                        <p class="text-center text-purple-600 font-medium mb-6">영어 교육 전문</p>
                        <div class="space-y-3 text-gray-600">
                            <p>✓ 꾸메땅학원 영어 담당</p>
                            <p>✓ 네이버 플레이스 1위 달성</p>
                            <p>✓ 블로그 마케팅 전문가</p>
                            <p>✓ 학원장 커뮤니티 운영</p>
                        </div>
                    </div>

                    <div class="bg-white rounded-3xl p-10">
                        <div class="w-32 h-32 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span class="text-5xl text-white font-bold">이</span>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 text-center mb-3">이 원장님</h3>
                        <p class="text-center text-orange-600 font-medium mb-6">수학 교육 전문</p>
                        <div class="space-y-3 text-gray-600">
                            <p>✓ 꾸메땅학원 수학 담당</p>
                            <p>✓ 퍼널 마케팅 전문가</p>
                            <p>✓ 학생 관리 시스템 구축</p>
                            <p>✓ 오프라인 교육 진행</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-6 gradient-purple">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl lg:text-5xl font-bold text-white mb-8">
                    함께 성장하는 학원을<br>
                    만들어가실 준비가 되셨나요?
                </h2>
                <p class="text-xl text-white/90 mb-12">
                    우리의 경험과 노하우가 여러분의 학원 성공에 도움이 되길 바랍니다
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-12 py-5 rounded-full text-lg font-medium shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        무료 상담 신청하기
                    </a>
                    <a href="/programs" class="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-white hover:text-purple-600 transition-all">
                        교육 프로그램 보기
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-50 text-gray-600 py-20 px-6 border-t border-gray-100">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div class="flex items-center space-x-2 mb-4">
                            <span class="text-xl font-bold text-gray-900">슈퍼플레이스</span>
                        </div>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            학원 마케팅의 새로운 기준
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">서비스</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/programs" class="hover:text-purple-600 transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-purple-600 transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-purple-600 transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">회사</h4>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/about" class="hover:text-purple-600 transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-purple-600 transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 mb-4">연락처</h4>
                        <ul class="space-y-3 text-sm">
                            <li>인천광역시 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용 가능</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
                    <p>&copy; 2024 우리는 슈퍼플레이스다. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </body>
    </html>
  `)
})

export default app
