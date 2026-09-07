import { describe, expect, it } from 'vitest'
import { classifyDueDate } from './dateUtils'

const BASE = '2026-09-10'

describe('classifyDueDate', () => {
  it('期限日が未設定なら null', () => {
    expect(classifyDueDate(null, BASE)).toBeNull()
  })

  it('基準日より前なら期限超過', () => {
    expect(classifyDueDate('2026-09-09', BASE)).toBe('期限超過')
  })

  it('基準日と同じなら今日', () => {
    expect(classifyDueDate('2026-09-10', BASE)).toBe('今日')
  })

  it('1〜3日後なら3日以内', () => {
    expect(classifyDueDate('2026-09-11', BASE)).toBe('3日以内')
    expect(classifyDueDate('2026-09-13', BASE)).toBe('3日以内')
  })

  it('4〜7日後なら7日以内', () => {
    expect(classifyDueDate('2026-09-14', BASE)).toBe('7日以内')
    expect(classifyDueDate('2026-09-17', BASE)).toBe('7日以内')
  })

  it('8日以降ならそれ以降', () => {
    expect(classifyDueDate('2026-09-18', BASE)).toBe('それ以降')
  })
})
