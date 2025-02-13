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
      code: product.code
    }"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <v-rect :config="productConfig" v-if="!product.image || !showProductImages" />
    <v-image 
      v-else
      :config="{
        ...productConfig,
        image: imageObj,
      }"
    />
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
import type { 
  ProductCollisionState, 
  PositionData, 
  ShelfPositionData,
  ProductPositionData
} from './product-model'

export default defineComponent({
  name: 'ProductComponent',
  props: {
    product: {
      type: Object as PropType<Product>,
      required: true
    },
    category: {
      type: String,
      default: 'Product'
    },
    type: {
      type: String,
      default: '-'
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
      fill: DEFAULT_FILL_COLOR,
      ...(isSelected.value ? SELECTED_STYLES : DEFAULT_STYLES),
      category: props.category,
      type: props.type,
      code: props.product.code
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

      const allProducts = stage.find((n: Node) => 
        n.getAttr('category')?.toLowerCase() === 'product' && 
        n.getAttr('id') !== props.product.id
      )

      const targetRect = node.getClientRect()
      allProducts.forEach((product) => {
        const productRect = product.getClientRect()
        const isRightOf = targetRect.x > productRect.x + productRect.width - COLLISION_ADJUSTMENT;
        const isLeftOf = targetRect.x + targetRect.width < productRect.x + COLLISION_ADJUSTMENT;
        const isBelow = targetRect.y > productRect.y + productRect.height - COLLISION_ADJUSTMENT;
        const isAbove = targetRect.y + targetRect.height < productRect.y + (COLLISION_ADJUSTMENT + 5);
        
        const hasCollision = !(isRightOf || isLeftOf || isBelow || isAbove) && 
                            product.getAttr('id') !== node.getAttr('id');

        if(hasCollision){
          isProductHaveCollision.value = {
            productId: node.getAttr('id'),
            hasCollision: hasCollision,
            collisionProduct: product as Node<NodeConfig>
          };
          product.setAttrs({
            fill: 'red'
          });
        } else {
          product.setAttrs({
            fill: DEFAULT_FILL_COLOR
          });
        }
      })
      node.getLayer()?.batchDraw()
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      debugStore.clearDragNodePosition()
      const node = e.target
      const absolutePos = node.getAbsolutePosition()
      const stage = node.getStage()
      if (!stage) return

      const findElements = () => {
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
        ).filter(p => p.id() !== props.product.id)

        return { shelves, allProducts }
      }

      const getShelfPositionData = (shelf: Group): ShelfPositionData => {
        const shelfPos = shelf.getAbsolutePosition()
        const shelfData = shelf.getAttr('shelfData')
        
        return {
          relativeX: absolutePos.x - shelfPos.x,
          relativeY: (- props.product.height) - Y_OFFSET_PRODUCT_ON_TOP_OF_SHELF,
          shelfPos,
          shelfData
        }
      }

      const getProductPositionData = (product: Node): ProductPositionData => {
        const yOffsetProductOnTopOfProduct = selectionStore.productGap;
        const relativeY = product.getAttr('y') - props.product.height - yOffsetProductOnTopOfProduct;
        return {
          relativeX: product.getAttr('x'),
          relativeY: relativeY,
          parentGroup: product.getParent(),
          productAttrs: product.getAttrs()
        }
      }

      const { shelves, allProducts } = findElements()
      
      const targetShelf = shelves.find(shelf => {
        const { shelfPos, shelfData } = getShelfPositionData(shelf)
        const shelfWidth = shelf.getAttr('width')
        const shelfHeight = shelf.getAttr('height')
        const yTolerance = 10

        return shelfData && shelfWidth && shelfHeight && (
          absolutePos.x >= shelfPos.x &&
          absolutePos.x <= shelfPos.x + shelfWidth &&
          absolutePos.y + props.product.height + yTolerance >= shelfPos.y &&
          absolutePos.y + props.product.height <= shelfPos.y + shelfHeight
        )
      })

      const targetProduct = targetShelf ? null : allProducts.find(product => {
        const productPos = product.getAbsolutePosition()
        const yTolerance = 10
        const xTolerance = 5
        return (
          absolutePos.x + product.getAttr('width') + xTolerance >= productPos.x  &&
          absolutePos.x <= productPos.x + product.getAttr('width') + xTolerance &&
          absolutePos.y + yTolerance >= productPos.y - product.getAttr('height') &&
          absolutePos.y <= productPos.y + product.getAttr('height')
        )
      })

      const handlePositioning = (): PositionData => {
        const productId = node.getAttr('id');
        if(isProductHaveCollision.value.productId === productId && isProductHaveCollision.value.hasCollision) {
          let collisionProduct = isProductHaveCollision.value.collisionProduct;
          collisionProduct?.setAttrs({
            fill: DEFAULT_FILL_COLOR
          });
          isProductHaveCollision.value = {
            productId: null,
            hasCollision: false,
            collisionProduct: null
          }
        }
        if (targetShelf) {
          console.log({targetShelf});
          const { relativeX, relativeY, shelfPos, shelfData } = getShelfPositionData(targetShelf)
          node.moveTo(targetShelf)
          targetShelf.add(node)
          node.position({ x: relativeX, y: relativeY })
          return {
            x: absolutePos.x,
            y: absolutePos.y,
            relativeX,
            relativeY,
            shelfId: shelfData.id,
            sectionId: shelfData.sectionId,
            foundShelf: true
          }
        }
        if (targetProduct) {
          console.log('targetProduct', targetProduct)
          const { relativeX, relativeY, parentGroup, productAttrs } = getProductPositionData(targetProduct)
          console.log({parentGroup})
          console.log({productAttrs})
          node.moveTo(parentGroup).position({ x: relativeX, y: relativeY })
          return {
            x: absolutePos.x,
            y: absolutePos.y,
            relativeX,
            relativeY,
            shelfId: parentGroup?.getAttr('id'),
            sectionId: parentGroup?.getAttr('shelfData').sectionId,
            parentProductId: targetProduct.id(),
            foundProduct: true
          }
        }
        node.position(originalPosition.value)
        return {
          ...originalPosition.value,
          relativeX: originalPosition.value.x,
          relativeY: originalPosition.value.y,
          foundProduct: false,
          foundShelf: false
        }
      }

      const positionData = handlePositioning()
      console.log(positionData);
      if(positionData.foundProduct || positionData.foundShelf){
        const { updateProductPosition } = usePlanogramStore()
        updateProductPosition({
          id: props.product.id,
          x: positionData.x,
          y: positionData.y,
          relativeX: positionData.relativeX,
          relativeY: positionData.relativeY,
          shelfId: positionData.shelfId,
          sectionId: positionData.sectionId,
        })
      }

      emit('dragend', {
        id: props.product.id,
        parentProductId: null,
        ...positionData
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
      selectionStore.selectOne(props.product.id)
      
      emit('drag-start', props.product.id)
    }

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      if (!metaPressed) {
        selectionStore.selectOne(props.product.id)
      } else {
        selectionStore.toggleSelection(props.product.id)
      }
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
      imageObj
    }
  }
})
</script>
