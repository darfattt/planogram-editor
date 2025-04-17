<template>
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
      <SectionComponent
        v-for="section in sections"
        :key="section.id"
        :section="section"
        :stage-width="stageConfig.width"
        :stage-height="stageConfig.height"
        @update-position="updateSectionPosition"
      />

      <!-- Standalone Products -->
      <ProductComponent
        v-for="product in standaloneProducts"
        :key="product.id"
        :product="product"
      />
      <ShelfComponent
        v-for="shelf in standaloneShelves"
        :key="shelf.id"
        :shelf="shelf"
        :products="getProductsByShelf(shelf.id)"
        @update-position="handleProductPositionUpdate"
      />
    </v-layer>
  </v-stage>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from './shelf/ShelfComponent.vue'
import ProductComponent from './product/ProductComponent.vue'
import SectionComponent from './section/SectionComponent.vue'
import { useDebugStore } from '../../composables/useDebugStore'
import type { Section, DraggedItem, Shelf } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'EditorCanvas',
  inheritAttrs: false,
  components: {
    ShelfComponent,
    ProductComponent,
    SectionComponent,
  },
  setup(props, { emit }) {
    const store = usePlanogramStore()
    const { sections, shelves, products, standaloneProducts, standaloneShelves } = storeToRefs(store)
    const { getProductsByShelf, initializeTestData, addProduct, updateProductPosition, updateSectionPosition } = store

    const { stageRef } = useDragAndDrop()
    const debugStore = useDebugStore()
    const selectionStore = useSelectionStore()

    const stageConfig = {
      width: window.innerWidth - 50,
      height: window.innerHeight - 50,
      scale: { x: 1, y: 1 },
      style: {
        border: '2px solid #e0e0e0'
      }
    }

    if (sections.value.length === 0) {
      // Initialize test data on component mount
      initializeTestData()
    }

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

    const handleProductPositionUpdate = (payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
    }) => {
      updateProductPosition(payload)
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
            depth: item.properties.depth,
            relativeX: 0,
            relativeY: 0,
            code: item.code ?? `PROD-${Date.now().toString().slice(-4)}`
          })
        }
      } catch (error) {
        console.error('Drop error:', error)
      }
      emit('drop', e)
    }

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
      // Clear selection when clicking empty canvas
      if (e.target === e.target.getStage()) {
        selectionStore.clearSelection()
      }
    }

    return {
      stageRef,
      stageConfig,
      sections,
      shelves,
      products,
      standaloneProducts,
      standaloneShelves,
      getProductsByShelf,
      updateSectionPosition,
      handleDragOver,
      handleDrop,
      handleMouseMove,
      handleStageClick,
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
