import type { Node } from 'konva/lib/Node'
import {
  ATTR_ID,
  ATTR_X,
  ATTR_Y
} from '../../shared/constants'

export interface ShelfPositionUpdate {
  sectionId: string
  x: number
  y: number
  relativeX: number
  relativeY: number
}

export function calculateShelfPosition(
  node: Node,
  section: Node,
  pos: { x: number; y: number }
): ShelfPositionUpdate {
  const sectionX = section.x()
  const sectionY = section.y()
  
  // Move shelf to section
  node.moveTo(section)
  node.position({
    x: 0,
    y: pos.y - sectionY
  })

  return {
    sectionId: section.id(),
    x: sectionX,
    y: pos.y,
    relativeX: 0,
    relativeY: pos.y - sectionY
  }
}

export function calculateProductPosition(
  productNode: Node,
  shelfX: number,
  shelfY: number
): { x: number; y: number } {
  return {
    x: productNode.x() - shelfX,
    y: productNode.y() - shelfY
  }
}

export interface ProductWithPosition {
  id: string
  relativeX?: number
  relativeY?: number
}

export function calculateProductDetachPosition(
  productId: string,
  products: ProductWithPosition[],
  shelfX: number,
  shelfY: number
): { absoluteX: number; absoluteY: number } | null {
  const product = products.find(p => p.id === productId)
  if (!product) return null

  return {
    absoluteX: shelfX + (product.relativeX ?? 0),
    absoluteY: shelfY + (product.relativeY ?? 0)
  }
}
