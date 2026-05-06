<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import FunctionPlot from './components/FunctionPlot.vue'
import { functionPresets } from './data/presets'
import { analyzeFunction, defaultViewSettings, formatNumber } from './utils/mathModel'

const initialPreset = functionPresets[0]
const themeStorageKey = 'mfv-theme'

const funcExpression = ref(initialPreset.expression)
const point = ref({ ...initialPreset.point })
const vector = ref({ ...initialPreset.vector })
const viewSettings = ref({ ...defaultViewSettings })
const viewOptions = ref({
  showGrid: true,
  showTangentPlane: true,
  showGradient: true,
  showDirectionCurve: true,
  showWireframe: true,
  showAxisLabels: true,
})
const viewCommand = ref({ type: 'iso', nonce: 0 })
const theme = ref('light')
const presentationMode = ref(false)
const drawerOpen = ref(false)

const analysis = computed(() =>
  analyzeFunction({
    expression: funcExpression.value,
    point: point.value,
    vector: vector.value,
  }),
)

const snappedPoint = computed(() => ({
  x: point.value.x,
  y: point.value.y,
  z: Number.isFinite(analysis.value.point?.z) ? analysis.value.point.z : 0,
}))

const derivativeLabel = computed(() =>
  analysis.value.ok ? formatNumber(analysis.value.directionalDerivative, 6) : '—',
)

const pointLabel = computed(() => {
  const graphPoint = analysis.value.point
  return `(${formatNumber(graphPoint?.x)}, ${formatNumber(graphPoint?.y)}, ${formatNumber(graphPoint?.z)})`
})

const gradientLabel = computed(() => {
  const gradient = analysis.value.gradient
  if (!gradient) return '(—, —)'
  return `(${formatNumber(gradient.x)}, ${formatNumber(gradient.y)})`
})

const unitVectorLabel = computed(() => {
  const unit = analysis.value.vector?.unit
  if (!analysis.value.vector?.valid) return '(—, —)'
  return `(${formatNumber(unit.x)}, ${formatNumber(unit.y)})`
})

const formulaLabel = computed(() =>
  analysis.value.ok
    ? `Dᵤf(P₀) = ∇f(P₀) · u = ${analysis.value.derivativeFormula}`
    : analysis.value.error,
)

watch(
  () => analysis.value.point?.z,
  (z) => {
    if (!Number.isFinite(z)) return
    point.value = { ...point.value, z }
  },
  { immediate: true },
)

watch(
  theme,
  (nextTheme) => {
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem(themeStorageKey, nextTheme)
  },
  { flush: 'post' },
)

onMounted(() => {
  const savedTheme = localStorage.getItem(themeStorageKey)
  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  theme.value = savedTheme || systemTheme || 'light'
  document.documentElement.dataset.theme = theme.value
})

const updateExpression = (expression) => {
  funcExpression.value = expression
}

const updatePoint = (nextPoint) => {
  point.value = {
    x: Number(nextPoint.x),
    y: Number(nextPoint.y),
    z: point.value.z,
  }
}

const updateVector = (nextVector) => {
  vector.value = {
    x: Number(nextVector.x),
    y: Number(nextVector.y),
  }
}

const updateViewSettings = (settings) => {
  viewSettings.value = { ...viewSettings.value, ...settings }
}

const updateViewOptions = (options) => {
  viewOptions.value = { ...viewOptions.value, ...options }
}

const applyPreset = (preset) => {
  funcExpression.value = preset.expression
  point.value = { ...preset.point }
  vector.value = { ...preset.vector }
  drawerOpen.value = false
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const togglePresentationMode = () => {
  presentationMode.value = !presentationMode.value
}

const requestView = (type) => {
  viewCommand.value = { type, nonce: Date.now() }
}
</script>

<template>
  <main
    class="app-shell"
    :class="{ 'presentation-mode': presentationMode, 'drawer-open': drawerOpen }"
  >
    <header class="mobile-topbar">
      <button class="icon-button" type="button" aria-label="打开菜单" @click="drawerOpen = true">
        ☰
      </button>
      <div>
        <strong>方向导数 Lab</strong>
        <span>z = {{ analysis.model?.expression || funcExpression }}</span>
      </div>
      <button class="icon-button" type="button" aria-label="切换主题" @click="toggleTheme">
        {{ theme === 'dark' ? '☀' : '◐' }}
      </button>
    </header>

    <ControlPanel
      :analysis="analysis"
      :func-expression="funcExpression"
      :point="point"
      :presets="functionPresets"
      :presentation-mode="presentationMode"
      :theme="theme"
      :vector="vector"
      :view-options="viewOptions"
      :view-settings="viewSettings"
      @apply-preset="applyPreset"
      @close-drawer="drawerOpen = false"
      @request-view="requestView"
      @toggle-presentation="togglePresentationMode"
      @toggle-theme="toggleTheme"
      @update:func-expression="updateExpression"
      @update:point="updatePoint"
      @update:vector="updateVector"
      @update:view-options="updateViewOptions"
      @update:view-settings="updateViewSettings"
    />

    <button
      class="drawer-scrim"
      type="button"
      aria-label="关闭菜单"
      @click="drawerOpen = false"
    />

    <section class="visual-stage" aria-label="三维函数图像">
      <FunctionPlot
        :analysis="analysis"
        :func-expression="funcExpression"
        :point="snappedPoint"
        :theme="theme"
        :vector="vector"
        :view-command="viewCommand"
        :view-options="viewOptions"
        :view-settings="viewSettings"
      />

      <div class="stage-topbar">
        <div class="formula-pill">
          <span>当前曲面</span>
          <strong>z = {{ analysis.model?.expression || funcExpression }}</strong>
        </div>
        <div class="view-actions">
          <button type="button" @click="requestView('iso')">三维</button>
          <button type="button" @click="requestView('top')">俯视</button>
          <button type="button" @click="requestView('front')">正视</button>
          <button type="button" @click="requestView('side')">侧视</button>
        </div>
      </div>

      <div class="floating-result" :class="{ error: !analysis.ok }">
        <span>方向导数</span>
        <strong>{{ derivativeLabel }}</strong>
        <p>{{ formulaLabel }}</p>
      </div>

      <div class="quick-metrics">
        <article>
          <span>P₀</span>
          <strong>{{ pointLabel }}</strong>
        </article>
        <article>
          <span>∇f(P₀)</span>
          <strong>{{ gradientLabel }}</strong>
        </article>
        <article>
          <span>单位方向 u</span>
          <strong>{{ unitVectorLabel }}</strong>
        </article>
      </div>
    </section>
  </main>
</template>
