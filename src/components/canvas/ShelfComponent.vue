<template>
  <v-group
    :config="{
      id: shelf.id,
      x: shelf.sectionId ? shelf.relativeX : shelf.x,
      y: shelf.sectionId ? shelf.relativeY : shelf.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'shelf',
      width: shelf.width,
      height: shelf.height,
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
import type { Shelf, Product } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import ProductComponent from './ProductComponent.vue'
import { useDebugStore } from '../../composables/useDebugStore'
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import { useSelectionStore } from '../../composables/useSelectionStore'

export default defineComponent({
  name: 'ShelfComponent',
  components: {
    ProductComponent
  },
  props: {
    shelf: {
      type: Object as PropType<Shelf>,
      required: true
    },
    products: {
      type: Array as PropType<Product[]>,
      required: true
    }
  },
  emits: ['product-drag', 'product-detach', 'update-position'],
  setup(props, { emit }) {
    const selectionStore = useSelectionStore()
    const { updateShelfPosition } = usePlanogramStore()
    const debugStore = useDebugStore()
    const shelfConfig = {
      width: props.shelf.width,
      height: props.shelf.height,
      fill: '#9e9e9e',
      stroke: '#757575',
      strokeWidth: 1,
      category: 'fixtures',
      subCategory: 'shelf'
    }

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getStage()?.getPointerPosition()
      debugStore.setDragNodePosition(pos ?? { x: 0, y: 0 })
      
      // Update shelf position in store
      updateShelfPosition({
        id: props.shelf.id,
        x: pos?.x || 0,
        y: pos?.y || 0,
        products: props.products.map(product => ({
          id: product.id,
          relativeX: product.relativeX ?? 0,
          relativeY: product.relativeY ?? 0
        }))
      })
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      console.log('handleDragEnd', props.shelf.id)
      debugStore.clearDragNodePosition()
      const node = e.target
      const pos = node.getAbsolutePosition()
      
      // Finalize position in store
      // finalizeShelfPosition({
      //   id: props.shelf.id,
      //   x: pos.x,
      //   y: pos.y,
      //   products: props.products
      // })
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
      // Convert to absolute position and detach from shelf
      const product = props.products.find((p: Product) => p.id === productId)
      if (product) {
        emit('product-detach', {
          productId,
          absoluteX: props.shelf.x + (product.relativeX ?? 0),
          absoluteY: props.shelf.y + (product.relativeY ?? 0)
        })
      }
    }

    const handleShelfClick = (e: KonvaEventObject<MouseEvent>) => {
      // Only clear selection if clicking directly on the shelf rectangle itself
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
      handleShelfClick
    }
  }
})
</script> 