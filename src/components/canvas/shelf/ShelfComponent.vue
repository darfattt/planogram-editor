<template>
  <v-group
    :config="{
      id: shelf.id,
      x: shelf.sectionId ? shelf.relativeX : shelf.x,
      y: shelf.sectionId ? shelf.relativeY : shelf.y,
      draggable: true,
      category: SHELF_CATEGORY,
      subCategory: SHELF_SUB_CATEGORY,
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
  SHELF_CATEGORY, 
  SHELF_SUB_CATEGORY,
  SECTION_CATEGORY,
  SECTION_SUB_CATEGORY,
  DEFAULT_POSITION 
} from './constants'
import type { 
  ShelfProps,
  ShelfEmits,
  ProductDragData,
  ShelfConfig,
  SectionBounds,
  ShelfBounds,
  SectionIntersection
} from './shelf-model'

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
      if(node.getAttr('category') !== SHELF_CATEGORY && node.getAttr('subCategory') !== SHELF_SUB_CATEGORY) return
      if (node.getAttr('sectionId') != null) return;
      
      const pos = node.getAbsolutePosition()
      const stage = node.getStage();
      if (!stage) return

      const sections = stage.find((node: Node) => 
          node.getType() === 'Group' && 
          node.getAttr('category') === SECTION_CATEGORY && 
          node.getAttr('subCategory') === SECTION_SUB_CATEGORY
      )
      
      let foundSection = null;
      
      for (const section of sections) {
        const bounds: SectionBounds = {
          sectionX: section.x(),
          sectionY: section.y(),
          sectionWidth: section.width(),
          sectionHeight: section.height(),
          shelfWidth: props.shelf.width,
          shelfHeight: props.shelf.height
        }
        
        const shelfBounds: ShelfBounds = {
          shelfLeft: pos.x,
          shelfRight: pos.x + bounds.shelfWidth,
          shelfTop: pos.y,
          shelfBottom: pos.y + bounds.shelfHeight
        }
        
        const intersection: SectionIntersection = {
          sectionRight: bounds.sectionX + bounds.sectionWidth,
          sectionBottom: bounds.sectionY + bounds.sectionHeight
        }

        console.log(`Checking section ${section.id()} bounds: X ${bounds.sectionX}-${intersection.sectionRight}, Y ${bounds.sectionY}-${intersection.sectionBottom}. Shelf bounds: ${shelfBounds.shelfLeft}-${shelfBounds.shelfRight}, ${shelfBounds.shelfTop}-${shelfBounds.shelfBottom}`)

        if (
          shelfBounds.shelfLeft < intersection.sectionRight &&
          shelfBounds.shelfRight > bounds.sectionX &&
          shelfBounds.shelfTop < intersection.sectionBottom &&
          shelfBounds.shelfBottom > bounds.sectionY
        ) {
          foundSection = section;
          break;
        }
      }

      if (foundSection) {
        console.log(`Shelf ${props.shelf.id} is inside section ${foundSection.id()}`)
        const sectionX = foundSection.x()
        const sectionY = foundSection.y()
        
        node.moveTo(foundSection)
        node.position({
          x: 0,
          y: pos.y - sectionY
        })

        props.shelf.sectionId = foundSection.id()
        props.shelf.x = sectionX
        props.shelf.y = pos.y
        props.shelf.relativeX = 0
        props.shelf.relativeY = pos.y - sectionY
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
      
      emit('product-drag', {
        productId: productNode.attrs.id,
        x: productNode.x() - props.shelf.x,
        y: productNode.y() - props.shelf.y
      })
    }

    const handleProductDragStart = (productId: string) => {
      const product = props.products.find(p => p.id === productId)
      if (product) {
        emit('product-detach', {
          productId,
          absoluteX: props.shelf.x + (product.relativeX ?? 0),
          absoluteY: props.shelf.y + (product.relativeY ?? 0)
        })
      }
    }

    const handleShelfClick = (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()?.findOne('Rect')) {
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
      SHELF_CATEGORY,
      SHELF_SUB_CATEGORY
    }
  }
})
</script>
