import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => ['Stage','Layer','Circle','Group','Rect','Text','Line'].includes(tag)
        }
      }
    }),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                manualChunks: (id) => {
                  if (id.includes('node_modules')) return 'vendor'
                }
              }
            }
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
