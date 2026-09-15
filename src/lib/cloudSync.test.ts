import { describe, expect, it } from 'vitest'
import { mergeById } from './cloudSync'

interface Item {
  id: string
  updatedAt: string
  value: string
}

describe('mergeById', () => {
  it('ローカルにしか無いものはそのまま残る', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z', value: 'ローカルだけ' }]
    const remote: Item[] = []
    const result = mergeById(local, remote)
    expect(result).toEqual(local)
  })

  it('リモートにしか無いものは取り込まれる', () => {
    const local: Item[] = []
    const remote: Item[] = [{ id: 'b', updatedAt: '2026-01-01T00:00:00.000Z', value: 'リモートだけ' }]
    const result = mergeById(local, remote)
    expect(result).toEqual(remote)
  })

  it('両方に存在する場合はupdatedAtが新しい方が勝つ（ローカルが新しい）', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2026-02-01T00:00:00.000Z', value: 'ローカルの方が新しい' }]
    const remote: Item[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z', value: '古いリモート' }]
    const result = mergeById(local, remote)
    expect(result).toEqual([local[0]])
  })

  it('両方に存在する場合はupdatedAtが新しい方が勝つ（リモートが新しい）', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z', value: '古いローカル' }]
    const remote: Item[] = [{ id: 'a', updatedAt: '2026-02-01T00:00:00.000Z', value: 'リモートの方が新しい' }]
    const result = mergeById(local, remote)
    expect(result).toEqual([remote[0]])
  })
})
