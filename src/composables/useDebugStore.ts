import { ref } from 'vue'

// Make store singleton to share state
const debugMode = ref(true)
const coordinates = ref({ x: 0, y: 0 })

export default function useDebugStore() {
  const toggleDebug = () => {
    debugMode.value = !debugMode.value
  }

  return {
    debugMode,
    coordinates,
    toggleDebug
  }
} 