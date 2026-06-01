import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('styles.css', () => {
  const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8')

  it('브랜드 컬러 변수가 존재한다', () => {
    expect(css).toContain('--color-brand:')
    expect(css).toContain('--color-brand-light:')
  })

  it('상태 컬러 변수가 4개 존재한다', () => {
    expect(css).toContain('--color-status-critical:')
    expect(css).toContain('--color-status-warning:')
    expect(css).toContain('--color-status-ok:')
    expect(css).toContain('--color-status-pending:')
  })
})
