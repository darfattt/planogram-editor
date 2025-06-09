<template>
  <div class="workspace">
    <!-- Floating Toolbar -->
    <div class="floating-toolbar">
      <div class="toolbar-section">
        <button @click="addHorizontalSplit" title="Split Horizontally" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
        </button>
        <button @click="addVerticalSplit" title="Split Vertically" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
          </svg>
        </button>
        <button @click="closeActivePane" title="Close Active Pane" :disabled="panes.length <= 1" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button @click="syncPanes" title="Sync All Panes" :class="{ active: syncEnabled }" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.98"/>
            <path d="m17 8 4 4-4 4"/>
          </svg>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-section zoom-section">
        <button @click="zoomOut" title="Zoom Out" class="zoom-btn">−</button>
        <span class="zoom-display">{{ Math.round(getActivePaneZoom() * 100) }}%</span>
        <button @click="zoomIn" title="Zoom In" class="zoom-btn">+</button>
        <button @click="resetZoom" title="Reset Zoom" class="zoom-btn reset">100%</button>
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
import { defineComponent, ref, nextTick } from 'vue'
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
  background-color: #fafafa;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Floating Toolbar - Excalidraw Style */
.floating-toolbar {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 100;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.floating-toolbar:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
  position: relative;
}

.toolbar-btn:hover {
  background: #f3f4f6;
  color: #374151;
  transform: translateY(-1px);
}

.toolbar-btn:active {
  transform: translateY(0);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.toolbar-btn:disabled:hover {
  background: transparent;
  color: #6b7280;
}

.toolbar-btn.active {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}

.zoom-section {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  gap: 2px;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.zoom-btn.reset {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
}

.zoom-display {
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  min-width: 48px;
  text-align: center;
}

.pane-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
}

.pane-content.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.pane-header {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.pane-controls {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.pane-controls button {
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
}

.pane-controls button:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.tabs {
  display: flex;
  background: #f8fafc;
  overflow-x: auto;
  min-height: 44px;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  padding: 12px 16px;
  background: #f1f5f9;
  border-right: 1px solid #e5e7eb;
  cursor: move;
  display: flex;
  align-items: center;
  min-width: 120px;
  position: relative;
  user-select: none;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.tab.active {
  background: #ffffff;
  color: #111827;
  border-bottom: 2px solid #3b82f6;
  border-right-color: #e5e7eb;
}

.tab:hover {
  background: #e5e7eb;
  color: #374151;
}

.tab.dragging {
  opacity: 0.6;
  background: #3b82f6;
  color: white;
  transform: rotate(2deg);
}

.tab.drop-target {
  border-left: 3px solid #3b82f6;
}

.close-tab {
  margin-left: 8px;
  font-size: 14px;
  line-height: 1;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.tab:hover .close-tab {
  opacity: 1;
}

.close-tab:hover {
  background: #ef4444;
  color: #ffffff;
  transform: scale(1.1);
}

.tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #ffffff;
}

.editor-canvas,
.three-d-viewer {
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
}

/* Modern Splitpanes Styling */
:deep(.splitpanes__splitter) {
  background: #e5e7eb;
  position: relative;
  transition: all 0.2s ease;
}

:deep(.splitpanes__splitter:hover) {
  background: #3b82f6;
}

:deep(.splitpanes__splitter:before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.3s ease;
  background: #3b82f6;
  opacity: 0;
  border-radius: 2px;
}

:deep(.splitpanes__splitter:hover:before) {
  opacity: 1;
}

:deep(.splitpanes--vertical > .splitpanes__splitter:before) {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 24px;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter:before) {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 3px;
}

/* Responsive Design for Floating Toolbar */
@media (max-width: 768px) {
  .floating-toolbar {
    position: fixed;
    top: auto;
    bottom: 16px;
    left: 16px;
    right: 16px;
    transform: none;
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-section {
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-divider {
    display: none;
  }
}

@media (max-width: 480px) {
  .floating-toolbar {
    padding: 6px 8px;
    gap: 4px;
  }

  .toolbar-btn {
    width: 32px;
    height: 32px;
  }

  .zoom-btn {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .zoom-display {
    font-size: 11px;
    padding: 4px 6px;
  }
}
</style> 