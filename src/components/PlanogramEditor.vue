<template>
  <div class="planogram-editor">
    <!-- Floating Toolbar -->
    <FloatingToolbar
      :active-tool="activeTool"
      :zoom-level="globalZoomLevel"
      @tool-change="handleToolChange"
      @undo="handleUndo"
      @redo="handleRedo"
      @zoom-in="globalZoomIn"
      @zoom-out="globalZoomOut"
      @zoom-fit="resetGlobalZoom"
      @save="handleSave"
      @load="handleLoad"
      @export="handleExport"
    />

    <!-- Undo notification -->
    <div class="undo-notification" v-if="showUndoNotification">
      Action undone
    </div>

    <!-- Collapsible sidebar -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed">Templates</h3>
        <button
          class="sidebar-toggle"
          @click="toggleSidebar"
          :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="sidebarCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'"/>
          </svg>
        </button>
      </div>

      <div v-if="!sidebarCollapsed" class="sidebar-content">
        <div class="template-segment">
          <FixtureTemplate @dragstart="handleDragStart" />
        </div>
        <div class="template-segment">
          <ProductTemplate
            @dragstart="handleDragStart"
            @add-product="handleAddProduct"
          />
        </div>

        <!-- Settings panel -->
        <div class="template-segment">
          <h4>Settings</h4>
          <div class="settings-group">
            <label class="setting-item">
              <input
                type="checkbox"
                v-model="showProductImages"
              />
              <span>Show Product Images</span>
            </label>
            <label class="setting-item">
              <input
                type="checkbox"
                v-model="snapToGrid"
              />
              <span>Snap to Grid</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Main workspace -->
    <div class="workspace-container" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <WorkspaceView
        ref="workspaceRef"
        @open-2d-view="open2DView"
        @open-3d-view="open3DView"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import FixtureTemplate from './templates/FixtureTemplate.vue'
import ProductTemplate from './templates/ProductTemplate.vue'
import WorkspaceView from './workspace/WorkspaceView.vue'
import FloatingToolbar from './ui/FloatingToolbar.vue'
import type { DraggedItem, Product, Segment, Shelf } from '../types'
import { v4 as uuidv4 } from 'uuid'
import Konva from 'konva'
import { usePlanogramStore } from '../composables/usePlanogramStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'PlanogramEditor',
  components: {
    FixtureTemplate,
    ProductTemplate,
    WorkspaceView,
    FloatingToolbar
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

    // New state for minimalist UI
    const activeTool = ref('select')
    const sidebarCollapsed = ref(false)
    const snapToGrid = ref(true)
    
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

    const handleAddProduct = (item: DraggedItem & { template?: any }) => {
      if (item.type === 'product') {
        const productData = {
          x: item.position?.x ?? 100,
          y: item.position?.y ?? 100,
          width: item.properties.width,
          height: item.properties.height,
          depth: item.properties.depth || 30,
          type: item.template?.category || 'default',
          color: item.template?.defaultProperties?.visual?.primaryColor || '#4444ff',
          code: item.code ?? 'default',
          // Enhanced properties from template
          ...(item.template?.defaultProperties?.visual && {
            visual: item.template.defaultProperties.visual
          }),
          ...(item.template?.defaultProperties?.name && {
            name: item.template.defaultProperties.name
          })
        }
        addProduct(productData)
      }
    }

    // New methods for minimalist UI
    const handleToolChange = (tool: string) => {
      activeTool.value = tool
    }

    const handleRedo = () => {
      // Implement redo functionality
      console.log('Redo action')
    }

    const handleExport = () => {
      // Implement export functionality
      console.log('Export action')
    }

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
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
      // New minimalist UI properties
      activeTool,
      sidebarCollapsed,
      snapToGrid,
      handleToolChange,
      handleRedo,
      handleExport,
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
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Sidebar styles */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
  z-index: 5;
}

.sidebar.collapsed {
  width: 48px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  min-height: 60px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #495057;
}

.sidebar-toggle {
  width: 32px;
  height: 32px;
  border: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.15s ease;
}

.sidebar-toggle:hover {
  background: #e9ecef;
  color: #495057;
}

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.template-segment {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-segment h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

/* Settings styles */
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
}

.setting-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #1971c2;
}

/* Workspace container */
.workspace-container {
  flex: 1;
  transition: all 0.25s ease;
  margin-left: 0;
}

.workspace-container.sidebar-collapsed {
  margin-left: 0;
}

/* Notifications */
.undo-notification {
  position: fixed;
  top: 80px;
  right: 20px;
  background: #51cf66;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  font-size: 14px;
  font-weight: 500;
  animation: slideIn 0.3s ease, slideOut 0.3s ease 1.7s;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    z-index: 10;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
    width: 280px;
  }

  .workspace-container {
    margin-left: 0;
  }
}
</style>
