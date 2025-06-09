<template>
  <v-group
    :config="segmentConfig"
    @dragmove="handleDragMove"
    @mouseenter="handleSegmentHover"
    @mouseleave="handleSegmentHoverEnd"
    @click="handleSegmentClick"
  >
  
    
    <!-- Segment rectangle -->
    <v-rect :config="segmentRectConfig" />
    
    <!-- Nested components -->
    <ShelfComponent
      v-for="shelf in getShelvesBySegment(segment.id)"
      :key="shelf.id"
      :shelf="shelf"
      :products="getProductsByShelf(shelf.id)"
      @update-position="handleProductPositionUpdate"
    >
    </ShelfComponent>

    <!-- Pegboards -->
    <PegboardComponent
      v-for="pegboard in getPegboardsBySegment(segment.id)"
      :key="pegboard.id"
      :pegboard="pegboard"
      @update-position="handleFixturePositionUpdate"
    />

    <!-- Base fixture at the bottom -->
    <v-rect :config="baseConfig" />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import ShelfComponent from '../shelf/ShelfComponent.vue'
import PegboardComponent from '../pegboard/PegboardComponent.vue'
import type { Segment } from '../../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../../composables/useSelectionStore'

export default defineComponent({
  name: 'SegmentComponent',
  components: {
    ShelfComponent,
    PegboardComponent,
  },
  props: {
    segment: {
      type: Object as () => Segment,
      required: true
    },
    stageWidth: {
      type: Number,
      required: true
    },
    stageHeight: {
      type: Number,
      required: true
    }
  },
  emits: ['update-position'],
  setup(props, { emit }) {
    const store = usePlanogramStore()
    const { getShelvesBySegment, getProductsByShelf, updateProductPosition, getPegboardsBySegment } = store
    const selectionStore = useSelectionStore()

    const segmentConfig = computed(() => ({
      id: props.segment.id,
      x: props.segment.x,
      y: props.segment.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'segment',
      width: props.segment.width,
      height: props.segment.height,
    }))

    const segmentRectConfig = computed(() => ({
      width: props.segment.width,
      height: props.segment.height,
      fill: '#BBDEFB',
      stroke: '#2196f3',
      strokeWidth: 2,
      category: 'fixtures',
      subCategory: 'segment'
    }))

    // Base fixture configuration
    const baseConfig = computed(() => {
      const baseWidth = props.segment.width + 20
      const widthDifference = baseWidth - props.segment.width
      return {
        width: baseWidth,
        height: 20, // Fixed height for base
        x: -(widthDifference / 2), // Dynamically center based on width difference
        y: props.segment.height, // Position at bottom of segment
        fill: '#78909C', // Darker color for base
        stroke: '#546E7A',
        strokeWidth: 1,
        category: 'fixtures',
        subCategory: 'base'
      }
    })

    const handleDragMove = () => {
      emit('update-position', props.segment.id)
    }

    const handleSegmentHover = (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'grab'
      }
    }

    const handleSegmentHoverEnd = (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'default'
      }
    }

    const handleSegmentClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true // Stop event from reaching stage
      
      if (e.target.attrs.category === 'fixtures') {
        selectionStore.clearSelection()
      }
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

    const handleFixturePositionUpdate = (payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
      segmentId?: string | null
    }) => {
      store.updatePegboardPosition({
        id: payload.id,
        x: payload.x,
        y: payload.y,
        segmentId: payload.segmentId || props.segment.id,
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
      segmentConfig,
      segmentRectConfig,
      baseConfig,
      getShelvesBySegment,
      getProductsByShelf,
      getPegboardsBySegment,
      handleDragMove,
      handleSegmentHover,
      handleSegmentHoverEnd,
      handleSegmentClick,
      handleProductPositionUpdate,
      handleFixturePositionUpdate
    }
  }
})
</script> 