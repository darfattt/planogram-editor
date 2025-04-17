<template>
  <v-group
    :config="sectionConfig"
    @dragmove="handleDragMove"
    @mouseenter="handleSectionHover"
    @mouseleave="handleSectionHoverEnd"
    @click="handleSectionClick"
  >
    <v-rect :config="sectionRectConfig" />
    
    <!-- Nested components -->
    <ShelfComponent
      v-for="shelf in getShelvesBySection(section.id)"
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
import type { Section } from '../../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'SectionComponent',
  components: {
    ShelfComponent,
  },
  props: {
    section: {
      type: Object as () => Section,
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
    const { getShelvesBySection, getProductsByShelf, updateProductPosition } = store
    const selectionStore = useSelectionStore()

    const sectionConfig = computed(() => ({
      id: props.section.id,
      x: props.section.x,
      y: props.section.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'section',
      width: props.section.width,
      height: props.section.height,
    }))

    const sectionRectConfig = computed(() => ({
      width: props.section.width,
      height: props.section.height,
      fill: '#BBDEFB',
      stroke: '#2196f3',
      strokeWidth: 2,
      category: 'fixtures',
      subCategory: 'section'
    }))

    const handleDragMove = () => {
      emit('update-position', props.section.id)
    }

    const handleSectionHover = (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'grab'
      }
    }

    const handleSectionHoverEnd = (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'default'
      }
    }

    const handleSectionClick = (e: KonvaEventObject<MouseEvent>) => {
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
      sectionConfig,
      sectionRectConfig,
      getShelvesBySection,
      getProductsByShelf,
      handleDragMove,
      handleSectionHover,
      handleSectionHoverEnd,
      handleSectionClick,
      handleProductPositionUpdate
    }
  }
})
</script> 