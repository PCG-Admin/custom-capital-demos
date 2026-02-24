'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

interface LandlordConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    business_address?: string
    equipment_items?: Array<{
      quantity?: string
      description?: string
      serial?: string
    }>
  }
}

interface EquipmentRow {
  quantity: string
  description: string
  serialNumbers: string
}

export function LandlordConsentDialog({ open, onOpenChange, applicationId, applicationData }: LandlordConsentDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Landlord Consent Fields
  const [rentalAgreementFor, setRentalAgreementFor] = useState(applicationData?.businessName || '')
  const [of, setOf] = useState(applicationData?.business_address || '')
  const [equipmentKeptFree, setEquipmentKeptFree] = useState('')

  // Equipment rows (max 6)
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(() => {
    if (applicationData?.equipment_items && applicationData.equipment_items.length > 0) {
      return applicationData.equipment_items.slice(0, 6).map(item => ({
        quantity: item.quantity || '1',
        description: item.description || '',
        serialNumbers: item.serial || 'TBA'
      }))
    }
    return [
      {
        quantity: '1',
        description: '',
        serialNumbers: 'TBA'
      }
    ]
  })

  // Signature date fields
  const [signatureDay, setSignatureDay] = useState('')
  const [signatureMonth, setSignatureMonth] = useState('')
  const [signatureYear, setSignatureYear] = useState('')

  // Signatory fields
  const [nameOfSignatory, setNameOfSignatory] = useState(applicationData?.applicantName || '')
  const [nameOfWitness, setNameOfWitness] = useState('')

  const handleAddEquipmentRow = () => {
    if (equipmentRows.length < 6) {
      setEquipmentRows([
        ...equipmentRows,
        {
          quantity: '1',
          description: '',
          serialNumbers: 'TBA'
        }
      ])
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

      const landlordConsentData = {
        rentalAgreementFor,
        of,
        equipmentKeptFree,
        equipmentRows,
        signatureDay,
        signatureMonth,
        signatureYear,
        nameOfSignatory,
        nameOfWitness,
      }

      const response = await fetch('/api/generate-landlord-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          landlordConsentData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate landlord consent')
      }

      toast({
        title: 'Landlord Consent Generated',
        description: 'Landlord consent form has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Landlord Consent Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate landlord consent.',
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
            <h2 className="text-lg font-semibold">Landlord Consent Form Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the landlord consent form. All fields are editable.</p>
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
          {/* Section 1: Agreement Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Agreement Information
            </h3>
            <div className="space-y-2">
              <Label>Rental Agreement For *</Label>
              <Input
                value={rentalAgreementFor}
                onChange={(e) => setRentalAgreementFor(e.target.value)}
                placeholder="Business name"
              />
            </div>
            <div className="space-y-2">
              <Label>Of (Address) *</Label>
              <Textarea
                value={of}
                onChange={(e) => setOf(e.target.value)}
                rows={2}
                placeholder="Business address"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipment Will Be Kept Free Of</Label>
              <Input
                value={equipmentKeptFree}
                onChange={(e) => setEquipmentKeptFree(e.target.value)}
                placeholder="Any liens, encumbrances, etc."
              />
            </div>
          </div>

          {/* Section 2: Equipment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2 flex-1">
                Equipment Schedule (Max 6 Items)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEquipmentRow}
                disabled={equipmentRows.length >= 6}
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            {equipmentRows.map((row, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Item {index + 1}</Label>
                  {equipmentRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEquipmentRow(index)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      value={row.quantity}
                      onChange={(e) => handleEquipmentRowChange(index, 'quantity', e.target.value)}
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => handleEquipmentRowChange(index, 'description', e.target.value)}
                      placeholder="Equipment description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Numbers</Label>
                    <Input
                      value={row.serialNumbers}
                      onChange={(e) => handleEquipmentRowChange(index, 'serialNumbers', e.target.value)}
                      placeholder="TBA"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 3: Signature Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signature Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Signature Day</Label>
                <Input
                  value={signatureDay}
                  onChange={(e) => setSignatureDay(e.target.value)}
                  placeholder="e.g., 24"
                />
              </div>
              <div className="space-y-2">
                <Label>Signature Month</Label>
                <Input
                  value={signatureMonth}
                  onChange={(e) => setSignatureMonth(e.target.value)}
                  placeholder="e.g., January"
                />
              </div>
              <div className="space-y-2">
                <Label>Signature Year</Label>
                <Input
                  value={signatureYear}
                  onChange={(e) => setSignatureYear(e.target.value)}
                  placeholder="e.g., 2026"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name of Signatory *</Label>
                <Input
                  value={nameOfSignatory}
                  onChange={(e) => setNameOfSignatory(e.target.value)}
                  placeholder="Full name of person signing"
                />
              </div>
              <div className="space-y-2">
                <Label>Name of Witness</Label>
                <Input
                  value={nameOfWitness}
                  onChange={(e) => setNameOfWitness(e.target.value)}
                  placeholder="Full name of witness"
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
