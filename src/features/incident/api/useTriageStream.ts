import { onUnmounted, ref } from 'vue';

export interface TriageStreamDone {
  incident_id?: string;
  assessment_id?: string;
  triage_priority?: string;
  total_ms?: number;
}

// Triage Agent 실행 로그를 SSE로 받는다 (FinOps 패턴 차용)
export function useTriageStream() {
  const lines = ref<string[]>([]);
  const isStreaming = ref(false);
  const isDone = ref(false);
  const error = ref<string | null>(null);
  const donePayload = ref<TriageStreamDone | null>(null);

  let eventSource: EventSource | null = null;

  // 스트림 중단 — 페이지 이탈 시 자동 호출
  function stop() {
    eventSource?.close();
    eventSource = null;
    isStreaming.value = false;
  }

  // 라인 1개 추가 (즉시 reactive 갱신)
  function appendLine(line: string) {
    lines.value = [...lines.value, line];
  }

  // SSE 미연결 환경에서 사용할 수동 시뮬레이션
  // 라인 배열을 일정 간격으로 차례로 추가
  async function simulate(scriptLines: string[], intervalMs = 350): Promise<void> {
    stop();
    lines.value = [];
    isDone.value = false;
    error.value = null;
    isStreaming.value = true;
    for (const line of scriptLines) {
      lines.value = [...lines.value, line];
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, intervalMs));
    }
    isStreaming.value = false;
    isDone.value = true;
  }

  // 실제 SSE 시작
  function start(groupId: string) {
    stop();
    lines.value = [];
    isDone.value = false;
    error.value = null;
    donePayload.value = null;
    isStreaming.value = true;

    eventSource = new EventSource(`/api/triage/stream/${encodeURIComponent(groupId)}`);

    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { type?: string; line?: string };
        if (data.type === 'line' && data.line) {
          appendLine(data.line);
        }
      } catch {
        appendLine(e.data);
      }
    };

    eventSource.addEventListener('done', (e: Event) => {
      const msg = e as MessageEvent;
      try {
        donePayload.value = JSON.parse(msg.data) as TriageStreamDone;
      } catch {
        donePayload.value = {};
      }
      isDone.value = true;
      isStreaming.value = false;
      eventSource?.close();
      eventSource = null;
    });

    eventSource.onerror = () => {
      if (!isDone.value) {
        error.value = 'Triage 스트림 연결 실패';
      }
      isStreaming.value = false;
      eventSource?.close();
      eventSource = null;
    };
  }

  onUnmounted(stop);

  return { lines, isStreaming, isDone, error, donePayload, start, stop, simulate, appendLine };
}
