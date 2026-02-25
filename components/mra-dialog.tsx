'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X } from 'lucide-react'

interface MRADialogProps {
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
    equipmentItems?: Array<{
      quantity?: string
      description?: string
      serial?: string
    }>
    bankName?: string
    bankBranch?: string
    bankBranchCode?: string
    accountNumber?: string
    accountHolder?: string
    accountType?: string
  }
}

export function MRADialog({ open, onOpenChange, applicationId, applicationData }: MRADialogProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Helper to extract city from business address
  const extractCityFromAddress = (address?: string): string => {
    if (!address) return ''
    // Try to extract city - typically after street and before province/postal code
    const parts = address.split(',').map(p => p.trim())
    // Usually city is the second-to-last or third-to-last part
    if (parts.length >= 2) {
      return parts[parts.length - 2] || parts[0]
    }
    return parts[0] || ''
  }

  // Company Information
  const [businessName, setBusinessName] = useState(applicationData?.businessName || '')
  const [businessAddress, setBusinessAddress] = useState(applicationData?.businessAddress || '')
  const [registrationNumber, setRegistrationNumber] = useState(applicationData?.regNumber || '')
  const [vatNumber, setVatNumber] = useState(applicationData?.vatNumber || '')
  const [contactPerson, setContactPerson] = useState(applicationData?.contactPerson || applicationData?.applicantName || '')
  const [email, setEmail] = useState(applicationData?.applicantEmail || '')
  const [phone, setPhone] = useState(applicationData?.applicantPhone || '')
  const [idNumber, setIdNumber] = useState('')

  // Financial Details
  const [rentalAmount, setRentalAmount] = useState(applicationData?.rentalAmount || '')
  const [monthlyVat, setMonthlyVat] = useState(() => {
    const rental = parseFloat(applicationData?.rentalAmount || '0')
    return (rental * 0.15).toFixed(2)
  })
  const [totalMonthly, setTotalMonthly] = useState(() => {
    const rental = parseFloat(applicationData?.rentalAmount || '0')
    return (rental * 1.15).toFixed(2)
  })
  const [annualEscalation, setAnnualEscalation] = useState(() => {
    return applicationData?.escalation || ''
  })
  const [rentalTerm, setRentalTerm] = useState(() => {
    const term = applicationData?.rentalTerm || '36'
    return term.includes('months') ? term : `${term} months`
  })
  const [commencementDate, setCommencementDate] = useState('')

  // Equipment Details - prefer equipment_items if available, otherwise fall back to description
  const [equipmentDescription, setEquipmentDescription] = useState(() => {
    if (applicationData?.equipmentItems && applicationData.equipmentItems.length > 0) {
      return applicationData.equipmentItems.map(item =>
        item.quantity
          ? `${item.quantity} x ${item.description || ''}`
          : `${item.description || ''}`
      ).join(', ')
    }
    return applicationData?.equipmentDescription || ''
  })
  const [equipmentQuantity, setEquipmentQuantity] = useState('')
  const [equipmentSerial, setEquipmentSerial] = useState('As per addendum')

  // Banking Details
  const [bankName, setBankName] = useState(applicationData?.bankName || '')
  const [branchName, setBranchName] = useState(applicationData?.bankBranch || '')
  const [branchCode, setBranchCode] = useState(applicationData?.bankBranchCode || '')
  const [accountNumber, setAccountNumber] = useState(applicationData?.accountNumber || '')
  const [accountHolder, setAccountHolder] = useState(applicationData?.accountHolder || applicationData?.businessName || '')
  const [accountType, setAccountType] = useState(applicationData?.accountType || 'Cheque')
  const [debitDay, setDebitDay] = useState('Last working day of each month')

  // CCF Signatory
  const [ccfSignatoryName, setCcfSignatoryName] = useState('')
  const [ccfSignedOnBehalfOf, setCcfSignedOnBehalfOf] = useState(extractCityFromAddress(applicationData?.businessAddress))
  const [ccfSignDay, setCcfSignDay] = useState('')
  const [ccfSignMonth, setCcfSignMonth] = useState('')
  const [ccfSignYear, setCcfSignYear] = useState('')

  // Renter Signatory
  const [renterSignatoryName, setRenterSignatoryName] = useState(applicationData?.applicantName || '')
  const [renterSignLocation, setRenterSignLocation] = useState(applicationData?.businessAddress || '')
  const [renterSignDay, setRenterSignDay] = useState('')
  const [renterSignMonth, setRenterSignMonth] = useState('')
  const [renterSignYear, setRenterSignYear] = useState('')

  // Board Resolution
  const [boardResolutionDay, setBoardResolutionDay] = useState('')
  const [boardResolutionMonth, setBoardResolutionMonth] = useState('')
  const [boardResolutionYear, setBoardResolutionYear] = useState('')
  const [boardResolutionLocation, setBoardResolutionLocation] = useState(extractCityFromAddress(applicationData?.businessAddress))
  const [boardResolutionCompany, setBoardResolutionCompany] = useState(applicationData?.businessName || '')
  const [boardResolutionFullName, setBoardResolutionFullName] = useState(applicationData?.applicantName || '')
  const [boardResolutionRegNo, setBoardResolutionRegNo] = useState(applicationData?.regNumber || '')
  const [boardResolutionCapacity, setBoardResolutionCapacity] = useState('')

  // Additional
  const [dateAdjustment, setDateAdjustment] = useState<'Y' | 'N'>('Y')
  const [witnessOne, setWitnessOne] = useState('')
  const [witnessTwo, setWitnessTwo] = useState('')
  const [applicantInitials, setApplicantInitials] = useState('')

  // Auto-generate initials from renter signatory name
  useEffect(() => {
    if (renterSignatoryName) {
      const parts = renterSignatoryName.trim().split(/\s+/).filter(Boolean)
      const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('')
      setApplicantInitials(initials)
    } else {
      setApplicantInitials('')
    }
  }, [renterSignatoryName])

  // Auto-calculate VAT when rental amount changes
  const handleRentalAmountChange = (value: string) => {
    setRentalAmount(value)
    const rental = parseFloat(value) || 0
    const vat = rental * 0.15
    const total = rental + vat
    setMonthlyVat(vat.toFixed(2))
    setTotalMonthly(total.toFixed(2))
  }

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)

      // Format rental term only (do not auto-append % to escalation)
      const formattedRentalTerm = rentalTerm.includes('months') ? rentalTerm : `${rentalTerm} months`

      const mraData = {
        // Company Information
        businessName,
        businessAddress,
        registrationNumber,
        vatNumber,
        contactPerson,
        applicantEmail: email,
        applicantPhone: phone,
        idNumber,

        // Financial Details
        rentalAmount,
        monthlyVat,
        totalMonthly,
        annualEscalation,
        rentalTerm: formattedRentalTerm,
        commencementDate,

        // Equipment
        equipmentItems: [
          {
            quantity: equipmentQuantity,
            description: equipmentDescription,
            serial: equipmentSerial,
          },
        ],

        // Banking
        bankName,
        branchName,
        branchCode,
        accountNumber,
        accountHolder,
        accountType,
        debitDay,

        // CCF Signatory
        ccfSignatoryName,
        ccfSignedOnBehalfOf,
        ccfSignDay,
        ccfSignMonth,
        ccfSignYear,

        // Renter Signatory
        renterSignatoryName,
        renterSignLocation,
        renterSignDay,
        renterSignMonth,
        renterSignYear,
        applicantInitials,

        // Board Resolution
        boardResolutionDay,
        boardResolutionMonth,
        boardResolutionYear,
        boardResolutionLocation,
        boardResolutionCompany,
        boardResolutionFullName,
        boardResolutionRegNo,
        boardResolutionCapacity,

        // Additional
        dateAdjustment,
        witnessOne,
        witnessTwo,
      }

      const response = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          mraData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate agreement')
      }

      toast({
        title: 'MRA Generated',
        description: 'Master Rental Agreement has been generated successfully.',
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      console.error('[MRA Dialog] Generation error:', error)
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate MRA.',
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
            <h2 className="text-lg font-semibold">Master Rental Agreement (MRA) Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and edit all fields before generating the rental agreement. All fields are editable.</p>
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
          {/* Section 1: Agreement Header */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Agreement Header
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number (Editable) *</Label>
                <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="VAT Number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID/Passport Number</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Director ID" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Address *</Label>
              <Textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 2: Signatories */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Signatories
            </h3>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">PCG Signatory</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ccfSignatoryName">Name of Signatory</Label>
                  <Input id="ccfSignatoryName" value={ccfSignatoryName} onChange={(e) => setCcfSignatoryName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccfSignedOnBehalfOf">Signed on behalf of Rentor (City from Business Address)</Label>
                  <Input id="ccfSignedOnBehalfOf" value={ccfSignedOnBehalfOf} onChange={(e) => setCcfSignedOnBehalfOf(e.target.value)} placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ccfSignDay">On this (Day number) *</Label>
                  <Input id="ccfSignDay" value={ccfSignDay} onChange={(e) => setCcfSignDay(e.target.value)} placeholder="17" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccfSignMonth">Day of (Month) *</Label>
                  <Input id="ccfSignMonth" value={ccfSignMonth} onChange={(e) => setCcfSignMonth(e.target.value)} placeholder="February" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccfSignYear">Year *</Label>
                  <Input id="ccfSignYear" value={ccfSignYear} onChange={(e) => setCcfSignYear(e.target.value)} placeholder="2026" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Renter Signatory</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renterSignatoryName">Name of Signatory (Full Applicant Name) *</Label>
                  <Input id="renterSignatoryName" value={renterSignatoryName} onChange={(e) => setRenterSignatoryName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicantInitials">Initials (Auto-generated, Editable) *</Label>
                  <Input
                    id="applicantInitials"
                    value={applicantInitials}
                    onChange={(e) => setApplicantInitials(e.target.value)}
                    placeholder="e.g., JD"
                    maxLength={3}
                  />
                  <p className="text-xs text-gray-500">Auto-generated from name, but you can edit</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterSignLocation">Signing Location (Held at - same city as business)</Label>
                  <Input id="renterSignLocation" value={renterSignLocation} onChange={(e) => setRenterSignLocation(e.target.value)} placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renterSignDay">On this (Day number) *</Label>
                  <Input id="renterSignDay" value={renterSignDay} onChange={(e) => setRenterSignDay(e.target.value)} placeholder="17" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterSignMonth">Day of (Month) *</Label>
                  <Input id="renterSignMonth" value={renterSignMonth} onChange={(e) => setRenterSignMonth(e.target.value)} placeholder="February" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterSignYear">Year *</Label>
                  <Input id="renterSignYear" value={renterSignYear} onChange={(e) => setRenterSignYear(e.target.value)} placeholder="2026" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Witnesses (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Witness 1</Label>
                  <Input value={witnessOne} onChange={(e) => setWitnessOne(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Witness 2</Label>
                  <Input value={witnessTwo} onChange={(e) => setWitnessTwo(e.target.value)} placeholder="Full name" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Equipment Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Schedule of Equipment
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipmentQuantity">Quantity</Label>
                <Input id="equipmentQuantity" value={equipmentQuantity} onChange={(e) => setEquipmentQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipmentDescription">Description (From Approval Letter, Editable) *</Label>
                <Input id="equipmentDescription" value={equipmentDescription} onChange={(e) => setEquipmentDescription(e.target.value)} placeholder="Equipment description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipmentSerial">Serial Numbers (Default: As per addendum, Editable)</Label>
                <Input id="equipmentSerial" value={equipmentSerial} onChange={(e) => setEquipmentSerial(e.target.value)} placeholder="As per addendum" />
              </div>
            </div>
          </div>

          {/* Section 4: Schedule of Rental */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Schedule of Rental
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Agreed Monthly Rental (Excl VAT) *</Label>
                <Input
                  type="number"
                  value={rentalAmount}
                  onChange={(e) => handleRentalAmountChange(e.target.value)}
                  placeholder="e.g., 5000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>VAT (15%)</Label>
                <Input value={monthlyVat} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Total Monthly Rental</Label>
                <Input value={totalMonthly} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentalTerm">Initial Rental Period (months added automatically) *</Label>
                <Input
                  id="rentalTerm"
                  value={rentalTerm}
                  onChange={(e) => setRentalTerm(e.target.value)}
                  placeholder="e.g., 36 months"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualEscalation">Annual Escalation Rate *</Label>
                <Input
                  id="annualEscalation"
                  value={annualEscalation}
                  onChange={(e) => setAnnualEscalation(e.target.value)}
                  placeholder="e.g., 10%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commencementDate">Commencement Date</Label>
                <Input id="commencementDate" value={commencementDate} onChange={(e) => setCommencementDate(e.target.value)} placeholder="Day Month Year" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date Adjustment Indicator</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={dateAdjustment === 'Y'}
                    onChange={() => setDateAdjustment('Y')}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={dateAdjustment === 'N'}
                    onChange={() => setDateAdjustment('N')}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Debit Payment Instructions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Debit Payment Instructions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Input value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="Cheque/Savings" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Debit Order Date</Label>
                <Input value={debitDay} onChange={(e) => setDebitDay(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 6: Resolution */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Resolution
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-3 gap-4 col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="boardResolutionDay">On this (Day number) *</Label>
                  <Input id="boardResolutionDay" value={boardResolutionDay} onChange={(e) => setBoardResolutionDay(e.target.value)} placeholder="17" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boardResolutionMonth">Day of (Month) *</Label>
                  <Input id="boardResolutionMonth" value={boardResolutionMonth} onChange={(e) => setBoardResolutionMonth(e.target.value)} placeholder="February" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boardResolutionYear">Year *</Label>
                  <Input id="boardResolutionYear" value={boardResolutionYear} onChange={(e) => setBoardResolutionYear(e.target.value)} placeholder="2026" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boardResolutionLocation">Held At (Same city as PCG signatory section)</Label>
                <Input id="boardResolutionLocation" value={boardResolutionLocation} onChange={(e) => setBoardResolutionLocation(e.target.value)} placeholder="City" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="boardResolutionCompany">Company Name</Label>
                <Input id="boardResolutionCompany" value={boardResolutionCompany} onChange={(e) => setBoardResolutionCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boardResolutionRegNo">Registration Number</Label>
                <Input id="boardResolutionRegNo" value={boardResolutionRegNo} onChange={(e) => setBoardResolutionRegNo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="boardResolutionFullName">Full Name (Authorized Person)</Label>
                <Input id="boardResolutionFullName" value={boardResolutionFullName} onChange={(e) => setBoardResolutionFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boardResolutionCapacity">In his/her capacity as</Label>
                <Input id="boardResolutionCapacity" value={boardResolutionCapacity} onChange={(e) => setBoardResolutionCapacity(e.target.value)} placeholder="Director/Member/Partner" />
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
