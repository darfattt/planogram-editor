<template>
  <div class="workspace">
    <div class="tabs">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        class="tab"
        :class="{ active: activeTabIndex === index }"
        @click="setActiveTab(index)"
      >
        {{ tab.title }}
        <span class="close-tab" @click.stop="closeTab(index)">×</span>
      </div>
    </div>
    <div class="tab-content">
      <EditorCanvas 
        v-show="activeTab.type === '2d'"
        ref="editorCanvasRef"
        class="editor-canvas"
        :key="'canvas-2d'"
      />
      <ThreeDViewer
        v-show="activeTab.type === '3d'"
        class="three-d-viewer"
        :key="'canvas-3d'"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, nextTick } from 'vue'
import EditorCanvas from '../canvas/EditorCanvas.vue'
import ThreeDViewer from '../canvas/ThreeDViewer.vue'

interface Tab {
  title: string;
  type: '2d' | '3d';
}

export default defineComponent({
  name: 'WorkspaceView',
  components: {
    EditorCanvas,
    ThreeDViewer
  },
  setup() {
    const editorCanvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null)
    
    // Tab management
    const tabs = ref<Tab[]>([
      { title: '2D View', type: '2d' }
    ]);
    const activeTabIndex = ref(0);
    
    const activeTab = computed(() => tabs.value[activeTabIndex.value]);
    
    const open2DView = () => {
      // Always add a new 2D tab
      tabs.value.push({ title: '2D View', type: '2d' });
      setActiveTab(tabs.value.length - 1);
    };

    const open3DView = () => {
      // Check if 3D tab already exists
      const existing3DTabIndex = tabs.value.findIndex(tab => tab.type === '3d');
      
      if (existing3DTabIndex >= 0) {
        // If 3D tab exists, activate it
        setActiveTab(existing3DTabIndex);
      } else {
        // If 3D tab doesn't exist, create a new one
        tabs.value.push({ title: '3D View', type: '3d' });
        setActiveTab(tabs.value.length - 1);
      }
    };

    const setActiveTab = (index: number) => {
      // Don't do anything if clicking the already active tab
      if (activeTabIndex.value === index) return;
      
      // Use nextTick to ensure DOM updates before changing the active tab
      nextTick(() => {
        activeTabIndex.value = index;
      });
    };

    const closeTab = (index: number) => {
      // Don't close the last tab
      if (tabs.value.length <= 1) return;
      
      // Remove the tab
      tabs.value.splice(index, 1);
      
      // Adjust active tab index if needed
      if (activeTabIndex.value >= tabs.value.length) {
        activeTabIndex.value = tabs.value.length - 1;
      }
    };

    return {
      editorCanvasRef,
      tabs,
      activeTabIndex,
      activeTab,
      open2DView,
      open3DView,
      setActiveTab,
      closeTab
    }
  }
})
</script>

<style scoped>
.workspace {
  flex: 1;
  background-color: #fff;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
}

.tab {
  padding: 10px 15px;
  background-color: #e0e0e0;
  border-right: 1px solid #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
  min-width: 100px;
  position: relative;
}

.tab.active {
  background-color: #fff;
  border-bottom: 2px solid #2196f3;
}

.close-tab {
  margin-left: 8px;
  font-size: 16px;
  line-height: 1;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #ccc;
  color: #333;
}

.close-tab:hover {
  background-color: #999;
  color: #fff;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-canvas,
.three-d-viewer {
  width: 100%;
  height: 100%;
}
</style> 