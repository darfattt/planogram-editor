<template>
  <div class="product-template">
    <div class="template-header">
      <h4>Product Templates</h4>
      <button class="category-toggle" @click="toggleCategory">
        {{ showCategories ? 'Simple' : 'Categories' }}
      </button>
    </div>

    <!-- Category-based view -->
    <div v-if="showCategories" class="categories-view">
      <div
        v-for="category in productCategories"
        :key="category.id"
        class="category-section"
      >
        <div class="category-header" @click="toggleCategoryExpanded(category.id)">
          <span class="category-icon" :style="{ color: category.color }">●</span>
          <span class="category-name">{{ category.name }}</span>
          <span class="expand-icon" :class="{ expanded: expandedCategories.includes(category.id) }">▼</span>
        </div>

        <div v-if="expandedCategories.includes(category.id)" class="category-products">
          <div
            v-for="template in category.templates"
            :key="template.id"
            class="product-template-item"
            @click="addProductFromTemplate(template)"
          >
            <div class="product-preview" :style="getPreviewStyle(template)"></div>
            <div class="product-info">
              <span class="product-name">{{ template.name }}</span>
              <span class="product-size">{{ template.defaultProperties.width }}×{{ template.defaultProperties.height }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simple view -->
    <div v-else class="simple-view">
      <div class="template-item" v-for="size in quickSizes" :key="size.id">
        <button
          class="add-button"
          @click="addProductToCanvas(size.width, size.height, size.code)"
        >
          + {{ size.name }}
        </button>
        <div class="size-preview" :style="getSizePreviewStyle(size)"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import type { DraggedItem, ProductTemplate as ProductTemplateType, ProductCategory } from '../../types'

export default defineComponent({
  name: 'ProductTemplate',
  emits: ['dragstart', 'add-product'],
  setup(_, { emit }) {
    const showCategories = ref(false)
    const expandedCategories = ref<string[]>(['beverages'])

    // Quick size templates
    const quickSizes = [
      { id: '1', name: 'Small (50×50)', width: 50, height: 50, code: 'PROD-5050' },
      { id: '2', name: 'Medium (50×100)', width: 50, height: 100, code: 'PROD-50100' },
      { id: '3', name: 'Large (100×100)', width: 100, height: 100, code: 'PROD-100100' },
      { id: '4', name: 'Wide (150×75)', width: 150, height: 75, code: 'PROD-15075' },
    ]

    // Product categories with templates
    const productCategories: (ProductCategory & { templates: ProductTemplateType[] })[] = [
      {
        id: 'beverages',
        name: 'Beverages',
        color: '#3b82f6',
        icon: '🥤',
        templates: [
          {
            id: 'soda-can',
            name: 'Soda Can',
            category: 'beverages',
            defaultProperties: {
              width: 30,
              height: 60,
              depth: 30,
              visual: {
                primaryColor: '#ef4444',
                borderRadius: 4,
              }
            },
            thumbnail: '🥤'
          },
          {
            id: 'water-bottle',
            name: 'Water Bottle',
            category: 'beverages',
            defaultProperties: {
              width: 25,
              height: 80,
              depth: 25,
              visual: {
                primaryColor: '#06b6d4',
                borderRadius: 8,
              }
            },
            thumbnail: '💧'
          }
        ]
      },
      {
        id: 'snacks',
        name: 'Snacks',
        color: '#f59e0b',
        icon: '🍿',
        templates: [
          {
            id: 'chips-bag',
            name: 'Chips Bag',
            category: 'snacks',
            defaultProperties: {
              width: 60,
              height: 80,
              depth: 20,
              visual: {
                primaryColor: '#fbbf24',
                borderRadius: 6,
              }
            },
            thumbnail: '🍟'
          },
          {
            id: 'candy-bar',
            name: 'Candy Bar',
            category: 'snacks',
            defaultProperties: {
              width: 40,
              height: 15,
              depth: 8,
              visual: {
                primaryColor: '#8b5cf6',
                borderRadius: 2,
              }
            },
            thumbnail: '🍫'
          }
        ]
      },
      {
        id: 'dairy',
        name: 'Dairy',
        color: '#10b981',
        icon: '🥛',
        templates: [
          {
            id: 'milk-carton',
            name: 'Milk Carton',
            category: 'dairy',
            defaultProperties: {
              width: 45,
              height: 90,
              depth: 45,
              visual: {
                primaryColor: '#f3f4f6',
                secondaryColor: '#e5e7eb',
                borderRadius: 4,
              }
            },
            thumbnail: '🥛'
          }
        ]
      }
    ]

    const toggleCategory = () => {
      showCategories.value = !showCategories.value
    }

    const toggleCategoryExpanded = (categoryId: string) => {
      const index = expandedCategories.value.indexOf(categoryId)
      if (index > -1) {
        expandedCategories.value.splice(index, 1)
      } else {
        expandedCategories.value.push(categoryId)
      }
    }

    const getPreviewStyle = (template: ProductTemplateType) => {
      const props = template.defaultProperties
      const visual = props.visual || {}

      return {
        width: `${Math.min(props.width || 50, 40)}px`,
        height: `${Math.min(props.height || 50, 40)}px`,
        backgroundColor: visual.primaryColor || '#81c784',
        borderRadius: `${visual.borderRadius || 0}px`,
        background: visual.secondaryColor
          ? `linear-gradient(135deg, ${visual.primaryColor}, ${visual.secondaryColor})`
          : visual.primaryColor || '#81c784'
      }
    }

    const getSizePreviewStyle = (size: any) => {
      const scale = Math.min(30 / Math.max(size.width, size.height), 1)
      return {
        width: `${size.width * scale}px`,
        height: `${size.height * scale}px`,
        backgroundColor: '#81c784',
        borderRadius: '2px'
      }
    }

    const addProductFromTemplate = (template: ProductTemplateType) => {
      const item: DraggedItem = {
        type: 'product',
        properties: {
          width: template.defaultProperties.width || 50,
          height: template.defaultProperties.height || 50,
          depth: template.defaultProperties.depth || 30
        }
      }

      emit('add-product', {
        ...item,
        code: `${template.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        position: { x: 100, y: 100 },
        template: template
      })
    }

    const addProductToCanvas = (width: number, height: number, code?: string) => {
      const item: DraggedItem = {
        type: 'product',
        properties: {
          width: width,
          height: height,
          depth: 30
        }
      }
      emit('add-product', {
        ...item,
        code: code ?? `PROD-${Date.now().toString().slice(-4)}`,
        position: { x: 100, y: 100 }
      })
    }

    return {
      showCategories,
      expandedCategories,
      quickSizes,
      productCategories,
      toggleCategory,
      toggleCategoryExpanded,
      getPreviewStyle,
      getSizePreviewStyle,
      addProductFromTemplate,
      addProductToCanvas
    }
  }
})
</script>

<style scoped>
.product-template {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.category-toggle {
  padding: 4px 8px;
  background: #f1f3f4;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  color: #6c757d;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.category-toggle:hover {
  background: #e9ecef;
  color: #495057;
}

/* Categories view */
.categories-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-section {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  cursor: pointer;
  transition: background 0.15s ease;
}

.category-header:hover {
  background: #f1f3f4;
}

.category-icon {
  font-size: 16px;
  font-weight: bold;
}

.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.expand-icon {
  font-size: 12px;
  color: #6c757d;
  transition: transform 0.15s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.category-products {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: white;
}

.product-template-item:hover {
  background: #f8f9fa;
  border-color: #ced4da;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.product-preview {
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-name {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.product-size {
  font-size: 11px;
  color: #6c757d;
}

/* Simple view */
.simple-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  background: white;
  transition: all 0.15s ease;
}

.template-item:hover {
  background: #f8f9fa;
  border-color: #ced4da;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.add-button {
  flex: 1;
  padding: 8px 12px;
  background: #1971c2;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s ease;
}

.add-button:hover {
  background: #1864ab;
}

.size-preview {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
