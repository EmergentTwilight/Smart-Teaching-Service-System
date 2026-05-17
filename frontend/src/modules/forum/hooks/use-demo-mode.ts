import { useCallback, useState } from 'react'
import { FORUM_DEMO_MODE_KEY } from '../constants/forum'

export function useDemoMode() {
  const [demoMode, setDemoModeState] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(FORUM_DEMO_MODE_KEY)
    // 答辩 Demo 默认开启；关闭后记为 '0'
    if (stored === '0') return false
    if (stored === '1') return true
    return true
  })

  const setDemoMode = useCallback((enabled: boolean) => {
    setDemoModeState(enabled)
    localStorage.setItem(FORUM_DEMO_MODE_KEY, enabled ? '1' : '0')
  }, [])

  return { demoMode, setDemoMode }
}
