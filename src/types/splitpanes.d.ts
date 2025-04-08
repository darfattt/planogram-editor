declare module 'splitpanes' {
  import { DefineComponent } from 'vue'
  
  export const Splitpanes: DefineComponent<{
    class?: string
    horizontal?: boolean
    pushOtherPanes?: boolean
    firstSplitter?: boolean
    dblClickSplitter?: boolean
    minSize?: number
    maxSize?: number
  }>
  
  export const Pane: DefineComponent<{
    minSize?: number
    maxSize?: number
    size?: number
  }>
} 