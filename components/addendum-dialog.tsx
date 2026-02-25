'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

interface AddendumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    regNumber?: string
    businessAddress?: string
    equipment_items?: Array<{
      quantity?: string
      description?: string
      serial?: string
    }>
  }
}

type EquipmentRow = {
  quantity: string
  description: string
  serialNumbers: string
}

export function AddendumDialog({ open, onOpenChange, applicationId, applicationData }: AddendumDialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Main form fields
  const [and, setAnd] = useState(applicationData?.businessName || '')
  const [registrationNumber, setRegistrationNumber] = useState(applicationData?.regNumber || '')
  const [of, setOf] = useState(applicationData?.businessAddress || '')

  // Equipment rows - initialize from applicationData if available, otherwise default to one empty row
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(() => {
    if (applicationData?.equipment_items && applicationData.equipment_items.length > 0) {
      return applicationData.equipment_items.slice(0, 10).map(item => ({
        quantity: item.quantity || '1',
        description: item.description || '',
        serialNumbers: item.serial || 'To be provided',
      }))
    }
    return [{
      quantity: '1',
      description: '',
      serialNumbers: 'To be provided',
    }]
  })

  // Signatory fields (Renter)
  const [signedAt, setSignedAt] = useState(applicationData?.businessAddress || '')
  const [on, setOn] = useState('')
  const [nameOfSignatory, setNameOfSignatory] = useState(applicationData?.applicantName || '')
  const [idNumber, setIdNumber] = useState('')
  const [witnessNameForNameField, setWitnessNameForNameField] = useState(applicationData?.applicantName || '')

  // Witness fields (CCF)
  const [signedAt2, setSignedAt2] = useState(applicationData?.businessAddress || '')
  const [signedAt3, setSignedAt3] = useState(applicationData?.businessAddress || '')
  const [on2, setOn2] = useState('')
  const [fullNames, setFullNames] = useState('Bronwyn Barnard')
  const [capacity, setCapacity] = useState('Authorised Representative')
  const [witness, setWitness] = useState('')

  // Equipment row handlers
  const addEquipmentRow = () => {
    if (equipmentRows.length < 10) {
      setEquipmentRows([...equipmentRows, {
        quantity: '1',
        description: '',
        serialNumbers: 'To be provided',
      }])
    }
  }

  const removeEquipmentRow = (index: number) => {
    if (equipmentRows.length > 1) {
      setEquipmentRows(equipmentRows.filter((_, i) => i !== index))
    }
  }

  const updateEquipmentRow = (index: number, field: keyof EquipmentRow, value: string) => {
    const newRows = [...equipmentRows]
    newRows[index][field] = value
    setEquipmentRows(newRows)
  }

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      const addendumData = {
        and,
        registrationNumber,
        of,
        equipmentRows,
        signedAt,
        on,
        nameOfSignatory,
        idNumber,
        name: witnessNameForNameField,
        signedAt2,
        signedAt3,
        on2,
        fullNames,
        capacity,
        witness,
      }

      const response = await fetch('/api/generate-addendum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          addendumData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate addendum')
      }

      toast({
        title: 'Addendum Generated',
        description: 'Equipment addendum has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[Addendum Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate addendum.',
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
            <h2 className="text-lg font-semibold">Equipment Addendum Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the equipment addendum. All fields are editable.</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name (And) *</Label>
                <Input value={and} onChange={(e) => setAnd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Registration Number *</Label>
                <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Address (Of) *</Label>
              <Textarea value={of} onChange={(e) => setOf(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Section 2: Equipment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Equipment Schedule (Up to 10 Items)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEquipmentRow}
                disabled={equipmentRows.length >= 10}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {equipmentRows.map((row, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-md">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      value={row.quantity}
                      onChange={(e) => updateEquipmentRow(index, 'quantity', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-5 space-y-2">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateEquipmentRow(index, 'description', e.target.value)}
                      placeholder="Equipment description"
                    />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label className="text-xs">Serial Numbers</Label>
                    <Input
                      value={row.serialNumbers}
                      onChange={(e) => updateEquipmentRow(index, 'serialNumbers', e.target.value)}
                      placeholder="To be provided"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEquipmentRow(index)}
                      disabled={equipmentRows.length === 1}
                      className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {equipmentRows.length >= 10 && (
              <p className="text-sm text-amber-600">Maximum of 10 equipment items reached</p>
            )}
          </div>

          {/* Section 3: Renter Signatory */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Renter Signatory (Editable)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Signed At (Location) *</Label>
                <Input value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>On (Date) *</Label>
                <Input value={on} onChange={(e) => setOn(e.target.value)} placeholder="DD day of MONTH YYYY" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name of Signatory *</Label>
                <Input value={nameOfSignatory} onChange={(e) => setNameOfSignatory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID/Passport" />
              </div>
              <div className="space-y-2">
                <Label>Witness Name *</Label>
                <Input value={witnessNameForNameField} onChange={(e) => setWitnessNameForNameField(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 4: PCG Signatory / Witness */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              PCG Signatory
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Signed At (Location)</Label>
                <Input value={signedAt2} onChange={(e) => setSignedAt2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Signed At (Location 2)</Label>
                <Input value={signedAt3} onChange={(e) => setSignedAt3(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>On (Date)</Label>
                <Input value={on2} onChange={(e) => setOn2(e.target.value)} placeholder="DD day of MONTH YYYY" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Full Names (Default: Bronwyn Barnard)</Label>
                <Input value={fullNames} onChange={(e) => setFullNames(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Witness (Optional)</Label>
                <Input value={witness} onChange={(e) => setWitness(e.target.value)} placeholder="Witness name" />
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
