<template>
  <div class="planogram-editor">
    <!-- Undo notification -->
    <div class="undo-notification" v-if="showUndoNotification">
      Action undone
    </div>
    <div class="templates">
      <div class="toolbar">
        <button @click="handleSave">Save</button>
        <button @click="handleLoad">Load</button>
        <button @click="handleUndo" title="Undo (Ctrl+Z)">Undo</button>
        <button @click="showProductImages = !showProductImages">
          {{ showProductImages ? 'Hide' : 'Show' }} Images
        </button>
        <!-- <button @click="open2DView">2D View</button>
        <button @click="open3DView">3D View</button> -->
      </div>
      <div class="template-section">
        <h3>Fixtures Template</h3>
        <FixtureTemplate @dragstart="handleDragStart" />
      </div>
      <div class="template-section">
        <h3>Products Template</h3>
        <ProductTemplate 
          @dragstart="handleDragStart"
          @add-product="handleAddProduct"
        />
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
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import FixtureTemplate from './templates/FixtureTemplate.vue'
import ProductTemplate from './templates/ProductTemplate.vue'
import WorkspaceView from './workspace/WorkspaceView.vue'
import type { DraggedItem, Product, Section, Shelf } from '../types'
import { v4 as uuidv4 } from 'uuid'
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
    const { sections, shelves, products, showProductImages } = storeToRefs(store)
    const workspaceRef = ref<InstanceType<typeof WorkspaceView> | null>(null)
    const showUndoNotification = ref(false)
    
    // Initialize with test data only if no data exists
    onMounted(() => {
      if (sections.value.length === 0) {
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
          x: 100,
          y: 100,
          width: item.properties.width,
          height: item.properties.height,
          depth: 30, // Default depth for products
          type: 'default',
          color: '#4444ff',
          code: 'default'
        })
      }
    }

    const handleSave = () => {
      // Create state data object
      const stateData = {
        sections: sections.value,
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
            sections.value.length = 0
            shelves.value.length = 0
            products.value.length = 0
            nodes.value.length = 0

            // Update store state with new data
            const newSections = jsonData.sections.map((section: Section) => ({
              ...section,
              x: section.x || 0,
              y: section.y || 0
            }))
            sections.value.push(...newSections)

            // Update shelves with proper positioning
            const newShelves = jsonData.shelves.map((shelf: Shelf) => {
              const parentSection = sections.value.find((s: Section) => s.id === shelf.sectionId)
              return {
                ...shelf,
                x: parentSection ? parentSection.x + (shelf.relativeX || 0) : shelf.x || 0,
                y: parentSection ? parentSection.y + (shelf.relativeY || 0) : shelf.y || 0
              }
            })
            shelves.value.push(...newShelves)

            // Update products with proper positioning
            const newProducts = jsonData.products.map((product: Product) => {
              const parentShelf = shelves.value.find((s: Shelf) => s.id === product.shelfId)
              const parentSection = sections.value.find((s: Section) => s.id === product.sectionId)
              return {
                ...product,
                x: parentShelf ? parentShelf.x + (product.relativeX || 0) : 
                   parentSection ? parentSection.x + (product.relativeX || 0) : product.x || 0,
                y: parentShelf ? parentShelf.y + (product.relativeY || 0) : 
                   parentSection ? parentSection.y + (product.relativeY || 0) : product.y || 0
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
      open3DView
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
}

.templates {
  width: 250px;
  padding: 20px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar button {
  padding: 8px 16px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
  min-width: 100px;
}

.toolbar button:hover {
  background-color: #1976d2;
}

.template-section {
  margin-bottom: 20px;
}

.template-section h3 {
  margin-bottom: 10px;
  color: #333;
}

.undo-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: fadeIn 0.3s, fadeOut 0.3s 1.7s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
