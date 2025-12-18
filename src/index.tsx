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
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
          
          * {
            font-family: 'Noto Sans KR', sans-serif;
          }
          
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .hero-pattern {
            background-color: #667eea;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          }
          
          .card-hover {
            transition: all 0.3s ease;
          }
          
          .card-hover:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: all 0.3s ease;
          }
          
          .btn-primary:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          }
          
          .section-title {
            position: relative;
            padding-bottom: 15px;
          }
          
          .section-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-lg fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-rocket text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">우리는 슈퍼플레이스다</h1>
                            <p class="text-xs text-gray-500">학원 마케팅 전문</p>
                        </div>
                    </div>
                    <div class="hidden md:flex items-center space-x-8">
                        <a href="/" class="text-gray-700 hover:text-purple-600 font-medium transition">홈</a>
                        <a href="/programs" class="text-gray-700 hover:text-purple-600 font-medium transition">교육 프로그램</a>
                        <a href="/success" class="text-gray-700 hover:text-purple-600 font-medium transition">성공 사례</a>
                        <a href="/contact" class="text-gray-700 hover:text-purple-600 font-medium transition">문의하기</a>
                        <a href="/login" class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition">로그인</a>
                    </div>
                    <div class="md:hidden">
                        <button id="mobile-menu-btn" class="text-gray-700">
                            <i class="fas fa-bars text-2xl"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile menu -->
            <div id="mobile-menu" class="hidden md:hidden bg-white border-t">
                <div class="px-4 pt-2 pb-4 space-y-2">
                    <a href="/" class="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded">홈</a>
                    <a href="/programs" class="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded">교육 프로그램</a>
                    <a href="/success" class="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded">성공 사례</a>
                    <a href="/contact" class="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded">문의하기</a>
                    <a href="/login" class="block px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="hero-pattern pt-32 pb-20 px-4">
            <div class="max-w-7xl mx-auto text-center">
                <h2 class="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                    학원 마케팅의<br>
                    <span class="text-yellow-300">새로운 기준</span>
                </h2>
                <p class="text-xl md:text-2xl text-white/90 mb-8 font-light">
                    네이버 플레이스 상위노출 · 블로그 마케팅 · 퍼널 마케팅
                </p>
                <p class="text-lg text-white/80 mb-12 max-w-2xl mx-auto">
                    전국 학원장님들의 성공을 돕는 실전 마케팅 교육<br>
                    오픈채팅방과 오프라인 모임으로 함께 성장합니다
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-10 py-4 rounded-full text-lg font-bold hover:shadow-2xl transform hover:scale-105 transition">
                        <i class="fas fa-paper-plane mr-2"></i>
                        무료 상담 신청
                    </a>
                    <a href="/programs" class="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-white hover:text-purple-600 transition">
                        <i class="fas fa-book-open mr-2"></i>
                        교육 프로그램 보기
                    </a>
                </div>
            </div>
        </section>

        <!-- Stats Section -->
        <section class="py-16 bg-white">
            <div class="max-w-7xl mx-auto px-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div class="p-6">
                        <div class="text-5xl font-black text-purple-600 mb-2">500+</div>
                        <div class="text-gray-600 font-medium">교육 수료 학원</div>
                    </div>
                    <div class="p-6">
                        <div class="text-5xl font-black text-purple-600 mb-2">95%</div>
                        <div class="text-gray-600 font-medium">만족도</div>
                    </div>
                    <div class="p-6">
                        <div class="text-5xl font-black text-purple-600 mb-2">24/7</div>
                        <div class="text-gray-600 font-medium">커뮤니티 지원</div>
                    </div>
                    <div class="p-6">
                        <div class="text-5xl font-black text-purple-600 mb-2">1:1</div>
                        <div class="text-gray-600 font-medium">맞춤 컨설팅</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Services Section -->
        <section class="py-20 px-4 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <h2 class="text-4xl md:text-5xl font-black text-center text-gray-800 mb-4 section-title">
                    핵심 교육 프로그램
                </h2>
                <p class="text-center text-gray-600 mb-16 text-lg">
                    실전에서 검증된 마케팅 전략을 배우세요
                </p>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Service 1 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg card-hover">
                        <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-map-marker-alt text-3xl text-purple-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-4">네이버 플레이스<br>상위노출</h3>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            지역 검색 1위를 차지하는 실전 노하우. 학원 위치 기반 최적화 전략으로 신규 학생 유입을 극대화합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-purple-600 mt-1 mr-3"></i>
                                <span>키워드 분석 및 최적화</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-purple-600 mt-1 mr-3"></i>
                                <span>리뷰 관리 전략</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-purple-600 mt-1 mr-3"></i>
                                <span>지역 SEO 완벽 가이드</span>
                            </li>
                        </ul>
                        <a href="/programs#naver-place" class="text-purple-600 font-bold hover:text-purple-800 transition">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- Service 2 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg card-hover">
                        <div class="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-blog text-3xl text-indigo-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-4">블로그<br>상위노출</h3>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            네이버 블로그 검색 상위권 진입 전략. SEO 최적화부터 콘텐츠 기획까지 체계적으로 학습합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-indigo-600 mt-1 mr-3"></i>
                                <span>검색 알고리즘 이해</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-indigo-600 mt-1 mr-3"></i>
                                <span>콘텐츠 작성 기법</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-indigo-600 mt-1 mr-3"></i>
                                <span>효과적인 포스팅 전략</span>
                            </li>
                        </ul>
                        <a href="/programs#blog" class="text-indigo-600 font-bold hover:text-indigo-800 transition">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- Service 3 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg card-hover">
                        <div class="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-funnel-dollar text-3xl text-pink-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-4">퍼널<br>마케팅</h3>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                        </p>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-pink-600 mt-1 mr-3"></i>
                                <span>고객 여정 설계</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-pink-600 mt-1 mr-3"></i>
                                <span>자동화 도구 활용</span>
                            </li>
                            <li class="flex items-start text-gray-700">
                                <i class="fas fa-check-circle text-pink-600 mt-1 mr-3"></i>
                                <span>전환율 최적화</span>
                            </li>
                        </ul>
                        <a href="/programs#funnel" class="text-pink-600 font-bold hover:text-pink-800 transition">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Us Section -->
        <section class="py-20 px-4 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 class="text-4xl md:text-5xl font-black text-gray-800 mb-6">
                            왜 우리를<br>선택해야 할까요?
                        </h2>
                        <p class="text-gray-600 text-lg mb-8 leading-relaxed">
                            꾸메땅학원을 운영하며 쌓은 실전 경험을 바탕으로,<br>
                            전국 학원장님들과 함께 성장하고 있습니다.
                        </p>
                        
                        <div class="space-y-6">
                            <div class="flex items-start space-x-4">
                                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-graduation-cap text-purple-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-800 text-lg mb-2">현업 학원장이 직접 교육</h4>
                                    <p class="text-gray-600">이론이 아닌 실제 학원 운영 경험에서 나온 살아있는 노하우</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4">
                                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-users text-indigo-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-800 text-lg mb-2">오픈채팅 & 오프라인 모임</h4>
                                    <p class="text-gray-600">온라인 커뮤니티와 정기 모임으로 지속적인 네트워킹과 정보 공유</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4">
                                <div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-chart-line text-pink-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-800 text-lg mb-2">검증된 성과</h4>
                                    <p class="text-gray-600">500개 이상 학원의 성공 사례와 95% 만족도가 증명하는 품질</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="relative">
                        <div class="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
                            <div class="mb-6">
                                <i class="fas fa-quote-left text-4xl text-white/30 mb-4"></i>
                                <p class="text-xl leading-relaxed mb-4">
                                    "플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 2배 이상 늘었습니다. 
                                    실전 노하우가 정말 대단합니다!"
                                </p>
                                <div class="flex items-center space-x-3">
                                    <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <i class="fas fa-user text-2xl"></i>
                                    </div>
                                    <div>
                                        <div class="font-bold">김OO 원장님</div>
                                        <div class="text-sm text-white/80">서울 강남구 영어학원</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Floating elements -->
                        <div class="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full opacity-20"></div>
                        <div class="absolute -bottom-6 -left-6 w-32 h-32 bg-pink-400 rounded-full opacity-20"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-4 gradient-bg">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-4xl md:text-5xl font-black text-white mb-6">
                    지금 바로 시작하세요
                </h2>
                <p class="text-xl text-white/90 mb-10">
                    무료 상담을 통해 학원에 맞는 맞춤 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/contact" class="bg-white text-purple-600 px-10 py-4 rounded-full text-lg font-bold hover:shadow-2xl transform hover:scale-105 transition inline-block">
                        <i class="fas fa-paper-plane mr-2"></i>
                        무료 상담 신청하기
                    </a>
                    <a href="/login" class="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-white hover:text-purple-600 transition inline-block">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        회원 로그인
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 class="text-xl font-bold mb-4">우리는 슈퍼플레이스다</h3>
                        <p class="text-gray-400 text-sm leading-relaxed">
                            학원 마케팅의 새로운 기준을 제시하는 전문 교육 기관입니다.
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">서비스</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li><a href="/programs" class="hover:text-white transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-white transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-white transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">회사</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li><a href="#" class="hover:text-white transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-white transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-white transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">연락처</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li><i class="fas fa-map-marker-alt mr-2"></i>인천 서구</li>
                            <li><i class="fas fa-envelope mr-2"></i>contact@superplace.kr</li>
                            <li><i class="fas fa-phone mr-2"></i>문의 양식 이용</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
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
        </script>
    </body>
    </html>
  `)
})

export default app
