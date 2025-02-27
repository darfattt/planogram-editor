import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { REORG_PRODUCT_ON_SHELF, Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF } from '../constants'
import type { ShelfPositionData, ProductPositionData, PositionData } from '../product-model'
import {
  ATTR_SHELF_DATA,
  ATTR_X,
  ATTR_Y,
  ATTR_ID,
  ATTR_SECTION_ID,
  ATTR_CATEGORY,
  ATTR_WIDTH
} from '../../shared/constants'

/**
 * Reorganizes products on a shelf with strict placement after a product is removed
 * Shifts all products to the left to fill any gaps
 */
export function reorganizeProductsOnShelf(shelf: Group, removedProductId?: string): void {
  const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
  
  // Only proceed if strict placement is enabled
  if (!shelfData.strictPlacement) {
    return
  }
  
  // Get all products on this shelf
  const productsOnShelf = shelf.getChildren(child => 
    child.getAttr(ATTR_CATEGORY)?.toLowerCase() === 'product'
  )
  
  if (productsOnShelf.length === 0) {
    return // No products to reorganize
  }
  
  // Sort products by their X position (left to right)
  const sortedProducts = [...productsOnShelf].sort((a, b) => {
    return a.getAttr(ATTR_X) - b.getAttr(ATTR_X)
  })
  
  // Start positioning from the left edge
  let currentX = 0
  
  // Reposition each product
  sortedProducts.forEach(product => {
    // Skip the product being removed (if specified)
    if (removedProductId && product.id() === removedProductId) {
      return
    }
    
    // Move the product to its new position
    product.setAttr(ATTR_X, currentX)
    
    // Update currentX for the next product
    currentX += product.getAttr(ATTR_WIDTH)
  })
}

export function getShelfPositionData(
  shelf: Group,
  absolutePos: { x: number; y: number },
  productHeight: number
): ShelfPositionData {
  const shelfPos = shelf.getAbsolutePosition()
  const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
  
  // Check if strict placement is enabled
  if (shelfData.strictPlacement) {
    // Get all products on this shelf
    const productsOnShelf = shelf.getChildren(child => 
      child.getAttr(ATTR_CATEGORY)?.toLowerCase() === 'product'
    )
    
    if (productsOnShelf.length === 0) {
      // If shelf is empty, place at the very left
      return {
        relativeX: 0, // Left edge
        relativeY: (- productHeight) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
        shelfPos,
        shelfData
      }
    } else {
      // Find the rightmost product
      let rightmostX = 0
      let rightmostWidth = 0
      
      productsOnShelf.forEach(product => {
        const productX = product.getAttr(ATTR_X)
        const productWidth = product.getAttr(ATTR_WIDTH)
        
        if (productX + productWidth > rightmostX + rightmostWidth) {
          rightmostX = productX
          rightmostWidth = productWidth
        }
      })
      
      // Place beside the rightmost product
      return {
        relativeX: rightmostX + rightmostWidth,
        relativeY: (- productHeight) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
        shelfPos,
        shelfData
      }
    }
  }
  
  // Default behavior if strict placement is not enabled
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
  const relativeY = product.getAttr(ATTR_Y) - productHeight - productGap
  return {
    relativeX: product.getAttr(ATTR_X),
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
  // Store original parent to check if product is being moved from one shelf to another
  const originalParent = node.getParent();
  const originalShelfData = originalParent?.getAttr?.(ATTR_SHELF_DATA);
  const isMovingFromShelf = originalShelfData && originalShelfData.strictPlacement && REORG_PRODUCT_ON_SHELF;
  
  if (targetShelf) {
    const positionData = getShelfPositionData(targetShelf, absolutePos, productHeight);
    const group = node as unknown as Group;
    
    // If moving from a shelf with strict placement, reorganize the original shelf
    if (isMovingFromShelf && originalParent !== targetShelf) {
      reorganizeProductsOnShelf(originalParent as Group, node.id());
    }
    
    group.moveTo(targetShelf);
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
      shelfId: positionData.parentGroup?.getAttr(ATTR_ID),
      sectionId: positionData.parentGroup?.getAttr(ATTR_SHELF_DATA).sectionId,
      parentProductId: targetProduct.id(),
      foundProduct: true
    };
  }

  // If moving from a shelf with strict placement but not to another shelf or product
  if (isMovingFromShelf) {
    reorganizeProductsOnShelf(originalParent as Group, node.id());
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
