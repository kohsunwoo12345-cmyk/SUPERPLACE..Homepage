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
        <section class="pt-32 pb-32 px-6 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="text-center max-w-4xl mx-auto animate-fade-in">
                    <div class="inline-block mb-6 px-5 py-2.5 bg-purple-50 rounded-full text-purple-700 text-sm font-medium border border-purple-100">
                        학원 마케팅의 새로운 기준
                    </div>
                    <h1 class="text-5xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight text-balance">
                        학원장님의 성공,<br>
                        <span class="text-purple-600">우리가 함께합니다</span>
                    </h1>
                    <p class="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                        네이버 플레이스 1위, 블로그 상위노출, 퍼널 마케팅까지<br class="hidden sm:block">
                        <span class="text-gray-900 font-medium">500개 학원이 검증</span>한 실전 마케팅 노하우
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-20">
                        <a href="/contact" class="gradient-purple text-white px-10 py-5 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            무료 상담 신청하기
                        </a>
                        <a href="/programs" class="bg-white text-purple-600 border-2 border-purple-200 px-10 py-5 rounded-full text-lg font-medium hover:border-purple-400 hover:bg-purple-50 transition-all">
                            교육 프로그램 보기
                        </a>
                    </div>
                    
                    <!-- Stats -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto pt-12 border-t border-gray-100">
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
                    <div class="bg-white rounded-2xl p-10 border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.1s">
                        <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">네이버 플레이스<br>상위노출</h3>
                        <p class="text-gray-600 mb-8 leading-relaxed">
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

                    <!-- Service 2 -->
                    <div class="bg-white rounded-2xl p-10 border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.2s">
                        <div class="w-14 h-14 gradient-orange rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">블로그<br>상위노출</h3>
                        <p class="text-gray-600 mb-8 leading-relaxed">
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

                    <!-- Service 3 -->
                    <div class="bg-white rounded-2xl p-10 border border-gray-100 card-hover animate-fade-in" style="transition-delay: 0.3s">
                        <div class="w-14 h-14 gradient-purple rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">퍼널<br>마케팅</h3>
                        <p class="text-gray-600 mb-8 leading-relaxed">
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

                <div class="grid lg:grid-cols-3 gap-8 mb-24">
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-10 border border-purple-100 card-hover animate-fade-in">
                        <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6 text-white text-2xl font-bold">
                            01
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">
                            현업 학원장의<br>살아있는 노하우
                        </h3>
                        <p class="text-gray-600 leading-relaxed">
                            꾸메땅학원을 운영하며 직접 검증한 실전 전략. 이론이 아닌 경험에서 우러나온 진짜 노하우를 배웁니다.
                        </p>
                    </div>

                    <div class="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-10 border border-orange-100 card-hover animate-fade-in" style="transition-delay: 0.1s">
                        <div class="w-16 h-16 gradient-orange rounded-2xl flex items-center justify-center mb-6 text-white text-2xl font-bold">
                            02
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">
                            24/7 커뮤니티<br>& 오프라인 모임
                        </h3>
                        <p class="text-gray-600 leading-relaxed">
                            오픈채팅방에서 실시간 소통하고, 정기 오프라인 모임에서 전국 학원장님들과 네트워킹하세요.
                        </p>
                    </div>

                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-10 border border-purple-100 card-hover animate-fade-in" style="transition-delay: 0.2s">
                        <div class="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mb-6 text-white text-2xl font-bold">
                            03
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">
                            500개 학원이<br>검증한 성과
                        </h3>
                        <p class="text-gray-600 leading-relaxed">
                            500개 이상 학원의 실제 성공 사례와 95% 만족도가 증명하는 확실한 효과를 경험하세요.
                        </p>
                    </div>
                </div>

                <!-- Testimonial -->
                <div class="bg-gradient-to-br from-gray-50 to-purple-50 rounded-3xl p-12 lg:p-16 max-w-5xl mx-auto animate-fade-in">
                    <div class="flex items-start gap-6 mb-8">
                        <svg class="w-12 h-12 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                        </svg>
                    </div>
                    <p class="text-2xl lg:text-3xl text-gray-900 leading-relaxed mb-10 font-medium">
                        플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 <span class="text-purple-600 font-bold">2배 이상</span> 늘었습니다. 실전 노하우가 정말 대단합니다!
                    </p>
                    <div class="flex items-center gap-5">
                        <div class="w-20 h-20 gradient-purple rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                            김
                        </div>
                        <div>
                            <div class="font-bold text-gray-900 text-xl">김OO 원장님</div>
                            <div class="text-gray-600">서울 강남구 영어학원</div>
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
                            <li><a href="#" class="hover:text-purple-600 transition">회사 소개</a></li>
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

export default app
