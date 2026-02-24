import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginCard } from './login-card'

// This page needs to run on the server at request time because it checks cookies for an existing session.
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect('/workflows')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-12">
      <LoginCard />
    </div>
  )
}
