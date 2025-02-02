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
        :config="{
          ...sectionConfig(section),
          category: 'fixtures',
          subCategory: 'section'
        }"
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
          @update="updateShelfPosition"
         
        />
        
        <ProductComponent
          v-for="product in getProductsBySection(section.id)"
          :key="product.id"
          :product="product"
          category="product"
          type="productX"
          @update="updateProductPosition"
        />
      </v-group>

      <!-- Standalone items -->
      <ShelfComponent
        v-for="shelf in standaloneShelves"
        :key="shelf.id"
        :shelf="shelf"
        @update="updateShelfPosition"
      />
      
      <ProductComponent
        v-for="product in standaloneProducts"
        :key="product.id"
        :product="product"
        category="product"
        type="productX"
        @dragend="handleProductDrop"
      />
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
import useDebugStore from '../../composables/useDebugStore'
import DebugOverlay from '../../components/DebugOverlay.vue'
import type { Section, Shelf } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'

export default defineComponent({
  components: {
    ShelfComponent,
    ProductComponent,
  },
  emits: ['drop', 'dragover'],
  setup() {
    const {
      sections,
      shelves,
      products,
      standaloneProducts,
      standaloneShelves,
      getShelvesBySection,
      getProductsBySection,
      initializeTestData
    } = usePlanogramStore()

    const { stageRef, getAbsolutePosition, findSectionAtPosition } = useDragAndDrop()
    const { debugMode, coordinates } = useDebugStore()

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
      if (!debugMode.value || !stageRef.value) return
      
      const stage = stageRef.value.getStage()
      if (!stage) return

      // Get pointer position directly from stage
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      // Update coordinates directly without transformation
      coordinates.value = {
        x: pos.x,
        y: pos.y
      }
    }

    // Add remaining logic and event handlers here
    // ...

    const sectionConfig = (section: Section) => ({
      id: section.id,
      x: section.x,
      y: section.y,
      draggable: true
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

    const updateShelfPosition = (shelfId: string) => {
      const shelf = shelves.value.find((s: Shelf) => s.id === shelfId)
      if (!shelf || !stageRef.value) return
      
      const group = stageRef.value.getStage().findOne(`#${shelfId}`)
      if (!group) return

      // Get absolute position from group
      const absPos = group.getAbsolutePosition()
      //console.log('Current absolute position:', absPos.x, absPos.y)
      
      // Calculate relative position if in section
      if (shelf.sectionId) {
        const section = sections.value.find(sec => sec.id === shelf.sectionId)
        if (section) {
          shelf.relativeX = absPos.x - section.x
          shelf.relativeY = absPos.y - section.y
          //console.log('Relative to section:', shelf.relativeX, shelf.relativeY)
        }
      }

      // Update both absolute and bottom-left coordinates
      shelf.x = absPos.x
      shelf.y = absPos.y + shelf.height
      //console.log('Updated shelf coordinates:', shelf.x, shelf.y)
    }

    const finalizeShelfPosition = (shelfId: string) => {
      console.log('finalizeShelfPosition', shelfId)
      const shelf = shelves.value.find(s => s.id === shelfId)
      if (!shelf || !stageRef.value) return

      const group = stageRef.value.getStage().findOne(`#${shelfId}`)
      if (!group) return

      const absPos = group.getAbsolutePosition()
      console.log('Final absolute position:', absPos.x, absPos.y)

      const newSection = findSectionAtPosition(absPos, sections.value)
      if (!newSection) {
        console.log('No section found - resetting position')
        if (shelf.sectionId) {
          group.x(shelf.relativeX!)
          group.y(shelf.relativeY!)
        }
        shelf.sectionId = null
        return
      }

      // Calculate relative position with proper offset
      shelf.sectionId = newSection.id
      shelf.relativeX = absPos.x - newSection.x
      shelf.relativeY = absPos.y - newSection.y
      shelf.x = absPos.x
      shelf.y = absPos.y + shelf.height
      
      console.log('Finalized positions:', {
        relative: [shelf.relativeX, shelf.relativeY],
        absolute: [shelf.x, shelf.y],
        section: [newSection.x, newSection.y]
      })
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

    const handleProductDrop = ({ id, x, y }: { id: string; x: number; y: number }) => {
      console.log('handleProductDrop', id, x, y)
      const product = products.value.find(p => p.id === id)
      if (!product) return

      // Update product position directly
      product.x = x
      product.y = y
      // Add your shelf snapping logic here
      updateProductPosition(id)
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

    const handleShelfDragEnd = (payload: {
      id: string
      x: number
      y: number
      relativeX: number
      relativeY: number
    }) => {
      console.log('Received shelf dragend:', payload.id)
      finalizeShelfPosition(payload.id)
    }

    return {
      stageRef,
      stageConfig,
      sections,
      shelves,
      products,
      standaloneProducts,
      standaloneShelves,
      getShelvesBySection,
      getProductsBySection,
      sectionConfig,
      sectionRectConfig,
      updateSectionPosition,
      updateProductPosition,
      updateShelfPosition,
      finalizeShelfPosition,
      handleDragOver,
      handleDrop,
      handleProductDrop,
      handleMouseMove,
      handleSectionHover,
      handleSectionHoverEnd,
      handleShelfDragEnd
    }
  }
})
</script>

<style scoped>
.konvajs-content {
  background-color: #fff;
}</style>
