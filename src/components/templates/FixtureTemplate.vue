<template>
  <div class="fixture-template">
    <div class="template-item" @click="addSegmentToCanvas">
      <button class="add-button" @click.stop.prevent="addSegmentToCanvas"></button>
      <span>Add Segment</span>
    </div>
    <div class="template-item" @click="addShelfToCanvas">
      <button class="add-button" @click.stop.prevent="addShelfToCanvas"></button>
      <span>Add Shelf</span>
    </div>
    <div class="template-item" @click="addPegboardToCanvas">
      <button class="add-button" @click.stop.prevent="addPegboardToCanvas"></button>
      <span>Add Pegboard</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { usePlanogramStore } from '../../composables/usePlanogramStore'

export default defineComponent({
  name: 'FixtureTemplate',
  setup() {
    const planogramStore = usePlanogramStore()

    const addSegmentToCanvas = () => {
      planogramStore.addSegment({
        x: 0,
        y: 100,
        width: 400,
        height: 600
      })
    }

    const addShelfToCanvas = () => {
      planogramStore.addShelf({
        x: 0,
        y: 0,
        width: 400,
        height: 10,
        depth: 50,
        strictPlacement: true
      })
    }

    const addPegboardToCanvas = () => {
      planogramStore.addPegboard({
        x: 0,
        y: 0,
        width: 150,
        height: 200,
        depth: 20,
        color: '#e0e0e0',
        strictPlacement: false
      })
    }

    return {
      addSegmentToCanvas,
      addShelfToCanvas,
      addPegboardToCanvas
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

.segment-preview {
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
