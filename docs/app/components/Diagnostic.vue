<script setup lang="ts">
/**
 * Renders a nostics Diagnostic as a faux-terminal block, colorizing tokens
 * with a terminal-realistic palette while preserving every character of the
 * original log (backticks, tree glyphs, punctuation: all kept verbatim).
 *
 * Pass the raw log via the `log` prop (a YAML block scalar in MDC):
 *
 * ::diagnostic
 * ---
 * log: |
 *   [NUXT_B2011] Invalid plugin `/plugins/bad.ts`.
 *   ╰▶ see: https://nuxt.com/e/b2011
 * ---
 * ::
 */
const props = defineProps<{ log: string }>()

interface Segment {
  text: string
  class: string
}

// Token patterns in priority order. Each match is wrapped in its class; any
// text between matches is emitted verbatim with no class. Nothing is dropped.
const TOKENS: { re: RegExp; class: string }[] = [
  // Diagnostic code, e.g. [NUXT_B2011]
  { re: /\[[A-Z][A-Z0-9_]*\]/y, class: 'diag-code' },
  // Backtick-wrapped code spans, backticks kept: `addPlugin()`
  { re: /`[^`]*`/y, class: 'diag-path' },
  // Full URLs
  { re: /https?:\/\/\S+/y, class: 'diag-link' },
  // Bare docs links: host.tld/path
  { re: /(?:[\w-]+\.)+[a-z]{2,}\/\S+/y, class: 'diag-link' },
  // File references with a line[:col]: nuxt.config.ts:14:3
  { re: /[\w./-]+\.\w+:\d+(?::\d+)?/y, class: 'diag-file' },
  // Tree glyphs
  { re: /[├╰└┌│]▶?|▶/y, class: 'diag-tree' },
  // The `fix:` label gets its own accent; other known labels are dimmed
  { re: /fix:/y, class: 'diag-fix' },
  { re: /(?:why|at|source|sources|see|cause|hint|note|docs):/y, class: 'diag-label' },
]

function tokenizeLine(line: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  let pending = ''

  while (i < line.length) {
    let matched: { text: string; class: string } | null = null
    for (const token of TOKENS) {
      token.re.lastIndex = i
      const m = token.re.exec(line)
      if (m && m.index === i) {
        matched = { text: m[0], class: token.class }
        break
      }
    }

    if (matched) {
      if (pending) {
        segments.push({ text: pending, class: '' })
        pending = ''
      }
      segments.push(matched)
      i += matched.text.length
    } else {
      pending += line[i]
      i += 1
    }
  }

  if (pending) segments.push({ text: pending, class: '' })
  return segments
}

// Trailing newline from the YAML block scalar is trimmed so the block has no
// dangling empty line; interior characters are untouched.
const lines = computed(() => props.log.replace(/\n+$/, '').split('\n').map(tokenizeLine))
</script>

<template>
  <pre class="diag"><template v-for="(line, l) in lines" :key="l"><span
    v-for="(seg, s) in line"
    :key="s"
    :class="seg.class"
  >{{ seg.text }}</span>{{ l < lines.length - 1 ? '\n' : '' }}</template></pre>
</template>
