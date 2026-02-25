'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const logoSrc = '/images/PCG_MindRift_Co_Logo-09.png'

export function LoginCard() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setError(payload.error || 'Unable to sign in. Please check your credentials.')
        setIsSubmitting(false)
        return
      }

      router.push('/workflows')
      router.refresh()
    } catch (err) {
      console.error('[auth] Login failed', err)
      setError('Unexpected error. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border border-[#7ea4bf] bg-[#011524] shadow-xl py-0">
      <CardHeader className="space-y-1 pb-2 pt-6 text-center">
        <div className="flex justify-center">
          <Image
            src={logoSrc}
            alt="Mindrift"
            width={400}
            height={130}
            className="h-28 w-auto"
            priority
          />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-base text-[#b6d0e3]">
            Sign in to manage rental credit applications and agreements.
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 bg-[#011524] pb-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@mindrift.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-white/25 bg-white/5 text-white placeholder:text-[#9ab8cc]"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </label>
              <Link href="/reset-password" className="text-xs font-medium text-[#9fd3ff] hover:text-white hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-white/25 bg-white/5 text-white placeholder:text-[#9ab8cc]"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full border-[#d7e8f5] bg-[#deeffa] text-[#011524] hover:bg-[#c7def0]"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-xs text-[#b6d0e3]">
            Need an account?{' '}
            <Link href="/contact" className="text-[#9fd3ff] hover:text-white hover:underline">
              Contact platform admin
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-1 border-t border-white/10 bg-[#011524] px-6 pb-6 pt-4 text-center text-xs leading-5 text-[#b6d0e3]">
          <p className="text-[#b6d0e3]">Use the credentials provisioned for your workflow role.</p>
          <p className="text-xs text-[#9fd3ff]">Having trouble? Reach out to support@mindrift.com</p>
        </CardFooter>
      </form>
    </Card>
  )
}






