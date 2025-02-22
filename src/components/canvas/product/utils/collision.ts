import type { Node, NodeConfig } from 'konva/lib/Node'
import { COLLISION_ADJUSTMENT } from '../constants'
import type { ProductCollisionState } from '../product-model'
import { 
  ATTR_ID,
  ATTR_COLOR,
  ATTR_FILL,
  COLOR_RED
} from '../../shared/constants'

export function checkCollision(
  targetRect: { x: number; y: number; width: number; height: number },
  productRect: { x: number; y: number; width: number; height: number }
) {
  const isRightOf = targetRect.x > productRect.x + productRect.width - COLLISION_ADJUSTMENT
  const isLeftOf = targetRect.x + targetRect.width < productRect.x + COLLISION_ADJUSTMENT
  const isBelow = targetRect.y > productRect.y + productRect.height - COLLISION_ADJUSTMENT
  const isAbove = targetRect.y + targetRect.height < productRect.y + (COLLISION_ADJUSTMENT + 5)
  
  return !(isRightOf || isLeftOf || isBelow || isAbove)
}

export function handleProductCollisions(
  node: Node,
  allProducts: Node[],
  productId: string,
  defaultFillColor: string
): ProductCollisionState {
  const targetRect = node.getClientRect()
  let collisionState: ProductCollisionState = {
    productId: null,
    hasCollision: false,
    collisionProduct: null
  }

  allProducts.forEach((product) => {
    const productRect = product.getClientRect()
    const productNode = product as Node<NodeConfig>;
    const hasCollision = checkCollision(targetRect, productRect) && 
                        product.getAttr(ATTR_ID) !== node.getAttr(ATTR_ID)
    if(hasCollision) {
      collisionState = {
        productId: node.getAttr(ATTR_ID),
        hasCollision: true,
        collisionProduct: productNode
      }
      product.setAttrs({ [ATTR_FILL]: COLOR_RED })
    } else {
      product.setAttrs({ [ATTR_FILL]: productNode.getAttr(ATTR_COLOR)})
    }
  })

  return collisionState
}
