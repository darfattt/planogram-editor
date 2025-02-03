<template>
  <v-group
    :config="{
      id: product.id,
      x: relativeTo ? product.relativeX : product.x,
      y: relativeTo ? product.relativeY : product.y,
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
import type { Node } from 'konva/lib/Node'
import { useDebugStore } from '../../composables/useDebugStore'

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
    },
    relativeTo: {
      type: Boolean,
      default: false
    }
  },
  emits: ['dragend', 'drag-start'],
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
    const debugStore = useDebugStore()

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const pos = e.target.getAbsolutePosition()
      debugStore.setDragNodePosition(pos)
      const node = e.target
      node.x(node.x())
      node.y(node.y())
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      debugStore.clearDragNodePosition()
      const node = e.target
      const absolutePos = node.getAbsolutePosition()
      const stage = node.getStage()
      if (!stage) return

      // Find section groups using config attributes
      const sections = stage.find((node: Node) => {
        return node.getType() === 'Group' && 
               node.getAttr('category') === 'fixtures' && 
               node.getAttr('subCategory') === 'section'
      })
      console.log('Found sections:', sections.length, sections.map(s => ({ 
        id: s.id, 
        pos: s.getAbsolutePosition(),
        category: s.getAttr('category'),
        subCategory: s.getAttr('subCategory')
      })))

      // Find shelves within these sections using config attributes
      const shelves = sections.flatMap(section => {
        const sectionGroup = section as Group
        return sectionGroup.getChildren(child => {
          return child.getAttr('category') === 'fixtures' && 
                 child.getAttr('subCategory') === 'shelf'
        })
      })
      console.log('Found shelves:', shelves.length, shelves.map(s => ({
        id: s.id,
        pos: s.getAbsolutePosition(),
        category: s.getAttr('category'),
        subCategory: s.getAttr('subCategory')
      })))

      // Find the first shelf that contains the product's position
      const targetShelf = shelves.find(shelf => {
        const shelfPos = shelf.getAbsolutePosition()
        const shelfWidth = shelf.getAttr('width')
        const shelfHeight = shelf.getAttr('height')
        const shelfData = shelf.getAttr('shelfData')

        if (!shelfData || !shelfWidth || !shelfHeight) {
          console.warn('Missing shelf data:', { 
            id: shelf.id(),
            shelfData, 
            shelfWidth, 
            shelfHeight 
          })
          return false
        }
        const yTolerance = 10;
        console.log('absolutePos', absolutePos)
        console.log('shelfPos : ' ,shelfPos)
        return (
          absolutePos.x >= shelfPos.x &&
          absolutePos.x <= shelfPos.x + shelfWidth &&
          absolutePos.y +props.product.height + yTolerance >= shelfPos.y &&
          absolutePos.y +props.product.height <= shelfPos.y + shelfHeight
        )
      })
      console.log('targetShelf', targetShelf)

      if (targetShelf) {
        const shelfData = targetShelf.getAttr('shelfData')
        const absoluteX = absolutePos.x
        const shelfY = shelfData.y
        const shelfPos = targetShelf.getAbsolutePosition()
        
        // Calculate relative position to shelf
        const relativeX = absolutePos.x - shelfPos.x
        const relativeY = absolutePos.y - shelfPos.y

        // Move product node to target shelf group
        node.moveTo(targetShelf)
        
        // Update position relative to new parent shelf
        node.position({
          x: relativeX,
          y: relativeY
        })

        // Instead of moving the node, update the product state
        emit('dragend', {
          id: props.product.id,
          x: absoluteX,
          y: shelfY - props.product.height, // Position on top of shelf
          relativeX: absoluteX - shelfData.x,
          relativeY: shelfY - shelfData.y - props.product.height,
          shelfId: shelfData.id,
          sectionId: shelfData.sectionId
        })
      } else {
        console.log('No target shelf found, reverting to original position')
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
      emit('drag-start', props.product.id)
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