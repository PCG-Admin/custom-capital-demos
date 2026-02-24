import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllSuppliersWithInactive } from '@/lib/data'
import { SupplierSettings } from '@/components/supplier-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')

  if (!isAdmin) {
    redirect('/workflows')
  }

  const suppliers = await getAllSuppliersWithInactive()

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage suppliers and upload sample documents to improve AI extraction accuracy
        </p>
      </div>

      <SupplierSettings initialSuppliers={suppliers} />
    </div>
  )
}
