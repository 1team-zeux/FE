// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
import axios from 'axios'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MSW handlers', () => {
  it('POST /api/upload-sessions → uploadSessionId 반환', async () => {
    const res = await axios.post('http://localhost/api/upload-sessions', {})
    expect(res.data.uploadSessionId).toBe('sess-mock-001')
  })

  it('GET /api/sla-bundles/draft/:sessionId → SLABundle 반환', async () => {
    const res = await axios.get('http://localhost/api/sla-bundles/draft/sess-mock-001')
    expect(res.data.bundleId).toBe('bundle-mock-001')
    expect(res.data.items.length).toBeGreaterThan(0)
  })

  it('GET /api/topologies/:bundleId → 3개 토폴로지 반환', async () => {
    const res = await axios.get('http://localhost/api/topologies/bundle-mock-001')
    expect(res.data.topologies).toHaveLength(3)
  })
})
