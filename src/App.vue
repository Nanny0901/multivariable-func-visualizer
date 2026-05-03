<script setup>
import { ref } from 'vue'
import FunctionPlot from './components/FunctionPlot.vue'
import ControlPanel from './components/ControlPanel.vue'

const funcExpression = ref('x^2 + y^2')
const point = ref({ x: 1, y: 1, z: 2 })
const vector = ref({ x: 1, y: 0, z: 0 })
</script>

<template>
  <div class="app-container">
    <div class="plot-area">
      <FunctionPlot
        :funcExpression="funcExpression"
        :point="point"
        :vector="vector"
      />
    </div>
    <ControlPanel
      :funcExpression="funcExpression"
      :point="point"
      :vector="vector"
      @update:funcExpression="funcExpression = $event"
      @update:point="point = $event"
      @update:vector="vector = $event"
    />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.plot-area {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>