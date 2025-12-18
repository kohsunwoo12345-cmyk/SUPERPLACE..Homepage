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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
          
          :root {
            --navy: #1e3a5f;
            --gold: #b8935f;
            --dark-navy: #152840;
          }
        </style>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center space-x-3">
                        <svg class="w-8 h-8" viewBox="0 0 32 32" fill="none">
                            <rect x="4" y="18" width="4" height="10" fill="var(--navy)"/>
                            <rect x="10" y="14" width="4" height="14" fill="var(--gold)"/>
                            <rect x="16" y="10" width="4" height="18" fill="var(--navy)"/>
                            <path d="M6 6L26 16" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"/>
                        </svg>
                        <span class="text-xl font-bold text-[var(--navy)]">SUPER PLACE</span>
                    </div>
                    <div class="hidden md:flex items-center space-x-8">
                        <a href="/" class="text-gray-600 hover:text-[var(--navy)] text-sm font-medium">홈</a>
                        <a href="/programs" class="text-gray-600 hover:text-[var(--navy)] text-sm font-medium">교육 프로그램</a>
                        <a href="/success" class="text-gray-600 hover:text-[var(--navy)] text-sm font-medium">성공 사례</a>
                        <a href="/contact" class="text-gray-600 hover:text-[var(--navy)] text-sm font-medium">문의하기</a>
                        <a href="/login" class="bg-[var(--navy)] text-white px-5 py-2 text-sm font-medium hover:bg-[var(--dark-navy)] transition">로그인</a>
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
                <div class="px-4 py-3 space-y-1">
                    <a href="/" class="block px-3 py-2 text-gray-700 text-sm hover:bg-gray-50">홈</a>
                    <a href="/programs" class="block px-3 py-2 text-gray-700 text-sm hover:bg-gray-50">교육 프로그램</a>
                    <a href="/success" class="block px-3 py-2 text-gray-700 text-sm hover:bg-gray-50">성공 사례</a>
                    <a href="/contact" class="block px-3 py-2 text-gray-700 text-sm hover:bg-gray-50">문의하기</a>
                    <a href="/login" class="block px-3 py-2 bg-[var(--navy)] text-white text-sm text-center">로그인</a>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="bg-[var(--navy)] pt-24 pb-20 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 class="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            학원 마케팅,<br>성과로 증명합니다
                        </h1>
                        <p class="text-lg text-gray-300 mb-8 leading-relaxed">
                            네이버 플레이스 상위노출, 블로그 마케팅, 퍼널 마케팅.<br>
                            실전에서 검증된 전략으로 학원의 성장을 만듭니다.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <a href="/contact" class="bg-[var(--gold)] text-white px-7 py-3.5 text-sm font-semibold text-center hover:opacity-90 transition">
                                무료 상담 신청
                            </a>
                            <a href="/programs" class="border-2 border-white text-white px-7 py-3.5 text-sm font-semibold text-center hover:bg-white hover:text-[var(--navy)] transition">
                                교육 프로그램 보기
                            </a>
                        </div>
                    </div>
                    <div class="hidden md:block">
                        <div class="bg-white/5 border border-white/10 p-8">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="text-center p-4">
                                    <div class="text-4xl font-bold text-[var(--gold)] mb-1">500+</div>
                                    <div class="text-sm text-gray-300">교육 수료 학원</div>
                                </div>
                                <div class="text-center p-4">
                                    <div class="text-4xl font-bold text-[var(--gold)] mb-1">95%</div>
                                    <div class="text-sm text-gray-300">만족도</div>
                                </div>
                                <div class="text-center p-4">
                                    <div class="text-4xl font-bold text-[var(--gold)] mb-1">24/7</div>
                                    <div class="text-sm text-gray-300">커뮤니티</div>
                                </div>
                                <div class="text-center p-4">
                                    <div class="text-4xl font-bold text-[var(--gold)] mb-1">1:1</div>
                                    <div class="text-sm text-gray-300">맞춤 컨설팅</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Services Section -->
        <section class="py-20 px-4 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-14">
                    <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        핵심 교육 프로그램
                    </h2>
                    <p class="text-gray-600">
                        실전에서 검증된 마케팅 전략
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-6">
                    <!-- Service 1 -->
                    <div class="bg-white border border-gray-200 p-7">
                        <div class="mb-5">
                            <div class="text-2xl font-bold text-[var(--navy)] mb-4">01</div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">네이버 플레이스 상위노출</h3>
                        </div>
                        <p class="text-gray-600 text-sm mb-5 leading-relaxed">
                            지역 검색 1위를 차지하는 실전 노하우. 학원 위치 기반 최적화 전략으로 신규 학생 유입을 극대화합니다.
                        </p>
                        <ul class="space-y-2 mb-5">
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>키워드 분석 및 최적화</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>리뷰 관리 전략</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>지역 SEO 완벽 가이드</span>
                            </li>
                        </ul>
                        <a href="/programs#naver-place" class="text-[var(--navy)] text-sm font-medium hover:text-[var(--gold)] transition">
                            자세히 보기 →
                        </a>
                    </div>

                    <!-- Service 2 -->
                    <div class="bg-white border border-gray-200 p-7">
                        <div class="mb-5">
                            <div class="text-2xl font-bold text-[var(--navy)] mb-4">02</div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">블로그 상위노출</h3>
                        </div>
                        <p class="text-gray-600 text-sm mb-5 leading-relaxed">
                            네이버 블로그 검색 상위권 진입 전략. SEO 최적화부터 콘텐츠 기획까지 체계적으로 학습합니다.
                        </p>
                        <ul class="space-y-2 mb-5">
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>검색 알고리즘 이해</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>콘텐츠 작성 기법</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>효과적인 포스팅 전략</span>
                            </li>
                        </ul>
                        <a href="/programs#blog" class="text-[var(--navy)] text-sm font-medium hover:text-[var(--gold)] transition">
                            자세히 보기 →
                        </a>
                    </div>

                    <!-- Service 3 -->
                    <div class="bg-white border border-gray-200 p-7">
                        <div class="mb-5">
                            <div class="text-2xl font-bold text-[var(--navy)] mb-4">03</div>
                            <h3 class="text-xl font-bold text-gray-900 mb-3">퍼널 마케팅</h3>
                        </div>
                        <p class="text-gray-600 text-sm mb-5 leading-relaxed">
                            상담부터 등록까지 자동화 시스템 구축. 효율적인 학생 모집 프로세스를 완성합니다.
                        </p>
                        <ul class="space-y-2 mb-5">
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>고객 여정 설계</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>자동화 도구 활용</span>
                            </li>
                            <li class="flex items-start text-sm text-gray-700">
                                <span class="text-[var(--gold)] mr-2">•</span>
                                <span>전환율 최적화</span>
                            </li>
                        </ul>
                        <a href="/programs#funnel" class="text-[var(--navy)] text-sm font-medium hover:text-[var(--gold)] transition">
                            자세히 보기 →
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
                        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            차별화된<br>학원 마케팅 교육
                        </h2>
                        <p class="text-gray-600 mb-8 leading-relaxed">
                            꾸메땅학원을 운영하며 쌓은 실전 경험을 바탕으로,<br>
                            전국 학원장님들과 함께 성장하고 있습니다.
                        </p>
                        
                        <div class="space-y-6">
                            <div class="flex items-start space-x-4">
                                <div class="w-10 h-10 bg-[var(--navy)] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                    01
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 mb-2">현업 학원장이 직접 교육</h4>
                                    <p class="text-gray-600 text-sm">이론이 아닌 실제 학원 운영 경험에서 나온 살아있는 노하우</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4">
                                <div class="w-10 h-10 bg-[var(--navy)] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                    02
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 mb-2">오픈채팅 & 오프라인 모임</h4>
                                    <p class="text-gray-600 text-sm">온라인 커뮤니티와 정기 모임으로 지속적인 네트워킹과 정보 공유</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-4">
                                <div class="w-10 h-10 bg-[var(--navy)] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                    03
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900 mb-2">검증된 성과</h4>
                                    <p class="text-gray-600 text-sm">500개 이상 학원의 성공 사례와 95% 만족도가 증명하는 품질</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 border border-gray-200 p-8">
                        <svg class="w-10 h-10 text-[var(--gold)] mb-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-gray-700 text-lg leading-relaxed mb-6">
                            "플레이스 마케팅 교육을 받은 후 3개월 만에 신규 문의가 2배 이상 늘었습니다. 실전 노하우가 정말 대단합니다!"
                        </p>
                        <div class="flex items-center space-x-3 pt-4 border-t border-gray-200">
                            <div class="w-12 h-12 bg-[var(--gold)] flex items-center justify-center text-white font-bold">
                                김
                            </div>
                            <div>
                                <div class="font-bold text-gray-900">김OO 원장님</div>
                                <div class="text-sm text-gray-500">서울 강남구 영어학원</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-4 bg-[var(--navy)]">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                    학원 마케팅, 지금 시작하세요
                </h2>
                <p class="text-lg text-gray-300 mb-8">
                    무료 상담을 통해 학원에 맞는 맞춤 마케팅 전략을 받아보세요
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="/contact" class="bg-[var(--gold)] text-white px-8 py-4 text-sm font-semibold hover:opacity-90 transition">
                        무료 상담 신청하기
                    </a>
                    <a href="/login" class="border-2 border-white text-white px-8 py-4 text-sm font-semibold hover:bg-white hover:text-[var(--navy)] transition">
                        회원 로그인
                    </a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-[var(--dark-navy)] text-white py-12 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div class="flex items-center space-x-2 mb-3">
                            <svg class="w-7 h-7" viewBox="0 0 32 32" fill="none">
                                <rect x="4" y="18" width="4" height="10" fill="#fff"/>
                                <rect x="10" y="14" width="4" height="14" fill="var(--gold)"/>
                                <rect x="16" y="10" width="4" height="18" fill="#fff"/>
                                <path d="M6 6L26 16" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                            <span class="text-lg font-bold">SUPER PLACE</span>
                        </div>
                        <p class="text-gray-400 text-sm">학원 마케팅 전문 교육 기관</p>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-3 text-sm">서비스</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li><a href="/programs" class="hover:text-white transition">교육 프로그램</a></li>
                            <li><a href="/success" class="hover:text-white transition">성공 사례</a></li>
                            <li><a href="/contact" class="hover:text-white transition">문의하기</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-3 text-sm">회사</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li><a href="#" class="hover:text-white transition">회사 소개</a></li>
                            <li><a href="#" class="hover:text-white transition">이용약관</a></li>
                            <li><a href="#" class="hover:text-white transition">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-3 text-sm">연락처</h4>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li>인천 서구</li>
                            <li>contact@superplace.kr</li>
                            <li>문의 양식 이용</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-700 pt-6 text-center text-gray-500 text-sm">
                    <p>&copy; 2024 SUPER PLACE. All rights reserved.</p>
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
