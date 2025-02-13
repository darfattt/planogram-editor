import type { Node, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Stage } from 'konva/lib/Stage'

export interface ElementFinderResult {
  shelves: Group[]
  allProducts: Node[]
}

export function findElements(stage: Stage): ElementFinderResult {
  const sections = stage.find((node: Node) => 
    node.getType() === 'Group' && 
    node.getAttr('category') === 'fixtures' && 
    node.getAttr('subCategory') === 'section'
  )

  const shelves = sections.flatMap(section => 
    (section as Group).getChildren(child => 
      child.getAttr('category') === 'fixtures' && 
      child.getAttr('subCategory') === 'shelf'
    )
  ) as Group[]

  const allProducts = shelves.flatMap(shelf => 
    shelf.getChildren(child => 
      child.getAttr('category').toLowerCase() === 'product'
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
    const shelfData = shelf.getAttr('shelfData')
    const shelfWidth = shelf.getAttr('width')
    const shelfHeight = shelf.getAttr('height')

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
      absolutePos.x + product.getAttr('width') + xTolerance >= productPos.x  &&
      absolutePos.x <= productPos.x + product.getAttr('width') + xTolerance &&
      absolutePos.y + yTolerance >= productPos.y - product.getAttr('height') &&
      absolutePos.y <= productPos.y + product.getAttr('height')
    )
  }) || null
}
