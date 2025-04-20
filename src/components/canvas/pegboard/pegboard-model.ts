export interface PegboardProps {
  pegboard: {
    id: string
    x: number
    y: number
    width: number
    height: number
    depth: number
    color?: string
    segmentId?: string | null
    relativeX?: number
    relativeY?: number
    strictPlacement: boolean
    category: string
    subCategory: string
  }
}

export interface PegboardConfig {
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius: number
}

export interface PegboardEmits {
  (e: 'product-drag', data: { productId: string; x: number; y: number }): void
  (e: 'product-detach', data: { productId: string; x: number; y: number }): void
  (e: 'update-position', data: { x: number; y: number }): void
} 