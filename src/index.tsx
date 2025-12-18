import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>우리는 슈퍼플레이스다 - 학원 마케팅 전문</title>
        <meta name="description" content="네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅으로 학원 성공을 돕는 마케팅 전문가">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
          
          * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          }
          
          :root {
            --navy: #1a2332;
            --gold: #c9a860;
            --dark-navy: #0f1419;
            --light-gold: #e5c88a;
            --gray-50: #f8fafc;
            --gray-100: #f1f5f9;
          }
          
          body {
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          }
          
          .card-modern {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            border-radius: 16px;
          }
          
          .card-modern:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          }
          
          .gradient-gold {
            background: linear-gradient(135deg, #c9a860 0%, #e5c88a 100%);
          }
          
          .gradient-navy {
            background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%);
          }
          
          .btn-modern {
            transition: all 0.3s ease;
            border-radius: 12px;
            font-weight: 600;
          }
          
          .btn-modern:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          }
          
          .glass-effect {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          .float-animation {
            animation: float 3s ease-in-out infinite;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="glass-effect fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center">
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-12 w-auto">
                    </div>
                    <div class="hidden md:flex items-center space-x-10">
                        <a href="/" class="text-gray-700 hover:text-[var(--navy)] font-medium transition-colors">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-[var(--navy)] font-medium transition-colors">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-[var(--navy)] font-medium transition-colors">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-[var(--navy)] font-medium transition-colors">문의하기</a>
                        <a href="/login" class="gradient-gold text-white px-6 py-2.5 rounded-xl font-semibold btn-modern">로그인</a>
                    </div>
                    <div class="md:hidden">
                        <button id="mobile-menu-btn" class="text-gray-700 p-2">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile menu -->
            <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100">
                <div class="px-4 py-4 space-y-2">
                    <a href="/" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition">홈</a>
                    <a href="/programs" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition">교육 프로그램</a>
                    <a href="/success" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition">성공 사례</a>
                    <a href="/contact" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition">문의하기</a>
                    <a href="/login" class="block px-4 py-3 gradient-gold text-white rounded-lg text-center font-semibold">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="gradient-navy pt-32 pb-24 px-4 relative overflow-hidden">
            <div class="absolute inset-0 opacity-10">
                <div class="absolute top-20 left-10 w-72 h-72 bg-[var(--gold)] rounded-full blur-3xl"></div>
                <div class="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
            </div>
            
            <div class="max-w-7xl mx-auto relative z-10">
                <div class="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div class="inline-block mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-[var(--gold)] text-sm font-semibold">
                            🚀 학원 마케팅 전문 교육
                        </div>
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            성과로<br>
                            <span class="text-transparent bg-clip-text gradient-gold">증명하는</span><br>
                            학원 마케팅
                        </h1>
                        <p class="text-lg text-gray-300 mb-8 leading-relaxed">
                            네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅까지.<br>
                            <span class="text-[var(--gold)] font-semibold">실전에서 검증된 전략</span>으로 학원의 변화를 만듭니다.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <a href="/contact" class="gradient-gold text-white px-8 py-4 rounded-xl font-bold text-center btn-modern inline-flex items-center justify-center space-x-2">
                                <span>무료 상담 신청</span>
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                </svg>
                            </a>
                            <a href="/programs" class="bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 px-8 py-4 rounded-xl font-bold text-center hover:bg-white hover:text-[var(--navy)] transition inline-flex items-center justify-center space-x-2">
                                <span>교육 프로그램</span>
                            </a>
                        </div>
                    </div>
                    <div class="hidden md:block">
                        <div class="glass-effect rounded-3xl p-10 float-animation">
                            <div class="grid grid-cols-2 gap-8">
                                <div class="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl">
                                    <div class="text-5xl font-black text-[var(--gold)] mb-2">500+</div>
                                    <div class="text-sm text-gray-300 font-medium">교육 수료 학원</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl">
                                    <div class="text-5xl font-black text-[var(--gold)] mb-2">95%</div>
                                    <div class="text-sm text-gray-300 font-medium">만족도</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl">
                                    <div class="text-5xl font-black text-[var(--gold)] mb-2">24/7</div>
                                    <div class="text-sm text-gray-300 font-medium">커뮤니티</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl">
                                    <div class="text-5xl font-black text-[var(--gold)] mb-2">1:1</div>
                                    <div class="text-sm text-gray-300 font-medium">맞춤 컨설팅</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>



        <!-- Services Section -->
        <section class="py-24 px-4 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <div class="inline-block mb-4 px-4 py-2 bg-[var(--gold)]/10 rounded-full text-[var(--navy)] text-sm font-semibold">
                        PROGRAMS
                    </div>
                    <h2 class="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                        핵심 교육 프로그램
                    </h2>
                    <p class="text-gray-600 text-lg">
                        실전에서 검증된 마케팅 전략
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Service 1 -->
                    <div class="card-modern p-8 border-2 border-gray-100">
                        <div class="mb-6">
                            <div class="w-14 h-14 gradient-gold rounded-2xl flex items-center justify-center mb-4">
                                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">네이버 플레이스<br>상위노출</h3>
                        </div>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            지역 검색 1위를 차지하는 실전 노하우. 학원 위치 기반 최적화 전략으로 신규 학생 유입을 극대화합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>키워드 분석 및 최적화</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>리뷰 관리 전략</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>지역 SEO 완벽 가이드</span>
                            </li>
                        </ul>
                        <a href="/programs#naver-place" class="inline-flex items-center text-[var(--navy)] font-semibold hover:text-[var(--gold)] transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>

                    <!-- Service 2 -->
                    <div class="card-modern p-8 border-2 border-gray-100">
                        <div class="mb-6">
                            <div class="w-14 h-14 gradient-navy rounded-2xl flex items-center justify-center mb-4">
                                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">블로그<br>상위노출</h3>
                        </div>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            네이버 블로그 검색 상위권 진입 전략. SEO 최적화부터 콘텐츠 기획까지 체계적으로 학습합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>검색 알고리즘 이해</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>콘텐츠 작성 기법</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>효과적인 포스팅 전략</span>
                            </li>
                        </ul>
                        <a href="/programs#blog" class="inline-flex items-center text-[var(--navy)] font-semibold hover:text-[var(--gold)] transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>

                    <!-- Service 3 -->
                    <div class="card-modern p-8 border-2 border-gray-100">
                        <div class="mb-6">
                            <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
                                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-3">퍼널<br>마케팅</h3>
                        </div>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>고객 여정 설계</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>자동화 도구 활용</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-[var(--gold)] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>전환율 최적화</span>
                            </li>
                        </ul>
                        <a href="/programs#funnel" class="inline-flex items-center text-[var(--navy)] font-semibold hover:text-[var(--gold)] transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Us Section -->
        <section class="py-24 px-4 bg-gradient-to-b from-white to-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div class="inline-block mb-4 px-4 py-2 bg-[var(--navy)]/10 rounded-full text-[var(--navy)] text-sm font-semibold">
                            WHY US
                        </div>
                        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            차별화된<br>
                            학원 마케팅 교육
                        </h2>
                        <p class="text-gray-600 mb-10 leading-relaxed text-lg">
                            꾸메땅학원을 운영하며 쌓은 실전 경험을 바탕으로,<br>
                            전국 학원장님들과 함께 성장하고 있습니다.
                        </p>
                        
                        <div class="space-y-6">
                            <div class="flex items-start space-x-4 group">
                                <div class="w-12 h-12 gradient-gold rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">현업 학원장이 직접 교육</h4>
                                    <p class="text-gray-600">이론이 아닌 실제 학원 운영 경험에서 나온 살아있는 노하우</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4 group">
                                <div class="w-12 h-12 gradient-navy rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">오픈채팅 & 오프라인 모임</h4>
                                    <p class="text-gray-600">온라인 커뮤니티와 정기 모임으로 지속적인 네트워킹과 정보 공유</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4 group">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">검증된 성과</h4>
                                    <p class="text-gray-600">500개 이상 학원의 성공 사례와 95% 만족도가 증명하는 품질</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-modern p-10 border-2 border-gray-100 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/10 rounded-full -mr-16 -mt-16"></div>
                        <div class="relative">
                            <svg class="w-12 h-12 text-[var(--gold)] mb-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                            </svg>
                            <p class="text-gray-700 text-xl leading-relaxed mb-8 font-medium">
                                "플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 <span class="text-[var(--gold)] font-bold">2배 이상</span> 늘었습니다. 실전 노하우가 정말 대단합니다!"
                            </p>
                            <div class="flex items-center space-x-4 pt-6 border-t border-gray-100">
                                <div class="w-14 h-14 gradient-gold rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    김
                                </div>
                                <div>
                                    <div class="font-bold text-gray-900 text-lg">김OO 원장님</div>
                                    <div class="text-sm text-gray-500">서울 강남구 영어학원</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-4 gradient-navy relative overflow-hidden">
            <div class="absolute inset-0 opacity-10">
                <div class="absolute top-10 right-10 w-64 h-64 bg-[var(--gold)] rounded-full blur-3xl"></div>
                <div class="absolute bottom-10 left-10 w-80 h-80 bg-blue-400 rounded-full blur-3xl"></div>
            </div>
            
            <div class="max-w-5xl mx-auto text-center relative z-10">
                <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">
                    학원 마케팅, 지금 시작하세요
                </h2>
                <p class="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
                    무료 상담을 통해 학원에 맞는 맞춤 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="gradient-gold text-white px-10 py-4 rounded-xl text-lg font-bold hover:shadow-2xl btn-modern inline-flex items-center justify-center space-x-2">
                        <span>무료 상담 신청하기</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </a>
                    <a href="/login" class="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-white hover:text-[var(--navy)] transition inline-flex items-center justify-center space-x-2">
                        <span>회원 로그인</span>
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-[var(--dark-navy)] text-white py-16 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <img src="/static/images/logo.png" alt="SUPER PLACE" class="h-10 mb-4 brightness-200">
                        <p class="text-gray-400 text-sm leading-relaxed mb-4">
                            학원 마케팅 전문 교육 기관
                        </p>
                        <p class="text-gray-500 text-xs">
                            성과로 말하는 실전 마케팅
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4 text-white">서비스</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li><a href="/programs" class="hover:text-[var(--gold)] transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-[var(--gold)] transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-[var(--gold)] transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4 text-white">회사</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li><a href="#" class="hover:text-[var(--gold)] transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-[var(--gold)] transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-[var(--gold)] transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4 text-white">연락처</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li class="flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                <span>인천 서구</span>
                            </li>
                            <li class="flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                <span>contact@superplace.kr</span>
                            </li>
                            <li class="flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                                <span>문의 양식 이용</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <p>&copy; 2024 SUPER PLACE. All rights reserved.</p>
                    <p class="mt-2 md:mt-0">Designed with ❤️ for Academy Success</p>
                </div>
            </div>
        </footer>

        <script>
            // Mobile menu toggle
            document.getElementById('mobile-menu-btn').addEventListener('click', function() {
                const menu = document.getElementById('mobile-menu');
                menu.classList.toggle('hidden');
            });
        </script>
    </body>
    </html>
  `)
})

export default app
