import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeployProgress from '../DeployProgress.vue'

const resources = [
  { resource: 'aws_vpc.main', status: 'complete' as const, detail: '생성 완료' },
  { resource: 'aws_instance.app', status: 'in_progress' as const, detail: '생성 중...' },
  { resource: 'aws_db_instance.primary', status: 'pending' as const, detail: '대기 중' },
]

describe('DeployProgress', () => {
  it('리소스 목록이 렌더링된다', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.findAll('[data-testid="resource-row"]')).toHaveLength(3)
  })

  it('complete 상태 아이콘 렌더링', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-status="complete"]').exists()).toBe(true)
  })

  it('in_progress 상태 아이콘 렌더링', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-status="in_progress"]').exists()).toBe(true)
  })

  it('진행률 바 렌더링', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-testid="progress-bar"]').exists()).toBe(true)
  })
})
