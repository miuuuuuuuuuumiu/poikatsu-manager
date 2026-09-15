// リポジトリ（データの保存処理）と cloudSync.ts が互いを直接importし合う
// 循環参照にならないよう、間に挟む軽量な「変更があったことだけを知らせる」仕組み。
type Listener = () => void

const listeners = new Set<Listener>()

/** ユーザー操作によるデータ変更があったときに呼ぶ（同期処理そのものによる書き込みでは呼ばない） */
export function notifyDataChanged(): void {
  for (const listener of listeners) listener()
}

export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
