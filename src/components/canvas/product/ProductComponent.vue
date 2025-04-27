<template>
  <v-group
    :config="{
      id: product.id,
      x: relativeTo ? product.relativeX : product.x,
      y: relativeTo ? product.relativeY : product.y,
      draggable: true,
      category: product.category,
      type: product.type,
      height: product.height,
      width: product.width,
      depth: product.depth,
      code: product.code,
      color: product.color
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <v-group>
    <v-rect :config="productConfig" v-if="!product.image || !showProductImages" />
    <v-image 
      v-else
      :config="{
        ...productConfig,
        image: imageObj,
      }"
    />
    </v-group>
  </v-group>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType, ref, onMounted } from 'vue'
import type { KonvaEventObject, NodeConfig } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import type { Node } from 'konva/lib/Node'
import { useDebugStore } from '../../../composables/useDebugStore'
import { useSelectionStore } from '../../../composables/useSelectionStore'
import { usePlanogramStore } from '../../../composables/usePlanogramStore'
import { storeToRefs } from 'pinia'
import type { Product } from '../../../types'
import { 
  DEFAULT_FILL_COLOR, 
  SELECTED_STYLES, 
  DEFAULT_STYLES,
  COLLISION_ADJUSTMENT,
  Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF
} from './constants'
import { 
  CATEGORY_PRODUCT,
  DEFAULT_CATEGORY_PRODUCT,
  DEFAULT_TYPE,
  ATTR_CATEGORY,
  ATTR_ID,
  CATEGORY_FIXTURES,
  ATTR_SUB_CATEGORY,
  SUB_CATEGORY_SEGMENT,
  SUB_CATEGORY_SHELF,
  SUB_CATEGORY_PEGBOARD,
  ATTR_SEGMENT_ID,
  Y_TOLERANCE
} from '../shared/constants'
import type { 
  ProductCollisionState, 
  PositionData, 
  ShelfPositionData,
  ProductPositionData
} from './product-model'
import { handleProductCollisions } from './utils/collision'
import { findElements, findTargetShelf, findTargetProduct } from './utils/element-finder'
import { calculatePositionData } from './utils/position'

export default defineComponent({
  name: 'ProductComponent',
  props: {
    product: {
      type: Object as PropType<Product>,
      required: true
    },
    category: {
      type: String,
      default: DEFAULT_CATEGORY_PRODUCT
    },
    type: {
      type: String,
      default: DEFAULT_TYPE
    },
    relativeTo: {
      type: Boolean,
      default: false
    }
  },
  emits: ['dragend', 'drag-start', 'update-position'],
  setup(props, { emit }) {
    const selectionStore = useSelectionStore()
    const store = usePlanogramStore()
    const { showProductImages } = storeToRefs(store)
    const imageObj = ref<HTMLImageElement | null>(null)

    onMounted(() => {
      if (props.product.image) {
        const img = new Image()
        img.src = props.product.image
        img.onload = () => {
          imageObj.value = img
        }
      }
    })

    const isSelected = computed(() => 
      selectionStore.selectedIds.value.includes(props.product.id)
    )

    const productConfig = computed(() => ({
      id: props.product.id, 
      width: props.product.width,
      height: props.product.height,
      fill: props.product.color? props.product.color : DEFAULT_FILL_COLOR,
      ...(isSelected.value ? SELECTED_STYLES : DEFAULT_STYLES),
      category: props.category,
      type: props.type,
      code: props.product.code,
      color : props.product.color? props.product.color : DEFAULT_FILL_COLOR,
    }))

    const originalPosition = ref({ x: 0, y: 0 })
    const debugStore = useDebugStore()
    const isProductHaveCollision = ref<ProductCollisionState>({
      productId: null,
      hasCollision: false,
      collisionProduct: null
    })

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      const pos = node.getAbsolutePosition()
      debugStore.setDragNodePosition(pos)
      
      node.x(node.x())
      node.y(node.y())

      const stage = node.getStage()
      if (!stage) return

      // Check if this product is part of a group
      if (props.product.groupId) {
        // Find all products with the same groupId
        const groupProducts = stage.find((n: Node) => {
          if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT || 
              n.getAttr(ATTR_ID) === props.product.id) {
            return false;
          }
          
          // Check if product has the same groupId
          const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
          return productData && productData.groupId === props.product.groupId;
        });
        
        // Calculate the movement delta
        const dx = node.x() - originalPosition.value.x;
        const dy = node.y() - originalPosition.value.y;
        
        // Move all products in the group by the same amount
        groupProducts.forEach(groupProduct => {
          const currentX = groupProduct.x();
          const currentY = groupProduct.y();
          groupProduct.position({
            x: currentX + dx,
            y: currentY + dy
          });
        });
        
        // Update original position for the next move
        originalPosition.value = {
          x: node.x(),
          y: node.y()
        };
      }

      const allProducts = stage.find((n: Node) => 
        n.getAttr(ATTR_CATEGORY)?.toLowerCase() === CATEGORY_PRODUCT && 
        n.getAttr(ATTR_ID) !== props.product.id
      )

      isProductHaveCollision.value = handleProductCollisions(
        node, 
        allProducts, 
        props.product.id,
        props.product.color?props.product.color : DEFAULT_FILL_COLOR
      )
      
      node.getLayer()?.batchDraw()
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      debugStore.clearDragNodePosition()
      const node = e.target
      const stage = node.getStage()
      if (!stage) return

      const absolutePos = node.getAbsolutePosition()

      const { shelves, allProducts } = findElements(stage)
      
      // Find all pegboards in the stage
      const pegboards = stage.find((n: Node) => 
        n.getAttr(ATTR_CATEGORY) === CATEGORY_FIXTURES && 
        n.getAttr(ATTR_SUB_CATEGORY) === SUB_CATEGORY_PEGBOARD
      )

      // Use Y_TOLERANCE constant for finding target shelf
      const targetShelf = findTargetShelf(
        shelves, 
        absolutePos, 
        props.product.height,
        Y_TOLERANCE
      )

      // Use Y_TOLERANCE constant for finding target product
      const targetProduct = targetShelf ? null : findTargetProduct(
        allProducts.filter(p => p.id() !== props.product.id),
        absolutePos,
        props.product.height,
        Y_TOLERANCE
      )

      // Find target pegboard using Konva's getClientRect()
      const targetPegboard = pegboards.find(pegboard => {
        const pegboardRect = pegboard.getClientRect()
        return (
          absolutePos.x >= pegboardRect.x &&
          absolutePos.x <= pegboardRect.x + pegboardRect.width &&
          absolutePos.y >= pegboardRect.y &&
          absolutePos.y <= pegboardRect.y + pegboardRect.height
        )
      })

      // If we found a pegboard, update product position relative to it
      if (targetPegboard) {
        const pegboardRect = targetPegboard.getClientRect()
        // We already checked stage existence at the start of handleDragEnd
        const scale = stage.scaleX()

        // Calculate relative position by adjusting for scale
        const relativeX = (absolutePos.x - pegboardRect.x) / scale
        const relativeY = (absolutePos.y - pegboardRect.y) / scale

        // Update product position
        const { updateProductPosition } = usePlanogramStore()
        updateProductPosition({
          id: props.product.id,
          x: absolutePos.x,
          y: absolutePos.y,
          relativeX,
          relativeY,
          shelfId: undefined,
          segmentId: targetPegboard.getAttr(ATTR_SEGMENT_ID),
          fixtureId: targetPegboard.id()
        })

        // If this product is part of a group, update all products in the group
        if (props.product.groupId) {
          
          const groupProducts = stage.find((n: Node) => {
            if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT || 
                n.getAttr(ATTR_ID) === props.product.id) {
              return false;
            }
            
            const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
            return productData && productData.groupId === props.product.groupId;
          });
          
          // Calculate the movement delta based on absolute positions
          const dx = absolutePos.x - props.product.x;
          const dy = absolutePos.y - props.product.y;
          
          groupProducts.forEach(groupProduct => {
            const productId = groupProduct.getAttr(ATTR_ID);
            const productData = store.products.find(p => p.id === productId);
            
            if (productData) {
              updateProductPosition({
                id: productId,
                x: productData.x + dx,
                y: productData.y + dy,
                relativeX: productData.relativeX,
                relativeY: productData.relativeY,
                shelfId: undefined,
                segmentId: targetPegboard.getAttr(ATTR_SEGMENT_ID),
                fixtureId: targetPegboard.id()
              });
            }
          });
        }

        emit('dragend', {
          id: props.product.id,
          parentProductId: null,
          x: absolutePos.x,
          y: absolutePos.y,
          relativeX,
          relativeY,
          shelfId: null,
          segmentId: targetPegboard.getAttr(ATTR_SEGMENT_ID),
          fixtureId: targetPegboard.id(),
          foundPegboard: true
        })

        return
      }

      // If we're in a segment but not directly on a shelf or pegboard, try to find the nearest shelf below
      if (!targetShelf && !targetProduct && !targetPegboard) {
        const segments = stage.find((n: Node) => 
          n.getAttr(ATTR_CATEGORY)?.toLowerCase() === CATEGORY_FIXTURES && 
          n.getAttr(ATTR_SUB_CATEGORY)?.toLowerCase() === SUB_CATEGORY_SEGMENT
        )
        
        // Check if we're inside any segment using getClientRect()
        for (const segment of segments) {
          const segmentRect = segment.getClientRect()
          
          if (
            absolutePos.x >= segmentRect.x && 
            absolutePos.x <= segmentRect.x + segmentRect.width &&
            absolutePos.y >= segmentRect.y && 
            absolutePos.y <= segmentRect.y + segmentRect.height
          ) {
            // We're inside a segment, find the nearest shelf below
            const segmentShelves = shelves.filter(shelf => 
              shelf.getAttr(ATTR_SEGMENT_ID) === segment.id()
            )
            
            // Sort shelves by y position using getClientRect()
            const sortedShelves = [...segmentShelves].sort((a, b) => 
              a.getClientRect().y - b.getClientRect().y
            )
            
            // Find the first shelf that's below our current position
            const nearestShelfBelow = sortedShelves.find(shelf => 
              shelf.getClientRect().y > absolutePos.y
            )
            
            if (nearestShelfBelow) {
              const positionData = calculatePositionData(
                node,
                nearestShelfBelow,
                null,
                absolutePos,
                props.product.height,
                selectionStore.productGap,
                originalPosition.value
              )
              
              const { updateProductPosition } = usePlanogramStore()
              updateProductPosition({
                id: props.product.id,
                ...positionData,
                shelfId: positionData.shelfId,
                segmentId: positionData.segmentId,
              })
              
              if (props.product.groupId) {
                const groupProducts = stage.find((n: Node) => {
                  if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT || 
                      n.getAttr(ATTR_ID) === props.product.id) {
                    return false;
                  }
                  
                  const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
                  return productData && productData.groupId === props.product.groupId;
                });
                
                const dx = positionData.x - props.product.x;
                const dy = positionData.y - props.product.y;
                
                groupProducts.forEach(groupProduct => {
                  const productId = groupProduct.getAttr(ATTR_ID);
                  const productData = store.products.find(p => p.id === productId);
                  
                  if (productData) {
                    updateProductPosition({
                      id: productId,
                      x: productData.x + dx,
                      y: productData.y + dy,
                      relativeX: productData.relativeX,
                      relativeY: productData.relativeY,
                      shelfId: positionData.shelfId,
                      segmentId: positionData.segmentId,
                    });
                  }
                });
              }
              
              emit('dragend', {
                id: props.product.id,
                parentProductId: null,
                ...positionData
              })
              
              return
            }
          }
        }
      }

      const positionData = calculatePositionData(
        node,
        targetShelf,
        targetProduct,
        absolutePos,
        props.product.height,
        selectionStore.productGap,
        originalPosition.value
      )

      // Reset collision state if needed
      if(isProductHaveCollision.value.productId === node.getAttr(ATTR_ID) && 
         isProductHaveCollision.value.hasCollision) {
        isProductHaveCollision.value.collisionProduct?.setAttrs({
          fill: DEFAULT_FILL_COLOR
        })
        isProductHaveCollision.value = {
          productId: null,
          hasCollision: false,
          collisionProduct: null
        }
      }
      
      // Check for nearby products with the same code to group them
      if (!targetShelf && !targetProduct) {
        const nearbyProducts = stage.find((n: Node) => {
          if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT || 
              n.getAttr(ATTR_ID) === props.product.id) {
            return false;
          }
          
          if (n.getAttr('code') !== props.product.code) {
            return false;
          }
          
          const productRect = n.getClientRect()
          const distance = Math.sqrt(
            Math.pow(productRect.x - absolutePos.x, 2) + 
            Math.pow(productRect.y - absolutePos.y, 2)
          );
          
          return distance < 50;
        });
        
        if (nearbyProducts.length > 0) {
          const { groupProducts } = usePlanogramStore();
          const productIds = [props.product.id, ...nearbyProducts.map(p => p.getAttr(ATTR_ID))];
          groupProducts(productIds);
          selectionStore.clearSelection();
          productIds.forEach(id => selectionStore.toggleSelection(id));
        }
      }
      
      if(positionData.foundProduct || positionData.foundShelf) {
        const { updateProductPosition } = usePlanogramStore()
        
        // Get the scale for relative position calculation
        const scale = stage.scaleX()
        
        // Adjust relative positions for scale
        const adjustedPositionData = {
          ...positionData,
          relativeX: positionData.relativeX / scale,
          relativeY: positionData.relativeY / scale
        }
        
        updateProductPosition({
          id: props.product.id,
          ...adjustedPositionData,
          shelfId: positionData.shelfId,
          segmentId: positionData.segmentId,
        })
        
        if (props.product.groupId) {
          const groupProducts = stage.find((n: Node) => {
            if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT || 
                n.getAttr(ATTR_ID) === props.product.id) {
              return false;
            }
            
            const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
            return productData && productData.groupId === props.product.groupId;
          });
          
          const dx = positionData.x - props.product.x;
          const dy = positionData.y - props.product.y;
          
          groupProducts.forEach(groupProduct => {
            const productId = groupProduct.getAttr(ATTR_ID);
            const productData = store.products.find(p => p.id === productId);
            
            if (productData) {
              const relativeX = productData.relativeX !== undefined ? productData.relativeX / scale : undefined;
              const relativeY = productData.relativeY !== undefined ? productData.relativeY / scale : undefined;
              
              updateProductPosition({
                id: productId,
                x: productData.x + dx,
                y: productData.y + dy,
                relativeX,
                relativeY,
                shelfId: positionData.shelfId,
                segmentId: positionData.segmentId,
              });
            }
          });
        }
      }

      emit('dragend', {
        id: props.product.id,
        parentProductId: null,
        ...positionData,
        relativeX: positionData.relativeX / stage.scaleX(),
        relativeY: positionData.relativeY / stage.scaleX()
      })
    }

    const handleMouseEnter = (e: any) => {
      e.target.getStage().container().style.cursor = 'grab'
    }

    const handleMouseLeave = (e: any) => {
      e.target.getStage().container().style.cursor = 'default'
    }

    const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
      originalPosition.value = {
        x: e.target.x(),
        y: e.target.y()
      }
      
      // If this product is part of a group, select all products in the group
      if (props.product.groupId) {
        const stage = e.target.getStage();
        if (stage) {
          // Find all products with the same groupId
          const groupProducts = stage.find((n: Node) => {
            if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT) {
              return false;
            }
            
            // Check if product has the same groupId
            const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
            return productData && productData.groupId === props.product.groupId;
          });
          
          // Select all products in the group
          selectionStore.clearSelection();
          groupProducts.forEach(product => {
            selectionStore.toggleSelection(product.getAttr(ATTR_ID));
          });
        }
      } else {
        // If not part of a group, just select this product
        selectionStore.selectOne(props.product.id);
      }
      
      emit('drag-start', props.product.id)
    }

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      
      // If this product is part of a group, handle group selection
      if (props.product.groupId) {
        const stage = e.target.getStage();
        if (stage) {
          // Find all products with the same groupId
          const groupProducts = stage.find((n: Node) => {
            if (n.getAttr(ATTR_CATEGORY)?.toLowerCase() !== CATEGORY_PRODUCT) {
              return false;
            }
            
            // Check if product has the same groupId
            const productData = store.products.find(p => p.id === n.getAttr(ATTR_ID));
            return productData && productData.groupId === props.product.groupId;
          });
          
          // Get all product IDs in the group
          const groupProductIds = groupProducts.map(p => p.getAttr(ATTR_ID));
          
      if (!metaPressed) {
            // If no modifier key, select only the group
            selectionStore.clearSelection();
            groupProductIds.forEach(id => selectionStore.toggleSelection(id));
          } else {
            // If modifier key pressed, toggle selection of the group
            const allSelected = groupProductIds.every(id => 
              selectionStore.selectedIds.value.includes(id)
            );
            
            if (allSelected) {
              // If all are selected, deselect all
              groupProductIds.forEach(id => {
                if (selectionStore.selectedIds.value.includes(id)) {
                  selectionStore.toggleSelection(id);
                }
              });
            } else {
              // If not all are selected, select all
              groupProductIds.forEach(id => {
                if (!selectionStore.selectedIds.value.includes(id)) {
                  selectionStore.toggleSelection(id);
                }
              });
            }
          }
        }
      } else {
        // If not part of a group, handle normal selection
        if (!metaPressed) {
          selectionStore.selectOne(props.product.id);
        } else {
          selectionStore.toggleSelection(props.product.id);
        }
      }
    }

    interface PositionPayload {
      x: number
      y: number
      relativeX?: number
      relativeY?: number
    }

    const updateProductPosition = (payload: PositionPayload) => {
      store.updateProductPosition({
        id: props.product.id,
        x: payload.x,
        y: payload.y,
        relativeX: payload.relativeX,
        relativeY: payload.relativeY,
        shelfId: props.product.shelfId || undefined,
        segmentId: props.product.segmentId || undefined,
        fixtureId: props.product.fixtureId || undefined
      })
    }

    return {
      productConfig,
      handleDragMove,
      handleDragEnd,
      handleMouseEnter,
      handleMouseLeave,
      originalPosition,
      handleDragStart,
      handleClick,
      showProductImages,
      imageObj,
      updateProductPosition
    }
  }
})
</script>
