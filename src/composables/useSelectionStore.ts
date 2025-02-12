import { ref } from 'vue'
import { usePlanogramStore } from './usePlanogramStore'
import { storeToRefs } from 'pinia'
import type { Product } from '../types'

const selectedIds = ref<string[]>([])
let isListenerAdded = false

export function useSelectionStore() {
  const store = usePlanogramStore()
  const { products, shelves } = storeToRefs(store)
  const { addProduct, deleteProduct, deleteShelf } = store
  const productGap = 3; // product gap when product dropped on top other product and also during copied

  
  const duplicateProductToRight = (productId: string) => {
    const sourceProduct = products.value.find((p: Product) => p.id === productId)
    if (!sourceProduct) return
    // Create new product with position offset
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x + sourceProduct.width + productGap, // productGap
      y: sourceProduct.y,
      relativeX: (sourceProduct.relativeX ?? 0) + sourceProduct.width + productGap,
      relativeY: sourceProduct.relativeY ?? 0
    }
    
    // Add to store
    products.value.push(newProduct)
    
    // Select the new product
    selectOne(newProduct.id)
  }

  const duplicateProductToLeft = (productId: string) => {
    const sourceProduct = products.value.find((p: Product) => p.id === productId)
    if (!sourceProduct) return
    
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x - sourceProduct.width - productGap,
      y: sourceProduct.y,
      relativeX: (sourceProduct.relativeX ?? 0) - sourceProduct.width - productGap,
      relativeY: sourceProduct.relativeY ?? 0
    }
    
    products.value.push(newProduct)
    selectOne(newProduct.id)
  }

  const duplicateProductToUp = (productId: string) => {
    const sourceProduct = products.value.find((p: Product) => p.id === productId)
    if (!sourceProduct) return
    
    const newProduct = {
      ...sourceProduct,
      id: crypto.randomUUID(),
      x: sourceProduct.x,
      y: sourceProduct.y - sourceProduct.height - productGap,
      relativeX: sourceProduct.relativeX ?? 0,
      relativeY: (sourceProduct.relativeY ?? 0) - sourceProduct.height - productGap
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

    // Handle delete key
    if (e.key === 'Delete') {
      selectedIds.value.forEach(id => {
        // Check if it's a product
        const product = products.value.find(p => p.id === id)
        if (product) {
          deleteProduct(id)
          return
        }

        // Check if it's a shelf
        const shelf = shelves.value.find(s => s.id === id)
        if (shelf) {
          deleteShelf(id)
        }
      })
      clearSelection()
      e.preventDefault()
      return
    }
    
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
    clearSelection,
    productGap
  }
}
