// 案件・作業などのIDを作る処理はここに一本化する。
// crypto.randomUUID() は「安全なコンテキスト」（https、またはパソコン自身のlocalhost）でしか
// 使えない制限があり、スマホから同じWi-Fi経由でhttp接続すると使えずエラーになる。
// そのため、まずgetRandomValues（こちらは制限を受けない）でIDを作り、
// どうしても使えない場合だけ簡易的な方法にフォールバックする。
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' && typeof window !== 'undefined' && window.isSecureContext) {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // 最終手段。暗号学的な安全性は無いが、アプリ内でIDが重複しなければ十分なため許容する。
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
