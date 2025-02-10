<template>
    <div><h1>standaloneProducts: {{ standaloneProducts.length }}</h1></div>
    <div><h1>product by shelf: {{ getProductsByShelf('shelf1').length }}</h1></div>
  <v-stage
    ref="stageRef"
    :config="stageConfig"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @pointermove="handleMouseMove"
    @click="handleStageClick"
    v-bind="$attrs"
  >
    <v-layer>
      <!-- Sections -->
        <v-group
        v-for="section in sections"
        :key="section.id"
        :config="sectionConfig(section)"
        @dragmove="updateSectionPosition(section.id)"
        @mouseenter="handleSectionHover"
        @mouseleave="handleSectionHoverEnd"
        @click="handleSectionClick"
      >
        <v-rect :config="sectionRectConfig(section)" />
        
        <!-- Nested components -->
        <ShelfComponent
          v-for="shelf in getShelvesBySection(section.id)"
          :key="shelf.id"
          :shelf="shelf"
          :products="getProductsByShelf(shelf.id)"
          @click="handleShelfClick"
          @update-position="handleProductPositionUpdate"
        >
        </ShelfComponent>
        </v-group>

      <!-- Standalone Products -->
      <ProductComponent
        v-for="product in standaloneProducts"
        :key="product.id"
        :product="product"
      />
    </v-layer>
  </v-stage>


</template>

<script lang="ts">
import { defineComponent } from 'vue'
import usePlanogramStore from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from '../../components/canvas/ShelfComponent.vue'
import ProductComponent from '../../components/canvas/ProductComponent.vue'
import { v4 as uuidv4 } from 'uuid'
import { useDebugStore } from '../../composables/useDebugStore'
import type { Section,DraggedItem } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../composables/useSelectionStore'

export default defineComponent({
  name: 'EditorCanvas',
  inheritAttrs: false,
  emits: ['drop', 'dragover'],
  components: {
    ShelfComponent,
    ProductComponent,
  },
  setup(props, { emit }) {
    const {
      sections,
      shelves,
      products,
      standaloneProducts,
      getShelvesBySection,
      getProductsBySection,
      getProductsByShelf,
      initializeTestData,
      addProduct,
      updateProductPosition
    } = usePlanogramStore()

    const { stageRef, findSectionAtPosition } = useDragAndDrop()
    const debugStore = useDebugStore()
    const selectionStore = useSelectionStore()

    const stageConfig = {
      width: window.innerWidth - 250,
      height: window.innerHeight,
      scale: { x: 1, y: 1 },
      style: {
        border: '2px solid #e0e0e0'
      }
    }

    // Initialize test data on component mount
    initializeTestData()

    // Add cache map at the top of setup
    const shelfPositionCache = new Map<string, { x: number; y: number }>()

    // Update mouse move handler
    const handleMouseMove = (e: KonvaEventObject<PointerEvent>) => {
      if (!debugStore.debugMode || !stageRef.value) return

      const stage = stageRef.value.getStage()
      if (!stage) return

      // Get pointer position directly from stage
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      // Update coordinates through store action
      debugStore.updateCoordinates(pos)
    }

    // Add remaining logic and event handlers here
    // ...

    const sectionConfig = (section: Section) => ({
      id: section.id,
      x: section.x,
      y: section.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'section'
    })

    const sectionRectConfig = (section: any) => ({
      width: section.width,
      height: section.height,
      fill: '#BBDEFB',
      stroke: '#2196f3',
      strokeWidth: 2
    })

    const updateSectionPosition = (sectionId: string) => {
      const section = sections.value.find((sec: Section) => sec.id === sectionId)
      if (!section || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${sectionId}`)
      if (!group) return

      // Enforce canvas boundaries
      const maxX = stageConfig.width - section.width
      const maxY = stageConfig.height - section.height
      const newX = Math.max(0, Math.min(group.x(), maxX))
      const newY = Math.max(0, Math.min(group.y(), maxY))

      group.x(newX)
      group.y(newY)
      section.x = newX
      section.y = newY
    }

    const handleProductPositionUpdate = (payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
    }) => {
      updateProductPosition(payload)
    }

    const updateShelfPosition = (payload: {
      id: string
      x: number
      y: number
      products: Array<{
        id: string
        relativeX: number
        relativeY: number
      }>
    }) => {
      const shelf = shelves.value.find(s => s.id === payload.id)
      if (!shelf || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${payload.id}`)
      if (!group) return
      // Update shelf position
      if (shelf.sectionId) {
        const section = sections.value.find(s => s.id === shelf.sectionId)
        if (section) {
          shelf.relativeX = payload.x - section.x
          shelf.relativeY = payload.y - section.y
        }
      } else {
        shelf.x = payload.x
        shelf.y = payload.y
      }

      // // Products move automatically with the group due to Konva's grouping
      // // Just update their relative positions in the store
      // payload.products.forEach(p => {
      //   const product = products.value.find(prod => prod.id === p.id)
      //   if (product) {
      //     product.relativeX = p.relativeX
      //     product.relativeY = p.relativeY
      //   }
      // })
    }

    const handleDragOver = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      emit('dragover', e)
    }

    const handleDrop = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      try {
        const type = e.evt.dataTransfer?.getData('text/plain')
        if (type !== 'product') return
        
        const data = e.evt.dataTransfer?.getData('application/json')
        if (!data) return

        const item = JSON.parse(data) as DraggedItem
        const stage = stageRef.value?.getStage()
        const pos = stage?.getPointerPosition()
        if (!pos) return

        if (item.type === 'product') {
          addProduct({
            x: pos.x - item.properties.width/2,
            y: pos.y - item.properties.height/2,
            width: item.properties.width,
            height: item.properties.height,
            relativeX: 0,
            relativeY: 0,
          })
        }
      } catch (error) {
        console.error('Drop error:', error)
      }
      emit('drop', e)
    }

    const handleSectionHover = (e: KonvaEventObject<MouseEvent>) => {
      if (stageRef.value?.getStage()) {
        stageRef.value.getStage().container().style.cursor = 'grab'
      }
    }

    const handleSectionHoverEnd = (e: KonvaEventObject<MouseEvent>) => {
      if (stageRef.value?.getStage()) {
        stageRef.value.getStage().container().style.cursor = 'default'
      }
    }
    // Handle product detachment
    const handleProductDetach = ({ productId, absoluteX, absoluteY }: { 
      productId: string;
      absoluteX: number;
      absoluteY: number;
    }) => {
      convertToStandaloneProduct(productId, absoluteX, absoluteY)
    }

    // Handle product re-parenting
    const convertToStandaloneProduct = (productId: string, x: number, y: number) => {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        product.shelfId = undefined
        product.x = x
        product.y = y
      }
    }

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
      // Clear selection when clicking empty canvas
      if (e.target === e.target.getStage()) {
        selectionStore.clearSelection()
      }
    }

    const handleSectionClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true // Stop event from reaching stage
      selectionStore.clearSelection()
    }

    const handleShelfClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true // Stop event from reaching section/stage
      selectionStore.clearSelection()
    }

    return {
      stageRef,
      stageConfig,
      sections,
      shelves,
      products,
      standaloneProducts,
      getShelvesBySection,
      getProductsBySection,
      getProductsByShelf,
      sectionConfig,
      sectionRectConfig,
      updateSectionPosition,
      updateProductPosition,
      updateShelfPosition,
      handleDragOver,
      handleDrop,
      handleMouseMove,
      handleSectionHover,
      handleSectionHoverEnd,
      handleProductDetach,
      handleStageClick,
      handleSectionClick,
      handleShelfClick,
      handleProductPositionUpdate
    }
  }
})
</script>

<style scoped>
.konvajs-content {
  background-color: #fff;
}
</style>
