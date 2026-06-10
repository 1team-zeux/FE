<script setup lang="ts">
defineProps<{ title: string; content: string; open: boolean }>()
defineEmits<{ (e: 'close'): void }>()

function renderMd(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-gray-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">$1</h2>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-[#2980B9] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // bullet list items — render consecutive bullets as a group
    .replace(/^- (.+)$/gm, '<li class="text-sm text-gray-600 ml-4 list-disc">$1</li>')
    // blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[#2980B9] pl-3 text-sm text-gray-500 italic my-1">$1</blockquote>')
    // horizontal rule
    .replace(/^---$/gm, '<hr class="border-gray-100 my-3">')
    // blank lines → paragraph break
    .replace(/\n{2,}/g, '</p><p class="text-sm text-gray-600 mb-2">')
    // remaining single newlines
    .replace(/\n/g, '<br>')
    // wrap in paragraph
    .replace(/^/, '<p class="text-sm text-gray-600 mb-2">')
    .replace(/$/, '</p>')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">

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
