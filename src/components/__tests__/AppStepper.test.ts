import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppStepper from '../AppStepper.vue'

const steps = [
  { label: '문서 업로드' },
  { label: '폼 검토' },
  { label: '토폴로지 선택' },
  { label: 'Terraform 배포' },
]

describe('AppStepper', () => {
  it('4개 스텝을 렌더링한다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 1 },
    })
    expect(wrapper.findAll('[data-testid="step-item"]')).toHaveLength(4)
  })

  it('현재 스텝이 step-active 클래스를 가진다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 2 },
    })
    const items = wrapper.findAll('[data-testid="step-item"]')
    expect(items[1].classes()).toContain('step-active')
  })

  it('완료된 스텝이 step-completed 클래스를 가진다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 3 },
    })
    const items = wrapper.findAll('[data-testid="step-item"]')
    expect(items[0].classes()).toContain('step-completed')
    expect(items[1].classes()).toContain('step-completed')
  })
})
