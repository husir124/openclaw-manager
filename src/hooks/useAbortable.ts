import { useRef, useCallback, useEffect } from 'react'

/**
 * 可取消请求的 Hook
 *
 * 用法：
 * const { makeAbortable } = useAbortable()
 *
 * useEffect(() => {
 *   makeAbortable(async (signal) => {
 *     const resp = await fetch(url, { signal })
 *     // ...
 *   })
 * }, [dep])
 *
 * 组件卸载时自动 abort，防止 setState 到已卸载组件
 */
export function useAbortable() {
  const controllerRef = useRef<AbortController | null>(null)

  // 组件卸载时自动取消
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const makeAbortable = useCallback(async <T>(
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | undefined> => {
    // 取消上一个请求
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      return await fn(controller.signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return undefined // 被取消，静默处理
      }
      throw err
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  return { makeAbortable, cancel }
}
