import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: { port: 5178 },
  build: {
    rollupOptions: {
      // two pages: the categorization demo and the Jev vs LLM explainer
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        jev: fileURLToPath(new URL('./jev.html', import.meta.url)),
      },
    },
  },
})
