import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'

// Make store singleton to share state
const debugMode = ref(true)
const coordinates = ref({ x: 0, y: 0 })

// Add to debug store interface
interface DebugState {
  debugMode: boolean
  coordinates: { x: number; y: number }
  dragNodePosition: { x: number; y: number } | null
  setDragNodePosition: (pos: { x: number; y: number }) => void
}

// In store definition
export const useDebugStore = defineStore('debug', {
  state: () => ({
    debugMode: true,
    coordinates: reactive({ x: 0, y: 0 }),
    dragNodePosition: null as { x: number; y: number } | null
  }),
  actions: {
    updateCoordinates(pos: { x: number; y: number }) {
      this.coordinates.x = pos.x
      this.coordinates.y = pos.y
    },
    setDragNodePosition(pos: { x: number; y: number }) {
      this.dragNodePosition = pos
    },
    clearDragNodePosition() {
      this.dragNodePosition = null
    },
    toggleDebug() {
      this.debugMode = !this.debugMode
    }
  }
}) 