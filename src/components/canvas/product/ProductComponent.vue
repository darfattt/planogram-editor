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
      width: product.width,
      depth: product.depth,
      code: product.code,
      color: product.color
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <v-rect :config="productConfig" v-if="!product.image || !showProductImages" />
    <v-image 
      v-else
      :config="{
        ...productConfig,
        image: imageObj,
      }"
    />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType, ref, onMounted } from 'vue'
import type { KonvaEventObject, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Node } from 'konva/lib/Node'
import { useDebugStore } from '../../../composables/useDebugStore'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import { storeToRefs } from 'pinia'
import type { Product } from '../../../types'
import { 
  DEFAULT_FILL_COLOR, 
  SELECTED_STYLES, 
  DEFAULT_STYLES,
  COLLISION_ADJUSTMENT,
  Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF
} from './constants'
import { 
  CATEGORY_PRODUCT,
  DEFAULT_CATEGORY_PRODUCT,
  DEFAULT_TYPE,
  ATTR_CATEGORY,
  ATTR_ID,
  CATEGORY_FIXTURES,
  ATTR_SUB_CATEGORY,
  SUB_CATEGORY_SECTION,
  ATTR_SECTION_ID,
  Y_TOLERANCE
} from '../shared/constants'
import type { 
  ProductCollisionState, 
  PositionData, 
  ShelfPositionData,
  ProductPositionData
} from './product-model'
import { handleProductCollisions } from './utils/collision'
import { findElements, findTargetShelf, findTargetProduct } from './utils/element-finder'
import { calculatePositionData } from './utils/position'

export default defineComponent({
  name: 'ProductComponent',
  props: {
    product: {
      type: Object as PropType<Product>,
      required: true
    },
    category: {
      type: String,
      default: DEFAULT_CATEGORY_PRODUCT
    },
    type: {
      type: String,
      default: DEFAULT_TYPE
    },
    relativeTo: {
      type: Boolean,
      default: false
    }
  },
  emits: ['dragend', 'drag-start', 'update-position'],
  setup(props, { emit }) {
    const selectionStore = useSelectionStore()
    const store = usePlanogramStore()
    const { showProductImages } = storeToRefs(store)
    const imageObj = ref<HTMLImageElement | null>(null)

    onMounted(() => {
      if (props.product.image) {
        const img = new Image()
        img.src = props.product.image
        img.onload = () => {
          imageObj.value = img
        }
      }
    })

    const isSelected = computed(() => 
      selectionStore.selectedIds.value.includes(props.product.id)
    )

    const productConfig = computed(() => ({
      id: props.product.id, 
      width: props.product.width,
      height: props.product.height,
      fill: props.product.color? props.product.color : DEFAULT_FILL_COLOR,
      ...(isSelected.value ? SELECTED_STYLES : DEFAULT_STYLES),
      category: props.category,
      type: props.type,
      code: props.product.code,
      color : props.product.color? props.product.color : DEFAULT_FILL_COLOR,
    }))

    const originalPosition = ref({ x: 0, y: 0 })
    const debugStore = useDebugStore()
    const isProductHaveCollision = ref<ProductCollisionState>({
      productId: null,
      hasCollision: false,
      collisionProduct: null
    })

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getAbsolutePosition()
      debugStore.setDragNodePosition(pos)
      
      node.x(node.x())
      node.y(node.y())

      const stage = node.getStage()
      if (!stage) return

      const allProducts = stage.find((n: Node) => 
        n.getAttr(ATTR_CATEGORY)?.toLowerCase() === CATEGORY_PRODUCT && 
        n.getAttr(ATTR_ID) !== props.product.id
      )

      isProductHaveCollision.value = handleProductCollisions(
        node, 
        allProducts, 
        props.product.id,
        props.product.color?props.product.color : DEFAULT_FILL_COLOR
      )
      
      node.getLayer()?.batchDraw()
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      debugStore.clearDragNodePosition()
      const node = e.target
      const absolutePos = node.getAbsolutePosition()
      const stage = node.getStage()
      if (!stage) return

      const { shelves, allProducts } = findElements(stage)
      
      // Use Y_TOLERANCE constant for finding target shelf
      const targetShelf = findTargetShelf(
        shelves, 
        absolutePos, 
        props.product.height,
        Y_TOLERANCE
      )

      // Use Y_TOLERANCE constant for finding target product
      const targetProduct = targetShelf ? null : findTargetProduct(
        allProducts.filter(p => p.id() !== props.product.id),
        absolutePos,
        props.product.height,
        Y_TOLERANCE
      )

      // If we're in a section but not directly on a shelf, try to find the nearest shelf below
      if (!targetShelf && !targetProduct) {
        const sections = stage.find((n: Node) => 
          n.getAttr(ATTR_CATEGORY)?.toLowerCase() === CATEGORY_FIXTURES && 
          n.getAttr(ATTR_SUB_CATEGORY)?.toLowerCase() === SUB_CATEGORY_SECTION
        )
        
        // Check if we're inside any section
        for (const section of sections) {
          const sectionBox = section.getClientRect()
          if (
            absolutePos.x >= sectionBox.x && 
            absolutePos.x <= sectionBox.x + sectionBox.width &&
            absolutePos.y >= sectionBox.y && 
            absolutePos.y <= sectionBox.y + sectionBox.height
          ) {
            // We're inside a section, find the nearest shelf below
            const sectionShelves = shelves.filter(shelf => 
              shelf.getAttr(ATTR_SECTION_ID) === section.id()
            )
            
            // Sort shelves by y position (top to bottom)
            const sortedShelves = [...sectionShelves].sort((a, b) => a.y() - b.y())
            
            // Find the first shelf that's below our current position
            const nearestShelfBelow = sortedShelves.find(shelf => 
              shelf.y() > absolutePos.y
            )
            
            if (nearestShelfBelow) {
              // Use this shelf as our target
              const positionData = calculatePositionData(
                node,
                nearestShelfBelow,
                null,
                absolutePos,
                props.product.height,
                selectionStore.productGap,
                originalPosition.value
              )
              
              // Update product position
              const { updateProductPosition } = usePlanogramStore()
              updateProductPosition({
                id: props.product.id,
                x: positionData.x,
                y: positionData.y,
                relativeX: positionData.relativeX,
                relativeY: positionData.relativeY,
                shelfId: positionData.shelfId,
                sectionId: positionData.sectionId,
              })
              
              emit('dragend', {
                id: props.product.id,
                parentProductId: null,
                ...positionData
              })
              
              return
            }
          }
        }
      }

      const positionData = calculatePositionData(
        node,
        targetShelf,
        targetProduct,
        absolutePos,
        props.product.height,
        selectionStore.productGap,
        originalPosition.value
      )

      // Reset collision state if needed
      if(isProductHaveCollision.value.productId === node.getAttr(ATTR_ID) && 
         isProductHaveCollision.value.hasCollision) {
        isProductHaveCollision.value.collisionProduct?.setAttrs({
          fill: DEFAULT_FILL_COLOR
        })
        isProductHaveCollision.value = {
          productId: null,
          hasCollision: false,
          collisionProduct: null
        }
      }
      if(positionData.foundProduct || positionData.foundShelf) {
        const { updateProductPosition } = usePlanogramStore()
        updateProductPosition({
          id: props.product.id,
          x: positionData.x,
          y: positionData.y,
          relativeX: positionData.relativeX,
          relativeY: positionData.relativeY,
          shelfId: positionData.shelfId,
          sectionId: positionData.sectionId,
        })
      }

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
      handleClick,
      showProductImages,
      imageObj
    }
  }
})
</script>
