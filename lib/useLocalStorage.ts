'use client'
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value, loaded])

  return [value, setValue, loaded] as const
}
