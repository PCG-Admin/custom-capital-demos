'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface GuaranteeDialogProps {
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
    registration_number?: string
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

export function GuaranteeDialog({ open, onOpenChange, applicationId, applicationData }: GuaranteeDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Company Details
  const [theDebtsOf, setTheDebtsOf] = useState(applicationData?.businessName || '')
  const [legalEntity, setLegalEntity] = useState(applicationData?.businessName || '')
  const [regNo, setRegNo] = useState(applicationData?.registration_number || applicationData?.regNumber || '')

  // Guarantor 1 - All 9 fields
  const [guarantor1IWe, setGuarantor1IWe] = useState('')
  const [guarantor1IdRegNo, setGuarantor1IdRegNo] = useState('')
  const [guarantor1SignedAt, setGuarantor1SignedAt] = useState('')
  const [guarantor1OnDay, setGuarantor1OnDay] = useState('')
  const [guarantor1OnMonth, setGuarantor1OnMonth] = useState('')
  const [guarantor1OnYear, setGuarantor1OnYear] = useState('')
  const [guarantor1IdentityNumber, setGuarantor1IdentityNumber] = useState('')
  const [guarantor1StreetAddress, setGuarantor1StreetAddress] = useState('')
  const [guarantor1PostalAddress1, setGuarantor1PostalAddress1] = useState('')
  const [guarantor1PostalAddress2, setGuarantor1PostalAddress2] = useState('')
  const [guarantor1WitnessFullName, setGuarantor1WitnessFullName] = useState('')

  // Guarantor 2 - All 9 fields (optional)
  const [guarantor2IWe, setGuarantor2IWe] = useState('')
  const [guarantor2IdRegNo, setGuarantor2IdRegNo] = useState('')
  const [guarantor2SignedAt, setGuarantor2SignedAt] = useState('')
  const [guarantor2OnDay, setGuarantor2OnDay] = useState('')
  const [guarantor2OnMonth, setGuarantor2OnMonth] = useState('')
  const [guarantor2OnYear, setGuarantor2OnYear] = useState('')
  const [guarantor2IdentityNumber, setGuarantor2IdentityNumber] = useState('')
  const [guarantor2StreetAddress, setGuarantor2StreetAddress] = useState('')
  const [guarantor2PostalAddress1, setGuarantor2PostalAddress1] = useState('')
  const [guarantor2PostalAddress2, setGuarantor2PostalAddress2] = useState('')
  const [guarantor2WitnessFullName, setGuarantor2WitnessFullName] = useState('')

  const combineDateParts = (day: string, month: string, year: string) =>
    [day.trim(), month.trim(), year.trim()].filter(Boolean).join(' ')

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const guaranteeData = {
        theDebtsOf,
        legalEntity,
        regNo,
        guarantor1: {
          iWe: guarantor1IWe,
          idRegNo: guarantor1IdRegNo,
          signedAt: guarantor1SignedAt,
          on: combineDateParts(guarantor1OnDay, guarantor1OnMonth, guarantor1OnYear),
          identityNumber: guarantor1IdentityNumber,
          streetAddress: guarantor1StreetAddress,
          postalAddress1: guarantor1PostalAddress1,
          postalAddress2: guarantor1PostalAddress2,
          witnessFullName: guarantor1WitnessFullName,
        },
        guarantor2: {
          iWe: guarantor2IWe,
          idRegNo: guarantor2IdRegNo,
          signedAt: guarantor2SignedAt,
          on: combineDateParts(guarantor2OnDay, guarantor2OnMonth, guarantor2OnYear),
          identityNumber: guarantor2IdentityNumber,
          streetAddress: guarantor2StreetAddress,
          postalAddress1: guarantor2PostalAddress1,
          postalAddress2: guarantor2PostalAddress2,
          witnessFullName: guarantor2WitnessFullName,
        },
      }

      const response = await fetch('/api/generate-guarantee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          guaranteeData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate guarantee')
      }

      toast({
        title: 'Guarantee Generated',
        description: 'Personal Guarantee has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Guarantee Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate guarantee.',
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
            <h2 className="text-lg font-semibold">Personal Guarantee Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the personal guarantee. All fields are editable.</p>
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
          {/* Section 1: Company Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Company Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>The Debts Of *</Label>
                <Input value={theDebtsOf} onChange={(e) => setTheDebtsOf(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Legal Entity *</Label>
                <Input value={legalEntity} onChange={(e) => setLegalEntity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input value={regNo} onChange={(e) => setRegNo(e.target.value)} />
            </div>
          </div>

          {/* Section 2: Guarantor 1 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Guarantor 1 Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>I/We *</Label>
                <Input
                  value={guarantor1IWe}
                  onChange={(e) => setGuarantor1IWe(e.target.value)}
                  placeholder="Full name of guarantor"
                />
              </div>
              <div className="space-y-2">
                <Label>ID/Reg No *</Label>
                <Input
                  value={guarantor1IdRegNo}
                  onChange={(e) => setGuarantor1IdRegNo(e.target.value)}
                  placeholder="ID or registration number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Signed At *</Label>
                <Input
                  value={guarantor1SignedAt}
                  onChange={(e) => setGuarantor1SignedAt(e.target.value)}
                  placeholder="City/Location"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>On (Date) *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={guarantor1OnDay}
                    onChange={(e) => setGuarantor1OnDay(e.target.value)}
                    placeholder="Day"
                  />
                  <Input
                    value={guarantor1OnMonth}
                    onChange={(e) => setGuarantor1OnMonth(e.target.value)}
                    placeholder="Month"
                  />
                  <Input
                    value={guarantor1OnYear}
                    onChange={(e) => setGuarantor1OnYear(e.target.value)}
                    placeholder="Year"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Identity Number *</Label>
              <Input
                value={guarantor1IdentityNumber}
                onChange={(e) => setGuarantor1IdentityNumber(e.target.value)}
                placeholder="ID Number"
              />
            </div>
            <div className="space-y-2">
              <Label>Street Address *</Label>
              <Textarea
                value={guarantor1StreetAddress}
                onChange={(e) => setGuarantor1StreetAddress(e.target.value)}
                rows={2}
                placeholder="Physical street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Address Line 1 *</Label>
                <Input
                  value={guarantor1PostalAddress1}
                  onChange={(e) => setGuarantor1PostalAddress1(e.target.value)}
                  placeholder="Postal address"
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Address Line 2</Label>
                <Input
                  value={guarantor1PostalAddress2}
                  onChange={(e) => setGuarantor1PostalAddress2(e.target.value)}
                  placeholder="City, Postal Code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Witness Full Name *</Label>
              <Input
                value={guarantor1WitnessFullName}
                onChange={(e) => setGuarantor1WitnessFullName(e.target.value)}
                placeholder="Name of witness"
              />
            </div>
          </div>

          {/* Section 3: Guarantor 2 (Optional) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Guarantor 2 Details (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>I/We</Label>
                <Input
                  value={guarantor2IWe}
                  onChange={(e) => setGuarantor2IWe(e.target.value)}
                  placeholder="Full name of guarantor"
                />
              </div>
              <div className="space-y-2">
                <Label>ID/Reg No</Label>
                <Input
                  value={guarantor2IdRegNo}
                  onChange={(e) => setGuarantor2IdRegNo(e.target.value)}
                  placeholder="ID or registration number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Signed At</Label>
                <Input
                  value={guarantor2SignedAt}
                  onChange={(e) => setGuarantor2SignedAt(e.target.value)}
                  placeholder="City/Location"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>On (Date)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={guarantor2OnDay}
                    onChange={(e) => setGuarantor2OnDay(e.target.value)}
                    placeholder="Day"
                  />
                  <Input
                    value={guarantor2OnMonth}
                    onChange={(e) => setGuarantor2OnMonth(e.target.value)}
                    placeholder="Month"
                  />
                  <Input
                    value={guarantor2OnYear}
                    onChange={(e) => setGuarantor2OnYear(e.target.value)}
                    placeholder="Year"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Identity Number</Label>
              <Input
                value={guarantor2IdentityNumber}
                onChange={(e) => setGuarantor2IdentityNumber(e.target.value)}
                placeholder="ID Number"
              />
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Textarea
                value={guarantor2StreetAddress}
                onChange={(e) => setGuarantor2StreetAddress(e.target.value)}
                rows={2}
                placeholder="Physical street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Address Line 1</Label>
                <Input
                  value={guarantor2PostalAddress1}
                  onChange={(e) => setGuarantor2PostalAddress1(e.target.value)}
                  placeholder="Postal address"
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Address Line 2</Label>
                <Input
                  value={guarantor2PostalAddress2}
                  onChange={(e) => setGuarantor2PostalAddress2(e.target.value)}
                  placeholder="City, Postal Code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Witness Full Name</Label>
              <Input
                value={guarantor2WitnessFullName}
                onChange={(e) => setGuarantor2WitnessFullName(e.target.value)}
                placeholder="Name of witness"
              />
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
