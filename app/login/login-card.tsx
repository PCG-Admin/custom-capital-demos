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
    <Card className="w-full max-w-md shadow-xl border-border/80">
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <Image
            src={logoSrc}
            alt="Custom Capital"
            width={200}
            height={56}
            className="h-14 w-auto"
            priority
          />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage rental credit applications and agreements.
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@customcapital.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link href="/reset-password" className="text-xs font-medium text-primary hover:underline">
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
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Need an account?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact platform admin
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
          <p>Use the credentials provisioned for your workflow role.</p>
          <p className="text-[11px]">Having trouble? Reach out to support@customcapital.com</p>
        </CardFooter>
      </form>
    </Card>
  )
}
