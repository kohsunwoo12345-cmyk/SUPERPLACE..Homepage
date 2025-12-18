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
        <title>SUPER PLACE - 학원 마케팅 전문</title>
        <meta name="description" content="네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅 전문 교육">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
          
          * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          
          :root {
            --primary: #4F46E5;
            --primary-light: #818CF8;
            --secondary: #F59E0B;
            --navy: #1e3a5f;
            --gold: #b8935f;
          }
          
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
          }
          
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .gradient-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          }
          
          .gradient-gold {
            background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          }
          
          .card-glass {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .card-glass:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.15);
          }
          
          .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .animate-on-scroll.show {
            opacity: 1;
            transform: translateY(0);
          }
          
          .animate-fade-in {
            animation: fadeIn 1s ease-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          
          .float-animation {
            animation: float 3s ease-in-out infinite;
          }
          
          .btn-gradient {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            transition: all 0.3s ease;
          }
          
          .btn-gradient:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(79, 70, 229, 0.4);
          }
          
          .text-gradient {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .number-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        </style>
    </head>
    <body>
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <div class="flex items-center space-x-2">
                            <svg class="w-10 h-10" viewBox="0 0 40 40" fill="none">
                                <rect x="6" y="22" width="5" height="12" rx="2" fill="url(#gradient1)"/>
                                <rect x="14" y="18" width="5" height="16" rx="2" fill="url(#gradient2)"/>
                                <rect x="22" y="14" width="5" height="20" rx="2" fill="url(#gradient1)"/>
                                <path d="M8 10L30 20" stroke="url(#gradient2)" stroke-width="3" stroke-linecap="round"/>
                                <defs>
                                    <linearGradient id="gradient1" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#667eea"/>
                                        <stop offset="100%" stop-color="#764ba2"/>
                                    </linearGradient>
                                    <linearGradient id="gradient2" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#f59e0b"/>
                                        <stop offset="100%" stop-color="#fbbf24"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span class="text-2xl font-bold text-gray-800">SUPER PLACE</span>
                        </div>
                    </div>
                    <div class="hidden md:flex items-center space-x-8">
                        <a href="/" class="text-gray-700 hover:text-indigo-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-indigo-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-indigo-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-indigo-600 font-medium transition">문의하기</a>
                        <a href="/login" class="btn-gradient text-white px-6 py-2.5 rounded-full font-semibold shadow-lg">
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
            <div id="mobile-menu" class="hidden md:hidden bg-white/95 backdrop-blur-md border-t">
                <div class="px-4 py-4 space-y-2">
                    <a href="/" class="block px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg transition">홈</a>
                    <a href="/programs" class="block px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg transition">교육 프로그램</a>
                    <a href="/success" class="block px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg transition">성공 사례</a>
                    <a href="/contact" class="block px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg transition">문의하기</a>
                    <a href="/login" class="block px-4 py-3 btn-gradient text-white rounded-lg text-center font-semibold">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="gradient-bg pt-32 pb-24 px-4 relative overflow-hidden">
            <div class="absolute inset-0 opacity-20">
                <div class="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                <div class="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
            </div>
            
            <div class="max-w-7xl mx-auto relative z-10">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div class="animate-fade-in">
                        <div class="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                            🚀 학원 마케팅 전문 교육
                        </div>
                        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            학원 성장의<br>
                            <span class="text-yellow-300">새로운 기준</span>
                        </h1>
                        <p class="text-xl text-white/90 mb-8 leading-relaxed">
                            네이버 플레이스 상위노출부터 퍼널 마케팅까지.<br>
                            <span class="font-bold">실전에서 검증된 전략</span>으로 학원의 변화를 만듭니다.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <a href="/contact" class="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-center shadow-xl hover:shadow-2xl hover:scale-105 transition duration-300">
                                무료 상담 신청하기
                            </a>
                            <a href="/programs" class="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-full font-bold text-center hover:bg-white hover:text-indigo-600 transition duration-300">
                                교육 프로그램 보기
                            </a>
                        </div>
                    </div>
                    
                    <div class="hidden md:block float-animation">
                        <div class="card-glass rounded-3xl p-10">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
                                    <div class="text-5xl font-black text-indigo-600 mb-2">500+</div>
                                    <div class="text-sm text-gray-600 font-medium">교육 수료 학원</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl">
                                    <div class="text-5xl font-black text-amber-600 mb-2">95%</div>
                                    <div class="text-sm text-gray-600 font-medium">만족도</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl">
                                    <div class="text-5xl font-black text-pink-600 mb-2">24/7</div>
                                    <div class="text-sm text-gray-600 font-medium">커뮤니티</div>
                                </div>
                                <div class="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
                                    <div class="text-5xl font-black text-green-600 mb-2">1:1</div>
                                    <div class="text-sm text-gray-600 font-medium">맞춤 컨설팅</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Services Section -->
        <section class="py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16 animate-on-scroll">
                    <div class="inline-block mb-4 px-5 py-2 bg-indigo-100 rounded-full text-indigo-700 text-sm font-bold">
                        PROGRAMS
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        핵심 교육 프로그램
                    </h2>
                    <p class="text-xl text-gray-600">
                        실전에서 검증된 마케팅 전략을 배우세요
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Service 1 -->
                    <div class="card-glass rounded-3xl p-8 animate-on-scroll" style="transition-delay: 0.1s">
                        <div class="mb-6">
                            <div class="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg class="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>키워드 분석 및 최적화</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>리뷰 관리 전략</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>지역 SEO 완벽 가이드</span>
                            </li>
                        </ul>
                        <a href="/programs#naver-place" class="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700 transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>

                    <!-- Service 2 -->
                    <div class="card-glass rounded-3xl p-8 animate-on-scroll" style="transition-delay: 0.2s">
                        <div class="mb-6">
                            <div class="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg class="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>검색 알고리즘 이해</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>콘텐츠 작성 기법</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>효과적인 포스팅 전략</span>
                            </li>
                        </ul>
                        <a href="/programs#blog" class="inline-flex items-center text-pink-600 font-bold hover:text-pink-700 transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>

                    <!-- Service 3 -->
                    <div class="card-glass rounded-3xl p-8 animate-on-scroll" style="transition-delay: 0.3s">
                        <div class="mb-6">
                            <div class="w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg class="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>고객 여정 설계</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>자동화 도구 활용</span>
                            </li>
                            <li class="flex items-center text-gray-700">
                                <svg class="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                <span>전환율 최적화</span>
                            </li>
                        </ul>
                        <a href="/programs#funnel" class="inline-flex items-center text-amber-600 font-bold hover:text-amber-700 transition group">
                            <span>자세히 보기</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Us Section -->
        <section class="py-24 px-4 bg-gradient-to-b from-white to-indigo-50">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-2 gap-16 items-center">
                    <div class="animate-on-scroll">
                        <div class="inline-block mb-4 px-5 py-2 bg-indigo-100 rounded-full text-indigo-700 text-sm font-bold">
                            WHY US
                        </div>
                        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            차별화된<br>
                            학원 마케팅 교육
                        </h2>
                        <p class="text-lg text-gray-600 mb-10 leading-relaxed">
                            꾸메땅학원을 운영하며 쌓은 실전 경험을 바탕으로,<br>
                            전국 학원장님들과 함께 성장하고 있습니다.
                        </p>
                        
                        <div class="space-y-6">
                            <div class="flex items-start space-x-4 group">
                                <div class="w-14 h-14 number-badge rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg group-hover:scale-110 transition">
                                    01
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">현업 학원장이 직접 교육</h4>
                                    <p class="text-gray-600">이론이 아닌 실제 학원 운영 경험에서 나온 살아있는 노하우</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4 group">
                                <div class="w-14 h-14 number-badge rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg group-hover:scale-110 transition">
                                    02
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">오픈채팅 & 오프라인 모임</h4>
                                    <p class="text-gray-600">온라인 커뮤니티와 정기 모임으로 지속적인 네트워킹과 정보 공유</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4 group">
                                <div class="w-14 h-14 number-badge rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg group-hover:scale-110 transition">
                                    03
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">검증된 성과</h4>
                                    <p class="text-gray-600">500개 이상 학원의 성공 사례와 95% 만족도가 증명하는 품질</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-glass rounded-3xl p-10 animate-on-scroll" style="transition-delay: 0.2s">
                        <svg class="w-14 h-14 text-indigo-600 mb-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-xl text-gray-700 leading-relaxed mb-8">
                            "플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 <span class="text-indigo-600 font-bold">2배 이상</span> 늘었습니다. 실전 노하우가 정말 대단합니다!"
                        </p>
                        <div class="flex items-center space-x-4 pt-6 border-t border-gray-200">
                            <div class="w-16 h-16 gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
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
        </section>

        <!-- CTA Section -->
        <section class="py-24 px-4 gradient-bg relative overflow-hidden">
            <div class="absolute inset-0 opacity-20">
                <div class="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                <div class="absolute bottom-10 left-10 w-80 h-80 bg-yellow-300 rounded-full blur-3xl"></div>
            </div>
            
            <div class="max-w-4xl mx-auto text-center relative z-10 animate-on-scroll">
                <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                    학원 마케팅, 지금 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-10 leading-relaxed">
                    무료 상담을 통해 학원에 맞는 맞춤 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-indigo-600 px-10 py-5 rounded-full text-lg font-bold shadow-2xl hover:shadow-xl hover:scale-105 transition duration-300 inline-flex items-center justify-center space-x-2">
                        <span>무료 상담 신청하기</span>
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </a>
                    <a href="/login" class="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-white hover:text-indigo-600 transition duration-300">
                        회원 로그인
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-16 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <div class="flex items-center space-x-2 mb-4">
                            <svg class="w-10 h-10" viewBox="0 0 40 40" fill="none">
                                <rect x="6" y="22" width="5" height="12" rx="2" fill="#fff"/>
                                <rect x="14" y="18" width="5" height="16" rx="2" fill="#f59e0b"/>
                                <rect x="22" y="14" width="5" height="20" rx="2" fill="#fff"/>
                                <path d="M8 10L30 20" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                            </svg>
                            <span class="text-2xl font-bold">SUPER PLACE</span>
                        </div>
                        <p class="text-gray-400 text-sm leading-relaxed">
                            학원 마케팅 전문 교육 기관<br>
                            성과로 증명하는 실전 마케팅
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">서비스</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li><a href="/programs" class="hover:text-white transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-white transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-white transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">회사</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li><a href="#" class="hover:text-white transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-white transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-white transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">연락처</h4>
                        <ul class="space-y-3 text-gray-400 text-sm">
                            <li>인천 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <p>&copy; 2024 SUPER PLACE. All rights reserved.</p>
                    <p class="mt-2 md:mt-0">Making Academy Success Together ✨</p>
                </div>
            </div>
        </footer>

        <script>
            // Mobile menu toggle
            document.getElementById('mobile-menu-btn').addEventListener('click', function() {
                const menu = document.getElementById('mobile-menu');
                menu.classList.toggle('hidden');
            });

            // Scroll animation
            const animateOnScroll = () => {
                const elements = document.querySelectorAll('.animate-on-scroll');
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('show');
                        }
                    });
                }, {
                    threshold: 0.1,
                    rootMargin: '0px 0px -100px 0px'
                });
                
                elements.forEach(element => observer.observe(element));
            };

            // Initialize on load
            document.addEventListener('DOMContentLoaded', animateOnScroll);
        </script>
    </body>
    </html>
  `)
})

export default app
