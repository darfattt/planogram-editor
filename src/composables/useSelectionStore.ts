import { ref } from 'vue'

const selectedIds = ref<string[]>([])

export function useSelectionStore() {
  const selectOne = (id: string) => {
    selectedIds.value = [id]
  }

  const toggleSelection = (id: string) => {
    const index = selectedIds.value.indexOf(id)
    if (index === -1) {
      selectedIds.value.push(id)
    } else {
      selectedIds.value.splice(index, 1)
    }
  }

  const clearSelection = () => {
    selectedIds.value = []
  }

  return {
    selectedIds,
    selectOne,
    toggleSelection,
    clearSelection
  }
} 