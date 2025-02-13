import type { KonvaEventObject, NodeConfig } from 'konva/lib/Node'
import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Container } from 'konva/lib/Container'
import type { Product } from '../../../types'

export interface ProductProps {
  product: Product
  category?: string
  type?: string
  relativeTo?: boolean
}

export interface ProductEmits {
  (e: 'dragend', data: DragEndEventData): void
  (e: 'drag-start', productId: string): void
  (e: 'update-position', data: UpdatePositionData): void
}

export interface DragEndEventData {
  id: string
  parentProductId: string | null
  x: number
  y: number
  relativeX: number
  relativeY: number
  shelfId?: string
  sectionId?: string
  foundProduct?: boolean
  foundShelf?: boolean
}

export interface UpdatePositionData {
  id: string
  x: number
  y: number
  relativeX: number
  relativeY: number
}

export interface ProductCollisionState {
  productId: string | null
  hasCollision: boolean
  collisionProduct: Node<NodeConfig> | null
}

export interface PositionData {
  x: number
  y: number
  relativeX: number
  relativeY: number
  shelfId?: string
  sectionId?: string
  parentProductId?: string
  foundProduct?: boolean
  foundShelf?: boolean
}

export interface ShelfPositionData {
  relativeX: number
  relativeY: number
  shelfPos: { x: number; y: number }
  shelfData: any
}

export interface ProductPositionData {
  relativeX: number
  relativeY: number
  parentGroup: Container<Node<NodeConfig>> | null
  productAttrs: any
}
