<template>
  <v-group
    :config="{
      id: shelf.id,
      x: shelf.sectionId ? shelf.relativeX : shelf.x,
      y: shelf.sectionId ? shelf.relativeY : shelf.y,
      draggable: true,
      category: CATEGORY_FIXTURES,
      subCategory: SUB_CATEGORY_SHELF,
      width: shelf.width,
      height: shelf.height,
      sectionId: shelf.sectionId? shelf.sectionId : null,
      shelfData: {
        ...shelf,
        strictPlacement: shelf.strictPlacement
      }
    }"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @update-position="$emit('update-position', $event)"
  >
    <v-rect :config="shelfConfig" 
    @click="handleShelfClick"
    />
    <ProductComponent
      v-for="product in products"
      :key="product.id"
      :product="product"
      :relativeTo="true"
      @update-position="$emit('update-position', $event)"
    />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, type PropType, inject } from 'vue'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import ProductComponent from '../product/ProductComponent.vue'
import { useDebugStore } from '../../../composables/useDebugStore'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { 
  SHELF_STYLES, 
  DEFAULT_POSITION 
} from './constants'
import {
  CATEGORY_FIXTURES,
  SUB_CATEGORY_SHELF,
  SUB_CATEGORY_SECTION,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY,
  ATTR_SECTION_ID,
  NODE_TYPE_RECT,
  ATTR_ID
} from '../shared/constants'
import type { 
  ShelfProps,
  ShelfEmits,
  ProductDragData,
  ShelfConfig
} from './shelf-model'
import { 
  findSections,
  findIntersectingSection 
} from './utils/element-finder'
import {
  calculateShelfPosition,
  calculateProductPosition,
  calculateProductDetachPosition
} from './utils/position'

export default defineComponent({
  name: 'ShelfComponent',
  components: {
    ProductComponent
  },
  props: {
    shelf: {
      type: Object as PropType<ShelfProps['shelf']>,
      required: true
    },
    products: {
      type: Array as PropType<ShelfProps['products']>,
      required: true
    }
  },
  emits: ['product-drag', 'product-detach', 'update-position'],
  setup(props, { emit }) {
    const selectionStore = useSelectionStore()
    const planogramStore = usePlanogramStore()
    const debugStore = useDebugStore()

    const shelfConfig: ShelfConfig = {
      width: props.shelf.width,
      height: props.shelf.height,
      depth: props.shelf.depth,
      ...SHELF_STYLES,
      sectionId: props.shelf.sectionId,
      strictPlacement: props.shelf.strictPlacement
    }

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      // Don't use cancelBubble as it might cause issues with Konva's event system
      const node = e.target
      const pos = node.getStage()?.getPointerPosition()
      debugStore.setDragNodePosition(pos ?? DEFAULT_POSITION)
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      // Don't use cancelBubble as it might cause issues with Konva's event system
      console.log('handleDragEnd', props.shelf.id)
      debugStore.clearDragNodePosition()
      const node = e.target
      if(node.getAttr(ATTR_CATEGORY) !== CATEGORY_FIXTURES && 
         node.getAttr(ATTR_SUB_CATEGORY) !== SUB_CATEGORY_SHELF) return
      
      const pos = node.getAbsolutePosition()
      const stage = node.getStage();
      if (!stage) return

      // Store original position before checking for sections
      const originalX = props.shelf.sectionId ? (props.shelf.relativeX ?? 0) : (props.shelf.x ?? 0)
      const originalY = props.shelf.sectionId ? (props.shelf.relativeY ?? 0) : (props.shelf.y ?? 0)
      const originalSectionId = props.shelf.sectionId

      const sections = findSections(stage)
      const foundSection = findIntersectingSection(
        sections,
        pos,
        props.shelf.width,
        props.shelf.height
      )

      // If the shelf is already in a section and we're not finding a new section,
      // we should keep it in the original section
      if (!foundSection && originalSectionId) {
        console.log(`Shelf ${props.shelf.id} is not within any section, reverting to original section ${originalSectionId}`)
        
        // Find the original section
        const originalSection = sections.find(s => s.id() === originalSectionId)
        if (originalSection) {
          // Move back to original section
          node.moveTo(originalSection)

          node.position({
            x: originalX,
            y: originalY
          })
          node.setAttr(ATTR_SECTION_ID, originalSectionId)
          
          // Get the absolute position of the original section
          const sectionPos = originalSection.absolutePosition()
          
          // Calculate the absolute position of the shelf within the section
          const absoluteX = sectionPos.x + originalX
          const absoluteY = sectionPos.y + originalY
          
          // // Update store with original position
          planogramStore.updateShelfPosition({
            id: props.shelf.id,
            x: absoluteX,
            y: absoluteY,
            products: props.products.map(p => ({
              id: p.id,
              relativeX: p.relativeX || 0,
              relativeY: p.relativeY || 0
            }))
          })
          
          // // Finalize position with correct coordinates
          planogramStore.finalizeShelfPosition({
            id: props.shelf.id,
            x: absoluteX,
            y: absoluteY,
            products: props.products
          })
        } else {
          // If original section not found, just update position
          planogramStore.updateShelfPosition({
            id: props.shelf.id,
            x: props.shelf.x,
            y: props.shelf.y,
            products: props.products.map(p => ({
              id: p.id,
              relativeX: p.relativeX || 0,
              relativeY: p.relativeY || 0
            }))
          })
        }
      } 
      // If we found a section (either the same one or a new one)
      else if (foundSection) {
        console.log(`Shelf ${props.shelf.id} is inside section ${foundSection.id()}`)
        const positionUpdate = calculateShelfPosition(node, foundSection, pos)
        
        // Log the position update for debugging
        console.log('Position update:', positionUpdate)
        
        // // Use store method to update shelf position to ensure history tracking
        planogramStore.updateShelfPosition({
          id: props.shelf.id,
          x: positionUpdate.x,
          y: positionUpdate.y,
          products: props.products.map(p => ({
            id: p.id,
            relativeX: p.relativeX || 0,
            relativeY: p.relativeY || 0
          }))
        })
        
        // // Update shelf properties for finalizing position
        planogramStore.finalizeShelfPosition({
          id: props.shelf.id,
          x: positionUpdate.x,
          y: positionUpdate.y,
          products: props.products
        })
        
        // Manually set the section ID and relative position on the node
        node.setAttr(ATTR_SECTION_ID, foundSection.id())
        node.position({
          x: positionUpdate.relativeX,
          y: positionUpdate.relativeY
        })
      } 
      // If the shelf is not in any section and wasn't in a section before
      else {
        console.log(`Shelf ${props.shelf.id} is not within any section and was not in a section before`)
        
        // For standalone shelves, update position
        planogramStore.updateShelfPosition({
          id: props.shelf.id,
          x: pos.x,
          y: pos.y,
          products: props.products.map(p => ({
            id: p.id,
            relativeX: p.relativeX || 0,
            relativeY: p.relativeY || 0
          }))
        })
        
        // Finalize position for standalone shelf
        planogramStore.finalizeShelfPosition({
          id: props.shelf.id,
          x: pos.x,
          y: pos.y,
          products: props.products
        })
        
        // Clear section ID for standalone shelf
        node.setAttr(ATTR_SECTION_ID, null)
      }
    }

    const handleMouseEnter = (e: any) => {
      e.target.getStage().container().style.cursor = 'grab'
    }

    const handleMouseLeave = (e: any) => {
      e.target.getStage().container().style.cursor = 'default'
    }

    const handleProductDrag = (e: KonvaEventObject<DragEvent>) => {
      const productNode = e.target
      const position = calculateProductPosition(productNode, props.shelf.x, props.shelf.y)
      emit('product-drag', {
        productId: productNode.attrs[ATTR_ID],
        ...position
      })
    }

    const handleProductDragStart = (productId: string) => {
      const position = calculateProductDetachPosition(
        productId,
        props.products,
        props.shelf.x,
        props.shelf.y
      )
      if (position) {
        emit('product-detach', {
          productId,
          ...position
        })
      }
    }

    const handleShelfClick = (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()?.findOne(NODE_TYPE_RECT)) {
        selectionStore.clearSelection()
      }
    }

    return {
      shelfConfig,
      handleDragMove,
      handleDragEnd,
      handleMouseEnter,
      handleMouseLeave,
      handleProductDrag,
      handleProductDragStart,
      handleShelfClick,
      CATEGORY_FIXTURES,
      SUB_CATEGORY_SHELF
    }
  }
})
</script>
