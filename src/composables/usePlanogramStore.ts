import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Section, Shelf, Product } from '../types'

export const usePlanogramStore = defineStore('planogram', () => {
  const sections = ref<Section[]>([])
  const shelves = ref<Shelf[]>([])
  const products = ref<Product[]>([])
  const showProductImages = ref(true)

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
      relativeX: 10,
      relativeY: 400,
      width: 380,
      height: 10,
      sectionId: testSection.id,
      category: 'fixtures',
      subCategory: 'shelf'
    }
    const testShelf2 = {
      id: "shelf2",
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
      code: 'pepsi01',
      x: 100,
      y: 100,
      relativeX: 0,
      relativeY: -51,
      width: 50,
      height: 50,
      depth: 10,
      sectionId: testSection.id,
      shelfId: testShelf.id,
      category: 'product',
      type: 'Food',
      image: '/src/assets/products/pepsi.png',
      color: 'yellow'
    })

    // Standalone Product
    // products.value.push({
    //   id: 'product2Standalone',
    //   code: 'cola01',
    //   x: 400,
    //   y: 200,
    //   width: 50,
    //   height: 50,
    //   depth: 10,
    //   category: 'product',
    //   type: 'Drink',
    //   image: '/src/assets/products/cola.png'
    // })
    // products.value.push({
    //   id: 'product3',
    //   code: 'golda01',
    //   x: 300,
    //   y: 200,
    //   width: 50,
    //   height: 50,
    //   depth: 10,
    //   category: 'product',
    //   type: 'Medicine',
    //   image: '/src/assets/products/golda.png'
    // })
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
    sectionId?: string
    relativeX?: number
    relativeY?: number
  }) => {
    const newShelf: Shelf = {
      id: uuidv4(),
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
      sectionId: payload.sectionId,
      relativeX: payload.relativeX ?? 0,
      relativeY: payload.relativeY ?? 0,
      category: 'fixtures',
      subCategory: 'shelf'
    }
    shelves.value.push(newShelf)
    return newShelf
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
    updateShelfPosition,
    finalizeShelfPosition,
    addProduct,
    updateProductPosition,
    deleteProduct,
    deleteShelf,
    addSection,
    addShelf
  }
})
