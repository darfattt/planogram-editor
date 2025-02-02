<template>
  <div class="fixture-template">
    <div
      class="template-item"
      draggable="true"
      @dragstart="(e) => {
        e.dataTransfer.setData('text/plain', 'fixture');
        e.dataTransfer.effectAllowed = 'move';
      }"
    >
      <div class="section-preview"></div>
      <span>Section</span>
    </div>
    <div
      class="template-item"
      draggable="true"
      @dragstart="(e) => {
        e.dataTransfer.setData('text/plain', 'shelf');
        e.dataTransfer.effectAllowed = 'move';
      }"
    >
      <div class="shelf-preview"></div>
      <span>Shelf</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { DraggedItem } from '../../types'

export default defineComponent({
  name: 'FixtureTemplate',
  emits: ['dragstart'],
  setup(_, { emit }) {
    const handleDragStart = (type: 'section' | 'shelf') => {
      const item: DraggedItem = {
        type,
        properties: type === 'section' 
          ? { width: 400, height: 600 }
          : { width: 200, height: 10 }
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
.fixture-template {
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

.section-preview {
  width: 100px;
  height: 60px;
  background: #e0e0e0;
  margin-bottom: 5px;
  border: 1px solid #ccc;
}

.shelf-preview {
  width: 100px;
  height: 5px;
  background: #9e9e9e;
  margin-bottom: 5px;
  border: 1px solid #888;
}

span {
  font-size: 14px;
  color: #666;
}
</style>
