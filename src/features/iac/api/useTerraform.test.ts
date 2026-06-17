import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api'
import { generateTerraformWithRetry, isApprovedTopologyPendingError } from './useTerraform'

describe('useTerraform helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('Approved topology 저장 지연 404는 자동 재시도 후 성공한다', async () => {
    const pendingError = Object.assign(new Error('Approved topology not found: topo-123'), { status: 404 })
    const postSpy = vi.spyOn(api, 'post')
      .mockRejectedValueOnce(pendingError)
      .mockResolvedValueOnce({ data: { planId: 'plan-123', hclPreview: 'resource "x" {}' } })

    const promise = generateTerraformWithRetry('topo-123')
    await vi.advanceTimersByTimeAsync(500)

    await expect(promise).resolves.toEqual({
      planId: 'plan-123',
      hclPreview: 'resource "x" {}',
    })
    expect(postSpy).toHaveBeenCalledTimes(2)
  })

  it('다른 404는 바로 실패시킨다', async () => {
    const other404 = Object.assign(new Error('Topology candidate not found'), { status: 404 })
    const postSpy = vi.spyOn(api, 'post').mockRejectedValue(other404)

    await expect(generateTerraformWithRetry('topo-404')).rejects.toThrow('Topology candidate not found')
    expect(postSpy).toHaveBeenCalledTimes(1)
  })

  it('Approved topology 대기 에러만 재시도 대상으로 판별한다', () => {
    expect(isApprovedTopologyPendingError(Object.assign(new Error('Approved topology not found: topo-1'), { status: 404 }))).toBe(true)
    expect(isApprovedTopologyPendingError(Object.assign(new Error('Approved topology not found: topo-1'), { status: 500 }))).toBe(false)
    expect(isApprovedTopologyPendingError(Object.assign(new Error('Topology candidate not found'), { status: 404 }))).toBe(false)
  })
})
