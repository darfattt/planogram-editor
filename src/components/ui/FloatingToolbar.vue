<template>
  <div class="floating-toolbar" :class="{ 'toolbar-expanded': isExpanded }">
    <!-- Main toolbar -->
    <div class="toolbar-main">
      <!-- Tool groups -->
      <div class="tool-group">
        <button 
          class="tool-button" 
          :class="{ active: activeTool === 'select' }"
          @click="setActiveTool('select')"
          title="Select (V)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </button>
        
        <button 
          class="tool-button" 
          :class="{ active: activeTool === 'hand' }"
          @click="setActiveTool('hand')"
          title="Hand tool (H)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L8 15"/>
          </svg>
        </button>
      </div>

      <div class="tool-separator"></div>

      <!-- Shape tools -->
      <div class="tool-group">
        <button 
          class="tool-button" 
          :class="{ active: activeTool === 'product' }"
          @click="setActiveTool('product')"
          title="Add Product (P)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
        </button>
        
        <button 
          class="tool-button" 
          :class="{ active: activeTool === 'shelf' }"
          @click="setActiveTool('shelf')"
          title="Add Shelf (S)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="6" width="20" height="2"/>
            <rect x="2" y="16" width="20" height="2"/>
          </svg>
        </button>
        
        <button 
          class="tool-button" 
          :class="{ active: activeTool === 'segment' }"
          @click="setActiveTool('segment')"
          title="Add Segment (G)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <path d="M9 3v18"/>
            <path d="M15 3v18"/>
          </svg>
        </button>
      </div>

      <div class="tool-separator"></div>

      <!-- Action tools -->
      <div class="tool-group">
        <button 
          class="tool-button"
          @click="$emit('undo')"
          title="Undo (Ctrl+Z)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>
        
        <button 
          class="tool-button"
          @click="$emit('redo')"
          title="Redo (Ctrl+Y)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 7v6h-6"/>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
          </svg>
        </button>
      </div>

      <div class="tool-separator"></div>

      <!-- View tools -->
      <div class="tool-group">
        <button 
          class="tool-button"
          @click="$emit('zoom-in')"
          title="Zoom In (+)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        
        <span class="zoom-display">{{ Math.round(zoomLevel * 100) }}%</span>
        
        <button 
          class="tool-button"
          @click="$emit('zoom-out')"
          title="Zoom Out (-)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        
        <button 
          class="tool-button"
          @click="$emit('zoom-fit')"
          title="Fit to Screen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      </div>

      <div class="tool-separator"></div>

      <!-- More tools toggle -->
      <button 
        class="tool-button"
        @click="toggleExpanded"
        title="More tools"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/>
          <circle cx="19" cy="12" r="1"/>
          <circle cx="5" cy="12" r="1"/>
        </svg>
      </button>
    </div>

    <!-- Expanded toolbar -->
    <div v-if="isExpanded" class="toolbar-expanded-content">
      <div class="tool-group">
        <button class="tool-button" @click="$emit('save')" title="Save">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
        </button>
        
        <button class="tool-button" @click="$emit('load')" title="Load">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        </button>
        
        <button class="tool-button" @click="$emit('export')" title="Export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'FloatingToolbar',
  props: {
    activeTool: {
      type: String,
      default: 'select'
    },
    zoomLevel: {
      type: Number,
      default: 1
    }
  },
  emits: [
    'tool-change',
    'undo',
    'redo',
    'zoom-in',
    'zoom-out',
    'zoom-fit',
    'save',
    'load',
    'export'
  ],
  setup(props, { emit }) {
    const isExpanded = ref(false)

    const setActiveTool = (tool: string) => {
      emit('tool-change', tool)
    }

    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value
    }

    return {
      isExpanded,
      setActiveTool,
      toggleExpanded
    }
  }
})
</script>

<style scoped>
.floating-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.25s ease;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.15s ease;
}

.tool-button:hover {
  background: #f1f3f4;
  color: #495057;
}

.tool-button.active {
  background: #e7f5ff;
  color: #1971c2;
}

.tool-separator {
  width: 1px;
  height: 24px;
  background: #e9ecef;
  margin: 0 4px;
}

.zoom-display {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

.toolbar-expanded-content {
  border-top: 1px solid #e9ecef;
  padding-top: 8px;
  display: flex;
  justify-content: center;
}

.toolbar-expanded .floating-toolbar {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}
</style>
