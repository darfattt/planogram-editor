import type { Node } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import { 
  NODE_TYPE_GROUP,
  CATEGORY_FIXTURES,
  SUB_CATEGORY_SEGMENT,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY,
  ATTR_WIDTH,
  ATTR_HEIGHT
} from '../../shared/constants'
import type { 
  SegmentBounds, 
  ShelfBounds, 
  SegmentIntersegment 
} from '../shelf-model'

export function findSegments(stage: Stage): Node[] {
  return stage.find((node: Node) => 
    node.getType() === NODE_TYPE_GROUP && 
    node.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
    node.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_SEGMENT
  )
}

export function checkSegmentIntersegment(
  pos: { x: number; y: number },
  segment: Node,
  shelfWidth: number,
  shelfHeight: number
): boolean {
  // Get stage and scale for zoom adjustment
  const stage = segment.getStage()
  const scale = stage ? stage.scaleX() : 1

  // Get segment position and adjust for zoom
  const rawSegmentPos = segment.getAbsolutePosition()
  const segmentPos = {
    x: rawSegmentPos.x / scale,
    y: rawSegmentPos.y / scale
  }

  const bounds: SegmentBounds = {
    segmentX: segmentPos.x,
    segmentY: segmentPos.y,
    segmentWidth: segment.getAttr(ATTR_WIDTH),
    segmentHeight: segment.getAttr(ATTR_HEIGHT),
    shelfWidth,
    shelfHeight
  }
  
  const shelfBounds: ShelfBounds = {
    shelfLeft: pos.x,
    shelfRight: pos.x + bounds.shelfWidth,
    shelfTop: pos.y,
    shelfBottom: pos.y + bounds.shelfHeight
  }
  
  const intersegment: SegmentIntersegment = {
    segmentRight: bounds.segmentX + bounds.segmentWidth,
    segmentBottom: bounds.segmentY + bounds.segmentHeight
  }

  return (
    shelfBounds.shelfLeft < intersegment.segmentRight &&
    shelfBounds.shelfRight > bounds.segmentX &&
    shelfBounds.shelfTop < intersegment.segmentBottom &&
    shelfBounds.shelfBottom > bounds.segmentY
  )
}

export function findIntersectingSegment(
  segments: Node[],
  pos: { x: number; y: number },
  shelfWidth: number,
  shelfHeight: number
): Node | null {
  for (const segment of segments) {
    if (checkSegmentIntersegment(pos, segment, shelfWidth, shelfHeight)) {
      return segment
    }
  }
  return null
}
