<template>
  <v-stage
    ref="stageRef"
    :config="stageConfig"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @pointermove="handleMouseMove"
  >
    <v-layer>
      <!-- Sections -->
        <v-group
        v-for="section in sections"
        :key="section.id"
        :config="sectionConfig(section)"
        @dragmove="updateSectionPosition(section.id)"
        @mouseenter="handleSectionHover"
        @mouseleave="handleSectionHoverEnd"
      >
        <v-rect :config="sectionRectConfig(section)" />
        
        <!-- Nested components -->
        <ShelfComponent
          v-for="shelf in getShelvesBySection(section.id)"
          :key="shelf.id"
          :shelf="shelf"
          :products="getProductsByShelf(shelf.id)"
          @update="updateShelfPosition"
        >
        </ShelfComponent>
      </v-group>
<!-- 
      <ProductComponent
        v-for="product in standaloneProducts"
        :key="product.id"
        :product="product"
        category="product"
        type="productX"
        @dragend="handleProductDrop"
      /> -->
    </v-layer>
  </v-stage>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import usePlanogramStore from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from '../../components/canvas/ShelfComponent.vue'
import ProductComponent from '../../components/canvas/ProductComponent.vue'
import { v4 as uuidv4 } from 'uuid'
import { useDebugStore } from '../../composables/useDebugStore'
import type { Section } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'

export default defineComponent({
  components: {
    ShelfComponent,
    ProductComponent,
  },
  setup() {
    const {
      sections,
      shelves,
      products,
      getShelvesBySection,
      getProductsBySection,
      getProductsByShelf,
      initializeTestData
    } = usePlanogramStore()

    const { stageRef, findSectionAtPosition } = useDragAndDrop()
    const debugStore = useDebugStore()

    const stageConfig = {
      width: window.innerWidth - 250,
      height: window.innerHeight,
      scale: { x: 1, y: 1 },
      style: {
        border: '2px solid #e0e0e0'
      }
    }

    // Initialize test data on component mount
    initializeTestData()

    // Add cache map at the top of setup
    const shelfPositionCache = new Map<string, { x: number; y: number }>()

    // Update mouse move handler
    const handleMouseMove = (e: KonvaEventObject<PointerEvent>) => {
      if (!debugStore.debugMode || !stageRef.value) return

      const stage = stageRef.value.getStage()
      if (!stage) return

      // Get pointer position directly from stage
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      // Update coordinates through store action
      debugStore.updateCoordinates(pos)
    }

    // Add remaining logic and event handlers here
    // ...

    const sectionConfig = (section: Section) => ({
      id: section.id,
      x: section.x,
      y: section.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'section'
    })

    const sectionRectConfig = (section: any) => ({
      width: section.width,
      height: section.height,
      fill: '#BBDEFB',
      stroke: '#2196f3',
      strokeWidth: 2
    })

    const updateSectionPosition = (sectionId: string) => {
      const section = sections.value.find((sec: Section) => sec.id === sectionId)
      if (!section || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${sectionId}`)
      if (!group) return

      // Enforce canvas boundaries
      const maxX = stageConfig.width - section.width
      const maxY = stageConfig.height - section.height
      const newX = Math.max(0, Math.min(group.x(), maxX))
      const newY = Math.max(0, Math.min(group.y(), maxY))

      group.x(newX)
      group.y(newY)
      section.x = newX
      section.y = newY
    }

    const updateProductPosition = (productId: string) => {
      const product = products.value.find(p => p.id === productId)
      if (!product || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${productId}`)
      if (!group) return

      const pos = group.getAbsolutePosition()
      let absoluteX = pos.x
      let absoluteY = pos.y

      // Update cache for shelf positions
      shelves.value.forEach((s: {
        id: string;
        sectionId?: string | null;
        relativeX?: number;
        relativeY?: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }) => {
        if (!shelfPositionCache.has(s.id)) {
          const shelfAbsX = s.sectionId 
            ? sections.value.find((sec: Section) => sec.id === s.sectionId)?.x! + s.relativeX!
            : s.x
          const shelfAbsY = s.sectionId 
            ? sections.value.find((sec: Section) => sec.id === s.sectionId)?.y! + s.relativeY!
            : s.y
          shelfPositionCache.set(s.id, { x: shelfAbsX, y: shelfAbsY })
        }
      })

      // Find target shelf using cached positions
      const targetShelf = shelves.value.find(s => {
        const { x: shelfAbsX, y: shelfAbsY } = shelfPositionCache.get(s.id)!
        return (
          absoluteX >= shelfAbsX &&
          absoluteX <= shelfAbsX + s.width &&
          absoluteY >= shelfAbsY - 20 &&
          absoluteY <= shelfAbsY + s.height + 20
        )
      })

      if (targetShelf) {
        const { x: shelfAbsX, y: shelfAbsY } = shelfPositionCache.get(targetShelf.id)!
        
        // Snap to shelf surface (top edge)
        absoluteY = shelfAbsY - product.height  // Position product on top of shelf
        
        // Clamp X position within shelf width
        absoluteX = Math.max(
          shelfAbsX,
          Math.min(absoluteX, shelfAbsX + targetShelf.width - product.width)
        )
        
        // Only update if position changed
        if (product.x !== absoluteX || product.y !== absoluteY) {
          product.x = absoluteX
          product.y = absoluteY
          product.shelfId = targetShelf.id
          product.sectionId = targetShelf.sectionId
          
          if (product.sectionId) {
            const section = sections.value.find((sec: Section) => sec.id === product.sectionId)!
            product.relativeX = absoluteX - section.x
            product.relativeY = absoluteY - section.y
          }
        }
      } else {
        console.log('No valid shelf - reverting position')
        // Revert to original position
        absoluteX = product.x
        absoluteY = product.y
      }

      // Always update position (either snapped or reverted)
      product.x = absoluteX
      product.y = absoluteY
      product.shelfId = targetShelf?.id || null
      product.sectionId = targetShelf?.sectionId || null

      // Force Konva position update
      group.x(absoluteX)
      group.y(absoluteY)
    }

    const updateShelfPosition = (payload: {
      id: string
      x: number
      y: number
      products: Array<{
        id: string
        relativeX: number
        relativeY: number
      }>
    }) => {
      const shelf = shelves.value.find(s => s.id === payload.id)
      if (!shelf || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${payload.id}`)
      if (!group) return
      // Update shelf position
      if (shelf.sectionId) {
        const section = sections.value.find(s => s.id === shelf.sectionId)
        if (section) {
          shelf.relativeX = payload.x - section.x
          shelf.relativeY = payload.y - section.y
        }
      } else {
        shelf.x = payload.x
        shelf.y = payload.y
      }

      // // Products move automatically with the group due to Konva's grouping
      // // Just update their relative positions in the store
      // payload.products.forEach(p => {
      //   const product = products.value.find(prod => prod.id === p.id)
      //   if (product) {
      //     product.relativeX = p.relativeX
      //     product.relativeY = p.relativeY
      //   }
      // })
    }

    const handleDragOver = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
    }

    const handleDrop = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      const data = e.evt.dataTransfer?.getData('application/json')
      console.log('data', data)
      if (!data) return

      try {
        const item = JSON.parse(data)
        const pos = stageRef.value?.getPointerPosition()
        if (!pos) return

        // Add new item to store
        if (item.type === 'section') {
          sections.value.push({
            id: uuidv4(),
            x: pos.x - item.properties.width/2,
            y: pos.y - item.properties.height/2,
            width: item.properties.width,
            height: item.properties.height,
            name: 'New Section'
          })
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    }

    const handleSectionHover = (e: KonvaEventObject<MouseEvent>) => {
      if (stageRef.value?.getStage()) {
        stageRef.value.getStage().container().style.cursor = 'grab'
      }
    }

    const handleSectionHoverEnd = (e: KonvaEventObject<MouseEvent>) => {
      if (stageRef.value?.getStage()) {
        stageRef.value.getStage().container().style.cursor = 'default'
      }
    }
    // Handle product detachment
    const handleProductDetach = ({ productId, absoluteX, absoluteY }: { 
      productId: string;
      absoluteX: number;
      absoluteY: number;
    }) => {
      convertToStandaloneProduct(productId, absoluteX, absoluteY)
    }

    // Handle product re-parenting
    const convertToStandaloneProduct = (productId: string, x: number, y: number) => {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        product.shelfId = undefined
        product.x = x
        product.y = y
      }
    }

    return {
      stageRef,
      stageConfig,
      sections,
      shelves,
      products,
      getShelvesBySection,
      getProductsBySection,
      getProductsByShelf,
      sectionConfig,
      sectionRectConfig,
      updateSectionPosition,
      updateProductPosition,
      updateShelfPosition,
      handleDragOver,
      handleDrop,
      handleMouseMove,
      handleSectionHover,
      handleSectionHoverEnd,
      handleProductDetach
    }
  }
})
</script>

<style scoped>
.konvajs-content {
  background-color: #fff;
}
</style>
