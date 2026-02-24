'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonProps } from '@/components/ui/button'

type LogoutButtonProps = {
  label?: string
} & Pick<ButtonProps, 'variant' | 'size' | 'className'>

export function LogoutButton({ label = 'Log out', variant = 'outline', size = 'sm', className }: LogoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
      await router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('[auth] Logout failed', error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out...' : label}
    </Button>
  )
}
