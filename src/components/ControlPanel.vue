<script setup>
import { computed, ref, watch } from 'vue'
import { symbolButtons } from '../data/presets'
import {
  formatNumber,
  vectorAngleDegrees,
  vectorFromAngleDegrees,
} from '../utils/mathModel'

const props = defineProps({
  analysis: { type: Object, required: true },
  funcExpression: { type: String, default: 'x^2 + y^2' },
  point: { type: Object, default: () => ({ x: 1, y: 1 }) },
  vector: { type: Object, default: () => ({ x: 1, y: 0 }) },
  presets: { type: Array, default: () => [] },
  viewSettings: { type: Object, required: true },
  viewOptions: { type: Object, required: true },
  theme: { type: String, default: 'light' },
  presentationMode: { type: Boolean, default: false },
})

const emit = defineEmits([
  'apply-preset',
  'close-drawer',
  'request-view',
  'toggle-presentation',
  'toggle-theme',
  'update:func-expression',
  'update:point',
  'update:vector',
  'update:view-options',
  'update:view-settings',
])

const localExpression = ref(props.funcExpression)
const localPoint = ref({ ...props.point })
const localVector = ref({ ...props.vector })
const angle = ref(vectorAngleDegrees(props.vector))
const activeSection = ref('function')

const sections = [
  { id: 'function', label: '函数', icon: 'ƒ' },
  { id: 'geometry', label: '几何', icon: '⌖' },
  { id: 'result', label: '结果', icon: '∇' },
  { id: 'view', label: '视图', icon: '◱' },
]

watch(
  () => props.funcExpression,
  (value) => {
    localExpression.value = value
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

const vectorLengthLabel = computed(() => formatNumber(props.analysis.vector?.length ?? NaN))

const insertSymbol = (symbol) => {
  localExpression.value = `${localExpression.value}${symbol}`
  emit('update:func-expression', localExpression.value)
}

const clearExpression = () => {
  localExpression.value = ''
  emit('update:func-expression', '')
}

const updateExpression = () => {
  emit('update:func-expression', localExpression.value)
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

const updateViewSetting = (key, value) => {
  emit('update:view-settings', {
    ...props.viewSettings,
    [key]: Number(value),
  })
}

const updateViewOption = (key, value) => {
  emit('update:view-options', {
    ...props.viewOptions,
    [key]: value,
  })
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

        <label class="expression-editor" for="func-input">
          <span>z =</span>
          <textarea
            id="func-input"
            v-model="localExpression"
            rows="3"
            spellcheck="false"
            placeholder="例如 x^2 + y^2"
            @input="updateExpression"
          />
          <button type="button" aria-label="清空函数" @click.prevent="clearExpression">清空</button>
        </label>

        <p class="status-line" :class="expressionStatus.type">
          <span>{{ expressionStatus.type === 'ok' ? '✓' : '!' }}</span>
          {{ expressionStatus.text }}
        </p>

        <div class="symbol-grid" aria-label="数学符号">
          <button
            v-for="symbol in symbolButtons"
            :key="symbol.label"
            class="chip"
            type="button"
            @click="insertSymbol(symbol.insert)"
          >
            {{ symbol.label }}
          </button>
        </div>

        <div class="preset-list">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="preset-row"
            type="button"
            @click="applyPreset(preset)"
          >
            <span>
              <strong>{{ preset.name }}</strong>
              <small>{{ preset.reason }}</small>
            </span>
            <code>{{ preset.expression }}</code>
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
          <strong>P₀ = {{ pointLabel }}</strong>
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
          <span>u = {{ unitVectorLabel }}</span>
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
          <p>{{ derivativeFormula }}</p>
        </article>

        <div class="metric-grid">
          <article>
            <span>梯度 ∇f(P₀)</span>
            <strong>{{ gradientLabel }}</strong>
          </article>
          <article>
            <span>单位方向 u</span>
            <strong>{{ unitVectorLabel }}</strong>
          </article>
          <article>
            <span>偏导公式</span>
            <strong>fₓ={{ analysis.model?.derivativeText?.x }}；fᵧ={{ analysis.model?.derivativeText?.y }}</strong>
          </article>
        </div>
      </section>

      <section v-show="activeSection === 'view'" class="panel-section">
        <div class="section-title">
          <span>04</span>
          <div>
            <h2>图像视图</h2>
            <p>降低干扰，让曲面、方向和梯度更容易看清</p>
          </div>
        </div>

        <div class="view-preset-grid">
          <button type="button" @click="$emit('request-view', 'iso')">三维视图</button>
          <button type="button" @click="$emit('request-view', 'top')">俯视图</button>
          <button type="button" @click="$emit('request-view', 'front')">正视图</button>
          <button type="button" @click="$emit('request-view', 'side')">侧视图</button>
        </div>

        <div class="switch-list">
          <label>
            <span>坐标网格</span>
            <input
              :checked="viewOptions.showGrid"
              type="checkbox"
              @change="updateViewOption('showGrid', $event.target.checked)"
            />
          </label>
          <label>
            <span>曲面网格线</span>
            <input
              :checked="viewOptions.showWireframe"
              type="checkbox"
              @change="updateViewOption('showWireframe', $event.target.checked)"
            />
          </label>
          <label>
            <span>切平面</span>
            <input
              :checked="viewOptions.showTangentPlane"
              type="checkbox"
              @change="updateViewOption('showTangentPlane', $event.target.checked)"
            />
          </label>
          <label>
            <span>梯度箭头</span>
            <input
              :checked="viewOptions.showGradient"
              type="checkbox"
              @change="updateViewOption('showGradient', $event.target.checked)"
            />
          </label>
          <label>
            <span>方向截线</span>
            <input
              :checked="viewOptions.showDirectionCurve"
              type="checkbox"
              @change="updateViewOption('showDirectionCurve', $event.target.checked)"
            />
          </label>
          <label>
            <span>坐标标签</span>
            <input
              :checked="viewOptions.showAxisLabels"
              type="checkbox"
              @change="updateViewOption('showAxisLabels', $event.target.checked)"
            />
          </label>
        </div>

        <div class="settings-grid">
          <label>
            <span>范围</span>
            <input
              :value="viewSettings.range"
              type="number"
              min="2"
              max="10"
              step="0.5"
              @input="updateViewSetting('range', $event.target.value)"
            />
          </label>
          <label>
            <span>采样</span>
            <input
              :value="viewSettings.segments"
              type="number"
              min="24"
              max="140"
              step="4"
              @input="updateViewSetting('segments', $event.target.value)"
            />
          </label>
          <label>
            <span>|z|≤</span>
            <input
              :value="viewSettings.zLimit"
              type="number"
              min="2"
              max="30"
              step="1"
              @input="updateViewSetting('zLimit', $event.target.value)"
            />
          </label>
        </div>
      </section>
    </div>

    <footer class="panel-actions">
      <button class="action-button" type="button" @click="$emit('toggle-theme')">
        <span>{{ theme === 'dark' ? '☀' : '◐' }}</span>
        {{ theme === 'dark' ? '亮色主题' : '暗色主题' }}
      </button>
      <button class="action-button" type="button" @click="$emit('toggle-presentation')">
        <span>◈</span>
        {{ presentationMode ? '完整模式' : '演示模式' }}
      </button>
    </footer>
  </aside>
</template>
