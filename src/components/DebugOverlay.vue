<template>
  <div v-if="debugStore.debugMode" class="debug-overlay">
    <div v-if="!debugStore.dragNodePosition">Mouse: {{ debugStore.coordinates.x.toFixed(1) }}, {{ debugStore.coordinates.y.toFixed(1) }}</div>
    <div v-if="debugStore.dragNodePosition">
      Node: {{ debugStore.dragNodePosition.x.toFixed(1) }}, {{ debugStore.dragNodePosition.y.toFixed(1) }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useDebugStore } from '../composables/useDebugStore'

export default defineComponent({
  setup() {
    const debugStore = useDebugStore()
    const { debugMode, coordinates, toggleDebug, dragNodePosition } = debugStore
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        toggleDebug()
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeyPress)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyPress)
    })

    return {
      debugMode,
      coordinates,
      toggleDebug,
      dragNodePosition,
      debugStore
    }
  }
})
</script>

<style scoped>
.debug-overlay {
  position: fixed;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  z-index: 1000;
}
</style> 