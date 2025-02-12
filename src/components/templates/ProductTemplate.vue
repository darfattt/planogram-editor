<template>
  <div class="product-template">
    <div class="template-header">
      
    </div>
    <div class="template-item">
        <button class="add-button" @click.stop.prevent="addProductToCanvas(50, 50)">+ Add New (50x50)</button>
    </div>
      <div class="template-item">
        <button class="add-button" @click.stop.prevent="addProductToCanvas(50, 100)">+ Add New (50x100)</button>
      </div>
      <div class="template-item">
        <button class="add-button" @click.stop.prevent="addProductToCanvas(100, 100)">+ Add New (100x100)</button>
      </div>
    
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { DraggedItem } from '../../types'

export default defineComponent({
  name: 'ProductTemplate',
  emits: ['dragstart', 'add-product'],
  setup(_, { emit }) {
    const handleDragStart = (e: DragEvent) => {
      if (e.dataTransfer) {
        const item: DraggedItem = {
          type: 'product',
          properties: {
            width: 50,
            height: 100
          }
        }
        e.dataTransfer.setData('text/plain', 'product')
        e.dataTransfer.setData('application/json', JSON.stringify(item))
        e.dataTransfer.effectAllowed = 'move'
      }
    }

    const addProductToCanvas = (width: number,height: number) => {
      const item: DraggedItem = {
        type: 'product',
        properties: {
          width: width,
          height: height,
        }
      }
      emit('add-product', {
        ...item,
        code: `PROD-${Date.now().toString().slice(-4)}`,
        position: { x: 100, y: 100 }
      })
    }

    return {
      handleDragStart,
      addProductToCanvas
    }
  }
})
</script>

<style scoped>
.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.add-button {
  padding: 5px 10px;
  background: #81C784;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.add-button:hover {
  background: #66BB6A;
}

.product-template {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
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
