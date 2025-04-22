<template>
  <div class="workspace">
    <div class="workspace-toolbar">
      <button @click="addHorizontalSplit" title="Split Horizontally">⇄</button>
      <button @click="addVerticalSplit" title="Split Vertically">⇅</button>
      <button @click="closeActivePane" title="Close Active Pane" :disabled="panes.length <= 1">×</button>
      <button @click="syncPanes" title="Sync All Panes" :class="{ active: syncEnabled }">⟲</button>
      <div class="zoom-controls">
        <button @click="zoomOut" title="Zoom Out">-</button>
        <span class="zoom-level">{{ Math.round(getActivePaneZoom() * 100) }}%</span>
        <button @click="zoomIn" title="Zoom In">+</button>
        <button @click="resetZoom" title="Reset Zoom">100%</button>
      </div>
    </div>
    <splitpanes class="default-theme" :horizontal="isHorizontal" @resized="handlePaneResize" @pane-click="handlePaneClick">
      <pane v-for="(pane, index) in panes" :key="index" :min-size="20">
        <div class="pane-content" :class="{ active: activePaneIndex === index }">
          <div class="pane-header">
            <div class="tabs" 
              @dragover.prevent 
              @drop="handleTabDrop($event, index)"
            >
              <div 
                v-for="(tab, tabIndex) in pane.tabs" 
                :key="tabIndex"
                class="tab"
                :class="{ 
                  active: pane.activeTabIndex === tabIndex,
                  'dragging': isDragging && draggedTab?.sourcePane === index && draggedTab?.sourceTab === tabIndex
                }"
                @click="setActiveTab(index, tabIndex)"
                draggable="true"
                @dragstart="handleTabDragStart($event, index, tabIndex)"
                @dragend="handleTabDragEnd"
                @dragover.prevent
                @dragenter="handleTabDragEnter($event, index, tabIndex)"
              >
                {{ tab.title }}
                <span class="close-tab" @click.stop="closeTab(index, tabIndex)">×</span>
              </div>
            </div>
            <div class="pane-controls">
              <button @click="open2DView(index)" title="Add 2D View">2D</button>
              <button @click="open3DView(index)" title="Add 3D View">3D</button>
            </div>
          </div>
          <div class="tab-content">
            <EditorCanvas 
              v-if="pane.getActiveTab().type === '2d'"
              ref="editorCanvasRef"
              class="editor-canvas"
              :zoom="getPaneZoom(index)"
              @zoom-change="handleZoomChange(index, $event)"
              @update="handleCanvasUpdate(index)"
            />
            <ThreeDViewer
              v-if="pane.getActiveTab().type === '3d'"
              ref="threeDViewerRef"
              class="three-d-viewer"
              @update="handleCanvasUpdate(index)"
            />
          </div>
        </div>
      </pane>
    </splitpanes>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, nextTick, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import EditorCanvas from '../canvas/EditorCanvas.vue'
import ThreeDViewer from '../canvas/ThreeDViewer.vue'

interface Tab {
  title: string;
  type: '2d' | '3d';
}

interface PaneData {
  tabs: Tab[];
  activeTabIndex: number;
  getActiveTab: () => Tab;
  zoomLevel: number;
}

interface DragData {
  sourcePane: number;
  sourceTab: number;
}

export default defineComponent({
  name: 'WorkspaceView',
  components: {
    EditorCanvas,
    ThreeDViewer,
    Splitpanes,
    Pane
  },
  setup() {
    const editorCanvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null)
    const threeDViewerRef = ref<InstanceType<typeof ThreeDViewer> | null>(null)
    const syncEnabled = ref(false)
    const activePaneIndex = ref(0)
    const isHorizontal = ref(false)
    const draggedTab = ref<DragData | null>(null)
    const isDragging = ref(false)
    
    // Create initial pane data
    const initialPane: PaneData = {
      tabs: [{ title: '2D View', type: '2d' }],
      activeTabIndex: 0,
      getActiveTab: function() { return this.tabs[this.activeTabIndex] },
      zoomLevel: 1
    };
    
    // Pane management
    const panes = ref<PaneData[]>([initialPane]);

    // Zoom controls
    const zoomIn = () => {
      const currentZoom = getActivePaneZoom();
      const newZoom = Math.min(currentZoom * 1.2, 5);
      updatePaneZoom(activePaneIndex.value, newZoom);
    }
    
    const zoomOut = () => {
      const currentZoom = getActivePaneZoom();
      const newZoom = Math.max(currentZoom / 1.2, 0.1);
      updatePaneZoom(activePaneIndex.value, newZoom);
    }
    
    const resetZoom = () => {
      updatePaneZoom(activePaneIndex.value, 1);
    }
    
    const handleZoomChange = (paneIndex: number, newZoom: number) => {
      updatePaneZoom(paneIndex, newZoom);
    }

    const getPaneZoom = (paneIndex: number): number => {
      return panes.value[paneIndex]?.zoomLevel || 1;
    }

    const getActivePaneZoom = (): number => {
      return getPaneZoom(activePaneIndex.value);
    }

    const updatePaneZoom = (paneIndex: number, newZoom: number) => {
      if (paneIndex >= 0 && paneIndex < panes.value.length) {
        panes.value[paneIndex].zoomLevel = newZoom;
        
        // If sync is enabled, update all panes
        if (syncEnabled.value) {
          panes.value.forEach((pane, index) => {
            if (index !== paneIndex) {
              pane.zoomLevel = newZoom;
            }
          });
        }
      }
    }

    // Method to update zoom level for all panes
    const updateAllPanesZoom = (newZoom: number) => {
      panes.value.forEach((pane, index) => {
        updatePaneZoom(index, newZoom);
      });
    }

    const createNewPane = (): PaneData => ({
      tabs: [{ title: '2D View', type: '2d' }],
      activeTabIndex: 0,
      getActiveTab: function() { return this.tabs[this.activeTabIndex] },
      zoomLevel: 1
    });

    const addHorizontalSplit = (): void => {
      isHorizontal.value = true;
      const newPane = createNewPane();
      panes.value.push(newPane);
      activePaneIndex.value = panes.value.length - 1;
    };

    const addVerticalSplit = (): void => {
      isHorizontal.value = false;
      const newPane = createNewPane();
      panes.value.push(newPane);
      activePaneIndex.value = panes.value.length - 1;
    };
    
    const closeActivePane = (): void => {
      if (panes.value.length <= 1) return;
      
      panes.value.splice(activePaneIndex.value, 1);
      
      if (activePaneIndex.value >= panes.value.length) {
        activePaneIndex.value = panes.value.length - 1;
      }
    };
    
    const syncPanes = (): void => {
      syncEnabled.value = !syncEnabled.value;
      
      // If enabling sync, set all panes to the active pane's zoom level
      if (syncEnabled.value) {
        const activeZoom = getActivePaneZoom();
        panes.value.forEach((pane, index) => {
          if (index !== activePaneIndex.value) {
            pane.zoomLevel = activeZoom;
          }
        });
      }
    };
    
    const open2DView = (paneIndex: number): void => {
      const pane = panes.value[paneIndex];
      pane.tabs.push({ title: '2D View', type: '2d' });
      setActiveTab(paneIndex, pane.tabs.length - 1);
    };

    const open3DView = (paneIndex: number): void => {
      const pane = panes.value[paneIndex];
      const existing3DTabIndex = pane.tabs.findIndex((tab: Tab) => tab.type === '3d');
      
      if (existing3DTabIndex >= 0) {
        setActiveTab(paneIndex, existing3DTabIndex);
      } else {
        pane.tabs.push({ title: '3D View', type: '3d' });
        setActiveTab(paneIndex, pane.tabs.length - 1);
        
        // Ensure the 3D viewer is properly initialized after the tab is added
        nextTick(() => {
          const threeDViewer = threeDViewerRef.value;
          if (threeDViewer) {
            // Force a re-render of the 3D viewer
            threeDViewer.$forceUpdate();
          }
        });
      }
    };

    const setActiveTab = (paneIndex: number, tabIndex: number): void => {
      const pane = panes.value[paneIndex];
      if (pane.activeTabIndex === tabIndex) return;
      
      activePaneIndex.value = paneIndex;
      
      nextTick(() => {
        pane.activeTabIndex = tabIndex;
      });
    };

    const closeTab = (paneIndex: number, tabIndex: number): void => {
      const pane = panes.value[paneIndex];
      if (pane.tabs.length <= 1) return;
      
      pane.tabs.splice(tabIndex, 1);
      
      if (pane.activeTabIndex >= pane.tabs.length) {
        pane.activeTabIndex = pane.tabs.length - 1;
      }
    };
    
    // Tab drag and drop handlers
    const handleTabDragStart = (event: DragEvent, paneIndex: number, tabIndex: number): void => {
      if (!event.dataTransfer) return;
      
      draggedTab.value = {
        sourcePane: paneIndex,
        sourceTab: tabIndex
      };
      
      isDragging.value = true;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', ''); // Required for Firefox
      
      // Add dragging class to the dragged element
      const target = event.target as HTMLElement;
      target.classList.add('dragging');
    };
    
    const handleTabDragEnd = (): void => {
      isDragging.value = false;
      draggedTab.value = null;
      
      // Remove dragging class from all tabs
      document.querySelectorAll('.tab.dragging').forEach(tab => {
        tab.classList.remove('dragging');
      });
    };
    
    const handleTabDragEnter = (event: DragEvent, paneIndex: number, tabIndex: number): void => {
      if (!draggedTab.value) return;
      
      const sourcePane = panes.value[draggedTab.value.sourcePane];
      const targetPane = panes.value[paneIndex];
      
      // Don't do anything if dragging over the same tab
      if (draggedTab.value.sourcePane === paneIndex && draggedTab.value.sourceTab === tabIndex) {
        return;
      }
      
      // Add visual feedback for drop target
      const target = event.target as HTMLElement;
      target.classList.add('drop-target');
      
      // Move the tab within the same pane or to a different pane
      const [movedTab] = sourcePane.tabs.splice(draggedTab.value.sourceTab, 1);
      targetPane.tabs.splice(tabIndex, 0, movedTab);
      
      // Update active tab indices if needed
      if (sourcePane.activeTabIndex >= draggedTab.value.sourceTab) {
        sourcePane.activeTabIndex = Math.max(0, sourcePane.activeTabIndex - 1);
      }
      if (targetPane.activeTabIndex >= tabIndex) {
        targetPane.activeTabIndex++;
      }
      
      // Update the draggedTab reference
      draggedTab.value = {
        sourcePane: paneIndex,
        sourceTab: tabIndex
      };
    };
    
    const handleTabDrop = (event: DragEvent, paneIndex: number): void => {
      if (!draggedTab.value) return;
      
      const sourcePane = panes.value[draggedTab.value.sourcePane];
      const targetPane = panes.value[paneIndex];
      
      // Remove drop target class
      document.querySelectorAll('.tab.drop-target').forEach(tab => {
        tab.classList.remove('drop-target');
      });
      
      // If dropping at the end of the tabs
      if (draggedTab.value.sourcePane !== paneIndex) {
        const [movedTab] = sourcePane.tabs.splice(draggedTab.value.sourceTab, 1);
        targetPane.tabs.push(movedTab);
        targetPane.activeTabIndex = targetPane.tabs.length - 1;
        if (sourcePane.activeTabIndex >= draggedTab.value.sourceTab) {
          sourcePane.activeTabIndex = Math.max(0, sourcePane.activeTabIndex - 1);
        }
      }
      
      draggedTab.value = null;
    };
    
    // Pane event handlers
    const handlePaneResize = (sizes: number[]): void => {
      // You can store the sizes if needed for persistence
      console.log('Pane sizes:', sizes);
    };
    
    const handlePaneClick = (event: MouseEvent): void => {
      // Ensure we have a valid target element
      if (!event.target) return;
      
      // Find the clicked pane index
      const targetElement = event.target as HTMLElement;
      const paneElement = targetElement.closest('.pane-content');
      
      // If we can't find a pane element, try to find the parent pane
      if (!paneElement) {
        // Check if we clicked directly on a pane
        if (targetElement.classList.contains('pane-content')) {
          const paneIndex = Array.from(targetElement.parentElement?.parentElement?.children ?? [])
            .findIndex(el => el === targetElement.parentElement);
          
          if (paneIndex >= 0) {
            activePaneIndex.value = paneIndex;
          }
        }
        return;
      }
      
      // Find the pane index
      const paneParent = paneElement.parentElement;
      if (!paneParent) return;
      
      const paneGrandParent = paneParent.parentElement;
      if (!paneGrandParent) return;
      
      const paneIndex = Array.from(paneGrandParent.children)
        .findIndex(el => el.contains(paneElement));
      
      if (paneIndex >= 0) {
        activePaneIndex.value = paneIndex;
      }
    };
    
    const handleCanvasUpdate = (sourcePaneIndex: number): void => {
      if (!syncEnabled.value) return;
      
      // Sync the active tab type to all other panes
      const sourcePane = panes.value[sourcePaneIndex];
      const sourceTabType = sourcePane.getActiveTab().type;
      
      panes.value.forEach((pane, index) => {
        if (index === sourcePaneIndex) return;
        
        // Find or create a tab of the same type
        const existingTabIndex = pane.tabs.findIndex(tab => tab.type === sourceTabType);
        
        if (existingTabIndex >= 0) {
          setActiveTab(index, existingTabIndex);
        } else {
          // Add a new tab of the same type
          pane.tabs.push({ 
            title: sourceTabType === '2d' ? '2D View' : '3D View', 
            type: sourceTabType 
          });
          setActiveTab(index, pane.tabs.length - 1);
        }
      });
    };

    return {
      editorCanvasRef,
      threeDViewerRef,
      panes,
      activePaneIndex,
      syncEnabled,
      isHorizontal,
      isDragging,
      draggedTab,
      addHorizontalSplit,
      addVerticalSplit,
      closeActivePane,
      syncPanes,
      open2DView,
      open3DView,
      setActiveTab,
      closeTab,
      handleCanvasUpdate,
      handleTabDragStart,
      handleTabDragEnd,
      handleTabDragEnter,
      handleTabDrop,
      handlePaneResize,
      handlePaneClick,
      zoomIn,
      zoomOut,
      resetZoom,
      handleZoomChange,
      getPaneZoom,
      getActivePaneZoom,
      updateAllPanesZoom
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

.workspace-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
}

.workspace-toolbar button {
  padding: 4px 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.workspace-toolbar button:hover {
  background-color: #e0e0e0;
}

.workspace-toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workspace-toolbar button.active {
  background-color: #2196f3;
  color: white;
  border-color: #1976d2;
}

.pane-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;
}

.pane-content.active {
  border-color: #2196f3;
}

.pane-header {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #ddd;
}

.pane-controls {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
}

.pane-controls button {
  padding: 2px 6px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.pane-controls button:hover {
  background-color: #e0e0e0;
}

.tabs {
  display: flex;
  background-color: #f0f0f0;
  overflow-x: auto;
  min-height: 40px;
}

.tab {
  padding: 10px 15px;
  background-color: #e0e0e0;
  border-right: 1px solid #ddd;
  cursor: move;
  display: flex;
  align-items: center;
  min-width: 100px;
  position: relative;
  user-select: none;
  transition: all 0.2s ease;
}

.tab.active {
  background-color: #fff;
  border-bottom: 2px solid #2196f3;
}

.tab:hover {
  background-color: #d0d0d0;
}

.tab.dragging {
  opacity: 0.5;
  background-color: #2196f3;
  color: white;
}

.tab.drop-target {
  border-left: 2px solid #2196f3;
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
  cursor: pointer;
  transition: all 0.2s ease;
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
  transition: opacity 0.3s ease;
}

:deep(.splitpanes__splitter) {
  background-color: #f0f0f0;
  position: relative;
  transition: background-color 0.2s;
}

:deep(.splitpanes__splitter:hover) {
  background-color: #2196f3;
}

:deep(.splitpanes__splitter:before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.4s;
  background-color: #2196f3;
  opacity: 0;
}

:deep(.splitpanes__splitter:hover:before) {
  opacity: 1;
}

:deep(.splitpanes--vertical > .splitpanes__splitter:before) {
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter:before) {
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
}

.zoom-controls {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
}

.zoom-controls button {
  padding: 2px 6px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.zoom-controls button:hover {
  background-color: #e0e0e0;
}

.zoom-level {
  padding: 2px 6px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 12px;
}
</style> 