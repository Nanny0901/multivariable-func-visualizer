<script setup>
import { computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps({
  latex: { type: String, default: '' },
  displayMode: { type: Boolean, default: false },
  fallback: { type: String, default: '—' },
})

const rendered = computed(() => {
  const latex = props.latex || props.fallback

  try {
    return katex.renderToString(latex, {
      displayMode: props.displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: 'html',
    })
  } catch {
    return katex.renderToString(props.fallback, {
      displayMode: props.displayMode,
      throwOnError: false,
      strict: false,
    })
  }
})
</script>

<template>
  <span class="math-renderer" :class="{ display: displayMode }" v-html="rendered"></span>
</template>
