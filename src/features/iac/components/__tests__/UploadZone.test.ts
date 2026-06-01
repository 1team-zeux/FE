import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UploadZone from '../UploadZone.vue'

describe('UploadZone', () => {
  it('라벨이 렌더링된다', () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    expect(wrapper.text()).toContain('SLA 계약서')
  })

  it('파일 없을 때 상태 텍스트에 PDF 포함', () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    expect(wrapper.find('[data-testid="upload-status"]').text()).toContain('PDF')
  })

  it('유효한 PDF 파일 선택 시 select emit', async () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toEqual(file)
  })

  it('PDF 아닌 파일 선택 시 select emit 없음', async () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    const file = new File(['text'], 'test.txt', { type: 'text/plain' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('select')).toBeFalsy()
  })
})
