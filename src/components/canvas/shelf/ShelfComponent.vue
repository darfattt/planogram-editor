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
      shelfData: shelf
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
import { defineComponent, type PropType } from 'vue'
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
    const { updateShelfPosition } = usePlanogramStore()
    const debugStore = useDebugStore()

    const shelfConfig: ShelfConfig = {
      width: props.shelf.width,
      height: props.shelf.height,
      ...SHELF_STYLES,
      sectionId: props.shelf.sectionId
    }

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getStage()?.getPointerPosition()
      debugStore.setDragNodePosition(pos ?? DEFAULT_POSITION)
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      console.log('handleDragEnd', props.shelf.id)
      debugStore.clearDragNodePosition()
      const node = e.target
      if(node.getAttr(ATTR_CATEGORY) !== CATEGORY_FIXTURES && 
         node.getAttr(ATTR_SUB_CATEGORY) !== SUB_CATEGORY_SHELF) return
      if (node.getAttr(ATTR_SECTION_ID) != null) return;
      
      const pos = node.getAbsolutePosition()
      const stage = node.getStage();
      if (!stage) return

      const sections = findSections(stage)
      const foundSection = findIntersectingSection(
        sections,
        pos,
        props.shelf.width,
        props.shelf.height
      )

      if (foundSection) {
        console.log(`Shelf ${props.shelf.id} is inside section ${foundSection.id()}`)
        const positionUpdate = calculateShelfPosition(node, foundSection, pos)
        
        // Update shelf properties
        Object.assign(props.shelf, positionUpdate)
      } else {
        console.log(`Shelf ${props.shelf.id} is not within any section`)
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
