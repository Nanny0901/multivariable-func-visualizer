<script setup>
import { computed, ref, watch } from 'vue'
import FormulaInput from './FormulaInput.vue'
import MathRenderer from './MathRenderer.vue'
import {
  formatNumber,
  vectorAngleDegrees,
  vectorFromAngleDegrees,
} from '../utils/mathModel'
import {
  numberToLatex,
  pointToLatex,
  vectorToLatex,
} from '../utils/formulaModel'

const props = defineProps({
  analysis: { type: Object, required: true },
  funcExpression: { type: String, default: 'x^2 + y^2' },
  funcLatex: { type: String, default: 'x^2+y^2' },
  point: { type: Object, default: () => ({ x: 1, y: 1 }) },
  vector: { type: Object, default: () => ({ x: 1, y: 0 }) },
  presets: { type: Array, default: () => [] },
  theme: { type: String, default: 'light' },
})

const emit = defineEmits([
  'apply-preset',
  'close-drawer',
  'toggle-theme',
  'update:formula',
  'update:func-expression',
  'update:point',
  'update:vector',
])

const localLatex = ref(props.funcLatex)
const localPoint = ref({ ...props.point })
const localVector = ref({ ...props.vector })
const angle = ref(vectorAngleDegrees(props.vector))
const activeSection = ref('function')

const sections = [
  { id: 'function', label: '函数', icon: 'ƒ' },
  { id: 'geometry', label: '几何', icon: '⌖' },
  { id: 'result', label: '结果', icon: '∇' },
]

watch(
  () => props.funcLatex,
  (value) => {
    localLatex.value = value
  },
)

watch(
  () => props.point,
  (value) => {
    localPoint.value = { ...value }
  },
  { deep: true },
)

watch(
  () => props.vector,
  (value) => {
    localVector.value = { ...value }
    angle.value = vectorAngleDegrees(value)
  },
  { deep: true },
)

const expressionStatus = computed(() =>
  props.analysis.model?.ok
    ? {
        type: 'ok',
        text: `已解析为 z = ${props.analysis.model.expression}`,
      }
    : {
        type: 'error',
        text: props.analysis.model?.error ?? props.analysis.error ?? '表达式无法解析',
      },
)

const pointLabel = computed(() => {
  const point = props.analysis.point
  return `(${formatNumber(point?.x)}, ${formatNumber(point?.y)}, ${formatNumber(point?.z)})`
})

const gradientLabel = computed(() => {
  const gradient = props.analysis.gradient
  if (!gradient) return '(—, —)'
  return `(${formatNumber(gradient.x)}, ${formatNumber(gradient.y)})`
})

const unitVectorLabel = computed(() => {
  const unit = props.analysis.vector?.unit
  if (!props.analysis.vector?.valid) return '(—, —)'
  return `(${formatNumber(unit.x)}, ${formatNumber(unit.y)})`
})

const derivativeLabel = computed(() =>
  props.analysis.ok ? formatNumber(props.analysis.directionalDerivative, 6) : '—',
)

const derivativeFormula = computed(() =>
  props.analysis.ok
    ? `Dᵤf = ∇f · u = ${props.analysis.derivativeFormula} = ${derivativeLabel.value}`
    : props.analysis.error,
)

const derivativeLatex = computed(() => {
  if (!props.analysis.ok) return '\\text{无法计算}'

  const gradient = props.analysis.gradient
  const unit = props.analysis.vector?.unit
  return [
    'D_{\\mathbf u}f(P_0)',
    '=\\nabla f(P_0)\\cdot\\mathbf u',
    `=${numberToLatex(gradient.x)}\\cdot${numberToLatex(unit.x)}+${numberToLatex(gradient.y)}\\cdot${numberToLatex(unit.y)}`,
    `=${numberToLatex(props.analysis.directionalDerivative)}`,
  ].join('')
})

const gradientLatex = computed(() => {
  const gradient = props.analysis.gradient
  if (!gradient) return '\\nabla f(P_0)=\\text{--}'
  return `\\nabla f(P_0)=\\left(${numberToLatex(gradient.x)},${numberToLatex(gradient.y)}\\right)`
})

const unitVectorLatex = computed(() => `\\mathbf u=${vectorToLatex(props.analysis.vector)}`)

const pointLatex = computed(() => `P_0=${pointToLatex(props.analysis.point)}`)

const vectorLengthLabel = computed(() => formatNumber(props.analysis.vector?.length ?? NaN))

const updateFormula = (payload) => {
  localLatex.value = payload.latex
  emit('update:formula', payload)
}

const updatePoint = () => {
  emit('update:point', {
    x: Number(localPoint.value.x),
    y: Number(localPoint.value.y),
  })
}

const updateVector = () => {
  emit('update:vector', {
    x: Number(localVector.value.x),
    y: Number(localVector.value.y),
  })
}

const updateAngle = () => {
  const vector = vectorFromAngleDegrees(angle.value)
  localVector.value = vector
  emit('update:vector', vector)
}

const resetVector = () => {
  angle.value = 0
  localVector.value = { x: 1, y: 0 }
  emit('update:vector', localVector.value)
}

const applyPreset = (preset) => {
  emit('apply-preset', preset)
}
</script>

<template>
  <aside class="control-panel" aria-label="控制面板">
    <header class="panel-brand">
      <button class="mobile-close" type="button" aria-label="关闭菜单" @click="$emit('close-drawer')">
        ×
      </button>
      <div class="brand-mark">∇</div>
      <div>
        <p>Math Analysis Studio</p>
        <h1>方向导数 Lab</h1>
      </div>
      <button
        class="theme-toggle"
        type="button"
        :aria-label="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'"
        :title="theme === 'dark' ? '亮色主题' : '暗色主题'"
        @click="$emit('toggle-theme')"
      >
        {{ theme === 'dark' ? '☀' : '◐' }}
      </button>
    </header>

    <nav class="section-nav" aria-label="控制分区">
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        :class="{ active: activeSection === section.id }"
        @click="activeSection = section.id"
      >
        <span>{{ section.icon }}</span>
        {{ section.label }}
      </button>
    </nav>

    <div class="panel-scroll">
      <section v-show="activeSection === 'function'" class="panel-section expression-card">
        <div class="section-title">
          <span>01</span>
          <div>
            <h2>函数输入</h2>
            <p>显式曲面模型：z = f(x,y)</p>
          </div>
        </div>

        <FormulaInput
          :latex="localLatex"
          @update="updateFormula"
        />

        <p class="status-line" :class="expressionStatus.type">
          <span>{{ expressionStatus.type === 'ok' ? '✓' : '!' }}</span>
          {{ expressionStatus.text }}
        </p>

        <div class="preset-list">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="preset-row"
            type="button"
            @click="applyPreset(preset)"
          >
            <span class="preset-copy">
              <strong>{{ preset.name }}</strong>
              <small>{{ preset.reason }}</small>
            </span>
            <span class="preset-formula">
              <MathRenderer :latex="preset.latex || preset.expression" />
            </span>
          </button>
        </div>
      </section>

      <section v-show="activeSection === 'geometry'" class="panel-section">
        <div class="section-title">
          <span>02</span>
          <div>
            <h2>点与方向</h2>
            <p>输入平面坐标，z₀ 自动吸附到曲面</p>
          </div>
        </div>

        <div class="field-group">
          <label>
            <span>x₀</span>
            <input v-model.number="localPoint.x" type="number" step="any" @input="updatePoint" />
          </label>
          <label>
            <span>y₀</span>
            <input v-model.number="localPoint.y" type="number" step="any" @input="updatePoint" />
          </label>
        </div>

        <article class="tonal-card">
          <span>当前曲面点</span>
          <strong><MathRenderer :latex="pointLatex" /></strong>
        </article>

        <div class="field-group">
          <label>
            <span>vₓ</span>
            <input v-model.number="localVector.x" type="number" step="any" @input="updateVector" />
          </label>
          <label>
            <span>vᵧ</span>
            <input v-model.number="localVector.y" type="number" step="any" @input="updateVector" />
          </label>
        </div>

        <label class="slider-field">
          <span>方向角 θ = {{ Math.round(angle) }}°</span>
          <input v-model.number="angle" type="range" min="0" max="360" step="1" @input="updateAngle" />
        </label>

        <div class="vector-facts">
          <span>|v| = {{ vectorLengthLabel }}</span>
          <span><MathRenderer :latex="unitVectorLatex" /></span>
          <button type="button" @click="resetVector">重置</button>
        </div>
      </section>

      <section v-show="activeSection === 'result'" class="panel-section">
        <div class="section-title">
          <span>03</span>
          <div>
            <h2>结果解释</h2>
            <p>方向导数衡量沿单位方向 u 的瞬时变化率</p>
          </div>
        </div>

        <article class="result-card" :class="{ error: !analysis.ok }">
          <span>方向导数</span>
          <strong>{{ derivativeLabel }}</strong>
          <p v-if="!analysis.ok">{{ derivativeFormula }}</p>
          <MathRenderer v-else :latex="derivativeLatex" display-mode />
        </article>

        <div class="metric-grid">
          <article>
            <span>梯度 ∇f(P₀)</span>
            <strong><MathRenderer :latex="gradientLatex" /></strong>
          </article>
          <article>
            <span>单位方向 u</span>
            <strong><MathRenderer :latex="unitVectorLatex" /></strong>
          </article>
          <article>
            <span>偏导公式</span>
            <strong>fₓ={{ analysis.model?.derivativeText?.x }}；fᵧ={{ analysis.model?.derivativeText?.y }}</strong>
          </article>
        </div>
      </section>

    </div>

  </aside>
</template>
