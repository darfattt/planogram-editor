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
    @click="handleClick"
  >
    <v-rect :config="productConfig" />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType, ref } from 'vue'
import type { Product } from '../../types'
import type { KonvaEventObject, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Node } from 'konva/lib/Node'
import { useDebugStore } from '../../composables/useDebugStore'
import useClipboardStore from '../../composables/useClipboardStore'
import usePlanogramStore from '../../composables/usePlanogramStore'
import { useSelectionStore } from '../../composables/useSelectionStore'

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
    const clipboard = useClipboardStore()
    const selectionStore = useSelectionStore()

    const isSelected = computed(() => 
      selectionStore.selectedIds.value.includes(props.product.id)
    )

    const productConfig = computed(() => ({
      id: props.product.id,
      x: props.product.x,
      y: props.product.y,
      width: props.product.width,
      height: props.product.height,
      fill: '#81C784',
      stroke: isSelected.value ? '#2196F3' : '#66bb6a',
      strokeWidth: isSelected.value ? 2 : 1,
      shadowColor: isSelected.value ? '#2196F3' : undefined,
      shadowBlur: isSelected.value ? 10 : 0,
      shadowOpacity: isSelected.value ? 0.3 : 0,
      draggable: true
    }))

    const originalPosition = ref({ x: 0, y: 0 })
    const debugStore = useDebugStore()
    const { products } = usePlanogramStore()
    const originalNodeGroup = ref<Group | null>(null)

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
            child.getAttr('category') === 'product'
          )
        ).filter(p => p.id() !== props.product.id)
        console.log('allProducts', allProducts)
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

        node.moveTo(originalNodeGroup.value).position(originalPosition.value)
        
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
      // Select product when drag starts
      selectionStore.selectOne(props.product.id)
      
      originalPosition.value = {
        x: e.target.x(),
        y: e.target.y()
      }
      originalNodeGroup.value = e.target.getParent() as Group
      originalNodeGroup.value.removeName(e.target);
      
      emit('drag-start', props.product.id)
    }

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      
      if (!metaPressed) {
        // Single selection
        selectionStore.selectOne(props.product.id)
      } else {
        // Multi selection
        selectionStore.toggleSelection(props.product.id)
      }
    }

    return {
      productConfig,
      handleDragMove,
      handleDragEnd,
      handleMouseEnter,
      handleMouseLeave,
      originalPosition,
      handleDragStart,
      handleClick
    }
  }
})
</script> 