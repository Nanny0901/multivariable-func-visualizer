import { ComputeEngine } from '@cortex-js/compute-engine'

const computeEngine = new ComputeEngine()

const binaryOperator = (json, operator) => {
  const [, first, ...rest] = json
  if (rest.length === 0) return mathJsonToMathjs(first)

  return rest.reduce(
    (accumulator, item) => `(${accumulator} ${operator} ${mathJsonToMathjs(item)})`,
    mathJsonToMathjs(first),
  )
}

const functionCall = (name, value) => `${name}(${mathJsonToMathjs(value)})`

export const mathJsonToMathjs = (json) => {
  if (typeof json === 'number') return String(json)
  if (typeof json === 'string') {
    if (json === 'Pi') return 'pi'
    if (json === 'ExponentialE') return 'e'
    if (json === 'ImaginaryUnit' || json === 'ImaginaryI') {
      throw new Error('当前只支持实值函数，不能使用虚数单位')
    }
    if (json === 'x' || json === 'y') return json
    if (json === 'Nothing') return ''
    throw new Error(`暂不支持符号 ${json}`)
  }

  if (!Array.isArray(json)) {
    throw new Error('无法识别该公式结构')
  }

  const [head, ...args] = json

  switch (head) {
    case 'Add':
      return binaryOperator(json, '+')
    case 'Subtract':
      return `(${mathJsonToMathjs(args[0])} - ${mathJsonToMathjs(args[1])})`
    case 'Negate':
      return `(-${mathJsonToMathjs(args[0])})`
    case 'Multiply':
      return binaryOperator(json, '*')
    case 'Divide':
      return `(${mathJsonToMathjs(args[0])} / ${mathJsonToMathjs(args[1])})`
    case 'Power':
      return `(${mathJsonToMathjs(args[0])} ^ ${mathJsonToMathjs(args[1])})`
    case 'Square':
      return `(${mathJsonToMathjs(args[0])} ^ 2)`
    case 'Sqrt':
      return functionCall('sqrt', args[0])
    case 'Root':
      return `(${mathJsonToMathjs(args[0])} ^ (1 / ${mathJsonToMathjs(args[1])}))`
    case 'Rational':
      return `(${mathJsonToMathjs(args[0])} / ${mathJsonToMathjs(args[1])})`
    case 'Sin':
      return functionCall('sin', args[0])
    case 'Cos':
      return functionCall('cos', args[0])
    case 'Tan':
      return functionCall('tan', args[0])
    case 'Exp':
      return functionCall('exp', args[0])
    case 'Log':
    case 'Ln':
      return functionCall('log', args[0])
    case 'Abs':
      return functionCall('abs', args[0])
    case 'Delimiter':
    case 'Parentheses':
      return `(${mathJsonToMathjs(args[0])})`
    case 'Error':
      throw new Error('公式中存在无法解析的片段')
    default:
      throw new Error(`暂不支持 ${head} 结构`)
  }
}

export const normalizeFormulaLatex = (latex) => {
  const raw = String(latex ?? '').trim()
  if (!raw) return ''

  return raw
    .replace(/^z\s*=\s*/i, '')
    .replace(/^\\?mathrm\{?z\}?\s*=\s*/i, '')
    .trim()
}

export const latexToExpression = (latex) => {
  try {
    const normalizedLatex = normalizeFormulaLatex(latex)
    if (!normalizedLatex) {
      return {
        ok: false,
        latex: '',
        expression: '',
        error: '请输入 z=f(x,y) 的右端公式',
      }
    }

    const parsed = computeEngine.parse(normalizedLatex)
    const expression = mathJsonToMathjs(parsed.json).trim()

    if (/\bz\b/i.test(expression)) {
      throw new Error('当前模型为显式曲面 z=f(x,y)，右端公式中不要再使用 z')
    }

    return {
      ok: true,
      latex: normalizedLatex,
      expression,
      mathJson: parsed.json,
    }
  } catch (error) {
    return {
      ok: false,
      latex: String(latex ?? ''),
      expression: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const expressionToLatex = (expression) => {
  try {
    const parsed = computeEngine.parse(String(expression ?? '0'))
    return parsed.latex
  } catch {
    return String(expression ?? '')
  }
}

export const numberToLatex = (value) => {
  if (!Number.isFinite(value)) return '\\text{--}'
  return String(Number(value.toFixed(6)))
}

export const pointToLatex = (point) =>
  `\\left(${numberToLatex(point?.x)}, ${numberToLatex(point?.y)}, ${numberToLatex(point?.z)}\\right)`

export const vectorToLatex = (vector) => {
  if (!vector?.valid) return '\\text{--}'
  return `\\left(${numberToLatex(vector.unit.x)}, ${numberToLatex(vector.unit.y)}\\right)`
}
