<template>
  <div id="app">
    <PlanogramEditor />
    <DebugOverlay />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PlanogramEditor from './components/PlanogramEditor.vue'
import DebugOverlay from './components/DebugOverlay.vue'

export default defineComponent({
  name: 'App',
  components: {
    PlanogramEditor,
    DebugOverlay
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
