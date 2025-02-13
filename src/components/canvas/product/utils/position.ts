import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF } from '../constants'
import type { ShelfPositionData, ProductPositionData, PositionData } from '../product-model'

export function getShelfPositionData(
  shelf: Group,
  absolutePos: { x: number; y: number },
  productHeight: number
): ShelfPositionData {
  const shelfPos = shelf.getAbsolutePosition()
  const shelfData = shelf.getAttr('shelfData')
  
  return {
    relativeX: absolutePos.x - shelfPos.x,
    relativeY: (- productHeight) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
    shelfPos,
    shelfData
  }
}

export function getProductPositionData(
  product: Node,
  productHeight: number,
  productGap: number
): ProductPositionData {
  const relativeY = product.getAttr('y') - productHeight - productGap
  return {
    relativeX: product.getAttr('x'),
    relativeY,
    parentGroup: product.getParent(),
    productAttrs: product.getAttrs()
  }
}

export function calculatePositionData(
  node: Node,
  targetShelf: Group | null,
  targetProduct: Node | null,
  absolutePos: { x: number; y: number },
  productHeight: number,
  productGap: number,
  originalPosition: { x: number; y: number }
): PositionData {
  if (targetShelf) {
    const positionData = getShelfPositionData(targetShelf, absolutePos, productHeight);
    const group = node as unknown as Group;
    group.moveTo(targetShelf);
    //targetShelf.add(node);
    node.position({ x: positionData.relativeX, y: positionData.relativeY });
    return {
      x: absolutePos.x,
      y: absolutePos.y,
      relativeX: positionData.relativeX,
      relativeY: positionData.relativeY,
      shelfId: positionData.shelfData.id,
      sectionId: positionData.shelfData.sectionId,
      foundShelf: true
    };
  }

  if (targetProduct) {
    const positionData = getProductPositionData(targetProduct, productHeight, productGap);
    const group = node as unknown as Group;
    group.moveTo(positionData.parentGroup);
    node.position({ x: positionData.relativeX, y: positionData.relativeY });
    return {
      x: absolutePos.x,
      y: absolutePos.y,
      relativeX: positionData.relativeX,
      relativeY: positionData.relativeY,
      shelfId: positionData.parentGroup?.getAttr('id'),
      sectionId: positionData.parentGroup?.getAttr('shelfData').sectionId,
      parentProductId: targetProduct.id(),
      foundProduct: true
    };
  }

  node.position(originalPosition)
  return {
    ...originalPosition,
    relativeX: originalPosition.x,
    relativeY: originalPosition.y,
    foundProduct: false,
    foundShelf: false
  }
}
