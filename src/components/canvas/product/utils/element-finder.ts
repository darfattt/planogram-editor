import type { Node, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Stage } from 'konva/lib/Stage'
import {
  NODE_TYPE_GROUP,
  CATEGORY_FIXTURES,
  CATEGORY_PRODUCT,
  SUB_CATEGORY_SECTION,
  SUB_CATEGORY_SHELF,
  ATTR_CATEGORY,
  ATTR_SUB_CATEGORY,
  ATTR_SHELF_DATA,
  ATTR_WIDTH,
  ATTR_HEIGHT
} from '../../shared/constants'

export interface ElementFinderResult {
  shelves: Group[]
  allProducts: Node[]
}

export function findElements(stage: Stage): ElementFinderResult {
  const sections = stage.find((node: Node) => 
    node.getType() === NODE_TYPE_GROUP && 
    node.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
    node.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_SECTION
  )

  const shelves = sections.flatMap(section => 
    (section as Group).getChildren(child => 
      child.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
      child.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_SHELF
    )
  ) as Group[]

  const allProducts = shelves.flatMap(shelf => 
    shelf.getChildren(child => 
      child.getAttr(ATTR_CATEGORY).toLowerCase() === CATEGORY_PRODUCT
    )
  )

  return { shelves, allProducts }
}

export function findTargetShelf(
  shelves: Group[], 
  absolutePos: { x: number; y: number },
  productHeight: number,
  yTolerance = 10
): Group | null {
  return shelves.find(shelf => {
    const shelfPos = shelf.getAbsolutePosition()
    const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
    const shelfWidth = shelf.getAttr(ATTR_WIDTH)
    const shelfHeight = shelf.getAttr(ATTR_HEIGHT)

    return shelfData && shelfWidth && shelfHeight && (
      absolutePos.x >= shelfPos.x &&
      absolutePos.x <= shelfPos.x + shelfWidth &&
      absolutePos.y + productHeight + yTolerance >= shelfPos.y &&
      absolutePos.y + productHeight <= shelfPos.y + shelfHeight
    )
  }) || null
}

export function findTargetProduct(
  allProducts: Node[],
  absolutePos: { x: number; y: number },
  productHeight: number,
  yTolerance = 10,
  xTolerance = 5
): Node | null {
  return allProducts.find(product => {
    const productPos = product.getAbsolutePosition()
    return (
      absolutePos.x + product.getAttr(ATTR_WIDTH) + xTolerance >= productPos.x  &&
      absolutePos.x <= productPos.x + product.getAttr(ATTR_WIDTH) + xTolerance &&
      absolutePos.y + yTolerance >= productPos.y - product.getAttr(ATTR_HEIGHT) &&
      absolutePos.y <= productPos.y + product.getAttr(ATTR_HEIGHT)
    )
  }) || null
}
