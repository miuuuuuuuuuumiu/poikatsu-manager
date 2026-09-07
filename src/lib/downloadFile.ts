/** Blobをファイルとしてダウンロードさせる（バックエンドを使わないので、ブラウザの機能だけで行う） */
export function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 日本時間の日付を、ファイル名に使いやすい形式（YYYYMMDD_HHmmss）にする */
export function timestampForFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
