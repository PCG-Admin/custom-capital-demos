'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  stepNumber: number
  mode?: 'create' | 'update' // NEW: Determines if creating new or updating existing
  existingApprovalData?: any // NEW: Pre-filled data for update mode
  isApprovalAction?: boolean // NEW: If true, this update is also approving the step
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    regNumber?: string
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

export function ApprovalDialog({ open, onOpenChange, applicationId, stepNumber, mode = 'create', existingApprovalData, isApprovalAction = false, applicationData }: ApprovalDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const isUpdateMode = mode === 'update'

  // Form fields - prioritize existingApprovalData for update mode, fallback to applicationData
  const [date, setDate] = useState(existingApprovalData?.date || '')
  const [clientName, setClientName] = useState(existingApprovalData?.clientName || applicationData?.businessName || '')
  const [attention, setAttention] = useState(existingApprovalData?.attention || applicationData?.applicantName || '')
  const [regNumber, setRegNumber] = useState(existingApprovalData?.regNumber || applicationData?.regNumber || '')
  const [supplier, setSupplier] = useState(existingApprovalData?.supplier || applicationData?.supplier || '')
  const [supplierEmail, setSupplierEmail] = useState(existingApprovalData?.supplierEmail || applicationData?.supplierEmail || '')
  const [equipmentSchedule, setEquipmentSchedule] = useState(existingApprovalData?.equipmentSchedule || applicationData?.equipmentSchedule || '')
  const [payoutExclVat, setPayoutExclVat] = useState(existingApprovalData?.payoutExclVat || applicationData?.payoutExclVat || '')
  const [settlement, setSettlement] = useState(existingApprovalData?.settlement || applicationData?.settlement || '')
  const [escalation, setEscalation] = useState(existingApprovalData?.escalation || applicationData?.escalation || '')
  const [rentalExclVat, setRentalExclVat] = useState(existingApprovalData?.rentalExclVat || applicationData?.rentalExclVat || '')
  const [factor, setFactor] = useState(existingApprovalData?.factor || '')
  const [period, setPeriod] = useState(() => {
    if (existingApprovalData?.period) {
      return existingApprovalData.period.replace(/\s*months?\s*$/i, '').trim()
    }
    const term = applicationData?.term || ''
    return term.replace(/\s*months?\s*$/i, '').trim()
  })
  const [rentalInclInsExclVat, setRentalInclInsExclVat] = useState(existingApprovalData?.rentalInclInsExclVat || '')
  const [docFee, setDocFee] = useState(existingApprovalData?.docFee || '')
  const [additionalConditions, setAdditionalConditions] = useState(existingApprovalData?.additionalConditions || '')

  // Checkboxes for requirements
  const [correctAuthorisingResolution, setCorrectAuthorisingResolution] = useState(existingApprovalData?.correctAuthorisingResolution || false)
  const [debitOrder, setDebitOrder] = useState(existingApprovalData?.debitOrder || false)
  const [ficadIdSignatories, setFicadIdSignatories] = useState(existingApprovalData?.ficadIdSignatories || false)
  const [suretyMembers, setSuretyMembers] = useState(existingApprovalData?.suretyMembers || false)
  const [cancelledCheque, setCancelledCheque] = useState(existingApprovalData?.cancelledCheque || false)
  const [copyLetterhead, setCopyLetterhead] = useState(existingApprovalData?.copyLetterhead || false)
  const [contractInstallation, setContractInstallation] = useState(existingApprovalData?.contractInstallation || false)
  const [insuranceLandlord, setInsuranceLandlord] = useState(existingApprovalData?.insuranceLandlord || false)
  const [firstRentalPaid, setFirstRentalPaid] = useState(existingApprovalData?.firstRentalPaid || false)

  // Update all form fields when existingApprovalData changes (for update mode)
  useEffect(() => {
    if (existingApprovalData && isUpdateMode) {
      // Update text fields
      setDate(existingApprovalData.date || '')
      setClientName(existingApprovalData.clientName || '')
      setAttention(existingApprovalData.attention || '')
      setRegNumber(existingApprovalData.regNumber || '')
      setSupplier(existingApprovalData.supplier || '')
      setSupplierEmail(existingApprovalData.supplierEmail || '')
      setEquipmentSchedule(existingApprovalData.equipmentSchedule || '')
      setPayoutExclVat(existingApprovalData.payoutExclVat || '')
      setSettlement(existingApprovalData.settlement || '')
      setEscalation(existingApprovalData.escalation || '')
      setRentalExclVat(existingApprovalData.rentalExclVat || '')
      setFactor(existingApprovalData.factor || '')
      setPeriod(existingApprovalData.period ? existingApprovalData.period.replace(/\s*months?\s*$/i, '').trim() : '')
      setRentalInclInsExclVat(existingApprovalData.rentalInclInsExclVat || '')
      setDocFee(existingApprovalData.docFee || '')
      setAdditionalConditions(existingApprovalData.additionalConditions || '')

      // Update checkboxes
      setCorrectAuthorisingResolution(existingApprovalData.correctAuthorisingResolution || false)
      setDebitOrder(existingApprovalData.debitOrder || false)
      setFicadIdSignatories(existingApprovalData.ficadIdSignatories || false)
      setSuretyMembers(existingApprovalData.suretyMembers || false)
      setCancelledCheque(existingApprovalData.cancelledCheque || false)
      setCopyLetterhead(existingApprovalData.copyLetterhead || false)
      setContractInstallation(existingApprovalData.contractInstallation || false)
      setInsuranceLandlord(existingApprovalData.insuranceLandlord || false)
      setFirstRentalPaid(existingApprovalData.firstRentalPaid || false)
    }
  }, [existingApprovalData, isUpdateMode])

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)

      console.log('[ApprovalDialog] Generating approval letter', {
        stepNumber,
        mode,
        isApprovalAction,
        isUpdateMode
      })

      // Format period and escalation for submission
      const formattedPeriod = period ? `${period} months` : ''
      const formattedEscalation = escalation && !escalation.includes('%') ? `${escalation}%` : escalation

      const approvalData = {
        date,
        clientName,
        attention,
        address: '', // Not used in PDF template but required by type
        amount: '', // Not used in PDF template but required by type
        term: formattedPeriod, // Use formatted period as term
        rate: '', // Not used in PDF template but required by type
        installment: '', // Not used in PDF template but required by type
        supplier,
        supplierEmail,
        regNumber,
        equipmentSchedule,
        payoutExclVat,
        settlement,
        escalation: formattedEscalation,
        rentalExclVat,
        factor,
        period: formattedPeriod,
        rentalInclInsExclVat,
        docFee,
        additionalConditions,
        // Checkboxes
        correctAuthorisingResolution,
        debitOrder,
        ficadIdSignatories,
        suretyMembers,
        cancelledCheque,
        copyLetterhead,
        contractInstallation,
        insuranceLandlord,
        firstRentalPaid
      }

      console.log('[ApprovalDialog] Sending request:', {
        stepNumber,
        status: (isUpdateMode && !isApprovalAction) ? undefined : 'completed',
        decision: (isUpdateMode && !isApprovalAction) ? undefined : 'approved',
        hasApprovalData: !!approvalData,
        updateApprovalLetter: isUpdateMode
      })

      const response = await fetch('/api/update-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          type: 'application',
          stepNumber,
          status: (isUpdateMode && !isApprovalAction) ? undefined : 'completed', // Approve if it's an approval action
          decision: (isUpdateMode && !isApprovalAction) ? undefined : 'approved', // Approve if it's an approval action
          approvalData,
          updateApprovalLetter: isUpdateMode // NEW: Flag to indicate update mode
        }),
      })

      console.log('[ApprovalDialog] Response status:', response.status)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve application')
      }

      toast({
        title: isApprovalAction ? 'Application Approved' : (isUpdateMode ? 'Approval Letter Updated' : 'Application Approved'),
        description: isApprovalAction
          ? 'Step 5 approved and approval letter updated successfully.'
          : (isUpdateMode
            ? 'Approval letter has been updated successfully.'
            : 'Approval letter has been generated successfully.'),
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Approval Dialog] Error:', error)
      toast({
        title: 'Approval failed',
        description: error.message || 'Could not process approval.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-70" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative z-50 bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isUpdateMode ? 'Update Approval Letter' : 'Approval Letter Details'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isUpdateMode
                ? 'Update the Additional Conditions field. All other fields are read-only.'
                : 'Fill in all fields to generate the approval letter.'}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={isGenerating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Day Month Year" disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attention">Attention</Label>
              <Input id="attention" value={attention} onChange={(e) => setAttention(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regNumber">Reg number / ID no</Label>
              <Input id="regNumber" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierEmail">Supplier Email</Label>
              <Input id="supplierEmail" type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipmentSchedule">Equipment Schedule (Description)</Label>
            <Textarea
              id="equipmentSchedule"
              value={equipmentSchedule}
              onChange={(e) => setEquipmentSchedule(e.target.value)}
              rows={4}
              placeholder="Describe equipment..."
              disabled={isUpdateMode}
            />
          </div>

          {/* Financials Row 1 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payoutExclVat">Payout excl. Vat</Label>
              <Input id="payoutExclVat" value={payoutExclVat} onChange={(e) => setPayoutExclVat(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement">Settlement</Label>
              <Input id="settlement" value={settlement} onChange={(e) => setSettlement(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="escalation">Escalation</Label>
              <Input id="escalation" value={escalation} onChange={(e) => setEscalation(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          {/* Financials Row 2 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentalExclVat">Rental excl. Vat</Label>
              <Input id="rentalExclVat" value={rentalExclVat} onChange={(e) => setRentalExclVat(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factor">Factor</Label>
              <Input id="factor" value={factor} onChange={(e) => setFactor(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input id="period" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          {/* Financials Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentalInclInsExclVat">Rental Incl Insurance & Excl Vat</Label>
              <Input id="rentalInclInsExclVat" value={rentalInclInsExclVat} onChange={(e) => setRentalInclInsExclVat(e.target.value)} disabled={isUpdateMode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docFee">Doc fee</Label>
              <Input id="docFee" value={docFee} onChange={(e) => setDocFee(e.target.value)} disabled={isUpdateMode} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalConditions" className="text-base font-medium">Additional Conditions</Label>
            <Textarea
              id="additionalConditions"
              value={additionalConditions}
              onChange={(e) => setAdditionalConditions(e.target.value)}
              rows={5}
              className="text-base leading-relaxed resize-none"
              placeholder="Enter any additional conditions or comments..."
            />
          </div>

          {/* Approved within terms section */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Approved within the terms and conditions of the agreement with the supplier and:</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="correctAuthorisingResolution"
                    checked={correctAuthorisingResolution}
                    onCheckedChange={(checked) => setCorrectAuthorisingResolution(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="correctAuthorisingResolution" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Correct authorising resolution
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="debitOrder"
                    checked={debitOrder}
                    onCheckedChange={(checked) => setDebitOrder(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="debitOrder" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Debit Order
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ficadIdSignatories"
                    checked={ficadIdSignatories}
                    onCheckedChange={(checked) => setFicadIdSignatories(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="ficadIdSignatories" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Ficad ID of Signatories
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suretyMembers"
                    checked={suretyMembers}
                    onCheckedChange={(checked) => setSuretyMembers(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="suretyMembers" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Surety of all members or directors
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cancelledCheque"
                    checked={cancelledCheque}
                    onCheckedChange={(checked) => setCancelledCheque(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="cancelledCheque" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Copy of cancelled cheque or confirmation from the bank
                  </label>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copyLetterhead"
                    checked={copyLetterhead}
                    onCheckedChange={(checked) => setCopyLetterhead(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="copyLetterhead" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Copy letterhead
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contractInstallation"
                    checked={contractInstallation}
                    onCheckedChange={(checked) => setContractInstallation(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="contractInstallation" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Contract and installation confirmation
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insuranceLandlord"
                    checked={insuranceLandlord}
                    onCheckedChange={(checked) => setInsuranceLandlord(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="insuranceLandlord" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    Insurance/landlord details
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="firstRentalPaid"
                    checked={firstRentalPaid}
                    onCheckedChange={(checked) => setFirstRentalPaid(checked === true)}
                    disabled={isUpdateMode}
                  />
                  <label htmlFor="firstRentalPaid" className={`text-sm ${isUpdateMode ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                    First rental to be paid
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isApprovalAction ? (
              'Confirm & Approve Step 5'
            ) : isUpdateMode ? (
              'Update Approval Letter'
            ) : (
              'Confirm & Approve'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
