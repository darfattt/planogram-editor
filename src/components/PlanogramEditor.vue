<template>
  <div class="planogram-editor">
    <!-- Undo notification -->
    <div class="undo-notification" v-if="showUndoNotification">
      Action undone
    </div>

    <!-- Collapsible Left Sidebar -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Collapse Toggle Button -->
      <button class="collapse-toggle" @click="toggleSidebar" :title="sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="sidebarCollapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'"/>
        </svg>
      </button>

      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <div class="toolbar">
          <div class="toolbar-group">
            <button @click="handleSave" class="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              Save
            </button>
            <button @click="handleLoad" class="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Load
            </button>
            <button @click="handleUndo" title="Undo (Ctrl+Z)" class="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v6h6"/>
                <path d="m21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
              </svg>
              Undo
            </button>
          </div>

          <div class="toolbar-group">
            <button @click="showProductImages = !showProductImages" class="toolbar-btn" :class="{ active: showProductImages }">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              {{ showProductImages ? 'Hide' : 'Show' }} Images
            </button>
          </div>

          <div class="zoom-controls">
            <button @click="globalZoomOut" title="Zoom Out" class="zoom-btn">−</button>
            <span class="zoom-level">{{ Math.round(globalZoomLevel * 100) }}%</span>
            <button @click="globalZoomIn" title="Zoom In" class="zoom-btn">+</button>
            <button @click="resetGlobalZoom" title="Reset Zoom" class="zoom-btn reset">100%</button>
          </div>
        </div>

        <div class="template-segment">
          <h3>Fixtures Template</h3>
          <FixtureTemplate @dragstart="handleDragStart" />
        </div>
        <div class="template-segment">
          <h3>Products Template</h3>
          <ProductTemplate
            @dragstart="handleDragStart"
            @add-product="handleAddProduct"
          />
        </div>
      </div>
    </div>

    <WorkspaceView
      ref="workspaceRef"
      @open-2d-view="open2DView"
      @open-3d-view="open3DView"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import FixtureTemplate from './templates/FixtureTemplate.vue'
import ProductTemplate from './templates/ProductTemplate.vue'
import WorkspaceView from './workspace/WorkspaceView.vue'
import type { DraggedItem, Product, Segment, Shelf } from '../types'

import Konva from 'konva'
import { usePlanogramStore } from '../composables/usePlanogramStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'PlanogramEditor',
  components: {
    FixtureTemplate,
    ProductTemplate,
    WorkspaceView
  },
  setup() {
    console.log('PlanogramEditor setup');
    const draggedItem = ref<DraggedItem | null>(null)
    const stageRef = ref<Konva.Stage | null>(null)
    const nodes = ref<any[]>([])
    const store = usePlanogramStore()
    const { addProduct } = store
    const { segments, shelves, products, showProductImages } = storeToRefs(store)
    const workspaceRef = ref<InstanceType<typeof WorkspaceView> | null>(null)
    const showUndoNotification = ref(false)
    const globalZoomLevel = ref(1)
    const sidebarCollapsed = ref(false)
    
    // Initialize with test data only if no data exists
    onMounted(() => {
      if (segments.value.length === 0) {
        //initializeTestData()
      }
      
      // Add keyboard event listener for Ctrl+Z (undo)
      window.addEventListener('keydown', handleKeyDown)
    })
    
    // Remove event listener when component is unmounted
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })
    
    // Handle undo action
    const handleUndo = () => {
      const undoSuccessful = store.undo()
      console.log('Undo action triggered', undoSuccessful ? 'successfully' : 'but no history available')
      
      if (undoSuccessful) {
        // Show notification
        showUndoNotification.value = true
        
        // Hide notification after 2 seconds
        setTimeout(() => {
          showUndoNotification.value = false
        }, 2000)
      }
    }
    
    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (undo)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault() // Prevent browser's default undo
        handleUndo()
      }
      
      // Check for Ctrl+Plus (zoom in)
      if (e.ctrlKey && e.key === '+') {
        e.preventDefault()
        globalZoomIn()
      }
      
      // Check for Ctrl+Minus (zoom out)
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault()
        globalZoomOut()
      }
      
      // Check for Ctrl+0 (reset zoom)
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        resetGlobalZoom()
      }
    }

    // Global zoom controls
    const globalZoomIn = () => {
      globalZoomLevel.value = Math.min(globalZoomLevel.value * 1.2, 5)
      updateAllPanesZoom()
    }
    
    const globalZoomOut = () => {
      globalZoomLevel.value = Math.max(globalZoomLevel.value / 1.2, 0.1)
      updateAllPanesZoom()
    }
    
    const resetGlobalZoom = () => {
      globalZoomLevel.value = 1
      updateAllPanesZoom()
    }
    
    const updateAllPanesZoom = () => {
      // This will be called when the workspace component is ready
      if (workspaceRef.value) {
        // We'll need to implement a method in WorkspaceView to update all panes
        workspaceRef.value.updateAllPanesZoom(globalZoomLevel.value)
      }
    }

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    const open2DView = () => {
      // Get the active pane index from the workspace
      const activePaneIndex = workspaceRef.value?.activePaneIndex ?? 0;
      workspaceRef.value?.open2DView(activePaneIndex);
    };

    const open3DView = () => {
      // Get the active pane index from the workspace
      const activePaneIndex = workspaceRef.value?.activePaneIndex ?? 0;
      workspaceRef.value?.open3DView(activePaneIndex);
    };

    const handleDragStart = (item: DraggedItem) => {
      draggedItem.value = item
    }

    const handleDragOver = (e: Konva.KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault();
    };

    const handleAddProduct = (item: DraggedItem) => {
      if (item.type === 'product') {
        addProduct({
          x: item.position?.x ?? 100,
          y: item.position?.y ?? 100,
          width: item.properties.width,
          height: item.properties.height,
          depth: 30, // Default depth for products
          type: 'default',
          color: '#4444ff',
          code: item.code ?? 'default'
        })
      }
    }

    const handleSave = () => {
      // Create state data object
      const stateData = {
        segments: segments.value,
        shelves: shelves.value,
        products: products.value,
        nodes: nodes.value
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(stateData, null, 2)
      console.log({jsonString});
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'planogram.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const handleLoad = () => {
      console.log('handle load');
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target?.result as string)
            
            // Clear existing data
            segments.value.length = 0
            shelves.value.length = 0
            products.value.length = 0
            nodes.value.length = 0

            // Update store state with new data
            const newSegments = jsonData.segments.map((segment: Segment) => ({
              ...segment,
              x: segment.x || 0,
              y: segment.y || 0
            }))
            segments.value.push(...newSegments)

            // Update shelves with proper positioning
            const newShelves = jsonData.shelves.map((shelf: Shelf) => {
              const parentSegment = segments.value.find((s: Segment) => s.id === shelf.segmentId)
              return {
                ...shelf,
                x: parentSegment ? parentSegment.x + (shelf.relativeX || 0) : shelf.x || 0,
                y: parentSegment ? parentSegment.y + (shelf.relativeY || 0) : shelf.y || 0
              }
            })
            shelves.value.push(...newShelves)

            // Update products with proper positioning
            const newProducts = jsonData.products.map((product: Product) => {
              const parentShelf = shelves.value.find((s: Shelf) => s.id === product.shelfId)
              const parentSegment = segments.value.find((s: Segment) => s.id === product.segmentId)
              return {
                ...product,
                x: parentShelf ? parentShelf.x + (product.relativeX || 0) : 
                   parentSegment ? parentSegment.x + (product.relativeX || 0) : product.x || 0,
                y: parentShelf ? parentShelf.y + (product.relativeY || 0) : 
                   parentSegment ? parentSegment.y + (product.relativeY || 0) : product.y || 0
              }
            })
            products.value.push(...newProducts)

            // Update nodes if they exist in the saved data
            if (jsonData.nodes) {
              nodes.value.push(...jsonData.nodes)
            }
          } catch (error) {
            console.error('Error loading file:', error)
          }
        }
        reader.readAsText(file)
      }

      input.click()
    }

    return {
      draggedItem,
      handleDragStart,
      handleDragOver,
      stageRef,
      nodes,
      handleAddProduct,
      handleSave,
      handleLoad,
      handleUndo,
      workspaceRef,
      showProductImages,
      showUndoNotification,
      open2DView,
      open3DView,
      globalZoomLevel,
      globalZoomIn,
      globalZoomOut,
      resetGlobalZoom,
      sidebarCollapsed,
      toggleSidebar
    }
  }
})
</script>

<style scoped>
.planogram-editor {
  display: flex;
  height: 100vh;
  width: 100vw;
  position: relative;
  background-color: #fafafa;
}

/* Modern Collapsible Sidebar */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.sidebar.collapsed {
  width: 48px;
}

.collapse-toggle {
  position: absolute;
  top: 16px;
  right: -12px;
  width: 24px;
  height: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.collapse-toggle:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: scale(1.05);
}

.collapse-toggle svg {
  color: #6b7280;
  transition: transform 0.2s ease;
}

.sidebar-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.sidebar.collapsed .sidebar-content {
  opacity: 0;
  pointer-events: none;
}

.toolbar {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: left;
}

.toolbar-btn:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
}

.toolbar-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.toolbar-btn svg {
  flex-shrink: 0;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  background: #ffffff;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.zoom-btn.reset {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
}

.zoom-level {
  flex: 1;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  color: #374151;
}

.template-segment {
  margin-bottom: 24px;
}

.template-segment h3 {
  margin-bottom: 12px;
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.undo-notification {
  position: fixed;
  top: 24px;
  right: 24px;
  background: #10b981;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  font-size: 14px;
  font-weight: 500;
  animation: slideInFade 0.3s ease-out, slideOutFade 0.3s ease-in 1.7s;
  backdrop-filter: blur(8px);
}

@keyframes slideInFade {
  from {
    opacity: 0;
    transform: translateX(100%) translateY(-50%);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

@keyframes slideOutFade {
  from {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%) translateY(-50%);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }

  .sidebar.collapsed {
    width: 44px;
  }

  .floating-toolbar {
    left: 16px;
    right: 16px;
    transform: none;
    width: auto;
  }

  .toolbar-section {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 200px;
  }

  .sidebar-content {
    padding: 16px;
  }

  .toolbar-btn {
    font-size: 12px;
    padding: 8px 10px;
  }
}
</style>
