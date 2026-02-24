'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface InstallVerificationDialogProps {
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

export function InstallVerificationDialog({ open, onOpenChange, applicationId, applicationData }: InstallVerificationDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Extract city from business address (first part before comma)
  const getLocationFromAddress = (address?: string) => {
    if (!address) return ''
    const parts = address.split(',')
    return parts[0].trim()
  }

  // Rental agreement details
  const [rentalAgreementFor, setRentalAgreementFor] = useState(applicationData?.businessName || '')
  const [of, setOf] = useState(applicationData?.businessAddress || '')

  // Signatory details
  const [bySigningThisDocument, setBySigningThisDocument] = useState(applicationData?.applicantName || '')
  const [idNo, setIdNo] = useState('')
  const [inMyCapacityAs, setInMyCapacityAs] = useState('Authorised Representative')

  // Agreement date
  const [agreementSignedByClientOn, setAgreementSignedByClientOn] = useState('')

  // Signature location and date
  const [thusDoneAndSignedAt, setThusDoneAndSignedAt] = useState(getLocationFromAddress(applicationData?.businessAddress))
  const [onThis, setOnThis] = useState('')
  const [dayOf, setDayOf] = useState('')
  const [year, setYear] = useState('')

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const installVerificationData = {
        rentalAgreementFor,
        of,
        bySigningThisDocument,
        idNo,
        inMyCapacityAs,
        agreementSignedByClientOn,
        thusDoneAndSignedAt,
        onThis,
        dayOf,
        year,
      }

      const response = await fetch('/api/generate-install-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          installVerificationData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate install verification')
      }

      toast({
        title: 'Install Verification Generated',
        description: 'Installation Verification document has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Install Verification Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate install verification.',
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
            <h2 className="text-lg font-semibold">Installation Verification Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the installation verification. All fields are editable.</p>
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
          {/* Section 1: Rental Agreement Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Rental Agreement Details
            </h3>
            <div className="space-y-2">
              <Label>In terms of rental agreement for *</Label>
              <Input
                value={rentalAgreementFor}
                onChange={(e) => setRentalAgreementFor(e.target.value)}
                placeholder="Business name"
              />
            </div>
            <div className="space-y-2">
              <Label>Of (Business Address) *</Label>
              <Textarea
                value={of}
                onChange={(e) => setOf(e.target.value)}
                rows={2}
                placeholder="Full business address"
              />
            </div>
          </div>

          {/* Section 2: Signatory Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signatory Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>By signing this document I *</Label>
                <Input
                  value={bySigningThisDocument}
                  onChange={(e) => setBySigningThisDocument(e.target.value)}
                  placeholder="Full name of signatory"
                />
              </div>
              <div className="space-y-2">
                <Label>ID/Passport Number *</Label>
                <Input
                  value={idNo}
                  onChange={(e) => setIdNo(e.target.value)}
                  placeholder="ID or passport number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>In my capacity as *</Label>
              <Input
                value={inMyCapacityAs}
                onChange={(e) => setInMyCapacityAs(e.target.value)}
                placeholder="e.g., Authorised Representative, Director"
              />
            </div>
          </div>

          {/* Section 3: Agreement Date */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Agreement Date
            </h3>
            <div className="space-y-2">
              <Label>Agreement signed by the client on *</Label>
              <Input
                value={agreementSignedByClientOn}
                onChange={(e) => setAgreementSignedByClientOn(e.target.value)}
                placeholder="Day Month Year"
              />
            </div>
          </div>

          {/* Section 4: Signature Location and Date */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signature Location and Date
            </h3>
            <div className="space-y-2">
              <Label>Thus done and signed at *</Label>
              <Input
                value={thusDoneAndSignedAt}
                onChange={(e) => setThusDoneAndSignedAt(e.target.value)}
                placeholder="City/Location"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>On this (Day number) *</Label>
                <Input
                  value={onThis}
                  onChange={(e) => setOnThis(e.target.value)}
                  placeholder="e.g., 24"
                />
              </div>
              <div className="space-y-2">
                <Label>Day of (Month) *</Label>
                <Input
                  value={dayOf}
                  onChange={(e) => setDayOf(e.target.value)}
                  placeholder="e.g., January"
                />
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2026"
                />
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
