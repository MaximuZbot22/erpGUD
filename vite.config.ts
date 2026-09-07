import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const base = process.env.VITE_BASE_PATH || (process.env.GITHUB_PAGES ? '/erpGUD/' : './');

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
  ],
})
