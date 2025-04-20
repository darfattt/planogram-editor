import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Segment, Shelf, Product, Pegboard } from '../types'

interface State {
  segments: Segment[]
  shelves: Shelf[]
  pegboards: Pegboard[]
  products: Product[]
  showProductImages: boolean
  history: HistoryState[]
  historyIndex: number
}

interface HistoryState {
  segments: Segment[]
  shelves: Shelf[]
  pegboards: Pegboard[]
  products: Product[]
}

export const usePlanogramStore = defineStore('planogram', {
  state: (): State => ({
    segments: [],
    shelves: [],
    pegboards: [],
    products: [],
    showProductImages: false,
    history: [],
    historyIndex: -1
  }),
  getters: {
    standaloneProducts: (state) => 
      state.products.filter(p => !p.segmentId && !p.shelfId),
    standaloneShelves: (state) => 
      state.shelves.filter(s => !s.segmentId),
    standaloneFixtures: (state) => ({
      shelves: state.shelves.filter(shelf => !shelf.segmentId),
      pegboards: state.pegboards.filter(pegboard => !pegboard.segmentId)
    }),
    getProductsForFixture: (state) => (fixtureId: string) => {
      return state.products.filter(product => product.fixtureId === fixtureId)
    }
  },
  actions: {
    getShelvesBySegment(segmentId: string) {
      return this.shelves.filter(s => s.segmentId === segmentId)
    },
    getProductsBySegment(segmentId: string) {
      return this.products.filter(p => p.segmentId === segmentId)
    },
    getProductsByShelf(shelfId: string) {
      return this.products.filter(p => p.shelfId === shelfId)
    },
    getPegboardsBySegment(segmentId: string) {
      return this.pegboards.filter(p => p.segmentId === segmentId)
    },
    initializeTestData() {
      // Test Segment centered on canvas
      const testSegment = {
        id: "segment1",
        x: (window.innerWidth - 60 - 400) / 2, // Center horizontally (canvas width - segment width) / 2
        y: (window.innerHeight - 60 - 600) / 2, // Center vertically (canvas height - segment height) / 2
        width: 400,
        height: 600,
        name: 'Test Segment',
        category: 'fixtures',
        subCategory: 'segment'
      }
      this.segments.push(testSegment)

      // Test Shelf
      const testShelf = {
        id: "shelf1",
        x: 500,
        y: 550,
        relativeX: 0,
        relativeY: 500,
        width: 400,
        height: 10,
        depth: 50,
        segmentId: testSegment.id,
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
        segmentId: testSegment.id,
        category: 'fixtures',
        subCategory: 'shelf',
        strictPlacement: true // Enable strict placement for this shelf
      }
      const testShelf3 = {
        id: "shelf3",
        x: 500,
        y: 550,
        relativeX: 0,
        relativeY: 300,
        width: 400,
        height: 10,
        depth: 50,
        segmentId: testSegment.id,
        category: 'fixtures',
        subCategory: 'shelf',
        strictPlacement: true // Disable strict placement for this shelf (for comparison)
      }
      this.shelves.push(testShelf)
      this.shelves.push(testShelf2)
      this.shelves.push(testShelf3)

      // Test Pegboard
      const testPegboard = {
        id: "pegboard1",
        x: 500,
        y: 100,
        relativeX: 0,
        relativeY: 50,
        width: 150,
        height: 200,
        depth: 20,
        color: '#e0e0e0',
        segmentId: testSegment.id,
        category: 'fixtures',
        subCategory: 'pegboard',
        strictPlacement: false
      }
      this.pegboards.push(testPegboard)
    },
    updateShelfPosition(payload: {
      id: string
      x: number
      y: number
      products: { id: string; relativeX: number; relativeY: number }[]
    }) {
      const shelf = this.shelves.find(s => s.id === payload.id)
      if (!shelf) return

      shelf.x = payload.x
      shelf.y = payload.y
      
      payload.products.forEach(p => {
        const product = this.products.find(prod => prod.id === p.id)
        if (product) {
          product.relativeX = p.relativeX ?? 0
          product.relativeY = p.relativeY ?? 0
        }
      })

      this.saveStateToHistory()
    },
    finalizeShelfPosition(payload: {
      id: string
      x: number
      y: number
      products: Product[]
    }) {
      const shelf = this.shelves.find(s => s.id === payload.id)
      if (!shelf) return

      // Handle segment grouping logic here
      const segment = this.segments.find(s => 
        payload.x >= s.x &&
        payload.x <= s.x + s.width &&
        payload.y >= s.y &&
        payload.y <= s.y + s.height
      )

      if (segment) {
        shelf.segmentId = segment.id
        shelf.relativeX = payload.x - segment.x
        shelf.relativeY = payload.y - segment.y
      } else {
        shelf.segmentId = null
      }

      this.saveStateToHistory()
    },
    addProduct(payload: {
      x: number
      y: number
      width: number
      height: number
      depth: number
      color?: string
      shelfId?: string
      segmentId?: string
      relativeX?: number
      relativeY?: number
      type?: string
      image?: string
      code?: string
    }) {
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
        segmentId: payload.segmentId,
        type: payload.type || 'Food',
        color: payload.color || '#81C784',
        category: 'product',
        image: payload.type === 'Drink' ? '/src/assets/products/cola.png' : 
               payload.type === 'Food' ? '/src/assets/products/pepsi.png' : 
               '/src/assets/products/default.png',
      }
      this.products.push(newProduct)
      return newProduct
    },
    updateProductPosition(payload: {
      id: string
      x: number
      y: number
      relativeX?: number
      relativeY?: number
      shelfId?: string
      segmentId?: string
      fixtureId?: string
    }) {
      const index = this.products.findIndex(p => p.id === payload.id)
      if (index === -1) return
      
      const currentProduct = this.products[index]
      this.products[index] = {
        ...currentProduct,
        x: payload.x,
        y: payload.y,
        relativeX: payload.relativeX ?? currentProduct.relativeX,
        relativeY: payload.relativeY ?? currentProduct.relativeY,
        shelfId: payload.shelfId,
        segmentId: payload.segmentId,
        fixtureId: payload.fixtureId,
        type: currentProduct.type,
        color: currentProduct.color,
        category: currentProduct.category,
        image: currentProduct.image
      }

      this.saveStateToHistory()
    },
    deleteProduct(productId: string) {
      const index = this.products.findIndex(p => p.id === productId)
      if (index !== -1) {
        this.products.splice(index, 1)
      }

      this.saveStateToHistory()
    },
    deleteShelf(shelfId: string) {
      // First remove all products on this shelf
      this.products = this.products.filter(p => p.shelfId !== shelfId)
      
      // Then remove the shelf
      const index = this.shelves.findIndex(s => s.id === shelfId)
      if (index !== -1) {
        this.shelves.splice(index, 1)
      }

      this.saveStateToHistory()
    },
    addSegment(payload: {
      x: number
      y: number
      width: number
      height: number
    }) {
      const newSegment: Segment = {
        id: uuidv4(),
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        name: 'New Segment',
        category: 'fixtures',
        subCategory: 'segment'
      }
      this.segments.push(newSegment)
      return newSegment
    },
    addShelf(payload: {
      x: number
      y: number
      width: number
      height: number
      depth : number
      segmentId?: string
      relativeX?: number
      relativeY?: number
      strictPlacement?: boolean
    }) {
      const newShelf: Shelf = {
        id: uuidv4(),
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        depth: payload.depth,
        segmentId: payload.segmentId,
        relativeX: payload.relativeX ?? 0,
        relativeY: payload.relativeY ?? 0,
        category: 'fixtures',
        subCategory: 'shelf',
        strictPlacement: payload.strictPlacement
      }
      this.shelves.push(newShelf)
      return newShelf
    },
    updateSegmentPosition(payload: {
      id: string
      x: number
      y: number
    }) {
      const segment = this.segments.find(s => s.id === payload.id)
      if (!segment) return
      
      // Calculate the movement delta
      const deltaX = payload.x - segment.x
      const deltaY = payload.y - segment.y
      
      // Update segment position
      segment.x = payload.x
      segment.y = payload.y
      
      // Update positions of shelves within this segment
      const segmentShelves = this.shelves.filter(s => s.segmentId === payload.id)
      segmentShelves.forEach(shelf => {
        // Update absolute position while maintaining relative position
        shelf.x = segment.x + (shelf.relativeX || 0)
        shelf.y = segment.y + (shelf.relativeY || 0)
        
        // Update products on this shelf
        const shelfProducts = this.products.filter(p => p.shelfId === shelf.id)
        shelfProducts.forEach(product => {
          if (product.relativeX !== undefined && product.relativeY !== undefined) {
            product.x = shelf.x + product.relativeX
            product.y = shelf.y + product.relativeY
          }
        })
      })
      
      // Update positions of products directly in this segment
      const segmentProducts = this.products.filter(p => p.segmentId === payload.id && !p.shelfId)
      segmentProducts.forEach(product => {
        if (product.relativeX !== undefined && product.relativeY !== undefined) {
          product.x = segment.x + product.relativeX
          product.y = segment.y + product.relativeY
        }
      })

      this.saveStateToHistory()
    },
    saveStateToHistory() {
      // Create a deep copy of the current state
      const currentState: HistoryState = {
        segments: JSON.parse(JSON.stringify(this.segments)),
        shelves: JSON.parse(JSON.stringify(this.shelves)),
        pegboards: JSON.parse(JSON.stringify(this.pegboards)),
        products: JSON.parse(JSON.stringify(this.products))
      }
      
      // Add to history
      this.history.push(currentState)
      
      // Limit history length
      if (this.history.length > 20) {
        this.history.shift() // Remove oldest state
      }
    },
    undo() {
      if (this.history.length === 0) {
        console.log('No actions to undo')
        return false
      }
      
      // Get the previous state
      const previousState = this.history.pop()
      
      if (previousState) {
        // Restore the previous state
        this.segments = previousState.segments
        this.shelves = previousState.shelves
        this.pegboards = previousState.pegboards
        this.products = previousState.products
        return true
      }
      
      return false
    },
    updatePegboardPosition(payload: {
      id: string
      x: number
      y: number
      segmentId?: string | null
      relativeX?: number | undefined
      relativeY?: number | undefined
      products: { id: string; relativeX: number; relativeY: number }[]
    }) {
      const pegboard = this.pegboards.find(p => p.id === payload.id)
      if (!pegboard) return

      pegboard.x = payload.x
      pegboard.y = payload.y
      
      // Update segment-related properties if provided
      if (payload.segmentId !== undefined) {
        pegboard.segmentId = payload.segmentId
      }
      
      if (payload.relativeX !== undefined) {
        pegboard.relativeX = payload.relativeX
      }
      
      if (payload.relativeY !== undefined) {
        pegboard.relativeY = payload.relativeY
      }

      // Update product positions
      payload.products.forEach(productUpdate => {
        const product = this.products.find(p => p.id === productUpdate.id)
        if (product) {
          product.relativeX = productUpdate.relativeX
          product.relativeY = productUpdate.relativeY
        }
      })

      this.saveStateToHistory()
    },
    groupProducts(productIds: string[]) {
      if (productIds.length < 2) return
      
      // Find all products to be grouped
      const productsToGroup = this.products.filter(p => productIds.includes(p.id))
      if (productsToGroup.length < 2) return
      
      // Get the first product as reference
      const referenceProduct = productsToGroup[0]
      
      // Create a group ID
      const groupId = `group-${referenceProduct.code}-${Date.now()}`
      
      // Update all products in the group to have the same group ID
      productsToGroup.forEach(product => {
        const index = this.products.findIndex(p => p.id === product.id)
        if (index !== -1) {
          this.products[index] = {
            ...product,
            groupId
          }
        }
      })
      
      // Save state to history
      this.saveStateToHistory()
    },
    wrappedGroupProducts(productIds: string[]) {
      this.saveStateToHistory()
      return this.groupProducts(productIds)
    },
    addPegboard(payload: {
      x: number
      y: number
      width: number
      height: number
      depth: number
      color?: string
      segmentId?: string
      relativeX?: number
      relativeY?: number
      strictPlacement?: boolean
    }) {
      const newPegboard: Pegboard = {
        id: uuidv4(),
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        depth: payload.depth,
        color: payload.color,
        segmentId: payload.segmentId || null,
        relativeX: payload.relativeX,
        relativeY: payload.relativeY,
        strictPlacement: payload.strictPlacement ?? false,
        category: 'fixtures',
        subCategory: 'pegboard'
      }
      this.pegboards.push(newPegboard)
      this.saveStateToHistory()
      return newPegboard
    },
    deletePegboard(pegboardId: string) {
      // First remove all products on this pegboard
      this.products = this.products.filter(p => p.fixtureId !== pegboardId)
      
      // Then remove the pegboard
      const index = this.pegboards.findIndex(p => p.id === pegboardId)
      if (index !== -1) {
        this.pegboards.splice(index, 1)
      }
      this.saveStateToHistory()
    },
    finalizePegboardPosition(payload: {
      id: string
      x: number
      y: number
      products: Product[]
    }) {
      const pegboard = this.pegboards.find(p => p.id === payload.id)
      if (!pegboard) return

      // Handle segment grouping logic here
      const segment = this.segments.find(s => 
        payload.x >= s.x &&
        payload.x <= s.x + s.width &&
        payload.y >= s.y &&
        payload.y <= s.y + s.height
      )

      if (segment) {
        pegboard.segmentId = segment.id
        pegboard.relativeX = payload.x - segment.x
        pegboard.relativeY = payload.y - segment.y
      } else {
        pegboard.segmentId = null
        pegboard.x = payload.x
        pegboard.y = payload.y
      }

      // Update product positions
      payload.products.forEach(product => {
        const index = this.products.findIndex(p => p.id === product.id)
        if (index !== -1) {
          this.products[index] = {
            ...product,
            fixtureId: pegboard.id,
            segmentId: pegboard.segmentId
          }
        }
      })

      this.saveStateToHistory()
    }
  }
})
