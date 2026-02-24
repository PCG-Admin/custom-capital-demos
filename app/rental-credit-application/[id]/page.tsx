import { notFound, redirect } from 'next/navigation'
import { getApplicationById, getSupportingDocumentsByApplication } from '@/lib/data'
import { WorkflowTracker } from '@/components/workflow-tracker'
import { ApplicationDetails } from '@/components/application-details'
import { SupportingDocuments } from '@/components/supporting-documents'
import { ExtractedDataTable } from '@/components/extracted-data-table'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { applicationWorkflowSteps } from '@/lib/workflows'
import { canUserActOnStep, getCurrentUser } from '@/lib/auth'

// Disable caching to ensure fresh data after edits
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ApplicationWorkflowPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const application = await getApplicationById((await params).id)
  const supportingDocuments = application ? await getSupportingDocumentsByApplication(application.id) : []

  if (!application) {
    notFound()
  }

  const workflowSteps = applicationWorkflowSteps.map((step) => ({
    ...step,
    status: application[`step${step.number}_status`],
    notes: application[`step${step.number}_notes`],
    completedAt: application[`step${step.number}_completed_at`],
    completedBy: application[`step${step.number}_completed_by`],
    decision: step.number === 5 ? application.step5_decision : undefined,
  }))
  const normalizedCurrentStep = Math.min(applicationWorkflowSteps.length, application.current_step || 1)

  // Allow editing on Step 1 and Step 2, lock after Step 2 is completed
  const step1Completed = (application.step1_status || '').toLowerCase() === 'completed'
  const hasLockedExtract = normalizedCurrentStep > 2 && step1Completed

  const canEditExtracted = canUserActOnStep(user, 'application', normalizedCurrentStep)
    && !['approved', 'declined'].includes((application.status || '').toLowerCase())
    && !hasLockedExtract
  const creditInfo = {
    score: application.credit_score,
    details: application.credit_details,
    notes: application.credit_notes,
    checkedAt: application.credit_checked_at,
    checkedBy: application.credit_checked_by,
  }

  const generatedAgreement = application.generated_agreement_url
    ? {
      url: application.generated_agreement_url,
      name: application.generated_agreement_name,
      number: application.generated_agreement_number,
      createdAt: application.generated_agreement_created_at,
    }
    : undefined

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Link href="/rental-credit-application">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Link>
      </div>

      <ApplicationDetails
        key={`${application.id}-${application.updated_at || application.created_at}-${application.business_name}`}
        application={application}
      />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-1">
          <ExtractedDataTable
            data={application.extracted_data}
            type="application"
            recordId={application.id}
            canEdit={canEditExtracted}
            workflowStatus={application.status}
            supplierFieldHints={application.supplier?.field_hints || null}
          />
        </div>

        <div className="lg:col-span-1">
          <WorkflowTracker
            steps={workflowSteps}
            applicationId={application.id}
            type="application"
            currentStep={normalizedCurrentStep}
            currentUser={user}
            workflowStatus={application.status}
            creditInfo={creditInfo}
            supportingDocuments={supportingDocuments}
            applicationData={{
              businessName: application.business_name,
              applicantName: application.applicant_name,
              applicantEmail: application.applicant_email,
              regNumber: application.extracted_data?.registration_number,
              vatNumber: application.extracted_data?.vat_number,
              equipmentSchedule: application.extracted_data?.equipment_description || (Array.isArray(application.extracted_data?.equipment_items) ? application.extracted_data?.equipment_items.map((i: any) => `${i.quantity || '1'} x ${i.description || 'Item'}`).join('\n') : ''),
              payoutExclVat: application.extracted_data?.payout_amount,
              settlement: application.extracted_data?.settlement,
              escalation: application.extracted_data?.escalation,
              rentalExclVat: application.extracted_data?.rental_excl_vat || application.extracted_data?.rental_amount,
              term: application.extracted_data?.rental_term || (application.extracted_data?.payment_period ? `${application.extracted_data.payment_period} months` : ''),
              supplier: application.extracted_data?.supplier_name,
              supplierEmail: application.extracted_data?.supplier_email,
            }}
          />
        </div>

        <div className="lg:col-span-1">
          <SupportingDocuments
            applicationId={application.id}
            documentUrl={application.document_url}
            documentName={application.document_name}
            supportingDocuments={supportingDocuments}
            generatedAgreement={generatedAgreement}
            workflowStatus={application.status}
            currentStep={normalizedCurrentStep}
            applicationData={{
              businessName: application.business_name,
              applicantName: application.applicant_name,
              applicantEmail: application.applicant_email,
              applicantPhone: application.applicant_phone,
              businessAddress: application.extracted_data?.business_address,
              regNumber: application.extracted_data?.registration_number,
              vatNumber: application.extracted_data?.vat_number,
              contactPerson: application.extracted_data?.contact_person,
              rentalAmount: application.extracted_data?.rental_excl_vat || application.extracted_data?.rental_amount,
              escalation: application.extracted_data?.escalation,
              rentalTerm: application.extracted_data?.rental_term,
              equipmentDescription: application.extracted_data?.equipment_description || (Array.isArray(application.extracted_data?.equipment_items) ? application.extracted_data?.equipment_items.map((i: any) => `${i.quantity || '1'} x ${i.description || 'Item'}`).join('\n') : ''),
              bankName: application.extracted_data?.bank_name,
              bankBranch: application.extracted_data?.bank_branch,
              bankBranchCode: application.extracted_data?.bank_branch_code,
              accountNumber: application.extracted_data?.account_number,
              accountHolder: application.extracted_data?.account_holder,
              accountType: application.extracted_data?.account_type,
              equipmentItems: application.extracted_data?.equipment_items,
              installationAddress: application.extracted_data?.installation_address,
            }}
          />
        </div>
      </div>
    </div>
  )
}
