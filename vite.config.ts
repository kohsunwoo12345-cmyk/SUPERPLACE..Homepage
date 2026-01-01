import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      outputDir: 'dist',
      minify: true,
      // Cloudflare Pages routing 설정
      cloudflarePages: {
        routes: {
          include: ['/*'],
          exclude: ['/static/*']
        }
      }
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
