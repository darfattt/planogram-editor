import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Section, Shelf, Product } from '../types'

export default function usePlanogramStore() {
  const sections = ref<Section[]>([])
  const shelves = ref<Shelf[]>([])
  const products = ref<Product[]>([])

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
      id: uuidv4(),
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
    shelves.value.push(testShelf)

    // Test Product on Shelf
    products.value.push({
      id: uuidv4(),
      x: testSection.x + testShelf.relativeX + 50,
      y: testSection.y + testShelf.relativeY - 40,
      relativeX: testShelf.relativeX + 50,
      relativeY: testShelf.relativeY - 105,
      width: 50,
      height: 50,
      sectionId: testSection.id,
      shelfId: testShelf.id,
      category: 'product',
      type: 'productX'
    })

    // Standalone Product
    products.value.push({
      id: uuidv4(),
      x: 400,
      y: 200,
      width: 50,
      height: 50,
      category: 'product',
      type: 'productX'
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
    finalizeShelfPosition
  }
} 