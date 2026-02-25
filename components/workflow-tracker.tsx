'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Circle, Clock, XCircle, Eye, Pencil, CircleHelp, Undo2, FileText } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types/user'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApprovalDialog } from '@/components/approval-dialog'

interface WorkflowStep {
  number: number
  title: string
  status: string
  notes?: string
  completedAt?: string
  completedBy?: string
  decision?: string
}

interface CreditInfo {
  score?: number | null
  details?: {
    bureau?: string | null
    reference?: string | null
    rating?: string | null
  } | null
  notes?: string | null
  checkedAt?: string | null
  checkedBy?: string | null
}

interface WorkflowTrackerProps {
  steps: WorkflowStep[]
  applicationId: string
  type: 'application'
  currentStep: number
  currentUser: SessionUser
  workflowStatus?: string
  creditInfo?: CreditInfo
  supportingDocuments?: {
    id: string
    document_type?: string | null
  }[]
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    applicantEmail?: string | null
    regNumber?: string
    vatNumber?: string
    equipmentSchedule?: string
    payoutExclVat?: string
    settlement?: string
    escalation?: string
    rentalExclVat?: string
    term?: string
    supplier?: string
    supplierEmail?: string
  }
}

export function WorkflowTracker({ steps, applicationId, type, currentStep, currentUser, workflowStatus, creditInfo, supportingDocuments = [], applicationData }: WorkflowTrackerProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(currentStep)
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    steps.reduce((acc, step) => {
      if (step.notes) acc[step.number] = step.notes
      return acc
    }, {} as Record<number, string>)
  )
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [isSavingCredit, setIsSavingCredit] = useState(false)
  const [creditScore, setCreditScore] = useState<string | number | ''>(creditInfo?.score ?? '')
  const [creditBureau, setCreditBureau] = useState<string>(creditInfo?.details?.bureau || '')
  const [creditReference, setCreditReference] = useState<string>(creditInfo?.details?.reference || '')
  const [creditRating, setCreditRating] = useState<string>(creditInfo?.details?.rating || '')
  const [creditNotes, setCreditNotes] = useState<string>(creditInfo?.notes || '')

  // State for approval letter update at Step 5
  const [approvalLetterUpdateDialogOpen, setApprovalLetterUpdateDialogOpen] = useState(false)
  const [existingApprovalData, setExistingApprovalData] = useState<any>(null)
  const [isApprovalAction, setIsApprovalAction] = useState(false) // Track if this is an approval action

  const { toast } = useToast()

  const formatStableDateTime = (value?: string) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toISOString().replace('T', ' ').slice(0, 16)
  }

  const normalizeStatus = (status?: string) => (status || '').toLowerCase().replace(/_/g, '-')

  const isStepUnlocked = (stepNumber: number) =>
    stepNumber === 1 || steps.slice(0, stepNumber - 1).every((step) => step.status === 'completed')

  const canActOnStep = (step: WorkflowStep) => {
    if (workflowStatus === 'declined' || workflowStatus === 'approved') return false
    if (!currentUser) return false

    // Admin / All Access
    if (currentUser.responsible_workflow === 'all' ||
      currentUser.role.toLowerCase().includes('admin') ||
      currentUser.role.toLowerCase().includes('all access')) {
      return true
    }

    // Role-based access overrides
    if (currentUser.role.toLowerCase().includes('credit applications') ||
      currentUser.role.toLowerCase().includes('credit application') ||
      currentUser.role.toLowerCase().includes('credit') ||
      currentUser.role === 'Application Intake Specialist') {
      return true
    }

    if (currentUser.responsible_workflow !== 'rental_credit_application' && currentUser.responsible_workflow !== 'all') {
      return false
    }

    if (currentUser.responsible_step.toLowerCase() === 'all workflow steps') return true

    return currentUser.responsible_step.toLowerCase() === step.title.toLowerCase()
  }

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [declineStepNumber, setDeclineStepNumber] = useState<number | null>(null)
  const [declineActionType, setDeclineActionType] = useState<'fail' | 'decline'>('decline')

  // Decline form state
  const [declineDate, setDeclineDate] = useState('')
  const [declineClientName, setDeclineClientName] = useState('')
  const [declineAttention, setDeclineAttention] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [declineSupplier, setDeclineSupplier] = useState('')
  const [declineSupplierEmail, setDeclineSupplierEmail] = useState('')

  const openDeclineDialog = (stepNumber: number, type: 'fail' | 'decline') => {
    // Pre-fill data
    setDeclineStepNumber(stepNumber)
    setDeclineActionType(type)
    setDeclineDate('')
    setDeclineClientName(applicationData?.businessName || '')
    setDeclineAttention(applicationData?.applicantName || '')
    setDeclineReason(reasons[stepNumber] ? reasons[stepNumber] : (notes[stepNumber] || ''))
    setDeclineSupplier('')
    setDeclineSupplierEmail('')

    setDeclineDialogOpen(true)
  }

  // Approval form state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalStepNumber, setApprovalStepNumber] = useState<number | null>(null)
  const [step3ApprovalData, setStep3ApprovalData] = useState<any>(null)

  // Deferred form state
  const [deferredDialogOpen, setDeferredDialogOpen] = useState(false)
  const [deferredStepNumber, setDeferredStepNumber] = useState<number | null>(null)

  const [deferredDate, setDeferredDate] = useState('')
  const [deferredSupplierEmail, setDeferredSupplierEmail] = useState('')
  const [deferredSupplier, setDeferredSupplier] = useState('')
  const [deferredAttention, setDeferredAttention] = useState('')
  const [deferredClientName, setDeferredClientName] = useState('')
  const [deferredAdditionalRequirements, setDeferredAdditionalRequirements] = useState('')

  const openApprovalDialog = async (stepNumber: number) => {
    setApprovalStepNumber(stepNumber)

    // Fetch existing approval data if it exists
    try {
      const response = await fetch(`/api/get-approval-data?applicationId=${applicationId}`)
      const data = await response.json()

      if (response.ok && data.approvalData) {
        console.log('[Step 3] Found existing approval data, using it to pre-fill form')
        setStep3ApprovalData(data.approvalData)
      } else {
        console.log('[Step 3] No existing approval data, using extracted data')
        setStep3ApprovalData(null)
      }
    } catch (error) {
      console.error('[Step 3] Error fetching approval data:', error)
      setStep3ApprovalData(null)
    }

    setApprovalDialogOpen(true)
  }

  const openDeferredDialog = (stepNumber: number) => {
    setDeferredStepNumber(stepNumber)
    setDeferredDate('')
    setDeferredClientName(applicationData?.businessName || '')
    setDeferredAttention(applicationData?.applicantName || '')

    // Clear others
    setDeferredSupplier('')
    setDeferredSupplierEmail('')
    setDeferredAdditionalRequirements('')

    setDeferredDialogOpen(true)
  }

  const handleConfirmDeferred = async () => {
    if (!deferredStepNumber) return

    const deferredData = {
      date: deferredDate,
      supplierEmail: deferredSupplierEmail,
      supplier: deferredSupplier,
      attention: deferredAttention,
      clientName: deferredClientName,
      additionalRequirements: deferredAdditionalRequirements
    }

    // Update workflow with 'deferred' status and pass data
    await handleUpdateStep(deferredStepNumber, 'completed', 'deferred', deferredData) // Or status 'deferred' based on logic?
    // Note: The backend logic for line 120 of route.ts sets status='deferred' if decision='deferred'.
    // We pass status='completed' here to indicate the *step* logic is done, but the decision is what matters.
    // Actually, let's stick to the pattern. If user clicks "Defer", usually we might want to just set decision=deferred.
    // But let's follow approval pattern: complete the step with decision=deferred.

    setDeferredDialogOpen(false)
  }

  const handleConfirmDecline = async () => {
    if (!declineStepNumber) return

    const declineData = {
      date: declineDate,
      clientName: declineClientName,
      attention: declineAttention,
      reason: declineReason,
      supplier: declineSupplier,
      supplierEmail: declineSupplierEmail
    }

    if (declineActionType === 'decline') {
      // Step 5 specific: Status completed, decision declined
      await handleUpdateStep(declineStepNumber, 'completed', 'declined', declineData)
    } else {
      // Intermediate steps or generic failure: Status failed
      await handleUpdateStep(declineStepNumber, 'failed', undefined, declineData)
    }

    setDeclineDialogOpen(false)
  }

  // Update signature of handleUpdateStep to accept optional info
  const handleUpdateStep = async (stepNumber: number, newStatus: string, stepDecision?: string, extraData?: any) => {
    const targetStep = steps.find((step) => step.number === stepNumber)
    if (!targetStep || !canActOnStep(targetStep)) {
      toast({
        title: 'Not permitted',
        description: 'You are not assigned to update this step.',
        variant: 'destructive',
        duration: 3000
      })
      return
    }

    if (newStatus === 'completed' && !isStepUnlocked(stepNumber)) {
      toast({
        title: 'Step locked',
        description: `Complete steps 1 through ${stepNumber - 1} before moving to step ${stepNumber}.`,
        variant: 'destructive',
      })
      return
    }

    const noteInput = (notes[stepNumber] ?? '').trim()
    const requiresNote = newStatus === 'failed' || newStatus === 'info_requested' || stepDecision === 'declined'

    // If coming from dialog (extraData exists), we skip manual note check if reason is in extraData
    if (requiresNote && !noteInput && !extraData?.reason) {
      toast({
        title: 'Note required',
        description: newStatus === 'info_requested'
          ? 'Please add a message before requesting more info.'
          : 'Please add notes before submitting a rejection.',
        variant: 'destructive',
      })
      return
    }

    // Append reason to notes if exists
    let finalNotes = noteInput || targetStep.notes || ''
    if (reasons[stepNumber]) {
      finalNotes = `${finalNotes}\n[Reason: ${reasons[stepNumber]}]`.trim()
    }

    // Use reason from dialog if available
    if (extraData?.reason) {
      finalNotes = extraData.reason
    }

    try {
      const response = await fetch('/api/update-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          type,
          stepNumber,
          status: newStatus,
          notes: finalNotes,
          decision: stepDecision,
          requestInfo: newStatus === 'info_requested',
          declineData: stepDecision === 'declined' || newStatus === 'failed' ? extraData : undefined,
          approvalData: stepDecision === 'approved' ? extraData : undefined,
          deferredData: stepDecision === 'deferred' ? extraData : undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Update failed')
      }

      toast({
        title: 'Step updated',
        description: 'Workflow step has been updated successfully',
      })

      window.location.reload()
    } catch (error: any) {
      console.error('[v0] Update error:', error)
      toast({
        title: 'Update failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, stepNumber: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('applicationId', applicationId)
    formData.append('stepNumber', stepNumber.toString())

    try {
      const response = await fetch('/api/upload-supporting-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      })

      // Refresh to show updated notes/docs
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveCreditInfo = async () => {
    setIsSavingCredit(true)
    try {
      const response = await fetch('/api/save-credit-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          creditScore: creditScore === '' ? null : Number(creditScore),
          creditBureau,
          creditReference,
          creditRating,
          creditNotes,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save credit info')
      }

      toast({
        title: 'Credit info saved',
        description: 'Credit details recorded for Step 2.',
      })
      window.location.reload()
    } catch (error: any) {
      console.error('[credit-info] Save error:', error)
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save credit info.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCredit(false)
    }
  }

  const handleOpenApprovalLetterUpdate = async (forApproval: boolean = false) => {
    try {
      // Fetch existing approval letter data from the application
      const response = await fetch(`/api/get-approval-data?applicationId=${applicationId}`)
      const data = await response.json()

      if (response.ok && data.approvalData) {
        setExistingApprovalData(data.approvalData)
        setIsApprovalAction(forApproval)
        setApprovalLetterUpdateDialogOpen(true)
      } else {
        toast({
          title: 'No approval letter found',
          description: 'Please create an approval letter at Step 3 first.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('[approval-letter-update] Fetch error:', error)
      toast({
        title: 'Failed to load approval data',
        description: error.message || 'Could not load existing approval letter.',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'info-requested':
        return <CircleHelp className="h-5 w-5 text-amber-500" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'in-progress':
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>
      case 'failed':
        return <Badge variant="destructive">Rejected</Badge>
      case 'info-requested':
        return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">Info Requested</Badge>
      default:
        return <Badge variant="secondary" className="capitalize">{normalized || 'pending'}</Badge>
    }
  }

  return (
    <>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const userCanAct = canActOnStep(step)
              return (
                <div
                  key={step.number}
                  className={cn(
                    'border rounded-lg p-4 transition-colors',
                    expandedStep === step.number ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(step.status)}
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">
                          Step {step.number}: {step.title}
                        </h3>
                        {step.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            <p>Completed: {formatStableDateTime(step.completedAt)}</p>
                            {step.completedBy && <p>By: {step.completedBy}</p>}
                          </div>
                        )}
                        {step.notes && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{step.notes}</p>
                        )}
                        {step.decision && (
                          <Badge
                            className={cn(
                              "mt-2 font-semibold",
                              (() => {
                                const d = step.decision.toLowerCase()
                                if (d === 'approved' || d === 'approve') return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                                if (d === 'declined' || d === 'decline' || d === 'fail') return "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                                if (d === 'deferred' || d === 'defer') return "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"
                                return "bg-gray-100 text-gray-800 border-gray-200"
                              })()
                            )}
                            variant="outline"
                          >
                            {step.decision.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(step.status)}
                  </div>

                  {expandedStep === step.number && (step.status !== 'completed' || (step.number === 5 && (step.decision === 'approved' || workflowStatus === 'approved'))) && (
                    <div className="mt-4 space-y-4 pl-8 relative">

                      {/* Step 2: Credit Check Upload */}
                      {step.number === 2 && (
                        <div className="space-y-3 border p-3 rounded-md bg-background">
                          <div className="space-y-2">
                            <Label>Credit Check (optional)</Label>
                            <p className="text-xs text-muted-foreground">
                              Upload a credit report and capture score/notes.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-[180px]"
                              disabled={!userCanAct}
                              onClick={() => {
                                setCreditScore(creditInfo?.score ?? '')
                                setCreditBureau(creditInfo?.details?.bureau || '')
                                setCreditReference(creditInfo?.details?.reference || '')
                                setCreditRating(creditInfo?.details?.rating || '')
                                setCreditNotes(creditInfo?.notes || '')
                                setCreditDialogOpen(true)
                              }}
                            >
                              Add credit info
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full sm:w-[180px]"
                              onClick={(e) => {
                                const input = document.getElementById(`credit-report-input-${step.number}`) as HTMLInputElement | null
                                input?.click()
                              }}
                              disabled={!userCanAct || isUploading}
                            >
                              Upload credit report
                            </Button>
                          </div>

                          <input
                            id={`credit-report-input-${step.number}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, step.number)}
                            disabled={!userCanAct || isUploading}
                          />
                          {isUploading && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock className="h-4 w-4 animate-spin" />
                              Uploading...
                            </div>
                          )}
                        </div>
                      )}

                      <Textarea
                        placeholder={step.number === 3 ? "Enter approval details and decision notes..." : "Add notes (required for Reject/Request Info actions)..."}
                        value={notes[step.number] || ''}
                        onChange={(e) => setNotes({ ...notes, [step.number]: e.target.value })}
                        rows={3}
                        readOnly={!userCanAct}
                        disabled={!userCanAct}
                        className="relative z-0"
                      />

                      {/* Step 5: Defer/Decline Reasons (plain select to avoid overlay glitches) */}
                      {step.number === 5 && (
                        <div className="space-y-2">
                          <Label>Decision Reason (Required for Defer/Decline)</Label>
                          <select
                            value={reasons[step.number] || ''}
                            onChange={(e) => setReasons({ ...reasons, [step.number]: e.target.value })}
                            disabled={!userCanAct}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="" disabled>Select a reason...</option>
                            <option value="Latest 3 months bank statements">Latest 3 months bank statements</option>
                            <option value="Latest 6 months bank statements">Latest 6 months bank statements</option>
                            <option value="Latest AFS and if older than 12 months the latest Man Accs">Latest AFS and if older than 12 months the latest Man Accs</option>
                            <option value="Latest Debtors Age Analysis">Latest Debtors Age Analysis</option>
                            <option value="Latest Man Accs">Latest Man Accs</option>
                            <option value="Proof of Active Registration with CIPC">Proof of Active Registration with CIPC</option>
                            <option value="Succession plan">Succession plan</option>
                          </select>
                        </div>
                      )}

                      {!userCanAct ? (
                        <p className="text-sm text-muted-foreground">
                          Only operators assigned to "{step.title}" can update this stage.
                        </p>
                      ) : !isStepUnlocked(step.number) ? (
                        <p className="text-sm text-muted-foreground">
                          Complete steps 1 through {step.number - 1} to unlock this step.
                        </p>
                      ) : (
                        <>
                          {step.number === 5 && (
                            <>
                              {/* Action Buttons */}
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-3">
                                  <Button
                                    onClick={() => handleOpenApprovalLetterUpdate(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                                    onClick={() => {
                                      if (!reasons[step.number]) {
                                        toast({
                                          title: "Reason required",
                                          description: "Please select a reason for declining.",
                                          variant: "destructive"
                                        })
                                        return
                                      }
                                      openDeclineDialog(step.number, 'decline')
                                    }}
                                  >
                                    Decline
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  <Button
                                    variant="outline"
                                    className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium shadow-sm"
                                    onClick={() => {
                                      if (!reasons[step.number]) {
                                        toast({
                                          title: "Reason required",
                                          description: "Please select a reason for deferring.",
                                          variant: "destructive"
                                        })
                                        return
                                      }
                                      openDeferredDialog(step.number)
                                    }}
                                  >
                                    Defer
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="border-amber-600 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-medium shadow-sm"
                                    onClick={() => handleUpdateStep(step.number, 'info_requested')}
                                  >
                                    <Undo2 className="h-4 w-4 mr-1" />
                                    Request Info
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}

                          {step.number === 3 && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => openApprovalDialog(step.number)}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                Complete & Generate Approval Letter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-600 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-medium shadow-sm"
                                onClick={() => handleUpdateStep(step.number, 'info_requested')}
                              >
                                <Undo2 className="h-4 w-4 mr-1" />
                                Request Info
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium shadow-sm"
                                onClick={() => {
                                  openDeclineDialog(step.number, 'fail')
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}

                          {step.number !== 5 && step.number !== 3 && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-100 hover:text-green-700 font-medium shadow-sm"
                                onClick={() => handleUpdateStep(step.number, 'completed')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-600 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-medium shadow-sm"
                                onClick={() => handleUpdateStep(step.number, 'info_requested')}
                              >
                                <Undo2 className="h-4 w-4 mr-1" />
                                Request Info
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium shadow-sm"
                                onClick={() => {
                                  // Use the dialog for rejecting as well
                                  openDeclineDialog(step.number, 'fail')
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {index < steps.length - 1 && (
                    <div className="ml-2 mt-2 mb-2 border-l-2 border-border h-4" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        {/* Updated DialogContent with explicit light theme styles using !important to override dark mode defaults */}
        <DialogContent className="max-w-lg !bg-white !text-gray-900 shadow-2xl !border !border-gray-200 max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="!text-gray-900">Add credit info (Step 2)</DialogTitle>
              <DialogDescription className="!text-gray-500">Optional: record the credit score and supporting details.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="credit-score" className="!text-gray-900">Credit score (optional)</Label>
              <Input
                id="credit-score"
                type="number"
                placeholder="e.g., 720"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value === '' ? '' : Number(e.target.value))}
                className="!bg-white !text-gray-900 !border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="credit-bureau" className="!text-gray-900">Credit bureau</Label>
              <Input
                id="credit-bureau"
                placeholder="Experian / TransUnion / Equifax"
                value={creditBureau}
                onChange={(e) => setCreditBureau(e.target.value)}
                className="!bg-white !text-gray-900 !border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="credit-reference" className="!text-gray-900">Reference</Label>
              <Input
                id="credit-reference"
                placeholder="Report reference number"
                value={creditReference}
                onChange={(e) => setCreditReference(e.target.value)}
                className="!bg-white !text-gray-900 !border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="credit-rating" className="!text-gray-900">Rating</Label>
              <Input
                id="credit-rating"
                placeholder="A / B / Fair / High risk"
                value={creditRating}
                onChange={(e) => setCreditRating(e.target.value)}
                className="!bg-white !text-gray-900 !border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="credit-notes" className="!text-gray-900">Notes (optional)</Label>
              <Textarea
                id="credit-notes"
                placeholder="Add any context about the credit pull..."
                value={creditNotes}
                onChange={(e) => setCreditNotes(e.target.value)}
                rows={3}
                className="!bg-white !text-gray-900 !border-gray-300"
              />
            </div>
          </div>

          <div className="p-6 pt-2 border-t mt-auto !bg-gray-50">
            <DialogFooter className="gap-2 sm:justify-end w-full">
              <Button
                variant="outline"
                onClick={() => setCreditDialogOpen(false)}
                disabled={isSavingCredit}
                className="!border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-100"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCreditInfo} disabled={isSavingCredit} className="!bg-green-600 hover:!bg-green-700 text-white">
                {isSavingCredit ? 'Saving...' : 'Save credit info'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        {/* Updated DialogContent with explicit light theme styles using !important to override dark mode defaults */}
        <DialogContent
          className="max-w-xl !bg-white !text-gray-900 shadow-2xl !border !border-gray-200 max-h-[90vh] flex flex-col p-0 gap-0"
        >
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="!text-gray-900">Decline Letter Details</DialogTitle>
              <DialogDescription className="!text-gray-500">
                Review and edit the details for the decline letter before generating it.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="!text-gray-900">Date</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" value={declineDate} onChange={e => setDeclineDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="!text-gray-900">Client Name</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" placeholder="Business Name" value={declineClientName} onChange={e => setDeclineClientName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="!text-gray-900">Attention</Label>
              <Input className="!bg-white !text-gray-900 !border-gray-300" placeholder="Contact Person" value={declineAttention} onChange={e => setDeclineAttention(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="!text-gray-900">Reason for Decline</Label>
              <Textarea className="!bg-white !text-gray-900 !border-gray-300" value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="!text-gray-900">Supplier (Optional)</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" placeholder="Supplier Name" value={declineSupplier} onChange={e => setDeclineSupplier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="!text-gray-900">Supplier Email (Optional)</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" placeholder="email@supplier.com" value={declineSupplierEmail} onChange={e => setDeclineSupplierEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 border-t mt-auto !bg-gray-50">
            <DialogFooter className="gap-2 sm:justify-end w-full">
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)} className="!border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-100">Cancel</Button>
              <Button className="!bg-red-600 hover:!bg-red-700 text-white" onClick={handleConfirmDecline}>Confirm Decline</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog (for Step 3) */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        applicationId={applicationId}
        stepNumber={approvalStepNumber || 5}
        existingApprovalData={step3ApprovalData}
        applicationData={applicationData}
      />

      {/* Approval Letter Update Dialog (for Step 5) */}
      <ApprovalDialog
        open={approvalLetterUpdateDialogOpen}
        onOpenChange={setApprovalLetterUpdateDialogOpen}
        applicationId={applicationId}
        stepNumber={5}
        mode="update"
        existingApprovalData={existingApprovalData}
        isApprovalAction={isApprovalAction}
        applicationData={applicationData}
      />

      {/* Deferred Dialog */}
      <Dialog open={deferredDialogOpen} onOpenChange={setDeferredDialogOpen}>
        <DialogContent
          className="max-w-2xl !bg-white !text-gray-900 shadow-2xl !border !border-gray-200 max-h-[90vh] flex flex-col p-0 gap-0"
        >
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="!text-gray-900">Deferred Letter Details</DialogTitle>
              <DialogDescription className="!text-gray-500">
                Fill in the details for the deferred letter.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="!text-gray-900">Date</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" value={deferredDate} onChange={e => setDeferredDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="!text-gray-900">Client Name</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" value={deferredClientName} onChange={e => setDeferredClientName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="!text-gray-900">Attention</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" value={deferredAttention} onChange={e => setDeferredAttention(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="!text-gray-900">Supplier</Label>
                <Input className="!bg-white !text-gray-900 !border-gray-300" value={deferredSupplier} onChange={e => setDeferredSupplier(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="!text-gray-900">Supplier Email</Label>
              <Input className="!bg-white !text-gray-900 !border-gray-300" value={deferredSupplierEmail} onChange={e => setDeferredSupplierEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="!text-gray-900">Additional Requirements</Label>
              <Textarea
                className="!bg-white !text-gray-900 !border-gray-300"
                value={deferredAdditionalRequirements}
                onChange={e => setDeferredAdditionalRequirements(e.target.value)}
                rows={5}
                placeholder="List additional requirements..."
              />
            </div>
          </div>

          <div className="p-6 pt-2 border-t mt-auto !bg-gray-50">
            <DialogFooter className="gap-2 sm:justify-end w-full">
              <Button variant="outline" onClick={() => setDeferredDialogOpen(false)} className="!border-gray-300 !text-gray-700 !bg-white hover:!bg-gray-100">Cancel</Button>
              <Button className="bg-[#84754e] hover:bg-[#6d6141] text-white" onClick={handleConfirmDeferred}>Confirm & Defer</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
