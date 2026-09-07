import { useEffect, useState, type ChangeEvent } from 'react'
import type { ImageKind, ProjectImage } from '../../types'
import { addProjectImage, deleteProjectImage, updateImageDescription } from '../../lib/repositories/images'
import { compressImage } from '../../lib/imageCompression'
import { ImageIcon } from '../icons'

const KINDS: ImageKind[] = ['条件画面', '申込完了', 'ポイント付与', 'その他']

export function EvidenceImages({
  projectId,
  images,
  onImagesChange,
}: {
  projectId: string
  images: ProjectImage[]
  onImagesChange: (images: ProjectImage[]) => void
}) {
  const [uploadingKind, setUploadingKind] = useState<ImageKind | null>(null)
  const [uploadError, setUploadError] = useState('')

  async function handleFileSelect(kind: ImageKind, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    setUploadingKind(kind)
    try {
      const compressed = await compressImage(file)
      const image = await addProjectImage(projectId, kind, '', compressed)
      onImagesChange([...images, image])
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '画像の追加に失敗しました')
    } finally {
      setUploadingKind(null)
    }
  }

  async function handleDelete(id: string) {
    await deleteProjectImage(id)
    onImagesChange(images.filter((img) => img.id !== id))
  }

  async function handleDescriptionBlur(id: string, description: string) {
    await updateImageDescription(id, description)
  }

  return (
    <div className="space-y-4">
      {uploadError && (
        <p className="rounded-xl bg-[var(--color-warn-bg)] px-3 py-2 text-sm font-bold text-[var(--color-warn-text)]">
          {uploadError}
        </p>
      )}
      {KINDS.map((kind) => (
        <div key={kind} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{kind}</p>
            <label className="cursor-pointer rounded-lg bg-[var(--color-beige)] px-3 py-1.5 text-xs font-bold text-[var(--color-ink)]">
              {uploadingKind === kind ? '処理中…' : '画像を追加'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingKind !== null}
                onChange={(e) => handleFileSelect(kind, e)}
              />
            </label>
          </div>

          {images.filter((img) => img.kind === kind).length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] p-3 text-[var(--color-ink-soft)]">
              <ImageIcon className="h-7 w-7 shrink-0" />
              <p className="text-xs">まだ画像がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {images
                .filter((img) => img.kind === kind)
                .map((img) => (
                  <ImageRow key={img.id} image={img} onDelete={handleDelete} onDescriptionBlur={handleDescriptionBlur} />
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ImageRow({
  image,
  onDelete,
  onDescriptionBlur,
}: {
  image: ProjectImage
  onDelete: (id: string) => void
  onDescriptionBlur: (id: string, description: string) => void
}) {
  const [description, setDescription] = useState(image.description)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // createObjectURLとrevokeObjectURLは同じuseMemo内で完結させず、必ずuseEffect内で
  // 作成・後片付けする（開発モードのStrictModeでは、useMemoで作った直後にrevokeされてしまい
  // 画像が表示されなくなるため）。
  useEffect(() => {
    const url = URL.createObjectURL(image.blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image.blob])

  return (
    <div className="flex gap-3 rounded-xl border border-[var(--color-line)] p-2">
      {objectUrl && <img src={objectUrl} alt={image.kind} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1 space-y-1">
        <input
          type="text"
          value={description}
          placeholder="画像の説明（任意）"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => onDescriptionBlur(image.id, description)}
          className="w-full rounded-lg border border-[var(--color-line)] px-2 py-1 text-xs outline-none focus:border-[var(--color-green-dark)]"
        />
        <button onClick={() => onDelete(image.id)} className="text-xs font-bold text-[var(--color-warn-text)]">
          この画像を削除
        </button>
      </div>
    </div>
  )
}
