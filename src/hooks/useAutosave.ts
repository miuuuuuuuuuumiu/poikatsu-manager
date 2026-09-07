import { useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 値が変わるたびに、少し待ってから自動保存する。
 * 保存中に次の変更が来た場合は、今の保存が終わってから最新の値でもう一度保存する
 * （保存の取りこぼしを防ぐため）。
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  options?: { delay?: number; enabled?: boolean },
) {
  const delay = options?.delay ?? 800
  const enabled = options?.enabled ?? true

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const valueRef = useRef(value)
  const saveRef = useRef(save)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  useEffect(() => {
    if (!enabled) return

    async function runSave() {
      if (savingRef.current) {
        pendingRef.current = true
        return
      }
      savingRef.current = true
      setStatus('saving')
      try {
        await saveRef.current(valueRef.current)
        setStatus('saved')
        setErrorMessage('')
      } catch (error) {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。もう一度お試しください。')
      } finally {
        savingRef.current = false
        if (pendingRef.current) {
          pendingRef.current = false
          void runSave()
        }
      }
    }

    const timer = window.setTimeout(() => {
      void runSave()
    }, delay)

    return () => window.clearTimeout(timer)
  }, [value, enabled, delay])

  return { status, errorMessage }
}
