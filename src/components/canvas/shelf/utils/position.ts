import type { Node } from 'konva/lib/Node'
import {
  ATTR_ID,
  ATTR_X,
  ATTR_Y,
  ATTR_SECTION_ID
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
  
  // Always align to left (x: 0) when in a section
  const relativeX = 0
  const relativeY = pos.y - sectionY
  
  // Move shelf to section and set position
  node.moveTo(section)
  node.position({
    x: relativeX,
    y: relativeY
  })
  
  // Set the section ID attribute
  node.setAttr(ATTR_SECTION_ID, section.id())

  return {
    sectionId: section.id(),
    x: sectionX,
    y: pos.y,
    relativeX: relativeX,
    relativeY: relativeY
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
