import { useCallback, useState } from 'react'
import { FORUM_DEMO_MODE_KEY } from '../constants/forum'

export function useDemoMode() {
  const [demoMode, setDemoModeState] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(FORUM_DEMO_MODE_KEY)
    return stored === '1'
  })

  const setDemoMode = useCallback((enabled: boolean) => {
    setDemoModeState(enabled)
    localStorage.setItem(FORUM_DEMO_MODE_KEY, enabled ? '1' : '0')
  }, [])

  return { demoMode, setDemoMode }
}
