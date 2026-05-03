<script setup>
import { ref, computed, watch } from 'vue'
import { evaluate, derivative } from 'mathjs'

const props = defineProps({
  funcExpression: { type: String, default: 'x^2 + y^2' },
  point: { type: Object, default: () => ({ x: 1, y: 1, z: 2 }) },
  vector: { type: Object, default: () => ({ x: 1, y: 0, z: 0 }) },
})

const emit = defineEmits(['update:funcExpression', 'update:point', 'update:vector'])

const localFunc = ref(props.funcExpression)
const localPoint = ref({ ...props.point })
const localVector = ref({ ...props.vector })

watch(() => props.funcExpression, (v) => { localFunc.value = v })
watch(() => props.point, (v) => { localPoint.value = { ...v } }, { deep: true })
watch(() => props.vector, (v) => { localVector.value = { ...v } }, { deep: true })

// 数学符号按钮
const mathSymbols = [
  { label: 'sin()', insert: 'sin()' },
  { label: 'cos()', insert: 'cos()' },
  { label: 'tan()', insert: 'tan()' },
  { label: 'exp()', insert: 'exp()' },
  { label: 'log()', insert: 'log()' },
  { label: 'sqrt()', insert: 'sqrt()' },
  { label: 'abs()', insert: 'abs()' },
  { label: 'pi', insert: 'pi' },
  { label: 'e', insert: 'e' },
  { label: '^', insert: '^' },
  { label: 'x', insert: 'x' },
  { label: 'y', insert: 'y' },
  { label: 'z', insert: 'z' },
]

const insertSymbol = (symbol) => {
  localFunc.value += symbol
  emit('update:funcExpression', localFunc.value)
}

const onFuncChange = () => {
  emit('update:funcExpression', localFunc.value)
}

const onPointChange = () => {
  emit('update:point', { ...localPoint.value })
}

const onVectorChange = () => {
  emit('update:vector', { ...localVector.value })
}

// 计算方向导数
const directionalDerivative = computed(() => {
  try {
    const { x, y, z } = localPoint.value
    const { x: vx, y: vy, z: vz } = localVector.value
    
    const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz)
    if (vLen < 1e-10) return '向量长度为零'

    const ux = vx / vLen
    const uy = vy / vLen
    const uz = vz / vLen

    // 计算偏导数 ∂f/∂x, ∂f/∂y, ∂f/∂z
    const expr = localFunc.value || '0'
    const dfdx = derivative(expr, 'x')
    const dfdy = derivative(expr, 'y')
    const dfdz = derivative(expr, 'z')

    const fx = evaluate(dfdx.toString(), { x, y, z })
    const fy = evaluate(dfdy.toString(), { x, y, z })
    const fz = evaluate(dfdz.toString(), { x, y, z })

    const result = fx * ux + fy * uy + fz * uz
    
    if (isNaN(result) || !isFinite(result)) return '无法计算（该点可能不在定义域内）'

    return result.toFixed(6)
  } catch (e) {
    return `计算错误: ${e.message}`
  }
})

// 函数在当前点的值
const functionValue = computed(() => {
  try {
    const { x, y, z } = localPoint.value
    const val = evaluate(localFunc.value || '0', { x, y, z })
    if (isNaN(val) || !isFinite(val)) return '无定义'
    return val.toFixed(6)
  } catch {
    return '无法计算'
  }
})

// 梯度
const gradientInfo = computed(() => {
  try {
    const { x, y, z } = localPoint.value
    const expr = localFunc.value || '0'
    const dfdx = derivative(expr, 'x')
    const dfdy = derivative(expr, 'y')
    const dfdz = derivative(expr, 'z')
    const fx = evaluate(dfdx.toString(), { x, y, z })
    const fy = evaluate(dfdy.toString(), { x, y, z })
    const fz = evaluate(dfdz.toString(), { x, y, z })
    return { x: fx.toFixed(6), y: fy.toFixed(6), z: fz.toFixed(6) }
  } catch {
    return null
  }
})

// 检查点是否在函数曲面上（对于 z=f(x,y) 的情况）
const pointOnSurface = computed(() => {
  try {
    const { x, y, z } = localPoint.value
    // 检查是否有显式的 z 变量使用
    const expr = localFunc.value || '0'
    const hasZ = expr.includes('z')
    if (hasZ) {
      // 对于包含 z 的隐式函数 f(x,y,z)，检查 f(x,y,z) 是否接近0
      const val = evaluate(expr, { x, y, z })
      return Math.abs(val) < 0.01
    }
    // 对于 z=f(x,y)，无法简单验证，始终显示在曲面上
    return true
  } catch {
    return false
  }
})
</script>

<template>
  <div class="control-panel">
    <h2 class="panel-title">📐 方向导数与梯度</h2>
    
    <!-- 函数输入 -->
    <div class="section">
      <label class="section-label">📝 函数表达式 z(x, y) =</label>
      <div class="func-input-row">
        <input
          v-model="localFunc"
          class="func-input"
          placeholder="例如: x^2 + y^2"
          @input="onFuncChange"
        />
      </div>
      <div class="symbol-buttons">
        <button
          v-for="sym in mathSymbols"
          :key="sym.label"
          class="sym-btn"
          @click="insertSymbol(sym.insert)"
        >
          {{ sym.label }}
        </button>
      </div>
      <div class="func-hint">
        💡 支持: + - * / ^ ( ) 及上方函数<br/>
        <span v-if="!localFunc.includes('z')" class="hint-dim">
          当前为显函数 z = {{ localFunc || '...' }}（三维曲面）
        </span>
        <span v-else class="hint-dim">
          当前为隐函数 f(x,y,z) = 0（等值面）
        </span>
      </div>
    </div>

    <!-- 点输入 -->
    <div class="section">
      <label class="section-label">📍 选定点 P₀</label>
      <div class="coord-row">
        <div class="coord-item">
          <span class="coord-label">x₀</span>
          <input v-model.number="localPoint.x" class="coord-input" type="number" step="any" @input="onPointChange" />
        </div>
        <div class="coord-item">
          <span class="coord-label">y₀</span>
          <input v-model.number="localPoint.y" class="coord-input" type="number" step="any" @input="onPointChange" />
        </div>
        <div class="coord-item">
          <span class="coord-label">z₀</span>
          <input v-model.number="localPoint.z" class="coord-input" type="number" step="any" @input="onPointChange" />
        </div>
      </div>
      <div class="info-row">
        <span>f(P₀) = {{ functionValue }}</span>
      </div>
    </div>

    <!-- 向量输入 -->
    <div class="section">
      <label class="section-label">➡️ 方向向量 v⃗</label>
      <div class="coord-row">
        <div class="coord-item">
          <span class="coord-label">vₓ</span>
          <input v-model.number="localVector.x" class="coord-input" type="number" step="any" @input="onVectorChange" />
        </div>
        <div class="coord-item">
          <span class="coord-label">vᵧ</span>
          <input v-model.number="localVector.y" class="coord-input" type="number" step="any" @input="onVectorChange" />
        </div>
        <div class="coord-item">
          <span class="coord-label">v_z</span>
          <input v-model.number="localVector.z" class="coord-input" type="number" step="any" @input="onVectorChange" />
        </div>
      </div>
    </div>

    <!-- 输出结果 -->
    <div class="section result-section">
      <label class="section-label">📊 计算结果</label>
      
      <div class="result-card">
        <div class="result-label">方向导数 D_v⃗ f(P₀)</div>
        <div class="result-value highlight">{{ directionalDerivative }}</div>
      </div>

      <div v-if="gradientInfo" class="result-card">
        <div class="result-label">梯度 ∇f(P₀)</div>
        <div class="result-value">
          ({{ gradientInfo.x }}, {{ gradientInfo.y }}, {{ gradientInfo.z }})
        </div>
      </div>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-dot" style="background:#ff0000"></span> 红色: 选定点 P₀
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#ffff00"></span> 黄色: 曲面上的投影点
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#00ff00"></span> 绿色箭头: 方向向量
        </div>
        <div class="legend-item" style="font-size:11px;color:#888;margin-top:6px">
          🖱️ 鼠标拖拽旋转 · 滚轮缩放 · 右键平移
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  width: 340px;
  height: 100%;
  background: #f8fafc;
  border-left: 1px solid #d0d8e0;
  padding: 20px 16px;
  overflow-y: auto;
  color: #2c3e50;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  box-sizing: border-box;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.06);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 18px 0;
  padding-bottom: 14px;
  text-align: center;
  color: #e94560;
  letter-spacing: 1px;
  border-bottom: 2px solid #e2e8f0;
}

.section {
  margin-bottom: 18px;
}

.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #4a5568;
  font-size: 14px;
}

.func-input-row {
  display: flex;
  gap: 6px;
}

.func-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: #ffffff;
  color: #2c3e50;
  font-size: 15px;
  font-family: 'Consolas', 'Courier New', monospace;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.func-input:focus {
  border-color: #e94560;
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
}

.symbol-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.sym-btn {
  padding: 4px 8px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  background: #edf2f7;
  color: #4a5568;
  cursor: pointer;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  transition: all 0.15s;
}
.sym-btn:hover {
  background: #e94560;
  color: #fff;
  border-color: #e94560;
}

.func-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
  line-height: 1.5;
}
.hint-dim {
  color: #a0aec0;
}

.coord-row {
  display: flex;
  gap: 8px;
}

.coord-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coord-label {
  font-size: 12px;
  color: #718096;
  font-family: 'Consolas', monospace;
}

.coord-input {
  padding: 8px 10px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: #ffffff;
  color: #2c3e50;
  font-size: 14px;
  font-family: 'Consolas', monospace;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.coord-input:focus {
  border-color: #e94560;
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
}

.info-row {
  margin-top: 6px;
  font-size: 13px;
  color: #718096;
}

.result-section {
  margin-top: 8px;
}

.result-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.result-label {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.result-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  font-family: 'Consolas', monospace;
  word-break: break-all;
}

.result-value.highlight {
  color: #e94560;
  font-size: 20px;
}

.legend {
  margin-top: 12px;
  padding: 10px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4a5568;
  margin-bottom: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 滚动条美化 */
.control-panel::-webkit-scrollbar {
  width: 6px;
}
.control-panel::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.control-panel::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}
</style>