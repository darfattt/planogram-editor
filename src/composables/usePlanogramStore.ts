import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Section, Shelf, Product } from '../types'

// Shared state outside the function
const sections = ref<Section[]>([])
const shelves = ref<Shelf[]>([])
const products = ref<Product[]>([])

export default function usePlanogramStore() {
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
    // Test Section
    const testSection = {
      id: uuidv4(),
      x: 500,
      y: 200,
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
      relativeX: 10,
      relativeY: 400,
      width: 380,
      height: 10,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf'
    }
    const testShelf2 = {
      id: "shelf2", //uuidv4(),
      x: 500,
      y: 550,
      relativeX: 10,
      relativeY: 200,
      width: 380,
      height: 10,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf'
    }
    shelves.value.push(testShelf)
    shelves.value.push(testShelf2)

    // Test Product on Shelf
    products.value.push({
      id: 'product1OnShelfe',
      x: 100,
      y: 100,
      relativeX: 0,
      relativeY: -51,
      width: 50,
      height: 50,
      sectionId: testSection.id,
      shelfId: testShelf.id,
      category: 'product',
      type: 'Food'
    })

    // Standalone Product
    products.value.push({
      id: 'product2Standalone',
      x: 400,
      y: 200,
      width: 50,
      height: 50,
      category: 'product',
      type: 'Drink'
    })
    products.value.push({
      id: 'product3',
      x: 300,
      y: 200,
      width: 50,
      height: 50,
      category: 'product',
      type: 'Medicine'
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
    x: number  // Canvas absolute X (matches node.x() when standalone)
    y: number  // Canvas absolute Y (matches node.y() when standalone)
    width: number
    height: number
    color?: string
    shelfId?: string
    sectionId?: string
    relativeX?: number  // X relative to parent shelf (if in shelf)
    relativeY?: number  // Y relative to parent shelf (if in shelf)
  }) => {
    const newProduct: Product = {
      id: uuidv4(),
      x: payload.shelfId ? payload.relativeX ?? 0 : payload.x,  // If in shelf, use relativeX
      y: payload.shelfId ? payload.relativeY ?? 0 : payload.y,  // If in shelf, use relativeY
      width: payload.width,
      height: payload.height,
      relativeX: payload.relativeX ?? (payload.shelfId ? payload.x : 0),  // Store canvas X as relativeX when adding to shelf
      relativeY: payload.relativeY ?? (payload.shelfId ? payload.y : 0),
      shelfId: payload.shelfId,
      sectionId: payload.sectionId,
      type: 'Food',
      color: payload.color || '#81C784',
      category: 'product',
    }
    products.value.push(newProduct)
    console.log('newProduct', newProduct);
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
    console.log(payload);
    const index = products.value.findIndex(p => p.id === payload.id)
    if (index === -1) return
    
    products.value[index] = {
      ...products.value[index],
      x: payload.x,
      y: payload.y,
      relativeX: payload.relativeX ?? products.value[index].relativeX,
      relativeY: payload.relativeY ?? products.value[index].relativeY,
      shelfId: payload.shelfId,
      sectionId: payload.sectionId,
    }
  }

  // Add methods for adding/updating items here
  // ...

  return {
    sections,
    shelves,
    products,
    standaloneProducts,
    standaloneShelves,
    getShelvesBySection,
    getProductsBySection,
    getProductsByShelf,
    initializeTestData,
    updateShelfPosition,
    finalizeShelfPosition,
    addProduct,
    updateProductPosition
  }
} 