import type { KonvaEventObject, NodeConfig, Node } from 'konva/lib/Node'
import type { Shelf, Product } from '../../../types'

export interface ShelfProps {
  shelf: Shelf
  products: Product[]
}

export interface ShelfEmits {
  (e: 'product-drag', data: ProductDragData): void
  (e: 'product-detach', data: ProductDetachData): void
  (e: 'update-position', data: any): void
}

export interface ProductDragData {
  productId: string
  x: number
  y: number
}

export interface ProductDetachData {
  productId: string
  absoluteX: number
  absoluteY: number
}

export interface ShelfConfig {
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  category: string
  subCategory: string
  sectionId: string | null | undefined
}

export interface ShelfPosition {
  id: string
  x: number
  y: number
  products: Array<{
    id: string
    relativeX: number
    relativeY: number
  }>
}

export interface SectionBounds {
  sectionX: number
  sectionY: number
  sectionWidth: number
  sectionHeight: number
  shelfWidth: number
  shelfHeight: number
}

export interface ShelfBounds {
  shelfLeft: number
  shelfRight: number
  shelfTop: number
  shelfBottom: number
}

export interface SectionIntersection {
  sectionRight: number
  sectionBottom: number
}

export interface ShelfPositionUpdate {
  x: number
  y: number
  relativeX?: number
  relativeY?: number
  sectionId?: string | null
}
