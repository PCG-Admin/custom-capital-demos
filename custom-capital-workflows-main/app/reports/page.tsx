export const dynamic = 'force-dynamic'

import { getApplications } from '@/lib/data'
import { ReportsView } from '@/components/reports-view'

export default async function ReportsPage() {
  const applications = await getApplications()

  return <ReportsView applications={applications} />
}
