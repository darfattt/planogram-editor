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
      code: product.code
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
  ATTR_ID
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
      fill: DEFAULT_FILL_COLOR,
      ...(isSelected.value ? SELECTED_STYLES : DEFAULT_STYLES),
      category: props.category,
      type: props.type,
      code: props.product.code
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
        DEFAULT_FILL_COLOR
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
      
      const targetShelf = findTargetShelf(
        shelves, 
        absolutePos, 
        props.product.height
      )

      const targetProduct = targetShelf ? null : findTargetProduct(
        allProducts.filter(p => p.id() !== props.product.id),
        absolutePos,
        props.product.height
      )

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
