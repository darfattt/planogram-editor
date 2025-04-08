import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isWeb = mode === 'web'
  
  const plugins = [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => ['Stage','Layer','Circle','Group','Rect','Text','Line'].includes(tag)
        }
      }
    })
  ]

  // Add electron plugins only for electron build
  if (!isWeb) {
    plugins.push(
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
      renderer()
    )
  }

  return {
    base: isWeb ? './' : '/',
    plugins,
    build: {
      chunkSizeWarningLimit: 1600,
      sourcemap: process.env.NODE_ENV !== 'production',
      outDir: isWeb ? 'dist' : 'dist-electron',
      rollupOptions: {
        output: {
          manualChunks: isWeb ? {
            'vendor': ['vue', 'pinia', 'vue-konva', 'konva'],
            'three': ['three']
          } : undefined
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  }
})
