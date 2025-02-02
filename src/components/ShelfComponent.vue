<script lang="ts">
import type { PropType } from 'vue'
import type { Shelf } from '../types'
import type { KonvaEventObject } from 'konva/lib/Node'

interface DragEndPayload {
  id: string
  x: number
  y: number
  relativeX: number
  relativeY: number
}

export default {
  props: {
    shelf: {
      type: Object as PropType<Shelf>,
      required: true
    },
    category: {
      type: String,
      default: 'fixtures'
    },
    type: {
      type: String,
      default: 'shelf'
    }
  },
  emits: {
    dragend: (payload: DragEndPayload) => !!payload.id
  },
  setup(props, { emit }) {
    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const absolutePos = node.getAbsolutePosition()
      
      const payload: DragEndPayload = {
        id: props.shelf.id,
        x: absolutePos.x,
        y: absolutePos.y + props.shelf.height,
        relativeX: node.x(),
        relativeY: node.y()
      }

      console.log('Emitting shelf dragend:', payload)
      emit('dragend', payload)
    }

    return { handleDragEnd }
  }
}
</script>

<template>
  <v-group
    :config="{
      id: shelf.id,
      x: shelf.relativeX,
      y: shelf.relativeY,
      draggable: true,
      shelf: shelf,
      width: shelf.width,
      height: shelf.height
    }"
    @dragend="handleDragEnd"
  >
    <v-rect :config="{
      width: shelf.width,
      height: shelf.height,
      fill: '#9e9e9e',
      stroke: '#757575',
      strokeWidth: 1
    }" />
  </v-group>
</template> 