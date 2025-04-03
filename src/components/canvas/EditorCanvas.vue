<template>
  <v-stage
    ref="stageRef"
    :config="stageConfig"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @pointermove="handleMouseMove"
    @click="handleStageClick"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleStageDrag"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    v-bind="$attrs"
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
        @click="handleSectionClick"
      >
        <v-rect :config="sectionRectConfig(section)" />
        
        <!-- Nested components -->
        <ShelfComponent
          v-for="shelf in getShelvesBySection(section.id)"
          :key="shelf.id"
          :shelf="shelf"
          :products="getProductsByShelf(shelf.id)"
          @update-position="handleProductPositionUpdate"
        >
        </ShelfComponent>
        </v-group>

      <!-- Standalone Products -->
      <ProductComponent
        v-for="product in standaloneProducts"
        :key="product.id"
        :product="product"
      />
      <ShelfComponent
          v-for="shelf in standaloneShelves"
          :key="shelf.id"
          :shelf="shelf"
          :products="getProductsByShelf(shelf.id)"
          @update-position="handleProductPositionUpdate"
        >
        </ShelfComponent>
    </v-layer>
  </v-stage>
  <!-- <div>
    <div>Standalone: {{ standaloneProducts.length }}</div>
    <div>Shelf 1: {{ getProductsByShelf('shelf1').length }}</div>
    <div>Shelf 2: {{ getProductsByShelf('shelf2').length }}</div>
  </div> -->
  <div class="zoom-controls">
    <div class="zoom-level">{{ Math.round(scale.x * 100) }}%</div>
    <button @click="zoomIn" class="zoom-btn" title="Zoom In (Ctrl+Plus)">+</button>
    <button @click="zoomOut" class="zoom-btn" title="Zoom Out (Ctrl+Minus)">-</button>
    <button @click="resetZoom" class="zoom-btn" title="Reset Zoom (Ctrl+0)">Reset</button>
    <div class="help-icon" title="Use mouse wheel to zoom in/out. Use middle mouse button to pan the canvas.">?</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import useDragAndDrop from '../../composables/useDragAndDrop'
import ShelfComponent from '../../components/canvas/shelf/ShelfComponent.vue'
import ProductComponent from '../../components/canvas/product/ProductComponent.vue'
import { v4 as uuidv4 } from 'uuid'
import { useDebugStore } from '../../composables/useDebugStore'
import type { Section, DraggedItem, Shelf } from '../../types'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useSelectionStore } from '../../composables/useSelectionStore'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'EditorCanvas',
  inheritAttrs: false,
  emits: ['drop', 'dragover'],
  components: {
    ShelfComponent,
    ProductComponent,
  },
  setup(props, { emit }) {
    const store = usePlanogramStore()
    const { sections, shelves, products, standaloneProducts,standaloneShelves } = storeToRefs(store)
    const { getShelvesBySection, getProductsBySection, getProductsByShelf, initializeTestData, addProduct, updateProductPosition } = store

    const { stageRef } = useDragAndDrop()
    const debugStore = useDebugStore()
    const selectionStore = useSelectionStore()

    // Use ref for scale to make it reactive
    const scale = ref({ x: 1, y: 1 })
    const stagePosition = ref({ x: 0, y: 0 })
    
    // For stage dragging with middle mouse button
    const isDragging = ref(false)
    const lastPointerPosition = ref({ x: 0, y: 0 })

    const stageConfig = {
      width: window.innerWidth - 250,
      height: window.innerHeight -60,
      scale: scale.value,
      position: stagePosition.value,
      style: {
        border: '2px solid #e0e0e0'
      }
    }

    // Initialize test data on component mount
    initializeTestData()

    // Add cache map at the top of setup
    const shelfPositionCache = new Map<string, { x: number; y: number }>()
    
    // Add keyboard shortcuts for zooming
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if Ctrl key is pressed
      if (!e.ctrlKey) return;
      
      switch (e.key) {
        case '+': // Ctrl + Plus
        case '=': // Ctrl + Equals (same key as plus without shift)
          e.preventDefault();
          zoomIn();
          break;
        case '-': // Ctrl + Minus
          e.preventDefault();
          zoomOut();
          break;
        case '0': // Ctrl + 0
          e.preventDefault();
          resetZoom();
          break;
      }
    };
    
    // Handle window resize
    const handleResize = () => {
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      // Update stage dimensions
      stage.width(window.innerWidth - 250);
      stage.height(window.innerHeight - 60);
      
      // Force update
      stage.batchDraw();
    };
    
    // Add and remove event listeners
    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
    });
    
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    });

    // Update mouse move handler
    const handleMouseMove = (e: KonvaEventObject<PointerEvent>) => {
      if (!debugStore.debugMode || !stageRef.value) return

      const stage = stageRef.value.getStage()
      if (!stage) return

      // Get pointer position directly from stage
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      // Adjust coordinates based on stage scale and position
      const stagePos = stage.position();
      const currentScale = scale.value.x;
      
      // Calculate the actual position in the stage's coordinate system
      const adjustedPos = {
        x: Math.round((pos.x - stagePos.x) / currentScale),
        y: Math.round((pos.y - stagePos.y) / currentScale)
      };
      
      // Update coordinates through store action
      debugStore.updateCoordinates(adjustedPos)
    }

    const sectionConfig = (section: Section) => ({
      id: section.id,
      x: section.x,
      y: section.y,
      draggable: true,
      category: 'fixtures',
      subCategory: 'section',
      width: section.width,
      height: section.height,
    })

    const sectionRectConfig = (section: Section) => ({
      width: section.width,
      height: section.height,
      fill: '#BBDEFB',
      stroke: '#2196f3',
      strokeWidth: 2,
      category: 'fixtures',
      subCategory: 'section'
    })

    const updateSectionPosition = (sectionId: string) => {
      const section = sections.value.find((sec: Section) => sec.id === sectionId)
      if (!section || !stageRef.value) return
      
      const stage = stageRef.value.getStage();
      const group = stage.findOne(`#${sectionId}`)
      if (!group) return
      
      // Get current scale and position
      const currentScale = scale.value.x;
      
      // Calculate boundaries considering scale
      const maxX = (stageConfig.width / currentScale) - section.width;
      const maxY = (stageConfig.height / currentScale) - section.height;
      
      // Enforce canvas boundaries
      const newX = Math.max(0, Math.min(group.x(), maxX));
      const newY = Math.max(0, Math.min(group.y(), maxY));
      
      group.x(newX);
      group.y(newY);
      
      // Use store method to update section position to ensure history tracking
      store.updateSectionPosition({
        id: sectionId,
        x: newX,
        y: newY
      });
    }

    const handleProductPositionUpdate = (payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
    }) => {
      console.log('handle Product Position update');
      updateProductPosition(payload)
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
      const shelf = shelves.value.find((s: Shelf) => s.id === payload.id)
      if (!shelf || !stageRef.value) return
      
      const stage = stageRef.value.getStage();
      const group = stage.findOne(`#${payload.id}`)
      if (!group) return
      
      // Get current scale
      const currentScale = scale.value.x;
      
      // Adjust position based on scale if needed
      const adjustedPayload = {
        ...payload,
        // If the position needs to be adjusted for scale, do it here
        // For example, if the position is in screen coordinates:
        // x: payload.x / currentScale,
        // y: payload.y / currentScale,
      };
      
      // Use store method to update shelf position to ensure history tracking
      store.updateShelfPosition(adjustedPayload)
    }

    const handleDragOver = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      emit('dragover', e)
    }

    const handleDrop = (e: KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault()
      try {
        const type = e.evt.dataTransfer?.getData('text/plain')
        if (type !== 'product') return
        
        const data = e.evt.dataTransfer?.getData('application/json')
        if (!data) return

        const item = JSON.parse(data) as DraggedItem
        const stage = stageRef.value?.getStage()
        if (!stage) return
        
        const pos = stage.getPointerPosition()
        if (!pos) return
        
        // Adjust position based on current scale and stage position
        // Convert from screen coordinates to stage coordinates
        const stagePos = stage.position();
        const currentScale = scale.value.x;
        
        // Calculate the actual position in the stage's coordinate system
        const adjustedX = (pos.x - stagePos.x) / currentScale;
        const adjustedY = (pos.y - stagePos.y) / currentScale;

        if (item.type === 'product') {
          addProduct({
            x: adjustedX - item.properties.width/2,
            y: adjustedY - item.properties.height/2,
            width: item.properties.width,
            height: item.properties.height,
            depth: item.properties.depth,
            relativeX: 0,
            relativeY: 0,
          })
        }
      } catch (error) {
        console.error('Drop error:', error)
      }
      emit('drop', e)
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

    const handleProductDetach = ({ productId, absoluteX, absoluteY }: { 
      productId: string;
      absoluteX: number;
      absoluteY: number;
    }) => {
      // Adjust position based on current scale and stage position
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      const currentScale = scale.value.x;
      const stagePos = stage.position();
      
      // Calculate the actual position in the stage's coordinate system
      // If absoluteX and absoluteY are already in stage coordinates, this may not be needed
      // If they are in screen coordinates, we need to adjust them
      const adjustedX = absoluteX / currentScale;
      const adjustedY = absoluteY / currentScale;
      
      convertToStandaloneProduct(productId, adjustedX, adjustedY);
    }

    const convertToStandaloneProduct = (productId: string, x: number, y: number) => {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        // Use store method to update product position to ensure history tracking
        updateProductPosition({
          id: productId,
          x: x,
          y: y,
          shelfId: undefined
        })
      }
    }

    // Handle mouse down for stage dragging
    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
      // Only start dragging with middle mouse button (button 1)
      if (e.evt.button === 1) {
        e.evt.preventDefault();
        
        const stage = stageRef.value?.getStage();
        if (!stage) return;
        
        isDragging.value = true;
        
        const pos = stage.getPointerPosition();
        if (pos) {
          lastPointerPosition.value = pos;
        }
        
        // Change cursor to grabbing
        stage.container().style.cursor = 'grabbing';
      }
    };
    
    // Handle stage dragging
    const handleStageDrag = (e: KonvaEventObject<MouseEvent>) => {
      if (!isDragging.value) return;
      
      e.evt.preventDefault();
      
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      // Calculate how far the pointer has moved
      const dx = pos.x - lastPointerPosition.value.x;
      const dy = pos.y - lastPointerPosition.value.y;
      
      // Update stage position
      const newPos = {
        x: stage.x() + dx,
        y: stage.y() + dy
      };
      
      stage.position(newPos);
      stagePosition.value = newPos;
      
      // Update last pointer position
      lastPointerPosition.value = pos;
      
      // Force update
      stage.batchDraw();
    };
    
    // Handle mouse up to end dragging
    const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
      // Only handle if we were dragging
      if (isDragging.value) {
        e.evt.preventDefault();
        
        const stage = stageRef.value?.getStage();
        if (!stage) return;
        
        isDragging.value = false;
        
        // Reset cursor
        stage.container().style.cursor = 'default';
      }
    };
    
    // Handle mouse leave to end dragging if mouse leaves the canvas
    const handleMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
      // Only handle if we were dragging
      if (isDragging.value) {
        e.evt.preventDefault();
        
        const stage = stageRef.value?.getStage();
        if (!stage) return;
        
        isDragging.value = false;
        
        // Reset cursor
        stage.container().style.cursor = 'default';
      }
    };

    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
      // Clear selection when clicking empty canvas
      if (e.target === e.target.getStage()) {
        selectionStore.clearSelection()
      }
    }

    const handleSectionClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true // Stop event from reaching stage
      
      if (e.target.attrs.category === 'fixtures') {
        selectionStore.clearSelection()
      }
    }

    const handleShelfClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true // Stop event from reaching section/stage
      //selectionStore.clearSelection()
      //todo select shelf
    }

    // Zoom functions
    const scaleBy = 1.1;
    
    const zoomStage = (newScale: number, centerPoint?: { x: number, y: number }) => {
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      const oldScale = scale.value.x;
      
      // Limit scale to reasonable bounds
      const limitedScale = Math.max(0.1, Math.min(newScale, 5));
      
      // If no center point is provided, use the center of the stage
      const center = centerPoint || {
        x: stage.width() / 2,
        y: stage.height() / 2
      };
      
      // Get stage position
      const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      
      // Calculate new position
      const newPos = {
        x: center.x - mousePointTo.x * limitedScale,
        y: center.y - mousePointTo.y * limitedScale,
      };
      
      // Update scale and position
      scale.value = { x: limitedScale, y: limitedScale };
      stagePosition.value = newPos;
      
      // Apply to stage
      stage.scale({ x: limitedScale, y: limitedScale });
      stage.position(newPos);
      
      // Force update
      stage.batchDraw();
    };
    
    // Handle wheel event for zooming
    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      const oldScale = scale.value.x;
      
      // Get pointer position
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      // Calculate new scale
      // Zoom in: e.evt.deltaY < 0, Zoom out: e.evt.deltaY > 0
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      
      // Zoom relative to pointer position
      zoomStage(newScale, pointer);
    };
    
    // Button zoom functions
    const zoomIn = () => {
      const newScale = scale.value.x * scaleBy;
      zoomStage(newScale);
    };
    
    const zoomOut = () => {
      const newScale = scale.value.x / scaleBy;
      zoomStage(newScale);
    };
    
    const resetZoom = () => {
      const stage = stageRef.value?.getStage();
      if (!stage) return;
      
      // Reset scale and position
      scale.value = { x: 1, y: 1 };
      stagePosition.value = { x: 0, y: 0 };
      
      // Apply to stage
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      
      // Force update
      stage.batchDraw();
    };

    return {
      stageRef,
      stageConfig,
      scale,
      stagePosition,
      isDragging,
      lastPointerPosition,
      sections,
      shelves,
      products,
      standaloneProducts,
      standaloneShelves,
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
      handleProductDetach,
      handleStageClick,
      handleSectionClick,
      handleShelfClick,
      handleProductPositionUpdate,
      handleWheel,
      handleMouseDown,
      handleStageDrag,
      handleMouseUp,
      handleMouseLeave,
      zoomIn,
      zoomOut,
      resetZoom
    }
  }
})
</script>

<style scoped>
.konvajs-content {
  background-color: #fff;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 5px;
  z-index: 1000;
  align-items: center;
}

.zoom-level {
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-right: 5px;
}

.zoom-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: white;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.zoom-btn:hover {
  background-color: #f5f5f5;
}

.zoom-btn:last-child {
  width: auto;
  border-radius: 18px;
  padding: 0 10px;
  font-size: 14px;
}

.help-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  cursor: help;
  margin-left: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
