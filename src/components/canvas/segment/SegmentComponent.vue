<template>
  <v-group
    :config="segmentConfig"
    @dragmove="handleDragMove"
    @mouseenter="handleSegmentHover"
    @mouseleave="handleSegmentHoverEnd"
    @click="handleSegmentClick"
  >
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
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import ShelfComponent from '../shelf/ShelfComponent.vue'
import type { Segment } from '../../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'SegmentComponent',
  components: {
    ShelfComponent,
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
    const { getShelvesBySegment, getProductsByShelf, updateProductPosition } = store
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

    return {
      segmentConfig,
      segmentRectConfig,
      getShelvesBySegment,
      getProductsByShelf,
      handleDragMove,
      handleSegmentHover,
      handleSegmentHoverEnd,
      handleSegmentClick,
      handleProductPositionUpdate
    }
  }
})
</script> 