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
      <!-- Segments (bottom layer) -->
      <SegmentComponent
        v-for="segment in segments"
        :key="segment.id"
        :segment="segment"
        :stage-width="stageConfig.width"
        :stage-height="stageConfig.height"
        @update-position="updateSegmentPosition"
      />

      <!-- Standalone Pegboards (middle layer) -->
      <PegboardComponent
        v-for="pegboard in standaloneFixtures.pegboards"
        :key="pegboard.id"
        :pegboard="pegboard"
        @update-position="handleFixturePositionUpdate"
      />

      <!-- Standalone Shelves (middle layer) -->
      <ShelfComponent
        v-for="shelf in standaloneShelves"
        :key="shelf.id"
        :shelf="shelf"
        :products="getProductsByShelf(shelf.id)"
        @update-position="handleProductPositionUpdate"
      />

      <!-- Products (top layer) -->
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
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from './shelf/ShelfComponent.vue'
import ProductComponent from './product/ProductComponent.vue'
import SegmentComponent from './segment/SegmentComponent.vue'
import { useDebugStore } from '../../composables/useDebugStore'
import type { Segment, DraggedItem, Shelf } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'
import PegboardComponent from './pegboard/PegboardComponent.vue'

export default defineComponent({
  name: 'EditorCanvas',
  inheritAttrs: false,
  components: {
    ShelfComponent,
    ProductComponent,
    SegmentComponent,
    PegboardComponent,
  },
  setup(props, { emit }) {
    const store = usePlanogramStore()
    const { segments, shelves, products, standaloneProducts, standaloneShelves, standaloneFixtures } = storeToRefs(store)
    const { getProductsByShelf, initializeTestData, addProduct, updateProductPosition, updateSegmentPosition, getProductsForFixture } = store

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

    if (segments.value.length === 0) {
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

    const handleDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return
      
      const data = e.dataTransfer.getData('text/plain')
      if (!data) return
      
      const dropData = JSON.parse(data)
      const stage = stageRef.value?.getStage()
      if (!stage) return
      
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      if (dropData.type === 'shelf') {
        store.addShelf({
          x: pos.x,
          y: pos.y,
          width: 100,
          height: 40,
          depth: 30,
          strictPlacement: true
        })
      } else if (dropData.type === 'pegboard') {
        store.addPegboard({
          x: pos.x,
          y: pos.y,
          width: 150,
          height: 200,
          depth: 20,
          color: '#e0e0e0',
          strictPlacement: false
        })
      } else if (dropData.type === 'product') {
        store.addProduct({
          x: pos.x,
          y: pos.y,
          width: 30,
          height: 40,
          depth: 20,
          color: '#ff0000',
          type: 'product'
        })
      }
    }

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
      // Clear selection when clicking empty canvas
      if (e.target === e.target.getStage()) {
        selectionStore.clearSelection()
      }
    }

    const handleFixturePositionUpdate = (payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
      segmentId?: string | null
    }) => {
      // Update the fixture position in the store
      store.updatePegboardPosition({
        id: payload.id,
        x: payload.x,
        y: payload.y,
        segmentId: payload.segmentId,
        relativeX: payload.relativeX,
        relativeY: payload.relativeY,
        products: store.getProductsForFixture(payload.id).map(p => ({
          id: p.id,
          relativeX: p.relativeX || 0,
          relativeY: p.relativeY || 0
        }))
      })
    }

    return {
      stageRef,
      stageConfig,
      segments,
      shelves,
      products,
      standaloneProducts,
      standaloneShelves,
      standaloneFixtures,
      getProductsByShelf,
      getProductsForFixture,
      updateSegmentPosition,
      handleDragOver,
      handleDrop,
      handleMouseMove,
      handleStageClick,
      handleProductPositionUpdate,
      handleFixturePositionUpdate
    }
  }
})
</script>

<style scoped>
.konvajs-content {
  background-color: #fff;
}
</style>
