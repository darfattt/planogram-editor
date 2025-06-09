<template>
  <div class="canvas-container">
    <!-- Grid background -->
    <div class="canvas-grid" :style="gridStyle"></div>
    
    <!-- Main canvas -->
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @pointermove="handleMouseMove"
      @click="handleStageClick"
      @wheel="handleWheel"
      v-bind="$attrs"
    >
      <!-- Grid layer -->
      <v-layer ref="gridLayer">
        <v-line
          v-for="line in gridLines"
          :key="line.id"
          :config="line.config"
        />
      </v-layer>

      <!-- Content layer -->
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

      <!-- Selection layer -->
      <v-layer ref="selectionLayer">
        <!-- Selection rectangle -->
        <v-rect
          v-if="selectionRect"
          :config="selectionRectConfig"
        />
      </v-layer>
    </v-stage>

    <!-- Canvas overlay for UI elements -->
    <div class="canvas-overlay">
      <!-- Zoom indicator -->
      <div class="zoom-indicator" v-if="showZoomIndicator">
        {{ Math.round(currentZoom * 100) }}%
      </div>
      
      <!-- Grid toggle -->
      <button 
        class="grid-toggle"
        @click="toggleGrid"
        :class="{ active: showGrid }"
        title="Toggle Grid"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="6" height="6"/>
          <rect x="15" y="3" width="6" height="6"/>
          <rect x="3" y="15" width="6" height="6"/>
          <rect x="15" y="15" width="6" height="6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from './shelf/ShelfComponent.vue'
import ProductComponent from './product/ProductComponent.vue'
import SegmentComponent from './segment/SegmentComponent.vue'
import PegboardComponent from './pegboard/PegboardComponent.vue'
import { useDebugStore } from '../../composables/useDebugStore'
import { useSelectionStore } from '../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'
import { theme, canvasConfig } from '../../styles/theme'
import type { Segment, DraggedItem, Shelf } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'

export default defineComponent({
  name: 'MinimalistCanvas',
  components: {
    ShelfComponent,
    ProductComponent,
    SegmentComponent,
    PegboardComponent,
  },
  props: {
    zoom: {
      type: Number,
      default: 1
    }
  },
  emits: ['zoom-change', 'update'],
  setup(props, { emit }) {
    const store = usePlanogramStore()
    const { segments, shelves, products, standaloneProducts, standaloneShelves, standaloneFixtures } = storeToRefs(store)
    const { getProductsByShelf, addProduct, updateProductPosition, updateSegmentPosition, getProductsForFixture } = store

    const { stageRef } = useDragAndDrop()
    const debugStore = useDebugStore()
    const selectionStore = useSelectionStore()

    // Canvas state
    const showGrid = ref(true)
    const showZoomIndicator = ref(false)
    const currentZoom = ref(props.zoom)
    const selectionRect = ref(null)
    const gridLayer = ref(null)
    const selectionLayer = ref(null)

    // Stage configuration
    const stageConfig = ref({
      width: window.innerWidth - 300, // Account for sidebar
      height: window.innerHeight - 100, // Account for toolbar
      scale: { x: currentZoom.value, y: currentZoom.value },
      draggable: false,
    })

    // Grid styling
    const gridStyle = computed(() => ({
      backgroundImage: showGrid.value ? `
        linear-gradient(${theme.colors.canvasGrid} 1px, transparent 1px),
        linear-gradient(90deg, ${theme.colors.canvasGrid} 1px, transparent 1px)
      ` : 'none',
      backgroundSize: `${canvasConfig.grid.size}px ${canvasConfig.grid.size}px`,
      opacity: canvasConfig.grid.opacity,
    }))

    // Grid lines for Konva
    const gridLines = computed(() => {
      if (!showGrid.value) return []
      
      const lines = []
      const gridSize = canvasConfig.grid.size
      const width = stageConfig.value.width
      const height = stageConfig.value.height

      // Vertical lines
      for (let i = 0; i <= width; i += gridSize) {
        lines.push({
          id: `v-${i}`,
          config: {
            points: [i, 0, i, height],
            stroke: canvasConfig.grid.color,
            strokeWidth: 0.5,
            opacity: canvasConfig.grid.opacity,
          }
        })
      }

      // Horizontal lines
      for (let i = 0; i <= height; i += gridSize) {
        lines.push({
          id: `h-${i}`,
          config: {
            points: [0, i, width, i],
            stroke: canvasConfig.grid.color,
            strokeWidth: 0.5,
            opacity: canvasConfig.grid.opacity,
          }
        })
      }

      return lines
    })

    // Selection rectangle configuration
    const selectionRectConfig = computed(() => ({
      ...canvasConfig.selection,
      fill: 'transparent',
    }))

    // Methods
    const toggleGrid = () => {
      showGrid.value = !showGrid.value
    }

    const handleDragOver = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
    }

    const handleDrop = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      // Handle drop logic here
    }

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
      // Handle mouse move logic here
    }

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
      // Handle stage click logic here
    }

    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      
      const scaleBy = 1.1
      const stage = e.target.getStage()
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
      
      // Clamp zoom level
      newScale = Math.max(canvasConfig.zoom.min, Math.min(canvasConfig.zoom.max, newScale))

      stage.scale({ x: newScale, y: newScale })

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }
      stage.position(newPos)

      currentZoom.value = newScale
      emit('zoom-change', newScale)

      // Show zoom indicator temporarily
      showZoomIndicator.value = true
      setTimeout(() => {
        showZoomIndicator.value = false
      }, 1000)
    }

    const handleProductPositionUpdate = (data: any) => {
      // Handle product position update
    }

    const handleFixturePositionUpdate = (data: any) => {
      // Handle fixture position update
    }

    // Watch for zoom changes
    watch(() => props.zoom, (newZoom) => {
      currentZoom.value = newZoom
      if (stageRef.value) {
        stageRef.value.scale({ x: newZoom, y: newZoom })
      }
    })

    // Resize handler
    const handleResize = () => {
      stageConfig.value.width = window.innerWidth - 300
      stageConfig.value.height = window.innerHeight - 100
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
    })

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
      handleFixturePositionUpdate,
      handleWheel,
      showGrid,
      showZoomIndicator,
      currentZoom,
      gridStyle,
      gridLines,
      selectionRect,
      selectionRectConfig,
      gridLayer,
      selectionLayer,
      toggleGrid,
    }
  }
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.canvas-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.zoom-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
}

.grid-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: 1px solid #e9ecef;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.15s ease;
  color: #6c757d;
}

.grid-toggle:hover {
  background: #f1f3f4;
  border-color: #ced4da;
}

.grid-toggle.active {
  background: #e7f5ff;
  border-color: #1971c2;
  color: #1971c2;
}

:deep(.konvajs-content) {
  background-color: transparent !important;
}
</style>
