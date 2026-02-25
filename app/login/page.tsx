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
    <div className="min-h-screen flex items-start justify-center bg-[#deeffa] px-4 pt-32 pb-10">
      <LoginCard />
    </div>
  )
}




