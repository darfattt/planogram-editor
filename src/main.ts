import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import App from './App.vue'

// Setup electron or mock for web
const setupElectron = () => {
  if (import.meta.env.MODE === 'web') {
    // Mock electron API for web
    return {
      ipcRenderer: {
        send: () => {},
        on: () => {},
        removeListener: () => {},
        removeAllListeners: () => {}
      }
    }
  }
  
  // Return actual electron for desktop
  try {
    return window.require('electron')
  } catch (e) {
    console.warn('Electron not available, using mock')
    return {
      ipcRenderer: {
        send: () => {},
        on: () => {},
        removeListener: () => {},
        removeAllListeners: () => {}
      }
    }
  }
}

// @ts-ignore
window.electron = setupElectron()

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(VueKonva)
app.mount('#app')
