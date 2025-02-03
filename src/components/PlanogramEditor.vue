<template>
  <div class="planogram-editor">
    <div class="templates">
      <div class="template-section">
        <h3>Fixtures Template</h3>
        <FixtureTemplate @dragstart="handleDragStart" />
      </div>
      <div class="template-section">
        <h3>Products Template</h3>
        <ProductTemplate 
          @dragstart="handleDragStart"
          @add-product="handleAddProduct"
        />
      </div>
    </div>
    <div class="workspace">
      <EditorCanvas 
        ref="editorCanvasRef"
        @drop="handleDrop" 
        @dragover.prevent="handleDragOver"
        class="editor-canvas"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import FixtureTemplate from './templates/FixtureTemplate.vue'
import ProductTemplate from './templates/ProductTemplate.vue'
import EditorCanvas from './canvas/EditorCanvas.vue'
import type { DraggedItem } from '../types'
import { v4 as uuidv4 } from 'uuid'
import Konva from 'konva'
import usePlanogramStore from '../composables/usePlanogramStore'

export default defineComponent({
  name: 'PlanogramEditor',
  components: {
    FixtureTemplate,
    ProductTemplate,
    EditorCanvas
  },
  setup() {
    console.log('PlanogramEditor setup');
    const draggedItem = ref<DraggedItem | null>(null)
    const stageRef = ref<Konva.Stage | null>(null)
    const nodes = ref<any[]>([])
    const { addProduct } = usePlanogramStore()

    const handleDragStart = (item: DraggedItem) => {
      draggedItem.value = item
    }

    const handleDragOver = (e: Konva.KonvaEventObject<DragEvent>) => {
      e.evt.preventDefault();
    };

    const handleDrop = (e: Konva.KonvaEventObject<DragEvent>) => {
      console.log('handleDrop')
      e.evt.preventDefault();
      const stage = stageRef.value?.getStage();
      const position = stage?.getPointerPosition();
      
      if (!position) return;

      // Get the dragged type from dataTransfer
      const type = e.evt.dataTransfer?.getData('text/plain');
      
      // Create new node with correct position
      const newNode = {
        id: uuidv4(),
        x: position.x,
        y: position.y,
        width: 100,
        height: 100,
        type,
        // Add other necessary properties
      };

      // Add to your state
      nodes.value.push(newNode);
    }

    const handleDragEnd = () => {
      draggedItem.value = null
    }

    const handleAddProduct = (item: DraggedItem) => {
      if (item.type === 'product') {
        addProduct({
          x: item.position?.x || 100,
          y: item.position?.y || 100,
          width: item.properties.width,
          height: item.properties.height,
          category: 'product',
          type: 'default'
        })
      }
    }

    return {
      draggedItem,
      handleDragStart,
      handleDrop,
      handleDragOver,
      stageRef,
      nodes,
      handleDragEnd,
      handleAddProduct
    }
  }
})
</script>

<style scoped>
.planogram-editor {
  display: flex;
  height: 100vh;
  width: 100vw;
  position: relative;
}

.templates {
  width: 250px;
  padding: 20px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
}

.template-section {
  margin-bottom: 20px;
}

.template-section h3 {
  margin-bottom: 10px;
  color: #333;
}

.workspace {
  flex: 1;
  background-color: #fff;
  overflow: hidden;
}
</style>
