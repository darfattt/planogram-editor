<template>
  <div class="product-template">
    <div
      class="template-item"
      draggable="true"
      @dragstart="(e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', 'product');
          e.dataTransfer.effectAllowed = 'move';
        }
      }"
    >
      <div class="product-preview"></div>
      <span>Product</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { DraggedItem } from '../../types'

export default defineComponent({
  name: 'ProductTemplate',
  emits: ['dragstart'],
  setup(_, { emit }) {
    const handleDragStart = () => {
      const item: DraggedItem = {
        type: 'product',
        properties: {
          width: 50,
          height: 100
        }
      }
      emit('dragstart', item)
    }

    return {
      handleDragStart
    }
  }
})
</script>

<style scoped>
.product-template {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: move;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s ease;
}

.template-item:hover {
  background: #f8f8f8;
  border-color: #ccc;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.product-preview {
  width: 25px;
  height: 50px;
  background: #81c784;
  margin-bottom: 5px;
  border: 1px solid #66bb6a;
}

span {
  font-size: 14px;
  color: #666;
}
</style>
