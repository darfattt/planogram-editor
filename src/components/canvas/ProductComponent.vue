<template>
  <v-group
    :config="{
      id: product.id,
      x: relativeTo ? product.relativeX : product.x,
      y: relativeTo ? product.relativeY : product.y,
      draggable: true,
      category: product.category,
      type: product.type,
      height: product.height,
      width: product.width
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
      default: 'Product'
    },
    type: {
      type: String,
      default: '-'
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
      shadowOffset: { x: 2, y: 2 },
      category: props.category,
      type: props.type
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

      // Helper function to find relevant elements
      const findElements = () => {
        const sections = stage.find((node: Node) => 
          node.getType() === 'Group' && 
          node.getAttr('category') === 'fixtures' && 
          node.getAttr('subCategory') === 'section'
        )

        const shelves = sections.flatMap(section => 
          (section as Group).getChildren(child => 
            child.getAttr('category') === 'fixtures' && 
            child.getAttr('subCategory') === 'shelf'
          )
        ) as Group[]

        const allProducts = shelves.flatMap(shelf => 
          shelf.getChildren(child => 
            child.getAttr('category').toLowerCase() === 'product'
          )
        ).filter(p => p.id() !== props.product.id)

        return { shelves, allProducts }
      }
      const yOffsetProductOnTopOfShelf = 3
      // Position calculation helpers
      const getShelfPositionData = (shelf: Group) => {
        const shelfPos = shelf.getAbsolutePosition()
        console.log('shelfPos', shelfPos)
        const shelfData = shelf.getAttr('shelfData')
        console.log('shelfData', shelfData)
        console.log(absolutePos.x - shelfPos.x)
        console.log(absolutePos.y - shelfPos.y)
        
        return {
          relativeX: absolutePos.x - shelfPos.x,
          relativeY: (- props.product.height) - yOffsetProductOnTopOfShelf,
          shelfPos,
          shelfData
        }
      }

      const getProductPositionData = (product: Node) => {
        const productPos = product.getAbsolutePosition()
        console.log('productPos', productPos)
        const yOffsetProductOnTopOfProduct = 3;
        const relativeY = product.getAttr('y') - props.product.height - yOffsetProductOnTopOfProduct;
        console.log('relativeY', relativeY);
        return {
          relativeX: product.getAttr('x'),
          relativeY: relativeY,
          parentGroup: product.getParent(),
          productAttrs: product.getAttrs()
        }
      }

      // Determine drag result type
      const { shelves, allProducts } = findElements()
      
      const targetShelf = shelves.find(shelf => {
        const { shelfPos, shelfData } = getShelfPositionData(shelf)
        const shelfWidth = shelf.getAttr('width')
        const shelfHeight = shelf.getAttr('height')
        const yTolerance = 10

        return shelfData && shelfWidth && shelfHeight && (
          absolutePos.x >= shelfPos.x &&
          absolutePos.x <= shelfPos.x + shelfWidth &&
          absolutePos.y + props.product.height + yTolerance >= shelfPos.y &&
          absolutePos.y + props.product.height <= shelfPos.y + shelfHeight
        )
      })

      const targetProduct = targetShelf ? null : allProducts.find(product => {
        console.log('product', product);
        const productPos = product.getAbsolutePosition()
        const yTolerance = 10
        const xTolerance = 5
        return (
          absolutePos.x + product.getAttr('width') + xTolerance >= productPos.x  &&
          absolutePos.x <= productPos.x + product.getAttr('width') + xTolerance &&
          absolutePos.y + yTolerance >= productPos.y - product.getAttr('height') &&
          absolutePos.y <= productPos.y + product.getAttr('height')
        )
      })

      // Handle final positioning
      const handlePositioning = () => {
        console.log('props.product', props.product);
        console.log('targetShelf', targetShelf)
        if (targetShelf) {
          const { relativeX, relativeY, shelfPos, shelfData } = getShelfPositionData(targetShelf)
          node.moveTo(targetShelf).position({ x: relativeX, y: relativeY })
          return {
            x: absolutePos.x,
            y: absolutePos.y - props.product.height,
            relativeX,
            relativeY,
            shelfId: shelfData.id,
            sectionId: shelfData.sectionId
          }
        }
        console.log('targetProduct', targetProduct)
        if (targetProduct) {
          console.log('targetProduct', targetProduct)
          const { relativeX, relativeY, parentGroup, productAttrs } = getProductPositionData(targetProduct)
          console.log('relative(X,Y)', relativeX,relativeY)
          node.moveTo(parentGroup).position({ x: relativeX, y: relativeY })
          return {
            x: absolutePos.x,
            y: absolutePos.y,
            relativeX,
            relativeY,
            shelfId: productAttrs.shelfId,
            sectionId: productAttrs.sectionId,
            parentProductId: targetProduct.id()
          }
        }

        node.position(originalPosition.value)
        return {
          ...originalPosition.value,
          relativeX: originalPosition.value.x,
          relativeY: originalPosition.value.y
        }
      }

      const positionData = handlePositioning()
      emit('dragend', {
        id: props.product.id,
        parentProductId: null,
        ...positionData
      })
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