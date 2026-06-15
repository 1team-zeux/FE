import { load as loadYaml } from 'js-yaml'
import type { OnboardPayload } from '@/features/customer/api/useOnboardMutation'

export type ParseOnboardResult =
  | { ok: true; data: Partial<OnboardPayload> }
  | { ok: false; error: string }

export async function parseOnboardFile(file: File): Promise<ParseOnboardResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: '파일을 읽을 수 없습니다.' }
  }

  let raw: unknown
  try {
    const ext = file.name.split('.').pop()?.toLowerCase()
    raw = ext === 'json' ? JSON.parse(text) : loadYaml(text)
  } catch (e) {
    return { ok: false, error: `파싱 실패: ${(e as Error).message}` }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: '올바른 형식의 파일이 아닙니다.' }
  }

  const obj = raw as Record<string, unknown>

  // login 섹션을 flat 필드로 매핑
  const login = obj.login as Record<string, string> | undefined
  const data: Partial<OnboardPayload> = {
    ...(obj as Partial<OnboardPayload>),
    ...(login?.email ? { loginEmail: login.email } : {}),
    ...(login?.password ? { loginPassword: login.password } : {}),
  }

  return { ok: true, data }
}
