import { ref } from 'vue'
import type { Product } from '../types'

const clipboardItem = ref<Product | null>(null)

export default function useClipboardStore() {
  const copyToClipboard = (product: Product) => {
    clipboardItem.value = { ...product } // Create a copy
  }

  const cutToClipboard = (product: Product) => {
    clipboardItem.value = { ...product }
    return product.id // Return id for removal
  }

  const getFromClipboard = (offsetX = 20, offsetY = 20): Product | null => {
    if (!clipboardItem.value) return null
    
    return {
      ...clipboardItem.value,
      id: crypto.randomUUID(), // Generate new ID for paste
      x: clipboardItem.value.x + offsetX,
      y: clipboardItem.value.y + offsetY,
      shelfId: undefined, // Reset parent relationships
      sectionId: undefined
    }
  }

  return {
    clipboardItem,
    copyToClipboard,
    cutToClipboard,
    getFromClipboard
  }
} 