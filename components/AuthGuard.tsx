'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isLoginPage) {
        window.location.href = '/login'
        return
      }
      if (session && isLoginPage) {
        window.location.href = '/'
        return
      }
      setChecked(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLoginPage) {
        window.location.href = '/login'
      }
    })

    return () => subscription.unsubscribe()
  }, [isLoginPage])

  if (!checked) return null

  return <>{children}</>
}
