import { writeFileSync } from 'fs';

const routesConfig = {
  version: 1,
  include: [
    "/",
    "/api/*",
    "/admin/*",
    "/login",
    "/signup",
    "/dashboard",
    "/my-page",
    "/programs",
    "/programs/*",
    "/store",
    "/tools/*",
    "/consulting/*"
  ],
  exclude: [
    "/*.jpg",
    "/*.png",
    "/*.gif",
    "/*.ico",
    "/*.svg",
    "/*.webp",
    "/*.css",
    "/*.js",
    "/static/*",
    "/downloads/*"
  ]
};

writeFileSync('dist/_routes.json', JSON.stringify(routesConfig, null, 2));
console.log('✅ _routes.json 수정 완료');
