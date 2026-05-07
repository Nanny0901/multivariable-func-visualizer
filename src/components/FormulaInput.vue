<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import 'mathlive'
import 'mathlive/static.css'
import 'mathlive/fonts.css'
import { latexToExpression } from '../utils/formulaModel'

const props = defineProps({
  latex: { type: String, default: '' },
})

const emit = defineEmits(['update'])
const mathfield = ref(null)
const localLatex = ref(props.latex)

const emitCurrentValue = () => {
  const latex = mathfield.value?.getValue?.() ?? localLatex.value
  localLatex.value = latex
  emit('update', latexToExpression(latex))
}

const insertTemplate = (template) => {
  const field = mathfield.value
  if (!field) return

  field.executeCommand?.(['insert', template])
  field.focus?.()
  emitCurrentValue()
}

const clear = () => {
  const field = mathfield.value
  if (!field) return

  field.setValue('')
  field.focus?.()
  emitCurrentValue()
}

watch(
  () => props.latex,
  (value) => {
    if (value === localLatex.value) return
    localLatex.value = value
    nextTick(() => {
      mathfield.value?.setValue?.(value || '')
    })
  },
)

onMounted(() => {
  if (!mathfield.value) return

  mathfield.value.setOptions?.({
    mathVirtualKeyboardPolicy: 'auto',
    smartFence: true,
    smartMode: true,
    removeExtraneousParentheses: true,
  })
  mathfield.value.setValue?.(props.latex || '')
  emitCurrentValue()
})

defineExpose({
  insertTemplate,
  clear,
})
</script>

<template>
  <div class="formula-input">
    <div class="formula-prefix">z =</div>
    <math-field
      ref="mathfield"
      class="math-field"
      math-virtual-keyboard-policy="auto"
      placeholder="x^2+y^2"
      smart-fence
      smart-mode
      @input="emitCurrentValue"
      @change="emitCurrentValue"
    ></math-field>
    <button class="formula-clear" type="button" @click="clear">清空</button>
  </div>
</template>
