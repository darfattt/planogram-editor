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
  category: string
  subCategory: string
  // Add other section properties as needed
}

export interface Shelf {
  id: string
  x: number
  y: number
  width: number
  height: number
  depth?: number
  sectionId?: string | null
  relativeX?: number | 0
  relativeY?: number | 0
  category: string
  subCategory: string
  // Add other shelf properties as needed
}

export interface Product {
  id: string
  code: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  sectionId?: string | null
  shelfId?: string | null
  relativeX?: number
  relativeY?: number
  category: string
  type: string
  color?: string
  image?: string | null
  // Add other product properties as needed
}

export type PlanogramItem = Section | Shelf | Product
