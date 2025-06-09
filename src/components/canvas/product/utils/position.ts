import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { REORG_PRODUCT_ON_SHELF, Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF } from '../constants'
import type { ShelfPositionData, ProductPositionData, PositionData } from '../product-model'
import {
  ATTR_SHELF_DATA,
  ATTR_X,
  ATTR_Y,
  ATTR_ID,
  ATTR_SEGMENT_ID,
  ATTR_CATEGORY,
  ATTR_WIDTH
} from '../../shared/constants'

/**
 * Reorganizes products on a shelf with strict placement after a product is removed
 * Shifts all products to the left to fill any gaps
 */
export function reorganizeProductsOnShelf(shelf: Group, removedProductId?: string): void {
  console.log("reorganizeProductsOnShelf", shelf);
  const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
  
  // Only proceed if strict placement is enabled
  if (!shelfData.strictPlacement) {
    return
  }
  
  // Get all products on this shelf
  const productsOnShelf = shelf.getChildren(child => 
    child.getAttr(ATTR_CATEGORY)?.toLowerCase() === 'product'
  )
  console.log("productsOnShelf", productsOnShelf);  
  if (productsOnShelf.length === 0) {
    return // No products to reorganize
  }
  
  // Sort products by their X position (left to right)
  const sortedProducts = [...productsOnShelf].sort((a, b) => {
    return a.getAttr(ATTR_X) - b.getAttr(ATTR_X)
  })
  
  // Start positioning from the left edge
  let currentX = 0
  console.log("sortedProducts", sortedProducts);
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
  productHeight: number,
  draggedProductId?: string
): ShelfPositionData {
  // Get stage and scale for zoom adjustment
  const stage = shelf.getStage()
  const scale = stage ? stage.scaleX() : 1

  // Get shelf position and adjust for zoom
  const rawShelfPos = shelf.getAbsolutePosition()
  const shelfPos = {
    x: rawShelfPos.x / scale,
    y: rawShelfPos.y / scale
  }
  const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
  
  // Check if strict placement is enabled
  if (shelfData.strictPlacement) {
    // Get all products on this shelf except the one being dragged
    const productsOnShelf = shelf.getChildren(child => 
      child.getAttr(ATTR_CATEGORY)?.toLowerCase() === 'product' &&
      child.id() !== draggedProductId
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

/**
 * Handles product movement within the same shelf
 * Returns position data for products being moved on the same shelf
 */
function getSameShelfPositionData(
  shelf: Group,
  draggedProduct: Node,
  absolutePos: { x: number; y: number },
  productHeight: number
): ShelfPositionData {
  // Get stage and scale for zoom adjustment
  const stage = shelf.getStage()
  const scale = stage ? stage.scaleX() : 1

  // Get shelf position and adjust for zoom
  const rawShelfPos = shelf.getAbsolutePosition()
  const shelfPos = {
    x: rawShelfPos.x / scale,
    y: rawShelfPos.y / scale
  }
  const shelfData = shelf.getAttr(ATTR_SHELF_DATA)
  
  if (!shelfData.strictPlacement) {
    return {
      relativeX: absolutePos.x - shelfPos.x,
      relativeY: (- productHeight) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
      shelfPos,
      shelfData
    }
  }

  // Get all products on this shelf except the one being dragged
  const productsOnShelf = shelf.getChildren(child => 
    child.getAttr(ATTR_CATEGORY)?.toLowerCase() === 'product' &&
    child.id() !== draggedProduct.id()
  )

  // Sort products by X position
  const sortedProducts = [...productsOnShelf].sort((a, b) => 
    a.getAttr(ATTR_X) - b.getAttr(ATTR_X)
  )

  // Find the insertion position
  const dragX = absolutePos.x - shelfPos.x
  let insertIndex = 0

  for (let i = 0; i < sortedProducts.length; i++) {
    const product = sortedProducts[i]
    const productX = product.getAttr(ATTR_X)
    const productWidth = product.getAttr(ATTR_WIDTH)

    if (dragX < productX + productWidth / 2) {
      break
    }
    insertIndex = i + 1
  }

  // Calculate the new X position
  let newX = 0
  if (insertIndex === 0) {
    // Insert at the beginning
    newX = 0
  } else if (insertIndex === sortedProducts.length) {
    // Insert at the end
    const lastProduct = sortedProducts[sortedProducts.length - 1]
    newX = lastProduct.getAttr(ATTR_X) + lastProduct.getAttr(ATTR_WIDTH)
  } else {
    // Insert between products
    const prevProduct = sortedProducts[insertIndex - 1]
    newX = prevProduct.getAttr(ATTR_X) + prevProduct.getAttr(ATTR_WIDTH)
  }

  return {
    relativeX: newX,
    relativeY: (- productHeight) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
    shelfPos,
    shelfData
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
    let positionData: ShelfPositionData;
    const group = node as unknown as Group;
    
    // Check if moving within the same shelf
    if (originalParent === targetShelf) {
      positionData = getSameShelfPositionData(targetShelf, node, absolutePos, productHeight);
    } else {
      // Moving to a different shelf
      positionData = getShelfPositionData(targetShelf, absolutePos, productHeight, node.id());
      
      // If moving from a shelf with strict placement, reorganize the original shelf
      if (isMovingFromShelf) {
        reorganizeProductsOnShelf(originalParent as Group, node.id());
      }
    }
    
    group.moveTo(targetShelf);
    node.position({ x: positionData.relativeX, y: positionData.relativeY });
    
    return {
      x: absolutePos.x,
      y: absolutePos.y,
      relativeX: positionData.relativeX,
      relativeY: positionData.relativeY,
      shelfId: positionData.shelfData.id,
      segmentId: positionData.shelfData.segmentId,
      foundShelf: true
    };
  }

  if (targetProduct) {
    console.log("found target product...");
    const positionData = getProductPositionData(targetProduct, productHeight, productGap);
    const group = node as unknown as Group;
    
    // Check if products have the same code and are on the same shelf
    const nodeCode = node.getAttr('code');
    const targetCode = targetProduct.getAttr('code');
    const targetParent = targetProduct.getParent();
    const isSameShelf = targetParent && originalParent && targetParent === originalParent;
    
    console.log("Node code:", nodeCode);
    console.log("Target code:", targetCode);
    console.log("Same shelf:", isSameShelf);
    
    if (nodeCode && targetCode && nodeCode === targetCode && isSameShelf) {
      console.log("Same product code and same shelf - nesting groups");
      
      // Cast the target product to a Group
      const targetGroup = targetProduct as unknown as Group;
      
      // Move the dragged product group into the target product group
      // This creates the nested structure:
      // <v-group> (target product)
      //   <v-rect/v-image> (target product content)
      //   <v-group> (dragged product)
      //     <v-rect/v-image> (dragged product content)
      //   </v-group>
      // </v-group>
      group.moveTo(targetGroup);
      
      return {
        x: absolutePos.x,
        y: absolutePos.y,
        relativeX: positionData.relativeX,
        relativeY: positionData.relativeY,
        shelfId: positionData.parentGroup?.getAttr(ATTR_ID),
        segmentId: positionData.parentGroup?.getAttr(ATTR_SHELF_DATA).segmentId,
        parentProductId: targetProduct.id(),
        foundProduct: true
      };
    }
    
    console.log({node});
    console.log({targetProduct});
    console.log(positionData.parentGroup);
    
    // For products that don't have the same code, move to the parent group
    if (positionData.parentGroup) {
      group.moveTo(positionData.parentGroup);
      node.position({ x: positionData.relativeX, y: positionData.relativeY });
    }
    return {
      x: absolutePos.x,
      y: absolutePos.y,
      relativeX: positionData.relativeX,
      relativeY: positionData.relativeY,
      shelfId: positionData.parentGroup?.getAttr(ATTR_ID),
      segmentId: positionData.parentGroup?.getAttr(ATTR_SHELF_DATA).segmentId,
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
