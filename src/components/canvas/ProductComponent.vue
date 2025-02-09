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
import { useSelectionStore } from '../../composables/useSelectionStore'
import type { Rect } from 'konva/lib/shapes/Rect'

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
  emits: ['dragend', 'drag-start', 'update-position'],
  setup(props, { emit }) {
    const defaultFillColor = '#81C784';
    const selectionStore = useSelectionStore()
    const isSelected = computed(() => 
      selectionStore.selectedIds.value.includes(props.product.id)
    )

    const productConfig = computed(() => ({
      id: props.product.id, 
      width: props.product.width,
      height: props.product.height,
      fill: defaultFillColor,
      stroke: isSelected.value ? '#2196F3' : '#66bb6a',
      strokeWidth: isSelected.value ? 2 : 1,
      shadowColor: isSelected.value ? '#2196F3' : undefined,
      shadowBlur: isSelected.value ? 10 : 0,
      shadowOpacity: isSelected.value ? 0.3 : 0,
      shadowOffset: { x: 2, y: 2 },
      category: props.category,
      type: props.type
    }))

    const originalPosition = ref({ x: 0, y: 0 })
    const debugStore = useDebugStore()
    const isProductHaveCollision = ref({
      productId: null as string | null,
      hasCollision: false,
      collisionProduct: null as Node<NodeConfig> | null
    })
    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getAbsolutePosition()
      debugStore.setDragNodePosition(pos)
      
      // Keep original position update logic
      node.x(node.x())
      node.y(node.y())

      const stage = node.getStage()
      if (!stage) return
      // Get all product nodes except current one
      const allProducts = stage.find((n: Node) => 
        n.getAttr('category')?.toLowerCase() === 'product' && 
        n.getAttr('id') !== props.product.id
      )
      // Get current node's bounding box (use group position)
      const targetRect = node.getClientRect()
      // Check collisions with all other products
      allProducts.forEach((product) => {
        const productRect = product.getClientRect()
        let collisionAdjustment = 10
        // Check intersection using same logic as sample
        const isRightOf = targetRect.x > productRect.x + productRect.width - collisionAdjustment;
        const isLeftOf = targetRect.x + targetRect.width < productRect.x + collisionAdjustment;
        const isBelow = targetRect.y > productRect.y + productRect.height - collisionAdjustment ;
        const isAbove = targetRect.y + targetRect.height < productRect.y + ( collisionAdjustment+5);
        
        const hasCollision = !(isRightOf || isLeftOf || isBelow || isAbove) && 
                            product.getAttr('id') !== node.getAttr('id');

        console.debug('Collision check:', {
          targetId: node.getAttr('id'),
          productId: product.getAttr('id'),
          targetX: targetRect.x,
          productRight: productRect.x + productRect.width,
          isRightOf,
          targetRight: targetRect.x + targetRect.width,
          productX: productRect.x,
          isLeftOf,
          targetY: targetRect.y,
          productBottom: productRect.y + productRect.height,
          isBelow,
          targetBottom: targetRect.y + targetRect.height,
          productY: productRect.y,
          isAbove,
          hasCollision
        });

        // Update color based on collision
        if(hasCollision){
          isProductHaveCollision.value = {productId:node.getAttr('id'),hasCollision:hasCollision,collisionProduct:product as Node<NodeConfig>};
            product.setAttrs({
              fill: 'red'
            });
        } else{
            product.setAttrs({
            fill: defaultFillColor
          });
        }
      })
      // Batch draw to update all changes at once
      node.getLayer()?.batchDraw()
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
        const shelfData = shelf.getAttr('shelfData')
        
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
        const productId = node.getAttr('id');
        //console.log({isProductHaveCollision});
        //if product has collision then revert to original postiion
        if(isProductHaveCollision.value.productId === productId && isProductHaveCollision.value.hasCollision) {
          let collisionProduct = isProductHaveCollision.value.collisionProduct;
          collisionProduct?.setAttrs({
            fill: defaultFillColor
          });
           //reset isProductHaveCollision
          isProductHaveCollision.value = {
            productId: null,
            hasCollision: false,
            collisionProduct: null as Node<NodeConfig> | null
          }

          //back to original position
          // node.position(originalPosition.value)
         
          // return {
          //   ...originalPosition.value,
          //   relativeX: originalPosition.value.x,
          //   relativeY: originalPosition.value.y
          // }
        }
        if (targetShelf) {
          console.log({targetShelf});
          const { relativeX, relativeY, shelfPos, shelfData } = getShelfPositionData(targetShelf)
          const shelfChildren = targetShelf.getChildren()
          node.moveTo(targetShelf)
          targetShelf.add(node)
          node.position({ x: relativeX, y: relativeY })
          node.zIndex(shelfChildren.length)
          return {
            x: absolutePos.x,
            y: absolutePos.y - props.product.height,
            relativeX,
            relativeY,
            shelfId: shelfData.id,
            sectionId: shelfData.sectionId
          }
        }
        if (targetProduct) {
          console.log('targetProduct', targetProduct)
          const { relativeX, relativeY, parentGroup, productAttrs } = getProductPositionData(targetProduct)
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

        //back to original position
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
      
      // Emit the position update
      emit('update-position', {
        id: props.product.id,
        x: positionData.x,
        y: positionData.y,
        relativeX: positionData.relativeX,
        relativeY: positionData.relativeY
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
      // Select product when drag starts
      selectionStore.selectOne(props.product.id)
      
      emit('drag-start', props.product.id)
    }

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      if (!metaPressed) {
        selectionStore.selectOne(props.product.id)
      } else {
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