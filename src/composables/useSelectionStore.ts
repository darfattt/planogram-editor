import { ref } from 'vue'
import usePlanogramStore from './usePlanogramStore'

const selectedIds = ref<string[]>([])
let isListenerAdded = false

export function useSelectionStore() {
  const { products } = usePlanogramStore()
  
  const duplicateProductToRight = (productId: string) => {
    const sourceProduct = products.value.find(p => p.id === productId)
    if (!sourceProduct) return
    console.log('sourceProduct', sourceProduct);
    // Create new product with position offset
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x + sourceProduct.width + 5, // 5px gap
      y: sourceProduct.y,
      relativeX: sourceProduct.relativeX + sourceProduct.width + 5,
      relativeY: sourceProduct.relativeY
    }
    
    // Add to store
    products.value.push(newProduct)
    
    // Select the new product
    selectOne(newProduct.id)
  }

  const duplicateProductToLeft = (productId: string) => {
    const sourceProduct = products.value.find(p => p.id === productId)
    if (!sourceProduct) return
    
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x - sourceProduct.width - 5,
      y: sourceProduct.y,
      relativeX: sourceProduct.relativeX - sourceProduct.width - 5,
      relativeY: sourceProduct.relativeY
    }
    
    products.value.push(newProduct)
    selectOne(newProduct.id)
  }

  const duplicateProductToUp = (productId: string) => {
    const sourceProduct = products.value.find(p => p.id === productId)
    if (!sourceProduct) return
    
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x,
      y: sourceProduct.y - sourceProduct.height - 5,
      relativeX: sourceProduct.relativeX,
      relativeY: sourceProduct.relativeY - sourceProduct.height - 5
    }
    
    products.value.push(newProduct)
    selectOne(newProduct.id)
  }

  const selectOne = (id: string) => {
    selectedIds.value = [id]
  }

  const toggleSelection = (id: string) => {
    const index = selectedIds.value.indexOf(id)
    if (index === -1) {
      selectedIds.value.push(id)
    } else {
      selectedIds.value.splice(index, 1)
    }
  }

  const clearSelection = () => {
    selectedIds.value = []
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (selectedIds.value.length === 0) return
    
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key) {
        case 'ArrowLeft':
          console.log('Ctrl+Shift+Left pressed for:', selectedIds.value)
          selectedIds.value.forEach(duplicateProductToLeft)
          e.preventDefault()
          break
        case 'ArrowRight':
          console.log('Ctrl+Shift+Right pressed for:', selectedIds.value)
          selectedIds.value.forEach(duplicateProductToRight)
          e.preventDefault()
          break
        case 'ArrowUp':
          console.log('Ctrl+Shift+Up pressed for:', selectedIds.value)
          selectedIds.value.forEach(duplicateProductToUp)
          e.preventDefault()
          break
        case 'ArrowDown':
          console.log('Ctrl+Shift+Down pressed for:', selectedIds.value)
          break
      }
    }
  }

  // Add listener only once
  if (!isListenerAdded) {
    window.addEventListener('keydown', handleKeyDown)
    isListenerAdded = true
  }

  return {
    selectedIds,
    selectOne,
    toggleSelection,
    clearSelection
  }
}