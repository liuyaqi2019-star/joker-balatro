import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 本地 dev 用 `/`，避免必须访问 /joker-balatro/；打包仍用子路径（如 GitHub Pages）
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/joker-balatro/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
}))
