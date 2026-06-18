<script setup lang="ts">
defineProps<{ title: string; content: string; open: boolean }>()
defineEmits<{ (e: 'close'): void }>()

function renderMd(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 테이블 블록을 placeholder로 추출
  const tables: string[] = []
  const lines = md.split('\n')
  const out: string[] = []
  let buf: string[] = []

  function flushTable() {
    if (buf.length >= 2) {
      const rows = buf.map(l => l.split('|').slice(1, -1).map(c => esc(c.trim())))
      const header = rows[0]
      const data = rows.slice(2)
      const idx = tables.length
      tables.push(
        `<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">` +
        `<thead class="bg-gray-50 border-b-2 border-gray-200"><tr>${header.map(h => `<th class="text-left font-semibold px-3 py-2 text-gray-900 text-xs">${h}</th>`).join('')}</tr></thead>` +
        `<tbody>${data.map((r, i) => `<tr class="${i % 2 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100">${r.map(c => `<td class="px-3 py-2 text-gray-800 text-xs">${c}</td>`).join('')}</tr>`).join('')}</tbody>` +
        `</table></div>`
      )
      out.push(`__TABLE_${idx}__`)
    } else {
      out.push(...buf)
    }
    buf = []
  }

  for (const line of lines) {
    if (line.trim().startsWith('|')) { buf.push(line) }
    else { flushTable(); out.push(line) }
  }
  flushTable()

  let result = out.join('\n')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-gray-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-900 mt-5 mb-2 border-b border-gray-200 pb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-[#2980B9] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-sm text-gray-800 ml-4 list-disc leading-relaxed">$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[#2980B9] pl-3 text-sm text-gray-500 italic my-1">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-gray-100 my-3">')
    .replace(/\n{2,}/g, '</p><p class="text-sm text-gray-800 mb-2">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p class="text-sm text-gray-800 mb-2">')
    .replace(/$/, '</p>')

  // placeholder 주변 <p> 제거
  result = result.replace(/<p[^>]*>(__TABLE_\d+__)<\/p>/g, '$1')

  tables.forEach((t, i) => { result = result.replace(`__TABLE_${i}__`, t) })
  return result
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

          <!-- 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 class="font-bold text-gray-900 text-base">{{ title }}</h2>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- 본문 -->
          <div class="overflow-y-auto px-6 py-5 prose-sm" v-html="renderMd(content)" />

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
