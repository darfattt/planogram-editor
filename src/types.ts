export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface DraggedItem {
  type: 'section' | 'shelf' | 'product'
  properties: Size
}

export interface Section {
  id: string
  x: number
  y: number
  width: number
  height: number
  name?: string
  // Add other section properties as needed
}

export interface Shelf {
  id: string
  x: number
  y: number
  width: number
  height: number
  sectionId?: string | null
  relativeX?: number
  relativeY?: number
  // Add other shelf properties as needed
}

export interface Product {
  id: string
  x: number
  y: number
  width: number
  height: number
  sectionId?: string | null
  shelfId?: string | null
  relativeX?: number
  relativeY?: number
  category: string
  type: string
  color?: string
  image?:string|null
  // Add other product properties as needed
}

export type PlanogramItem = Section | Shelf | Product
