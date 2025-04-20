import type { Stage } from 'konva/lib/Stage'
import type { Node } from 'konva/lib/Node'
import { 
  CATEGORY_FIXTURES,
  SUB_CATEGORY_PEGBOARD,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY
} from '../../shared/constants'

/**
 * Find all pegboards in the stage
 */
export function findPegboards(stage: Stage): Node[] {
  return stage.find(node => 
    node.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
    node.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_PEGBOARD
  )
}

/**
 * Check if a point intersects with a pegboard
 */
export function checkPegboardIntersection(
  pegboard: Node,
  point: { x: number; y: number },
  width: number,
  height: number
): boolean {
  const pegboardPos = pegboard.absolutePosition()
  const pegboardWidth = pegboard.width()
  const pegboardHeight = pegboard.height()

  return (
    point.x >= pegboardPos.x &&
    point.x + width <= pegboardPos.x + pegboardWidth &&
    point.y >= pegboardPos.y &&
    point.y + height <= pegboardPos.y + pegboardHeight
  )
}

/**
 * Find the pegboard that intersects with a point
 */
export function findIntersectingPegboard(
  pegboards: Node[],
  point: { x: number; y: number },
  width: number,
  height: number
): Node | null {
  return pegboards.find(pegboard => 
    checkPegboardIntersection(pegboard, point, width, height)
  ) || null
} 