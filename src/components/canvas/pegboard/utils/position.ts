import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { ATTR_SEGMENT_ID } from '../../shared/constants'

export interface PegboardPosition {
  x: number
  y: number
  relativeX?: number
  relativeY?: number
  segmentId?: string | null
}

/**
 * Calculate the position of a pegboard relative to a segment
 */
export function calculatePegboardPosition(
  pegboardNode: Node,
  segment: Group,
  position: { x: number; y: number }
): PegboardPosition {
  const segmentPos = segment.absolutePosition()
  const pegboardWidth = pegboardNode.width()
  const pegboardHeight = pegboardNode.height()
  const segmentWidth = segment.width()
  const segmentHeight = segment.height()

  // Calculate relative position within segment bounds
  let relativeX = position.x - segmentPos.x
  let relativeY = position.y - segmentPos.y

  // Constrain to segment bounds
  relativeX = Math.max(0, Math.min(relativeX, segmentWidth - pegboardWidth))
  relativeY = Math.max(0, Math.min(relativeY, segmentHeight - pegboardHeight))

  return {
    x: segmentPos.x + relativeX,
    y: segmentPos.y + relativeY,
    relativeX,
    relativeY,
    segmentId: segment.id()
  }
}

/**
 * Calculate the position of a product relative to a pegboard
 */
export function calculateProductPositionOnPegboard(
  productNode: Node,
  pegboard: Node,
  position: { x: number; y: number }
): { x: number; y: number; relativeX: number; relativeY: number } {
  const pegboardPos = pegboard.absolutePosition()
  const productWidth = productNode.width()
  const productHeight = productNode.height()
  const pegboardWidth = pegboard.width()
  const pegboardHeight = pegboard.height()

  // Calculate relative position within pegboard bounds
  let relativeX = position.x - pegboardPos.x
  let relativeY = position.y - pegboardPos.y

  // Constrain to pegboard bounds
  relativeX = Math.max(0, Math.min(relativeX, pegboardWidth - productWidth))
  relativeY = Math.max(0, Math.min(relativeY, pegboardHeight - productHeight))

  return {
    x: pegboardPos.x + relativeX,
    y: pegboardPos.y + relativeY,
    relativeX,
    relativeY
  }
}

/**
 * Calculate the detach position for a product when removed from a pegboard
 */
export function calculateProductDetachFromPegboard(
  productId: string,
  products: Array<{ id: string; x: number; y: number }>,
  pegboardX: number,
  pegboardY: number
): { x: number; y: number } | null {
  const product = products.find(p => p.id === productId)
  if (!product) return null

  return {
    x: pegboardX + (product.x || 0),
    y: pegboardY + (product.y || 0)
  }
} 