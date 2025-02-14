import type { Node } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import { 
  NODE_TYPE_GROUP,
  CATEGORY_FIXTURES,
  SUB_CATEGORY_SECTION,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY,
  ATTR_WIDTH,
  ATTR_HEIGHT
} from '../../shared/constants'
import type { 
  SectionBounds, 
  ShelfBounds, 
  SectionIntersection 
} from '../shelf-model'

export function findSections(stage: Stage): Node[] {
  return stage.find((node: Node) => 
    node.getType() === NODE_TYPE_GROUP && 
    node.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
    node.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_SECTION
  )
}

export function checkSectionIntersection(
  pos: { x: number; y: number },
  section: Node,
  shelfWidth: number,
  shelfHeight: number
): boolean {
  const bounds: SectionBounds = {
    sectionX: section.x(),
    sectionY: section.y(),
    sectionWidth: section.getAttr(ATTR_WIDTH),
    sectionHeight: section.getAttr(ATTR_HEIGHT),
    shelfWidth,
    shelfHeight
  }
  
  const shelfBounds: ShelfBounds = {
    shelfLeft: pos.x,
    shelfRight: pos.x + bounds.shelfWidth,
    shelfTop: pos.y,
    shelfBottom: pos.y + bounds.shelfHeight
  }
  
  const intersection: SectionIntersection = {
    sectionRight: bounds.sectionX + bounds.sectionWidth,
    sectionBottom: bounds.sectionY + bounds.sectionHeight
  }

  return (
    shelfBounds.shelfLeft < intersection.sectionRight &&
    shelfBounds.shelfRight > bounds.sectionX &&
    shelfBounds.shelfTop < intersection.sectionBottom &&
    shelfBounds.shelfBottom > bounds.sectionY
  )
}

export function findIntersectingSection(
  sections: Node[],
  pos: { x: number; y: number },
  shelfWidth: number,
  shelfHeight: number
): Node | null {
  for (const section of sections) {
    if (checkSectionIntersection(pos, section, shelfWidth, shelfHeight)) {
      return section
    }
  }
  return null
}
