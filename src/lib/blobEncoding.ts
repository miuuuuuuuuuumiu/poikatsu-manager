// 画像（Blob）をJSONに乗せて送れる文字列に変換する処理をここに一本化する。
// JSON完全バックアップ（backup.ts）とクラウド同期（cloudSync.ts）の両方から使う。

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*);base64/.exec(header)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  return base64ToBlob(base64, mime)
}

/** データURLの先頭部分（data:image/jpeg;base64,）を除いた、Base64本体だけを返す */
export async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await blobToDataUrl(blob)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}
