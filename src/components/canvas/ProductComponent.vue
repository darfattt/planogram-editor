<template>
  <v-group
    :config="{
      id: product.id,
      x: product.sectionId ? product.relativeX : product.x,
      y: product.sectionId ? product.relativeY : product.y,
      draggable: true
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <v-rect :config="productConfig" />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType, ref } from 'vue'
import type { Product } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'

export default defineComponent({
  name: 'ProductComponent',
  props: {
    product: {
      type: Object as PropType<Product>,
      required: true
    },
    category: {
      type: String,
      default: 'product'
    },
    type: {
      type: String,
      default: 'productX'
    }
  },
  emits: ['dragend'],
  setup(props, { emit }) {
    const productConfig = computed(() => ({
      width: props.product.width,
      height: props.product.height,
      fill: '#81C784',
      stroke: '#66bb6a',
      strokeWidth: 1,
      // Add shadow for better visual feedback
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.2,
      shadowOffset: { x: 2, y: 2 }
    }))

    const originalPosition = ref({ x: 0, y: 0 })

    const handleDragMove = (e: any) => {
      const node = e.target
      node.x(node.x())
      node.y(node.y())
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const absolutePos = node.getAbsolutePosition()
      const stage = node.getStage()
      if (!stage) return

      // Find section groups using the same category/type attributes
      const sections = stage.find(node => {
        return node.getType() === 'Group' && 
               node.getAttr('category') === 'fixtures' 
               && node.getAttr('subCategory') === 'section'
      })
      // Then find shelves within these sections
      const shelves = sections.flatMap(section => {
        const sectionGroup = section as Group
        return sectionGroup.getChildren(child => {
          return child.getAttr('category') === 'fixtures' && 
                 child.getAttr('subCategory') === 'shelf'
        })
      })
      // Find the first shelf that contains the product's position
      const targetShelf = shelves.find(shelf => {
        const shelfPos = shelf.getAbsolutePosition()
        // Get dimensions directly from group attributes
        const shelfWidth = shelf.getAttr('width')
        const shelfHeight = shelf.getAttr('height')
        const shelfData = shelf.getAttr('shelfData')

        if (!shelfData || !shelfWidth || !shelfHeight) {
          console.warn('Missing shelf data:', { shelfData, shelfWidth, shelfHeight })
          return false
        }
        absolutePos.y = absolutePos.y+props.product.height;
        return (
          absolutePos.x >= shelfPos.x &&
          absolutePos.x <= shelfPos.x + shelfWidth &&
          absolutePos.y+props.product.height >= shelfPos.y &&
          absolutePos.y <= shelfPos.y + shelfHeight
        )
      })
      console.log('targetShelf', targetShelf)
      if (targetShelf) {
        const shelfData = targetShelf.getAttr('shelfData')
        // Keep original X position from drag event, use shelf's Y position
        const absoluteX = absolutePos.x
        const shelfY = shelfData.y
        
        emit('dragend', {
          id: props.product.id,
          x: absoluteX,
          y: shelfY,
          relativeX: absoluteX - shelfData.x,
          relativeY: shelfY - shelfData.y
        })
      } else {
        // Reset to original position if not on shelf
        node.position(originalPosition.value)
        emit('dragend', {
          id: props.product.id,
          x: originalPosition.value.x,
          y: originalPosition.value.y,
          relativeX: originalPosition.value.x,
          relativeY: originalPosition.value.y
        })
      }
    }

    const handleMouseEnter = (e: any) => {
      e.target.getStage().container().style.cursor = 'grab'
    }

    const handleMouseLeave = (e: any) => {
      e.target.getStage().container().style.cursor = 'default'
    }

    const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
      originalPosition.value = {
        x: e.target.x(),
        y: e.target.y()
      }
    }

    return {
      productConfig,
      handleDragMove,
      handleDragEnd,
      handleMouseEnter,
      handleMouseLeave,
      originalPosition,
      handleDragStart
    }
  }
})
</script> 