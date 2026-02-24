'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface FirstRentalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    businessAddress?: string
    bankName?: string
    bankBranch?: string
    bankBranchCode?: string
    accountNumber?: string
  }
}

export function FirstRentalDialog({ open, onOpenChange, applicationId, applicationData }: FirstRentalDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Company Information
  const [companyName, setCompanyName] = useState(applicationData?.businessName || '')
  const [address, setAddress] = useState(applicationData?.businessAddress || '')

  // Deduction Options
  const [deductionOption1, setDeductionOption1] = useState('')
  const [deductionOption2, setDeductionOption2] = useState('')

  // Banking Details
  const [bankName, setBankName] = useState(applicationData?.bankName || '')
  const [branchName, setBranchName] = useState(applicationData?.bankBranch || '')
  const [branchCode, setBranchCode] = useState(applicationData?.bankBranchCode || '')
  const [accountNumber, setAccountNumber] = useState(applicationData?.accountNumber || '')

  // Financial Details
  const [firstRentalAmount, setFirstRentalAmount] = useState('')
  const [documentFee, setDocumentFee] = useState('')
  const [totalAmount, setTotalAmount] = useState(() => {
    const rental = parseFloat('0') || 0
    const fee = parseFloat('0') || 0
    return (rental + fee).toFixed(2)
  })

  // Signatory Details
  const [signedBy, setSignedBy] = useState(applicationData?.applicantName || '')
  const [capacity, setCapacity] = useState('Authorised Representative')
  const [ofTheCompany, setOfTheCompany] = useState(applicationData?.businessName || '')

  // Witness & Date
  const [witnessName, setWitnessName] = useState('Bronwyn Barnard')
  const [signedAt, setSignedAt] = useState(applicationData?.businessAddress || '')
  const [dayNumberField, setDayNumberField] = useState('')
  const [monthField, setMonthField] = useState('')
  const [yearField, setYearField] = useState('')

  // Auto-calculate total when amounts change
  const handleAmountChange = (rentalValue: string, feeValue: string) => {
    const rental = parseFloat(rentalValue) || 0
    const fee = parseFloat(feeValue) || 0
    const total = rental + fee
    setTotalAmount(total.toFixed(2))
  }

  const handleFirstRentalChange = (value: string) => {
    setFirstRentalAmount(value)
    handleAmountChange(value, documentFee)
  }

  const handleDocumentFeeChange = (value: string) => {
    setDocumentFee(value)
    handleAmountChange(firstRentalAmount, value)
  }

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const firstRentalData = {
        companyName,
        address,
        deductionOption1,
        deductionOption2,
        bankName,
        branchName,
        branchCode,
        accountNumber,
        firstRentalAmount,
        documentFee,
        totalAmount,
        signedBy,
        capacity,
        ofTheCompany,
        witnessName,
        signedAt,
        dayNumber: dayNumberField,
        month: monthField,
        year: yearField,
      }

      const response = await fetch('/api/generate-first-rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          firstRentalData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate first rental document')
      }

      toast({
        title: 'First Rental Generated',
        description: 'First Rental document has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[First Rental Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate First Rental document.',
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
      <div className="relative z-50 bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header with sticky positioning */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">First Rental Document Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the first rental document. All fields are editable.</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={isGenerating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body with all form fields */}
        <div className="p-6 space-y-6">
          {/* Section 1: Company Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Company Information
            </h3>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Section 2: Deduction Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Deduction Options
            </h3>
            <div className="space-y-2">
              <Label>Deduction Option 1</Label>
              <Input
                value={deductionOption1}
                onChange={(e) => setDeductionOption1(e.target.value)}
                placeholder="Please deduct the first rental by special debit order on the commencement date of the rental agreement 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Deduction Option 2</Label>
              <Input
                value={deductionOption2}
                onChange={(e) => setDeductionOption2(e.target.value)}
                placeholder="Please deduct the first rental by special debit order on the commencement date of the rental agreement 2"
              />
            </div>
          </div>

          {/* Section 3: Banking Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Banking Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Standard Bank" />
              </div>
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g., Sandton" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch Code *</Label>
                <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="e.g., 051001" />
              </div>
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g., 1234567890" />
              </div>
            </div>
          </div>

          {/* Section 4: Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Financial Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>1st Rental in Advance (Incl VAT) *</Label>
                <Input
                  type="number"
                  value={firstRentalAmount}
                  onChange={(e) => handleFirstRentalChange(e.target.value)}
                  placeholder="e.g., 5750.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Once Off Document Fee (Incl VAT) *</Label>
                <Input
                  type="number"
                  value={documentFee}
                  onChange={(e) => handleDocumentFeeChange(e.target.value)}
                  placeholder="e.g., 1150.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount to be Deducted (Incl VAT)</Label>
                <Input value={totalAmount} readOnly className="bg-muted" />
              </div>
            </div>
          </div>

          {/* Section 5: Signatory Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signatory Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Signed By *</Label>
                <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>In His/Her Capacity As *</Label>
                <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Of the Company *</Label>
                <Input value={ofTheCompany} onChange={(e) => setOfTheCompany(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 6: Witness & Date Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Witness & Date Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Witness Name</Label>
                <Input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Signed At (Location) *</Label>
                <Input value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Day Number *</Label>
                <Input value={dayNumberField} onChange={(e) => setDayNumberField(e.target.value)} placeholder="e.g., 24" />
              </div>
              <div className="space-y-2">
                <Label>Month *</Label>
                <Input value={monthField} onChange={(e) => setMonthField(e.target.value)} placeholder="e.g., January" />
              </div>
              <div className="space-y-2">
                <Label>Year (Last 2 Digits) *</Label>
                <Input value={yearField} onChange={(e) => setYearField(e.target.value)} placeholder="e.g., 26" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with sticky positioning */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleConfirm}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm & Generate'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
