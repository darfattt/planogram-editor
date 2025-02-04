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

      // Find all relevant elements
      const sections = stage.find((node: Node) => {
        return node.getType() === 'Group' && 
               node.getAttr('category') === 'fixtures' && 
               node.getAttr('subCategory') === 'section'
      })

      // Find shelves and products
      const shelves = sections.flatMap(section => {
        const sectionGroup = section as Group
        return sectionGroup.getChildren(child => {
          return child.getAttr('category') === 'fixtures' && 
                 child.getAttr('subCategory') === 'shelf'
        })
      }).map(shelf => shelf as Group)
      console.log('Found sections:', sections.length, sections.map(s => ({ 
        id: s.id, 
        pos: s.getAbsolutePosition(),
        category: s.getAttr('category'),
        subCategory: s.getAttr('subCategory')
      })))
      const allProducts = shelves.flatMap(shelf => {
        const children = shelf.getChildren(child => {
          return child.getAttr('category') === 'product' || 
                 child.getAttr('type') === 'product'
        });
        console.log('Shelf children:', shelf.id(), children.map(c => ({ 
          id: c.id(), 
          category: c.getAttr('category'),
          type: c.getType(),
          attrs: c.getAttrs()
        })));
        return children;
      }).filter(p => p.id() !== props.product.id)
      console.log('allProducts', allProducts)
      // Find shelf or product to snap to
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
      const targetProduct = allProducts.find(product => {
        const productPos = product.getAbsolutePosition()
        const productHeight = product.getAttr('height')
        const yTolerance = 10;

        console.log('productPos', productPos)
        console.log('productHeight', productHeight)
        console.log(absolutePos.y + yTolerance ,' y >= ', productPos.y - productHeight )
        console.log(absolutePos.y,' y <= ', productPos.y + productHeight)
        console.log(absolutePos.x,' x >= ', productPos.x)
        console.log(absolutePos.x,' x <= ', productPos.x + product.getAttr('width'))
        return (
          absolutePos.x >= productPos.x &&
          absolutePos.x <= productPos.x + product.getAttr('width') &&
          absolutePos.y + yTolerance >= productPos.y - productHeight &&
          absolutePos.y <= productPos.y + productHeight
        )
      })
      console.log('targetProduct', targetProduct);
      if (targetShelf) {
        const shelfData = targetShelf.getAttr('shelfData')
        const shelfPos = targetShelf.getAbsolutePosition()
        
        // Calculate shelf-relative position
        const relativeX = absolutePos.x - shelfPos.x
        const relativeY = absolutePos.y - shelfPos.y

        node.moveTo(targetShelf)
        node.position({ x: relativeX, y: relativeY })

        emit('dragend', {
          id: props.product.id,
          x: absolutePos.x,
          y: shelfPos.y - props.product.height,
          relativeX: relativeX,
          relativeY: shelfPos.y - shelfData.y - props.product.height,
          shelfId: shelfData.id,
          sectionId: shelfData.sectionId,
          parentProductId: null
        })
      } else if (targetProduct) {
        const productPos = targetProduct.getAbsolutePosition()
        const parentGroup = targetProduct.getParent()

        // Calculate product-relative position
        const relativeX = absolutePos.x - productPos.x
        const relativeY = absolutePos.y - productPos.y - props.product.height
        console.log('relativeX', relativeX)
        console.log('relativeY', relativeY)
        node.moveTo(parentGroup)
        node.position({ x: relativeX, y: relativeY })

        emit('dragend', {
          id: props.product.id,
          x: absolutePos.x,
          y: absolutePos.y,
          relativeX: relativeX,
          relativeY: relativeY,
          shelfId: targetProduct.getAttr('shelfId'),
          sectionId: targetProduct.getAttr('sectionId'),
          parentProductId: targetProduct.id()
        })
      } else {
        node.position(originalPosition.value)
        emit('dragend', {
          id: props.product.id,
          x: originalPosition.value.x,
          y: originalPosition.value.y,
          relativeX: originalPosition.value.x,
          relativeY: originalPosition.value.y,
          parentProductId: null
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