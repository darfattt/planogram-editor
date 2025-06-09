import type { Node } from 'konva/lib/Node'
import {
  ATTR_ID,
  ATTR_X,
  ATTR_Y,
  ATTR_SEGMENT_ID
} from '../../shared/constants'

export interface ShelfPositionUpdate {
  segmentId: string
  x: number
  y: number
  relativeX: number
  relativeY: number
}

export function calculateShelfPosition(
  node: Node,
  segment: Node,
  pos: { x: number; y: number }
): ShelfPositionUpdate {
  // Get stage and scale for zoom adjustment
  const stage = segment.getStage()
  const scale = stage ? stage.scaleX() : 1

  // Get segment position and adjust for zoom
  const rawSegmentPos = segment.getAbsolutePosition()
  const segmentPos = {
    x: rawSegmentPos.x / scale,
    y: rawSegmentPos.y / scale
  }

  // Always align to left (x: 0) when in a segment
  const relativeX = 0
  const relativeY = pos.y - segmentPos.y
  
  // Move shelf to segment and set position
  node.moveTo(segment)
  node.position({
    x: relativeX,
    y: relativeY
  })
  
  // Set the segment ID attribute
  node.setAttr(ATTR_SEGMENT_ID, segment.id())

  return {
    segmentId: segment.id(),
    x: segmentPos.x,
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
