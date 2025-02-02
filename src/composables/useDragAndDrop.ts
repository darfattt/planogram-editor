import { ref } from 'vue'
import Konva from 'konva'
import type { Position } from '../types'

export default function useDragAndDrop() {
  const stageRef = ref<Konva.Stage | null>(null)

  const getAbsolutePosition = (nodeId: string) => {
    const node = stageRef.value?.findOne(`#${nodeId}`)
    return node?.getAbsolutePosition() || { x: 0, y: 0 }
  }

  const findSectionAtPosition = (pos: Position, sections: any[]) => {
    return sections.find(s => 
      pos.x >= s.x && 
      pos.x <= s.x + s.width &&
      pos.y >= s.y && 
      pos.y <= s.y + s.height
    )
  }

  // Add more shared drag/drop utilities here
  // ...

  return {
    stageRef,
    getAbsolutePosition,
    findSectionAtPosition
  }
} 