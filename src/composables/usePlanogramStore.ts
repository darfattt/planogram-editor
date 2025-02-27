import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Section, Shelf, Product } from '../types'

// Define a type for the state history
interface PlanogramState {
  sections: Section[]
  shelves: Shelf[]
  products: Product[]
}

export const usePlanogramStore = defineStore('planogram', () => {
  const sections = ref<Section[]>([])
  const shelves = ref<Shelf[]>([])
  const products = ref<Product[]>([])
  const showProductImages = ref(true)
  
  // Add history tracking
  const history = ref<PlanogramState[]>([])
  const maxHistoryLength = 20 // Limit history to prevent memory issues

  // Keep the computed properties inside the function
  const standaloneProducts = computed(() => 
    products.value.filter(p => !p.sectionId && !p.shelfId)
  )

  const standaloneShelves = computed(() => 
    shelves.value.filter(s => !s.sectionId)
  )

  const getShelvesBySection = (sectionId: string) => 
    shelves.value.filter(s => s.sectionId === sectionId)

  const getProductsBySection = (sectionId: string) => 
    products.value.filter(p => p.sectionId === sectionId)

  const getProductsByShelf = (shelfId: string) => 
    products.value.filter(p => p.shelfId === shelfId)

  const initializeTestData = () => {
    // Test Section centered on canvas
    const testSection = {
      id: "section1",
      x: (window.innerWidth - 250 - 400) / 2, // Center horizontally (canvas width - section width) / 2
      y: (window.innerHeight - 60 - 600) / 2, // Center vertically (canvas height - section height) / 2
      width: 400,
      height: 600,
      name: 'Test Section',
      category: 'fixtures',
      subCategory: 'section'
    }
    sections.value.push(testSection)

    // Test Shelf
    const testShelf = {
      id: "shelf1",
      x: 500,
      y: 550,
      relativeX: 0,
      relativeY: 590,
      width: 400,
      height: 10,
      depth: 50,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf',
      strictPlacement: true // Enable strict placement for this shelf
    }
    const testShelf2 = {
      id: "shelf2",
      x: 500,
      y: 550,
      relativeX: 0,
      relativeY: 400,
      width: 400,
      height: 10,
      depth: 50,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf',
      strictPlacement: true // Enable strict placement for this shelf
    }
    const testShelf3 = {
      id: "shelf3",
      x: 500,
      y: 550,
      relativeX: 0,
      relativeY: 200,
      width: 400,
      height: 10,
      depth: 50,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf',
      strictPlacement: false // Disable strict placement for this shelf (for comparison)
    }
    shelves.value.push(testShelf)
    shelves.value.push(testShelf2)
    shelves.value.push(testShelf3)


    // Test Product on Shelf
    products.value.push({
      id: 'product1OnShelfe',
      code: 'pepsi01',
      x: 100,
      y: 100,
      relativeX: 0,
      relativeY: -52,
      width: 50,
      height: 50,
      depth: 50,
      sectionId: testSection.id,
      shelfId: testShelf.id,
      category: 'product',
      type: 'Food',
      image: '/src/assets/products/pepsi.png',
      color: 'purple'
    })
  }

  const updateShelfPosition = (payload: {
    id: string
    x: number
    y: number
    products: Array<{
      id: string
      relativeX: number
      relativeY: number
    }>
  }) => {
    const shelf = shelves.value.find(s => s.id === payload.id)
    if (!shelf) return

    shelf.x = payload.x
    shelf.y = payload.y
    
    payload.products.forEach(p => {
      const product = products.value.find(prod => prod.id === p.id)
      if (product) {
        product.relativeX = p.relativeX ?? 0
        product.relativeY = p.relativeY ?? 0
      }
    })
  }

  const finalizeShelfPosition = (payload: {
    id: string
    x: number
    y: number
    products: Product[]
  }) => {
    const shelf = shelves.value.find(s => s.id === payload.id)
    if (!shelf) return

    // Handle section grouping logic here
    const section = sections.value.find(s => 
      payload.x >= s.x &&
      payload.x <= s.x + s.width &&
      payload.y >= s.y &&
      payload.y <= s.y + s.height
    )

    if (section) {
      shelf.sectionId = section.id
      shelf.relativeX = payload.x - section.x
      shelf.relativeY = payload.y - section.y
    } else {
      shelf.sectionId = null
    }
  }

  const addProduct = (payload: {
    x: number
    y: number
    width: number
    height: number
    depth: number
    color?: string
    shelfId?: string
    sectionId?: string
    relativeX?: number
    relativeY?: number
    type?: string
    image?: string
    code?: string
  }) => {
    const newProduct: Product = {
      id: uuidv4(),
      code: payload.code || '',
      x: payload.shelfId ? payload.relativeX ?? 0 : payload.x,
      y: payload.shelfId ? payload.relativeY ?? 0 : payload.y,
      width: payload.width,
      height: payload.height,
      depth: payload.depth,
      relativeX: payload.relativeX ?? (payload.shelfId ? payload.x : 0),
      relativeY: payload.relativeY ?? (payload.shelfId ? payload.y : 0),
      shelfId: payload.shelfId,
      sectionId: payload.sectionId,
      type: payload.type || 'Food',
      color: payload.color || '#81C784',
      category: 'product',
      image: payload.type === 'Drink' ? '/src/assets/products/cola.png' : 
             payload.type === 'Food' ? '/src/assets/products/pepsi.png' : 
             '/src/assets/products/default.png',
    }
    products.value.push(newProduct)
    return newProduct
  }

  const updateProductPosition = (payload: {
    id: string
    x: number
    y: number
    relativeX?: number
    relativeY?: number
    shelfId?: string
    sectionId?: string,
  }) => {
    const index = products.value.findIndex(p => p.id === payload.id)
    if (index === -1) return
    
    const currentProduct = products.value[index]
    products.value[index] = {
      ...currentProduct,
      x: payload.x,
      y: payload.y,
      relativeX: payload.relativeX ?? currentProduct.relativeX,
      relativeY: payload.relativeY ?? currentProduct.relativeY,
      shelfId: payload.shelfId,
      sectionId: payload.sectionId,
      type: currentProduct.type,
      color: currentProduct.color,
      category: currentProduct.category,
      image: currentProduct.image
    }
  }

  const deleteProduct = (productId: string) => {
    const index = products.value.findIndex(p => p.id === productId)
    if (index !== -1) {
      products.value.splice(index, 1)
    }
  }

  const deleteShelf = (shelfId: string) => {
    // First remove all products on this shelf
    products.value = products.value.filter(p => p.shelfId !== shelfId)
    
    // Then remove the shelf
    const index = shelves.value.findIndex(s => s.id === shelfId)
    if (index !== -1) {
      shelves.value.splice(index, 1)
    }
  }

  const addSection = (payload: {
    x: number
    y: number
    width: number
    height: number
  }) => {
    const newSection: Section = {
      id: uuidv4(),
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
      name: 'New Section',
      category: 'fixtures',
      subCategory: 'section'
    }
    sections.value.push(newSection)
    return newSection
  }

  const addShelf = (payload: {
    x: number
    y: number
    width: number
    height: number
    depth : number
    sectionId?: string
    relativeX?: number
    relativeY?: number
    strictPlacement?: boolean
  }) => {
    const newShelf: Shelf = {
      id: uuidv4(),
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
      depth: payload.depth,
      sectionId: payload.sectionId,
      relativeX: payload.relativeX ?? 0,
      relativeY: payload.relativeY ?? 0,
      category: 'fixtures',
      subCategory: 'shelf',
      strictPlacement: payload.strictPlacement
    }
    shelves.value.push(newShelf)
    return newShelf
  }
  
  const updateSectionPosition = (payload: {
    id: string
    x: number
    y: number
  }) => {
    const section = sections.value.find(s => s.id === payload.id)
    if (!section) return
    
    section.x = payload.x
    section.y = payload.y
    
    // Update positions of shelves within this section
    const sectionShelves = shelves.value.filter(s => s.sectionId === payload.id)
    sectionShelves.forEach(shelf => {
      shelf.x = payload.x + (shelf.relativeX || 0)
      shelf.y = payload.y + (shelf.relativeY || 0)
    })
    
    // Update positions of products directly in this section
    const sectionProducts = products.value.filter(p => p.sectionId === payload.id && !p.shelfId)
    sectionProducts.forEach(product => {
      product.x = payload.x + (product.relativeX || 0)
      product.y = payload.y + (product.relativeY || 0)
    })
  }

  // Save current state to history
  const saveStateToHistory = () => {
    // Create a deep copy of the current state
    const currentState: PlanogramState = {
      sections: JSON.parse(JSON.stringify(sections.value)),
      shelves: JSON.parse(JSON.stringify(shelves.value)),
      products: JSON.parse(JSON.stringify(products.value))
    }
    
    // Add to history
    history.value.push(currentState)
    
    // Limit history length
    if (history.value.length > maxHistoryLength) {
      history.value.shift() // Remove oldest state
    }
  }
  
  // Undo the last action
  const undo = () => {
    if (history.value.length === 0) {
      console.log('No actions to undo')
      return false
    }
    
    // Get the previous state
    const previousState = history.value.pop()
    
    if (previousState) {
      // Restore the previous state
      sections.value = previousState.sections
      shelves.value = previousState.shelves
      products.value = previousState.products
      return true
    }
    
    return false
  }
  
  // Create wrapped versions of state-changing methods that save history before changes
  const wrappedUpdateSectionPosition = (payload: {
    id: string
    x: number
    y: number
  }) => {
    saveStateToHistory()
    return updateSectionPosition(payload)
  }
  
  const wrappedAddProduct = (payload: {
    x: number
    y: number
    width: number
    height: number
    depth: number
    color?: string
    shelfId?: string
    sectionId?: string
    relativeX?: number
    relativeY?: number
    type?: string
    image?: string
    code?: string
  }) => {
    saveStateToHistory()
    return addProduct(payload)
  }
  
  const wrappedUpdateProductPosition = (payload: {
    id: string
    x: number
    y: number
    relativeX?: number
    relativeY?: number
    shelfId?: string
    sectionId?: string,
  }) => {
    saveStateToHistory()
    return updateProductPosition(payload)
  }
  
  const wrappedDeleteProduct = (productId: string) => {
    saveStateToHistory()
    return deleteProduct(productId)
  }
  
  const wrappedDeleteShelf = (shelfId: string) => {
    saveStateToHistory()
    return deleteShelf(shelfId)
  }
  
  const wrappedAddSection = (payload: {
    x: number
    y: number
    width: number
    height: number
  }) => {
    saveStateToHistory()
    return addSection(payload)
  }
  
  const wrappedAddShelf = (payload: {
    x: number
    y: number
    width: number
    height: number,
    depth : number,
    sectionId?: string
    relativeX?: number
    relativeY?: number
    strictPlacement?: boolean
  }) => {
    saveStateToHistory()
    return addShelf(payload)
  }
  
  const wrappedUpdateShelfPosition = (payload: {
    id: string
    x: number
    y: number
    products: Array<{
      id: string
      relativeX: number
      relativeY: number
    }>
  }) => {
    saveStateToHistory()
    return updateShelfPosition(payload)
  }
  
  const wrappedFinalizeShelfPosition = (payload: {
    id: string
    x: number
    y: number
    products: Product[]
  }) => {
    saveStateToHistory()
    return finalizeShelfPosition(payload)
  }

  return {
    sections,
    shelves,
    products,
    showProductImages,
    standaloneProducts,
    standaloneShelves,
    getShelvesBySection,
    getProductsBySection,
    getProductsByShelf,
    initializeTestData,
    // Return wrapped functions instead of originals
    updateShelfPosition: wrappedUpdateShelfPosition,
    finalizeShelfPosition: wrappedFinalizeShelfPosition,
    addProduct: wrappedAddProduct,
    updateProductPosition: wrappedUpdateProductPosition,
    deleteProduct: wrappedDeleteProduct,
    deleteShelf: wrappedDeleteShelf,
    addSection: wrappedAddSection,
    addShelf: wrappedAddShelf,
    updateSectionPosition: wrappedUpdateSectionPosition,
    undo // Export the undo function
  }
})
