# SUPERPLACE Academy - Complete System 2026

## 🚀 Major Update - Full System Restructure

### Latest Changes (Jan 16, 2026)
- ✅ **Complete Signup Page Restructure**
  - Role selection: Director (학원장) vs Teacher (선생님)
  - Dynamic form fields based on role
  - Separate registration flows
  
- ✅ **Academy Management System**
  - Teachers can request to join academies
  - Approval workflow for directors
  - Multi-academy support
  
- ✅ **Teacher Management System**  
  - Directors can manage teachers
  - Verification code system
  - Class assignment capabilities
  
- ✅ **Role-Based Access Control**
  - Director-only features
  - Teacher-only features
  - Automatic navigation adjustments

---

## 프로젝트 개요
- **회사명**: 우리는 슈퍼플레이스다
- **목표**: 전국 학원장들을 위한 마케팅 교육 플랫폼 제공
- **주요 기능**: 
  - 네이버 플레이스 상위노출 교육
  - 블로그 마케팅 교육
  - 퍼널 마케팅 교육
  - 학원장 커뮤니티 (오픈채팅 & 오프라인 모임)

## 🔑 Key URLs
- Production: https://superplace-academy.pages.dev
- Signup: https://superplace-academy.pages.dev/signup
- Login: https://superplace-academy.pages.dev/login
- Student Management: https://superplace-academy.pages.dev/students
- Academy Management (Teachers): https://superplace-academy.pages.dev/academy-management

## 🛠 Tech Stack
- Hono.js (Web Framework)
- Cloudflare Pages (Hosting)
- Turso DB (Database)
- TailwindCSS (Styling)

## 📦 Deployment
This repository includes the `dist` folder for direct deployment to Cloudflare Pages.

### Build Command
```bash
npm run build
```

### Deploy Command  
```bash
npm run deploy
```

## 🏗 Project Structure
```
src/
  ├── index.tsx          # Main application routes
  ├── student-routes.tsx # Student management API
  └── student-pages.tsx  # Student management pages

dist/                     # Build output (included for deployment)
  ├── _worker.js          # Cloudflare Worker bundle
  └── static/             # Static assets
```

## 🔐 Environment Variables
Configure in Cloudflare Pages dashboard:
- `DATABASE_URL`: Turso database connection string
- `DATABASE_AUTH_TOKEN`: Turso authentication token
- `ALIGO_API_KEY`: SMS service API key (optional)
- `ALIGO_USER_ID`: SMS service user ID (optional)

## 📱 Features

### For Directors (학원장)
- Register academy and create account
- Generate verification codes for teachers
- Approve/reject teacher applications  
- Manage teachers and assign classes
- View student lists and performance

### For Teachers (선생님)
- Request to join academy with verification code
- Wait for director approval
- Request access to multiple academies
- Manage assigned classes
- View student information (with permissions)

## 🚦 Getting Started

1. **Clone repository**
```bash
git clone https://github.com/kohsunwoo12345-cmyk/SUPERPLACE..Homepage.git
cd SUPERPLACE..Homepage
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Build for production**
```bash
npm run build
```

## 📝 Version History
- **v2.0.0** (Jan 16, 2026) - Complete system restructure with role-based access
- **v1.0.0** - Initial release

---

**Built with ❤️ by SUPERPLACE Team**
