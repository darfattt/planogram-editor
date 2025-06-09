<template>
  <v-group
    :config="{
      id: pegboard.id,
      x: pegboard.segmentId ? pegboard.relativeX : pegboard.x,
      y: pegboard.segmentId ? pegboard.relativeY : pegboard.y,
      draggable: true,
      category: CATEGORY_FIXTURES,
      subCategory: SUB_CATEGORY_PEGBOARD,
      width: pegboard.width,
      height: pegboard.height,
      segmentId: pegboard.segmentId ? pegboard.segmentId : null,
      pegboardData: {
        ...pegboard,
        strictPlacement: pegboard.strictPlacement
      }
    }"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @update-position="$emit('update-position', $event)"
  >
    <!-- Base pegboard rectangle -->
    <v-rect :config="pegboardConfig" @click="handlePegboardClick" />
    
    <!-- Dot pattern using v-group -->
    <v-group>
      <v-circle
        v-for="(dot, index) in dotPattern"
        :key="index"
        :config="{
          x: dot.x,
          y: dot.y,
          radius: 2,
          fill: '#666',
          listening: false
        }"
      />
    </v-group>

    <!-- Products placed on pegboard -->
    <ProductComponent
      v-for="product in getProductsForPegboard"
      :key="product.id"
      :product="product"
      :relativeTo="true"
      @update-position="$emit('update-position', $event)"
    />
  </v-group>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Node, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import ProductComponent from '../product/ProductComponent.vue'
import { useDebugStore } from '../../../composables/useDebugStore'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { 
  CATEGORY_FIXTURES,
  SUB_CATEGORY_PEGBOARD,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY,
  ATTR_SEGMENT_ID,
  NODE_TYPE_RECT,
  ATTR_ID
} from '../shared/constants'
import { 
  findSegments,
  findIntersectingSegment 
} from '../shelf/utils/element-finder'
import {
  calculatePegboardPosition,
  calculateProductPositionOnPegboard,
  calculateProductDetachFromPegboard
} from './utils/position'
import type { 
  PegboardProps,
  PegboardConfig,
  PegboardEmits
} from './pegboard-model'

// Pegboard specific constants
const PEGBOARD_STYLES = {
  fill: '#e0e0e0',
  stroke: '#999',
  strokeWidth: 1,
  cornerRadius: 0
}

const DOT_SPACING = 20 // Space between dots in pixels

export default defineComponent({
  name: 'PegboardComponent',
  components: {
    ProductComponent
  },
  props: {
    pegboard: {
      type: Object as PropType<PegboardProps['pegboard']>,
      required: true
    }
  },
  emits: ['product-drag', 'product-detach', 'update-position'],
  setup(props: PegboardProps, { emit }: { emit: PegboardEmits }) {
    const selectionStore = useSelectionStore()
    const planogramStore = usePlanogramStore()
    const debugStore = useDebugStore()

    const getProductsForPegboard = computed(() => 
      planogramStore.getProductsForFixture(props.pegboard.id)
    )

    // Compute pegboard configuration
    const pegboardConfig = computed(() => ({
      width: props.pegboard.width,
      height: props.pegboard.height,
      fill: props.pegboard.color || PEGBOARD_STYLES.fill,
      stroke: PEGBOARD_STYLES.stroke,
      strokeWidth: PEGBOARD_STYLES.strokeWidth,
      cornerRadius: PEGBOARD_STYLES.cornerRadius
    }))

    // Compute dot pattern positions
    const dotPattern = computed(() => {
      const dots = []
      const cols = Math.floor(props.pegboard.width / DOT_SPACING)
      const rows = Math.floor(props.pegboard.height / DOT_SPACING)
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dots.push({
            x: (col + 0.5) * DOT_SPACING,
            y: (row + 0.5) * DOT_SPACING
          })
        }
      }
      return dots
    })

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getStage()?.getPointerPosition()
      debugStore.setDragNodePosition(pos ?? { x: 0, y: 0 })
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      debugStore.clearDragNodePosition()
      const node = e.target as Node<NodeConfig>
      if (node.getAttr(ATTR_CATEGORY) !== CATEGORY_FIXTURES &&
          node.getAttr(ATTR_SUB_CATEGORY) !== SUB_CATEGORY_PEGBOARD) return

      const stage = node.getStage()
      if (!stage) return

      // Get the current zoom scale
      const scale = stage.scaleX()

      // Get position and adjust for zoom
      const rawPos = node.getAbsolutePosition()
      const pos = {
        x: rawPos.x / scale,
        y: rawPos.y / scale
      }

      const segments = findSegments(stage)
      const foundSegment = findIntersectingSegment(
        segments,
        pos,
        props.pegboard.width,
        props.pegboard.height
      )

      if (foundSegment) {
        // Moving to a segment (either from standalone or another segment)
        const positionUpdate = calculatePegboardPosition(node, foundSegment as Group, pos)
        
        // Set the segment ID attribute
        node.setAttr(ATTR_SEGMENT_ID, positionUpdate.segmentId)
        
        // Position the node relative to the segment
        node.position({
          x: positionUpdate.relativeX || 0,
          y: positionUpdate.relativeY || 0
        })
        
        // Move the node to the segment group
        node.moveTo(foundSegment as Group)
        
        // Update the pegboard position in the store
        planogramStore.updatePegboardPosition({
          id: props.pegboard.id,
          x: positionUpdate.x,
          y: positionUpdate.y,
          segmentId: positionUpdate.segmentId,
          relativeX: positionUpdate.relativeX,
          relativeY: positionUpdate.relativeY,
          products: getProductsForPegboard.value.map(p => ({
            id: p.id,
            relativeX: p.relativeX || 0,
            relativeY: p.relativeY || 0
          }))
        })
      } else {
        // Moving to standalone (not in any segment)
        planogramStore.updatePegboardPosition({
          id: props.pegboard.id,
          x: pos.x,
          y: pos.y,
          segmentId: null,
          relativeX: undefined,
          relativeY: undefined,
          products: getProductsForPegboard.value.map(p => ({
            id: p.id,
            relativeX: p.relativeX || 0,
            relativeY: p.relativeY || 0
          }))
        })
        node.setAttr(ATTR_SEGMENT_ID, null)
      }
    }

    const handleMouseEnter = (e: any) => {
      e.target.getStage().container().style.cursor = 'grab'
    }

    const handleMouseLeave = (e: any) => {
      e.target.getStage().container().style.cursor = 'default'
    }

    const handlePegboardClick = (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()?.findOne(NODE_TYPE_RECT)) {
        selectionStore.clearSelection()
      }
    }

    return {
      pegboardConfig,
      dotPattern,
      getProductsForPegboard,
      handleDragMove,
      handleDragEnd,
      handleMouseEnter,
      handleMouseLeave,
      handlePegboardClick,
      CATEGORY_FIXTURES,
      SUB_CATEGORY_PEGBOARD
    }
  }
})
</script> 