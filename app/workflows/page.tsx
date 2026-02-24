export const dynamic = 'force-dynamic'

import { getApplications } from '@/lib/data'
import { getCurrentUser, canUserActOnStep } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { applicationWorkflowSteps } from '@/lib/workflows'
import { WorkflowsView } from '@/components/workflows-view'

export default async function WorkflowsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const applications = await getApplications()

  const activeApplications = applications.filter(app => {
    const status = (app.status || '').toLowerCase()
    return status === 'pending' || status === 'deferred' || status === 'info_requested' || status === 'in_progress'
  })
  
  const approvedApplications = applications.filter(app => app.status === 'approved')

  const declinedApplications = applications.filter(app => app.status === 'declined')
  const generatedAgreements = applications.filter(app => Boolean(app.generated_agreement_url))

  type TaskItem = {
    id: string
    type: 'application'
    title: string
    subtitle: string
    stepTitle: string
    status: string
    amount?: number | null
    link: string
    createdAt: string
  }

  const normalizeStepNumber = (value: number | null | undefined, total: number) => {
    if (!value || value < 1) return 1
    if (value > total) return total
    return value
  }

  const applicationTasks = applications
    .map<TaskItem | null>((app) => {
      const totalSteps = applicationWorkflowSteps.length
      const stepNumber = normalizeStepNumber(app.current_step, totalSteps)
      const stepDef = applicationWorkflowSteps.find((step) => step.number === stepNumber)
      if (!stepDef) return null

      const rawStatus = (app[`step${stepNumber}_status`] as string | null) ?? 'pending'
      const normalizedStatus = rawStatus.replace(/_/g, '-')
      if (normalizedStatus === 'completed') return null
      if (!canUserActOnStep(user, 'application', stepNumber)) return null

      return {
        id: app.id,
        type: 'application',
        title: app.document_name ?? 'Application',
        subtitle: app.business_name || app.applicant_name || 'Rental credit application',
        stepTitle: stepDef.title,
        status: normalizedStatus,
        amount: app.rental_amount,
        link: `/rental-credit-application/${app.id}`,
        createdAt: app.created_at,
      }
    })
    .filter((task): task is TaskItem => Boolean(task))

  const myTasks: TaskItem[] = [...applicationTasks]

  return (
    <WorkflowsView 
      activeApplications={activeApplications} 
      approvedApplications={approvedApplications}
      declinedApplications={declinedApplications}
      generatedAgreements={generatedAgreements}
      myTasks={myTasks}
      currentUser={user} 
    />
  )
}
