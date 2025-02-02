<template>
  <v-group
    :config="{
      id: shelf.id,
      x: shelf.sectionId ? shelf.relativeX : shelf.x,
      y: shelf.sectionId ? shelf.relativeY : shelf.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'shelf',
      width: shelf.width,
      height: shelf.height,
      shelfData: shelf
    }"
    @dragmove="updatePosition"
    @dragend="finalizePosition"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <v-rect :config="shelfConfig" />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { Shelf } from '../../types'

export default defineComponent({
  name: 'ShelfComponent',
  props: {
    shelf: {
      type: Object as PropType<Shelf>,
      required: true
    }
  },
  emits: ['update', 'finalize'],
  setup(props, { emit }) {
    const shelfConfig = {
      width: props.shelf.width,
      height: props.shelf.height,
      fill: '#9e9e9e',
      stroke: '#757575',
      strokeWidth: 1,
      category: 'fixtures',
      subCategory: 'shelf'
    }

    const updatePosition = (e: any) => {
      emit('update', props.shelf.id)
      const stage = e.target.getStage()
      if (stage) stage.container().style.cursor = 'grabbing'
    }

    const finalizePosition = (e: any) => {
      const stage = e.target.getStage()
      if (stage) stage.container().style.cursor = 'grab'
    }

    const handleMouseEnter = (e: any) => {
      e.target.getStage().container().style.cursor = 'grab'
    }

    const handleMouseLeave = (e: any) => {
      e.target.getStage().container().style.cursor = 'default'
    }

    return {
      shelfConfig,
      updatePosition,
      finalizePosition,
      handleMouseEnter,
      handleMouseLeave
    }
  }
})
</script> 