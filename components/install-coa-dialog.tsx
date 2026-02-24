'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface InstallCOADialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    applicantEmail?: string | null
    applicantPhone?: string | null
    businessAddress?: string
    regNumber?: string
    vatNumber?: string
    contactPerson?: string
    rentalAmount?: string
    escalation?: string
    rentalTerm?: string
    equipmentDescription?: string
    bankName?: string
    bankBranch?: string
    bankBranchCode?: string
    accountNumber?: string
    accountHolder?: string
    accountType?: string
  }
}

export function InstallCOADialog({ open, onOpenChange, applicationId, applicationData }: InstallCOADialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Rental Agreement Date (free-form parts so partial date is preserved)
  const [rentalAgreementDay, setRentalAgreementDay] = useState('')
  const [rentalAgreementMonth, setRentalAgreementMonth] = useState('')
  const [rentalAgreementYear, setRentalAgreementYear] = useState('')

  // Equipment Items - Quantity
  const [qty1, setQty1] = useState('1')
  const [qty2, setQty2] = useState('')
  const [qty3, setQty3] = useState('')

  // Equipment Items - Description
  const [description1, setDescription1] = useState(applicationData?.equipmentDescription || '')
  const [description2, setDescription2] = useState('')
  const [description3, setDescription3] = useState('')
  const [description4, setDescription4] = useState('')

  // Equipment Items - Serial Numbers
  const [serialNumbers1, setSerialNumbers1] = useState('TBA')
  const [serialNumbers2, setSerialNumbers2] = useState('TBA')
  const [serialNumbers3, setSerialNumbers3] = useState('TBA')
  const [serialNumbers4, setSerialNumbers4] = useState('TBA')

  // Signature Details
  const [signatureDay, setSignatureDay] = useState('')
  const [signatureMonth, setSignatureMonth] = useState('')
  const [signatureYear, setSignatureYear] = useState('')

  // Signatory and Witness
  const [nameOfSignatory, setNameOfSignatory] = useState(applicationData?.applicantName || '')
  const [nameOfWitness, setNameOfWitness] = useState('')
  const [text7, setText7] = useState('')

  const combineDateParts = (day: string, month: string, year: string) =>
    [day.trim(), month.trim(), year.trim()].filter(Boolean).join(' ')

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const installCOAData = {
        rentalAgreementDate: combineDateParts(rentalAgreementDay, rentalAgreementMonth, rentalAgreementYear),
        qty1,
        qty2,
        qty3,
        description1,
        description2,
        description3,
        description4,
        serialNumbers1,
        serialNumbers2,
        serialNumbers3,
        serialNumbers4,
        signatureDay,
        signatureMonth,
        signatureYear,
        nameOfSignatory,
        nameOfWitness,
        text7,
      }

      const response = await fetch('/api/generate-install-coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          installCOAData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Installation COA')
      }

      toast({
        title: 'Installation COA Generated',
        description: 'Installation Certificate of Acceptance has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[InstallCOA Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate Installation COA.',
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
        {/* Header with sticky positioning */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Installation Certificate of Acceptance (COA) Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the Installation COA. All fields are editable.</p>
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
          {/* Section 1: Rental Agreement Date */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Rental Agreement Date
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Day</Label>
                <Input value={rentalAgreementDay} onChange={(e) => setRentalAgreementDay(e.target.value)} placeholder="17" />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input value={rentalAgreementMonth} onChange={(e) => setRentalAgreementMonth(e.target.value)} placeholder="August" />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={rentalAgreementYear} onChange={(e) => setRentalAgreementYear(e.target.value)} placeholder="2025" />
              </div>
            </div>
          </div>

          {/* Section 2: Equipment Items */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Equipment Schedule (Editable)
            </h3>

            {/* Equipment Item 1 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity 1</Label>
                <Input value={qty1} onChange={(e) => setQty1(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Description 1 *</Label>
                <Input value={description1} onChange={(e) => setDescription1(e.target.value)} placeholder="Equipment description" />
              </div>
              <div className="space-y-2">
                <Label>Serial Numbers 1 (Editable)</Label>
                <Input value={serialNumbers1} onChange={(e) => setSerialNumbers1(e.target.value)} placeholder="TBA" />
              </div>
            </div>

            {/* Equipment Item 2 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity 2</Label>
                <Input value={qty2} onChange={(e) => setQty2(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Description 2</Label>
                <Input value={description2} onChange={(e) => setDescription2(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Serial Numbers 2 (Editable)</Label>
                <Input value={serialNumbers2} onChange={(e) => setSerialNumbers2(e.target.value)} placeholder="TBA" />
              </div>
            </div>

            {/* Equipment Item 3 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity 3</Label>
                <Input value={qty3} onChange={(e) => setQty3(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Description 3</Label>
                <Input value={description3} onChange={(e) => setDescription3(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Serial Numbers 3 (Editable)</Label>
                <Input value={serialNumbers3} onChange={(e) => setSerialNumbers3(e.target.value)} placeholder="TBA" />
              </div>
            </div>

            {/* Description 4 (no quantity or serial) */}
            <div className="space-y-2">
              <Label>Description 4</Label>
              <Input value={description4} onChange={(e) => setDescription4(e.target.value)} placeholder="Optional additional description" />
            </div>

            {/* Serial Numbers 4 */}
            <div className="space-y-2">
              <Label>Serial Numbers 4 (Editable)</Label>
              <Input value={serialNumbers4} onChange={(e) => setSerialNumbers4(e.target.value)} placeholder="TBA" />
            </div>
          </div>

          {/* Section 3: Signature Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signature Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Day *</Label>
                <Input value={signatureDay} onChange={(e) => setSignatureDay(e.target.value)} placeholder="e.g., 24" />
              </div>
              <div className="space-y-2">
                <Label>Month *</Label>
                <Input value={signatureMonth} onChange={(e) => setSignatureMonth(e.target.value)} placeholder="e.g., January" />
              </div>
              <div className="space-y-2">
                <Label>Year (Last 2 digits) *</Label>
                <Input value={signatureYear} onChange={(e) => setSignatureYear(e.target.value)} placeholder="e.g., 26" />
              </div>
            </div>
          </div>

          {/* Section 4: Signatory and Witness */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signatory and Witness Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name of Signatory *</Label>
                <Input value={nameOfSignatory} onChange={(e) => setNameOfSignatory(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Name of Witness</Label>
                <Input value={nameOfWitness} onChange={(e) => setNameOfWitness(e.target.value)} placeholder="Full name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text7 (Additional Field)</Label>
              <Input value={text7} onChange={(e) => setText7(e.target.value)} placeholder="Optional" />
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
