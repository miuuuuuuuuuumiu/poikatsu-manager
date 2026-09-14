import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

/**
 * 入力した文章の長さに合わせて自動で高さが伸びる入力欄。
 * 「達成条件」「メモ」など、長い文章を書いても全部見えるようにするため。
 */
export function AutoResizeTextarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])

  return <textarea ref={ref} className={`resize-none overflow-hidden ${className}`} {...props} />
}
