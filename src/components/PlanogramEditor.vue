<template>
  <div class="planogram-editor">
    <div class="templates">
      <div class="toolbar">
        <button @click="handleSave">Save</button>
        <button @click="handleLoad">Load</button>
        <button @click="showProductImages = !showProductImages">
          {{ showProductImages ? 'Hide' : 'Show' }} Images
        </button>
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
    <div class="workspace">
      <EditorCanvas 
        ref="editorCanvasRef"
        @drop="handleDrop" 
        @dragover.prevent="handleDragOver"
        class="editor-canvas"
        :key="canvasKey"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import FixtureTemplate from './templates/FixtureTemplate.vue'
import ProductTemplate from './templates/ProductTemplate.vue'
import EditorCanvas from './canvas/EditorCanvas.vue'
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
    EditorCanvas
  },
  setup() {
    console.log('PlanogramEditor setup');
    const draggedItem = ref<DraggedItem | null>(null)
    const stageRef = ref<Konva.Stage | null>(null)
    const nodes = ref<any[]>([])
    const store = usePlanogramStore()
    const { addProduct, initializeTestData } = store
    const { sections, shelves, products, standaloneProducts, showProductImages } = storeToRefs(store)
    const editorCanvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null)
    const canvasKey = ref(0)

    // Initialize with test data only if no data exists
    onMounted(() => {
      if (sections.value.length === 0) {
        //initializeTestData()
      }
    })

    const handleDragStart = (item: DraggedItem) => {
      draggedItem.value = item
    }

    const handleDragOver = (e: Konva.KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault();
    };

    const handleDrop = (e: Konva.KonvaEventObject<DragEvent>) => {
      console.log('handleDrop')
      e.evt.preventDefault();
      if (!editorCanvasRef.value?.stageRef?.value) return;
      
      const stage = (editorCanvasRef.value.stageRef.value as unknown) as Konva.Stage
      const position = stage.getPointerPosition();
      
      if (!position) return;

      // Get the dragged type from dataTransfer
      const type = e.evt.dataTransfer?.getData('text/plain');
      
      // Create new node with correct position
      const newNode = {
        id: uuidv4(),
        x: position.x,
        y: position.y,
        width: 100,
        height: 100,
        type: type || 'default',
        category: 'product'
      };

      // Add to your state
      nodes.value = [...nodes.value, newNode];
    }

    const handleDragEnd = () => {
      draggedItem.value = null
    }

    const handleAddProduct = (item: DraggedItem) => {
      if (item.type === 'product') {
        const product = {
          x: 100,
          y: 100,
          width: item.properties.width,
          height: item.properties.height,
          type: 'default',
          category: 'product'
        }
        addProduct(product)
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

            // Force canvas remount by changing key
            canvasKey.value++
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
      handleDrop,
      handleDragOver,
      stageRef,
      nodes,
      handleDragEnd,
      handleAddProduct,
      handleSave,
      handleLoad,
      editorCanvasRef,
      canvasKey,
      showProductImages
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

.workspace {
  flex: 1;
  background-color: #fff;
  overflow: hidden;
}
</style>
