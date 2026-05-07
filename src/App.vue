<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import FunctionPlot from './components/FunctionPlot.vue'
import MathRenderer from './components/MathRenderer.vue'
import { functionPresets } from './data/presets'
import { analyzeFunction, formatNumber } from './utils/mathModel'
import {
  expressionToLatex,
  numberToLatex,
  pointToLatex,
  vectorToLatex,
} from './utils/formulaModel'

const initialPreset = functionPresets[0]
const themeStorageKey = 'mfv-theme'
const panelWidthStorageKey = 'mfv-panel-width'
const defaultPanelWidth = 392
const minPanelWidth = 320
const maxPanelWidth = 560

const funcExpression = ref(initialPreset.expression)
const funcLatex = ref(initialPreset.latex)
const point = ref({ ...initialPreset.point })
const vector = ref({ ...initialPreset.vector })
const theme = ref('light')
const drawerOpen = ref(false)
const panelWidth = ref(defaultPanelWidth)
const isResizingPanel = ref(false)

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

const currentFunctionLatex = computed(() => funcLatex.value || expressionToLatex(funcExpression.value))

const appShellStyle = computed(() => ({
  '--panel-width': `${panelWidth.value}px`,
}))

const derivativeLatex = computed(() => {
  if (!analysis.value.ok) return '\\text{无法计算}'

  const gradient = analysis.value.gradient
  const unit = analysis.value.vector?.unit
  return [
    'D_{\\mathbf u}f(P_0)',
    '=\\nabla f(P_0)\\cdot\\mathbf u',
    `=${numberToLatex(gradient.x)}\\cdot${numberToLatex(unit.x)}+${numberToLatex(gradient.y)}\\cdot${numberToLatex(unit.y)}`,
    `=${numberToLatex(analysis.value.directionalDerivative)}`,
  ].join('')
})

const pointLatex = computed(() => `P_0=${pointToLatex(analysis.value.point)}`)

const gradientLatex = computed(() => {
  const gradient = analysis.value.gradient
  if (!gradient) return '\\nabla f(P_0)=\\text{--}'
  return `\\nabla f(P_0)=\\left(${numberToLatex(gradient.x)},${numberToLatex(gradient.y)}\\right)`
})

const unitVectorLatex = computed(() => `\\mathbf u=${vectorToLatex(analysis.value.vector)}`)

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

watch(
  panelWidth,
  (width) => {
    localStorage.setItem(panelWidthStorageKey, String(width))
  },
  { flush: 'post' },
)

const clampPanelWidth = (width) =>
  Math.min(maxPanelWidth, Math.max(minPanelWidth, Math.round(Number(width))))

onMounted(() => {
  const savedTheme = localStorage.getItem(themeStorageKey)
  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  theme.value = savedTheme || systemTheme || 'light'
  document.documentElement.dataset.theme = theme.value

  const savedPanelWidth = Number(localStorage.getItem(panelWidthStorageKey))
  panelWidth.value = Number.isFinite(savedPanelWidth)
    ? clampPanelWidth(savedPanelWidth)
    : defaultPanelWidth
})

onBeforeUnmount(() => {
  stopPanelResize()
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

const applyPreset = (preset) => {
  funcExpression.value = preset.expression
  funcLatex.value = preset.latex || preset.expression
  point.value = { ...preset.point }
  vector.value = { ...preset.vector }
  drawerOpen.value = false
}

const updateFormula = (payload) => {
  funcLatex.value = payload.latex
  if (payload.ok) {
    funcExpression.value = payload.expression
  } else {
    funcExpression.value = payload.expression || ''
  }
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const updatePanelResize = (event) => {
  if (!isResizingPanel.value) return
  panelWidth.value = clampPanelWidth(event.clientX - 16)
}

const stopPanelResize = () => {
  if (!isResizingPanel.value) return
  isResizingPanel.value = false
  document.body.classList.remove('resizing-panel')
  window.removeEventListener('pointermove', updatePanelResize)
  window.removeEventListener('pointerup', stopPanelResize)
  window.removeEventListener('pointercancel', stopPanelResize)
}

const startPanelResize = (event) => {
  if (window.matchMedia?.('(max-width: 1180px)').matches) return
  event.preventDefault()
  isResizingPanel.value = true
  document.body.classList.add('resizing-panel')
  window.addEventListener('pointermove', updatePanelResize)
  window.addEventListener('pointerup', stopPanelResize)
  window.addEventListener('pointercancel', stopPanelResize)
}

const resizePanelWithKeyboard = (event) => {
  const step = event.shiftKey ? 40 : 16
  const keyMap = {
    ArrowLeft: -step,
    ArrowRight: step,
    Home: minPanelWidth - panelWidth.value,
    End: maxPanelWidth - panelWidth.value,
  }
  const delta = keyMap[event.key]
  if (delta === undefined) return
  event.preventDefault()
  panelWidth.value = clampPanelWidth(panelWidth.value + delta)
}

</script>

<template>
  <main
    class="app-shell"
    :class="{ 'drawer-open': drawerOpen }"
    :style="appShellStyle"
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
      :func-latex="funcLatex"
      :point="point"
      :presets="functionPresets"
      :theme="theme"
      :vector="vector"
      @apply-preset="applyPreset"
      @close-drawer="drawerOpen = false"
      @toggle-theme="toggleTheme"
      @update:formula="updateFormula"
      @update:func-expression="updateExpression"
      @update:point="updatePoint"
      @update:vector="updateVector"
    />

    <div
      class="panel-resizer"
      role="separator"
      aria-label="调整左侧控制栏宽度"
      aria-orientation="vertical"
      :aria-valuemin="minPanelWidth"
      :aria-valuemax="maxPanelWidth"
      :aria-valuenow="panelWidth"
      tabindex="0"
      @pointerdown="startPanelResize"
      @keydown="resizePanelWithKeyboard"
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
      />

      <div class="stage-topbar">
        <div class="formula-pill">
          <span>当前曲面</span>
          <strong><MathRenderer :latex="`z=${currentFunctionLatex || '0'}`" /></strong>
        </div>
      </div>

      <div class="floating-result" :class="{ error: !analysis.ok }">
        <span>方向导数</span>
        <strong>{{ derivativeLabel }}</strong>
        <p v-if="!analysis.ok">{{ formulaLabel }}</p>
        <MathRenderer v-else :latex="derivativeLatex" display-mode />
      </div>

      <div class="quick-metrics">
        <article>
          <span>P₀</span>
          <strong><MathRenderer :latex="pointLatex" /></strong>
        </article>
        <article>
          <span>∇f(P₀)</span>
          <strong><MathRenderer :latex="gradientLatex" /></strong>
        </article>
        <article>
          <span>单位方向 u</span>
          <strong><MathRenderer :latex="unitVectorLatex" /></strong>
        </article>
      </div>
    </section>
  </main>
</template>
