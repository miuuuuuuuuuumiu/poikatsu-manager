// 画像は端末容量を圧迫しないよう、長辺1600px・JPEG品質80%を目安に圧縮する。
// 文字が読めなくなるほどの劣化は避けつつ、スクリーンショット程度なら十分小さくなる設定。
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画像を処理できませんでした')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('画像の圧縮に失敗しました')
    return blob
  } finally {
    bitmap.close()
  }
}
