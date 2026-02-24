'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

interface InsuranceDialogProps {
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

type EquipmentRow = {
  description: string
  installationAddress: string
}

export function InsuranceDialog({ open, onOpenChange, applicationId, applicationData }: InsuranceDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Helper function to calculate initials from applicant name
  const calculateInitials = (name: string | null | undefined): string => {
    if (!name) return ''
    const parts = name.trim().split(/\s+/)
    return parts.map(p => p[0]?.toUpperCase() || '').join('')
  }

  // Insurance Data fields
  const [rentalContractDay, setRentalContractDay] = useState('')
  const [rentalContractMonth, setRentalContractMonth] = useState('')
  const [rentalContractYear, setRentalContractYear] = useState('')
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
    { description: applicationData?.equipmentDescription || '', installationAddress: applicationData?.businessAddress || '' }
  ])
  const [and, setAnd] = useState('')
  const [initials, setInitials] = useState(calculateInitials(applicationData?.applicantName))

  // CCF Signatory fields
  const [signedOnBehalfOfCCFAt1, setSignedOnBehalfOfCCFAt1] = useState('Johannesburg')
  const [signature, setSignature] = useState('')
  const [nameInFull, setNameInFull] = useState('Bronwyn Barnard')
  const [address, setAddress] = useState('')
  const [dateDay, setDateDay] = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateYear, setDateYear] = useState('')

  // Renter Signatory fields
  const [signedOnBehalfOfRenterAt1, setSignedOnBehalfOfRenterAt1] = useState('')
  const [signature2, setSignature2] = useState('')
  const [nameInFull2, setNameInFull2] = useState(applicationData?.applicantName || '')
  const [address2, setAddress2] = useState(applicationData?.businessAddress || '')
  const [date2Day, setDate2Day] = useState('')
  const [date2Month, setDate2Month] = useState('')
  const [date2Year, setDate2Year] = useState('')

  // Additional fields
  const [text4, setText4] = useState('')
  const [text5, setText5] = useState('')
  const [text6, setText6] = useState('')

  const combineDateParts = (day: string, month: string, year: string) =>
    [day.trim(), month.trim(), year.trim()].filter(Boolean).join(' ')

  // Equipment row handlers
  const handleAddEquipmentRow = () => {
    if (equipmentRows.length < 4) {
      setEquipmentRows([...equipmentRows, { description: '', installationAddress: '' }])
    }
  }

  const handleRemoveEquipmentRow = (index: number) => {
    if (equipmentRows.length > 1) {
      setEquipmentRows(equipmentRows.filter((_, i) => i !== index))
    }
  }

  const handleEquipmentRowChange = (index: number, field: keyof EquipmentRow, value: string) => {
    const newRows = [...equipmentRows]
    newRows[index][field] = value
    setEquipmentRows(newRows)
  }

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const insuranceData = {
        rentalContractDated: combineDateParts(rentalContractDay, rentalContractMonth, rentalContractYear),
        equipmentRows: equipmentRows.slice(0, 4), // max 4 items
        and,
        initials,
        signedOnBehalfOfCCFAt1,
        signedOnBehalfOfCCFAt2: '',
        signature,
        nameInFull,
        address,
        date: combineDateParts(dateDay, dateMonth, dateYear),
        signedOnBehalfOfRenterAt1,
        signedOnBehalfOfRenterAt2: '',
        signature2,
        nameInFull2,
        address2,
        date2: combineDateParts(date2Day, date2Month, date2Year),
        text4,
        text5,
        text6,
      }

      const response = await fetch('/api/generate-insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          insuranceData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate insurance agreement')
      }

      toast({
        title: 'Insurance Agreement Generated',
        description: 'Insurance agreement has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Insurance Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate insurance agreement.',
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
            <h2 className="text-lg font-semibold">Insurance Agreement Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the insurance agreement. All fields are editable.</p>
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
          {/* Section 1: Contract Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Contract Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-3">
                <Label>Rental Contract Dated</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={rentalContractDay} onChange={(e) => setRentalContractDay(e.target.value)} placeholder="Day" />
                  <Input value={rentalContractMonth} onChange={(e) => setRentalContractMonth(e.target.value)} placeholder="Month" />
                  <Input value={rentalContractYear} onChange={(e) => setRentalContractYear(e.target.value)} placeholder="Year" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Equipment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2 flex-1">
                Equipment Schedule (Max 4 Items)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEquipmentRow}
                disabled={equipmentRows.length >= 4}
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>
            <div className="space-y-3">
              {equipmentRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 border rounded-lg bg-gray-50/50">
                  <div className="space-y-2">
                    <Label>Description of Goods and Serial Numbers</Label>
                    <Textarea
                      value={row.description}
                      onChange={(e) => handleEquipmentRowChange(index, 'description', e.target.value)}
                      placeholder="Enter equipment description"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installation Address</Label>
                    <Textarea
                      value={row.installationAddress}
                      onChange={(e) => handleEquipmentRowChange(index, 'installationAddress', e.target.value)}
                      placeholder="Enter installation address"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEquipmentRow(index)}
                      disabled={equipmentRows.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Renter Info and Premium */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Renter Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name of Renter</Label>
                <Input value={and} onChange={(e) => setAnd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Initials</Label>
                <Input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="e.g., JD" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Monthly Rental Premium Excl VAT</Label>
                <Input value={text4} onChange={(e) => setText4(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>VAT</Label>
                <Input value={text5} onChange={(e) => setText5(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <Input value={text6} onChange={(e) => setText6(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 4: CCF Signatory */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              CCF Signatory (Custom Capital Finance)
            </h3>
            <div className="space-y-2">
              <Label>Signed on behalf of CCF at (Location) *</Label>
              <Input value={signedOnBehalfOfCCFAt1} onChange={(e) => setSignedOnBehalfOfCCFAt1(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Signature</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Signature field" />
              </div>
              <div className="space-y-2">
                <Label>Name in Full (Default: Bronwyn Barnard) *</Label>
                <Input value={nameInFull} onChange={(e) => setNameInFull(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={dateDay} onChange={(e) => setDateDay(e.target.value)} placeholder="Day" />
                  <Input value={dateMonth} onChange={(e) => setDateMonth(e.target.value)} placeholder="Month" />
                  <Input value={dateYear} onChange={(e) => setDateYear(e.target.value)} placeholder="Year" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="CCF address" />
            </div>
          </div>

          {/* Section 5: Renter Signatory */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Renter Signatory
            </h3>
            <div className="space-y-2">
              <Label>Signed on behalf of Renter at (Location)</Label>
              <Input value={signedOnBehalfOfRenterAt1} onChange={(e) => setSignedOnBehalfOfRenterAt1(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Signature</Label>
                <Input value={signature2} onChange={(e) => setSignature2(e.target.value)} placeholder="Signature field" />
              </div>
              <div className="space-y-2">
                <Label>Name in Full *</Label>
                <Input value={nameInFull2} onChange={(e) => setNameInFull2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={date2Day} onChange={(e) => setDate2Day(e.target.value)} placeholder="Day" />
                  <Input value={date2Month} onChange={(e) => setDate2Month(e.target.value)} placeholder="Month" />
                  <Input value={date2Year} onChange={(e) => setDate2Year(e.target.value)} placeholder="Year" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={address2} onChange={(e) => setAddress2(e.target.value)} rows={2} placeholder="Renter address" />
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
