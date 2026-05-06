import { compile, derivative } from 'mathjs'

export const defaultViewSettings = {
  range: 5,
  segments: 84,
  zLimit: 9,
}

export const normalizeExpressionText = (text) => {
  const raw = String(text ?? '').trim()
  if (!raw) return '0'

  const explicitMatch = raw.match(/^z\s*=\s*(.+)$/i)
  if (explicitMatch) return explicitMatch[1].trim() || '0'

  return raw
}

export const formatNumber = (value, digits = 4) => {
  if (!Number.isFinite(value)) return '—'

  const rounded = Number(value.toFixed(digits))
  if (Math.abs(rounded) >= 10000 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 0.0001)) {
    return rounded.toExponential(3)
  }

  return String(rounded)
}

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const normalizeVector = (vector) => {
  const x = toFiniteNumber(vector?.x)
  const y = toFiniteNumber(vector?.y)
  const length = Math.hypot(x, y)

  if (length < 1e-10) {
    return {
      x,
      y,
      length,
      unit: { x: 0, y: 0 },
      valid: false,
    }
  }

  return {
    x,
    y,
    length,
    unit: { x: x / length, y: y / length },
    valid: true,
  }
}

export const vectorAngleDegrees = (vector) => {
  const { x, y, valid } = normalizeVector(vector)
  if (!valid) return 0

  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

export const vectorFromAngleDegrees = (degrees) => {
  const radians = (toFiniteNumber(degrees) * Math.PI) / 180
  return {
    x: Number(Math.cos(radians).toFixed(6)),
    y: Number(Math.sin(radians).toFixed(6)),
  }
}

const coerceFiniteNumber = (value) => {
  const primitive = typeof value?.toNumber === 'function' ? value.toNumber() : value?.valueOf?.() ?? value
  const number = Number(primitive)
  return Number.isFinite(number) ? number : NaN
}

export const createFunctionModel = (expressionText) => {
  try {
    const expression = normalizeExpressionText(expressionText)

    if (/=/.test(expression)) {
      throw new Error('请只输入 z = f(x,y) 的右端表达式，或写成 z = ...')
    }

    if (/\bz\b/i.test(expression)) {
      throw new Error('当前模型为显式曲面 z=f(x,y)，右端表达式中不要再使用 z')
    }

    const compiled = compile(expression)
    const dfdxNode = derivative(expression, 'x')
    const dfdyNode = derivative(expression, 'y')
    const dfdxCompiled = dfdxNode.compile()
    const dfdyCompiled = dfdyNode.compile()

    const evaluateAt = (x, y) => coerceFiniteNumber(compiled.evaluate({ x, y }))
    const gradientAt = (x, y) => ({
      x: coerceFiniteNumber(dfdxCompiled.evaluate({ x, y })),
      y: coerceFiniteNumber(dfdyCompiled.evaluate({ x, y })),
    })

    return {
      ok: true,
      expression,
      derivativeText: {
        x: dfdxNode.toString(),
        y: dfdyNode.toString(),
      },
      evaluateAt,
      gradientAt,
    }
  } catch (error) {
    return {
      ok: false,
      expression: normalizeExpressionText(expressionText),
      error: error instanceof Error ? error.message : String(error),
      evaluateAt: () => NaN,
      gradientAt: () => ({ x: NaN, y: NaN }),
      derivativeText: { x: '—', y: '—' },
    }
  }
}

export const analyzeFunction = ({ expression, point, vector }) => {
  const model = createFunctionModel(expression)
  const x = toFiniteNumber(point?.x)
  const y = toFiniteNumber(point?.y)
  const normalizedVector = normalizeVector(vector)

  if (!model.ok) {
    return {
      ok: false,
      model,
      point: { x, y, z: NaN },
      vector: normalizedVector,
      error: model.error,
    }
  }

  const z = model.evaluateAt(x, y)
  const gradient = model.gradientAt(x, y)
  const gradientLength = Math.hypot(gradient.x, gradient.y)

  if (!Number.isFinite(z)) {
    return {
      ok: false,
      model,
      point: { x, y, z },
      vector: normalizedVector,
      gradient,
      gradientLength,
      error: '选定点不在函数定义域内，无法计算曲面高度与方向导数',
    }
  }

  if (!Number.isFinite(gradient.x) || !Number.isFinite(gradient.y)) {
    return {
      ok: false,
      model,
      point: { x, y, z },
      vector: normalizedVector,
      gradient,
      gradientLength,
      error: '该点处偏导数无定义或数值发散',
    }
  }

  if (!normalizedVector.valid) {
    return {
      ok: false,
      model,
      point: { x, y, z },
      vector: normalizedVector,
      gradient,
      gradientLength,
      error: '方向向量不能为零，请输入非零二维向量',
    }
  }

  const directionalDerivative =
    gradient.x * normalizedVector.unit.x + gradient.y * normalizedVector.unit.y

  return {
    ok: true,
    model,
    point: { x, y, z },
    vector: normalizedVector,
    gradient,
    gradientLength,
    directionalDerivative,
    derivativeFormula: `${formatNumber(gradient.x)} × ${formatNumber(normalizedVector.unit.x)} + ${formatNumber(gradient.y)} × ${formatNumber(normalizedVector.unit.y)}`,
  }
}

export const sampleSurface = (model, settings = defaultViewSettings) => {
  const range = Math.max(1, toFiniteNumber(settings.range, defaultViewSettings.range))
  const segments = Math.max(16, Math.min(150, Math.round(toFiniteNumber(settings.segments, defaultViewSettings.segments))))
  const zLimit = Math.max(2, toFiniteNumber(settings.zLimit, defaultViewSettings.zLimit))
  const step = (2 * range) / segments
  const vertices = []
  const colors = []
  const valid = []
  let skipped = 0
  let minZ = Infinity
  let maxZ = -Infinity

  for (let i = 0; i <= segments; i += 1) {
    const x = -range + i * step

    for (let j = 0; j <= segments; j += 1) {
      const y = -range + j * step
      const z = model.ok ? model.evaluateAt(x, y) : NaN
      const usable = Number.isFinite(z) && Math.abs(z) <= zLimit

      valid.push(usable)
      vertices.push(x, usable ? z : 0, y)

      if (usable) {
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      } else {
        skipped += 1
      }
    }
  }

  const zSpan = Number.isFinite(maxZ - minZ) && maxZ > minZ ? maxZ - minZ : 1

  for (let index = 0; index < vertices.length; index += 3) {
    const z = vertices[index + 1]
    const ratio = Math.max(0, Math.min(1, (z - minZ) / zSpan))
    colors.push(0.2 + ratio * 0.65, 0.48 + ratio * 0.28, 0.98 - ratio * 0.5)
  }

  const indices = []

  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * (segments + 1) + j
      const b = a + 1
      const c = a + (segments + 1)
      const d = c + 1

      if (valid[a] && valid[b] && valid[d]) indices.push(a, b, d)
      if (valid[a] && valid[d] && valid[c]) indices.push(a, d, c)
    }
  }

  return {
    vertices,
    colors,
    indices,
    stats: {
      skipped,
      total: valid.length,
      minZ: Number.isFinite(minZ) ? minZ : NaN,
      maxZ: Number.isFinite(maxZ) ? maxZ : NaN,
    },
  }
}

export const sampleCurveAlongDirection = (model, point, unit, length = 2.4, steps = 72) => {
  const positions = []

  for (let i = 0; i <= steps; i += 1) {
    const t = -length / 2 + (length * i) / steps
    const x = point.x + unit.x * t
    const y = point.y + unit.y * t
    const z = model.evaluateAt(x, y)

    if (Number.isFinite(z)) {
      positions.push({ x, y, z })
    }
  }

  return positions
}
