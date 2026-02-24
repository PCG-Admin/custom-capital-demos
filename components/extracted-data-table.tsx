'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import { APPLICATION_FIELD_DEFINITIONS } from '@/lib/extraction-fields'

type TableType = 'agreement' | 'application'

interface Section {
  title: string
  fields: string[]
}

interface ExtractedDataTableProps {
  data?: Record<string, any> | null
  type: TableType
  recordId?: string
  canEdit?: boolean
  workflowStatus?: string
  onDataChange?: (data: Record<string, any>) => void
  supplierFieldHints?: { enabled_fields: string[]; dynamic_fields?: Record<string, string> } | null
}

const agreementLabels: Record<string, string> = {
  rental_agreement_reference: 'Rental Agreement Reference',
  company_name: 'Company Name',
  renter_address: 'Renter Address',
  registration_number: 'Registration Number',
  vat_number: 'VAT Number',
  contact_number: 'Contact Number',
  contact_email: 'Contact Email',
  installation_address: 'Installation Address',
  id_passport_number: 'ID/Passport Number',
  agreed_monthly_rental: 'Agreed Monthly Rental',
  vat_on_rental: 'VAT on Rental',
  total_monthly_rental: 'Total Monthly Rental',
  initial_rental_period: 'Initial Rental Period',
  annual_escalation_rate: 'Annual Escalation Rate',
  service_fee: 'Service Fee',
  commencement_date: 'Commencement Date',
  date_adjustment_indicator: 'Date Adjustment Indicator',
  bank_name: 'Bank Name',
  bank_branch: 'Bank Branch',
  bank_branch_code: 'Branch Code',
  account_holder_name: 'Account Holder',
  account_number: 'Account Number',
  account_type: 'Account Type',
  debit_order_date: 'Debit Order Date',
  renter_signed_by: 'Signed By',
  renter_signed_capacity: 'Signatory Capacity',
  renter_signed_date: 'Signature Date',
  renter_signed_location: 'Signature Location',
  resolution_date: 'Resolution Date',
  resolution_reg_no: 'Resolution Reg No',
  resolution_held_at: 'Resolution Location',
  resolution_company_name: 'Resolution Company Name',
  resolution_full_name: 'Resolution Full Name',
  equipment_items: 'Equipment Items',
}

const applicationLabels: Record<string, string> = {
  // Applicant/Company Info
  applicant_name: 'Applicant Name',
  applicant_email: 'Applicant Email',
  applicant_phone: 'Applicant Phone',
  telephone: 'Telephone',
  cell_number: 'Cell Number',
  fax_number: 'Fax Number',
  business_name: 'Business Name',
  company_type: 'Company Type',
  registration_number: 'Registration Number',
  vat_number: 'VAT Number',
  contact_person: 'Contact Person',
  nature_of_business: 'Nature of Business',
  date_established: 'Date Established',

  // Addresses
  business_address: 'Business Address',
  street_address: 'Street Address',
  postal_address: 'Postal Address',
  installation_address: 'Installation Address',
  delivery_address: 'Delivery Address',

  // Financial/Rental Details
  rental_amount: 'Rental Amount',
  rental_excl_vat: 'Rental Excl VAT',
  rental_incl_insurance_excl_vat: 'Rental Incl Insurance Excl VAT',
  rental_term: 'Rental Term',
  payment_period: 'Payment Period (Months)',
  payout_amount: 'Payout Amount',
  payout_excl_vat: 'Payout Excl VAT',
  settlement: 'Settlement',
  escalation: 'Escalation %',
  factor: 'Factor',
  doc_fee: 'Doc Fee',
  valid_until: 'Valid Until',

  // Equipment
  equipment_description: 'Equipment Description',
  equipment_quantity: 'Equipment Quantity',

  // Banking
  bank_name: 'Bank Name',
  bank_branch: 'Bank Branch',
  bank_branch_code: 'Branch Code',
  sort_code: 'Sort Code',
  account_number: 'Account Number',
  account_holder: 'Account Holder',
  account_type: 'Account Type',
  period_with_bank: 'Period with Bank',

  // Supplier
  supplier_name: 'Supplier Name',
  supplier_email: 'Supplier Email',

  // Additional Info
  turnover: 'Annual Turnover',
  asset_value: 'Asset Value',
  solvency: 'Solvency',
  auditors: 'Auditors',
  auditors_tel: 'Auditors Tel',
  insurers: 'Insurers',
  insurers_contact: 'Insurers Contact',
  insurers_policy_no: 'Policy Number',
  landlord: 'Landlord',
  landlord_contact: 'Landlord Contact',
  landlord_address: 'Landlord Address',
}

const agreementSections: Section[] = [
  {
    title: 'Agreement Overview',
    fields: [
      'rental_agreement_reference',
      'company_name',
      'renter_address',
      'registration_number',
      'vat_number',
      'contact_number',
      'contact_email',
      'installation_address',
      'id_passport_number',
    ],
  },
  {
    title: 'Financial Terms',
    fields: [
      'agreed_monthly_rental',
      'vat_on_rental',
      'total_monthly_rental',
      'initial_rental_period',
      'annual_escalation_rate',
      'service_fee',
      'commencement_date',
      'date_adjustment_indicator',
    ],
  },
  {
    title: 'Banking Instructions',
    fields: [
      'bank_name',
      'bank_branch',
      'bank_branch_code',
      'account_holder_name',
      'account_number',
      'account_type',
      'debit_order_date',
    ],
  },
  {
    title: 'Signatures & Resolution',
    fields: [
      'renter_signed_by',
      'renter_signed_capacity',
      'renter_signed_date',
      'renter_signed_location',
      'resolution_date',
      'resolution_reg_no',
      'resolution_held_at',
      'resolution_company_name',
      'resolution_full_name',
    ],
  },
]

const applicationSections: Section[] = [
  {
    title: 'Company Information',
    fields: [
      'business_name',
      'company_type',
      'registration_number',
      'vat_number',
      'nature_of_business',
      'date_established',
    ],
  },
  {
    title: 'Contact Details',
    fields: [
      'applicant_name',
      'contact_person',
      'applicant_email',
      'applicant_phone',
      'telephone',
      'cell_number',
      'fax_number',
    ],
  },
  {
    title: 'Addresses',
    fields: [
      'business_address',
      'street_address',
      'postal_address',
      'installation_address',
      'delivery_address',
    ],
  },
  {
    title: 'Rental & Financial Details',
    fields: [
      'supplier_name',
      'supplier_email',
      'equipment_description',
      'payout_excl_vat',
      'payout_amount',
      'settlement',
      'escalation',
      'rental_excl_vat',
      'rental_incl_insurance_excl_vat',
      'factor',
      'payment_period',
      'rental_term',
      'rental_amount',
      'doc_fee',
      'valid_until',
    ],
  },
  {
    title: 'Equipment Details',
    fields: ['equipment_description', 'equipment_quantity'],
  },
  {
    title: 'Banking Details',
    fields: [
      'bank_name',
      'bank_branch',
      'bank_branch_code',
      'sort_code',
      'account_number',
      'account_holder',
      'account_type',
      'period_with_bank',
    ],
  },
  {
    title: 'Additional Information',
    fields: [
      'turnover',
      'asset_value',
      'solvency',
      'auditors',
      'auditors_tel',
      'insurers',
      'insurers_contact',
      'insurers_policy_no',
      'landlord',
      'landlord_contact',
      'landlord_address',
    ],
  },
]

export function ExtractedDataTable({ data, type, recordId, canEdit = true, workflowStatus, onDataChange, supplierFieldHints }: ExtractedDataTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftData, setDraftData] = useState<Record<string, any>>(data || {})
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    setDraftData(data || {})
  }, [data])

  // Fetch suppliers for dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers')
        if (response.ok) {
          const result = await response.json()
          setSuppliers(result.suppliers.filter((s: any) => s.is_active))
        }
      } catch (error) {
        console.error('Failed to fetch suppliers:', error)
      }
    }
    fetchSuppliers()
  }, [])

  if (!data || Object.keys(data).length === 0) {
    return null
  }

  let sections = type === 'agreement' ? agreementSections : applicationSections
  let labels = type === 'agreement' ? agreementLabels : applicationLabels

  // Fields that should only appear in the "Additional Fields" section
  const additionalFieldsOnly = new Set<string>([])

  // Filter sections based on supplier field hints (if provided)
  if (type === 'application' && supplierFieldHints) {
    const enabledSchemaKeys = new Set<string>()

    // Convert enabled field keys to schema keys
    if (supplierFieldHints.enabled_fields) {
      for (const fieldKey of supplierFieldHints.enabled_fields) {
        const fieldDef = APPLICATION_FIELD_DEFINITIONS.find(f => f.key === fieldKey)
        if (fieldDef) {
          enabledSchemaKeys.add(fieldDef.schemaKey)
        }
      }
    }

    // Add dynamic fields (they're already in snake_case)
    if (supplierFieldHints.dynamic_fields) {
      for (const dynamicKey of Object.keys(supplierFieldHints.dynamic_fields)) {
        enabledSchemaKeys.add(dynamicKey)
      }
    }

    // Filter sections to only show fields that are enabled, excluding additional fields
    sections = sections.map(section => ({
      ...section,
      fields: section.fields.filter(field =>
        !additionalFieldsOnly.has(field) &&
        (enabledSchemaKeys.has(field) || draftData[field] !== undefined)
      )
    })).filter(section => section.fields.length > 0)

    // Add dynamic fields section if there are any
    if (supplierFieldHints.dynamic_fields && Object.keys(supplierFieldHints.dynamic_fields).length > 0) {
      const dynamicFieldsInData = Object.keys(supplierFieldHints.dynamic_fields).filter(key => draftData[key] !== undefined)

      if (dynamicFieldsInData.length > 0) {
        sections.push({
          title: 'Supplier-Specific Fields',
          fields: dynamicFieldsInData
        })

        // Add labels for dynamic fields
        for (const [key, label] of Object.entries(supplierFieldHints.dynamic_fields)) {
          labels[key] = label
        }
      }
    }
  } else if (type === 'application') {
    // If no supplier field hints, still exclude additional fields from regular sections
    sections = sections.map(section => ({
      ...section,
      fields: section.fields.filter(field => !additionalFieldsOnly.has(field))
    })).filter(section => section.fields.length > 0)
  }

  const equipmentItems = Array.isArray(draftData.equipment_items) ? draftData.equipment_items : []
  const isLocked = ['approved', 'declined'].includes((workflowStatus || '').toLowerCase())
  const editingDisabled = isLocked || !canEdit

  const handleFieldChange = (field: string, value: string) => {
    setDraftData((prev) => ({ ...prev, [field]: value }))
  }

  const handleEquipmentChange = (index: number, field: string, value: string) => {
    if (type !== 'agreement') return
    const updated = [...equipmentItems]
    updated[index] = { ...updated[index], [field]: value }
    setDraftData((prev) => ({ ...prev, equipment_items: updated }))
  }

  const addEquipmentItem = () => {
    const updated = [...equipmentItems, { quantity: '', description: '', serial_numbers: '' }]
    setDraftData((prev) => ({ ...prev, equipment_items: updated }))
  }

  const removeEquipmentItem = (index: number) => {
    const updated = equipmentItems.filter((_, idx) => idx !== index)
    setDraftData((prev) => ({ ...prev, equipment_items: updated }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Client-side update mode
      if (onDataChange) {
        onDataChange(draftData)
        toast({
          title: 'Updated',
          description: 'Data updated. Click "Confirm & Create Workflow" to proceed.',
        })
        setIsEditing(false)
        return
      }

      // Server-side update mode
      if (!recordId) {
        throw new Error('Missing record ID for server update')
      }

      const response = await fetch('/api/update-extracted-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordId,
          type,
          data: draftData,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Update failed')
      }

      toast({
        title: 'Saved',
        description: 'Extracted fields updated successfully.',
      })
      setIsEditing(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not update extracted data.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderFieldValue = (field: string) => {
    const value = draftData[field]
    if (!isEditing || editingDisabled) {
      return formatValue(value)
    }

    // Special handling for supplier_name - use dropdown
    if (field === 'supplier_name') {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full h-9 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name} className="text-gray-900">
              {supplier.name}
            </option>
          ))}
        </select>
      )
    }

    const stringValue = value === undefined || value === null ? '' : String(value)
    const shouldUseTextarea =
      field.includes('address') || field.includes('description') || stringValue.length > 60

    if (shouldUseTextarea) {
      return (
        <Textarea
          value={stringValue}
          rows={3}
          onChange={(e) => handleFieldChange(field, e.target.value)}
        />
      )
    }

    return (
      <Input
        value={stringValue}
        onChange={(e) => handleFieldChange(field, e.target.value)}
      />
    )
  }

  const handleCancel = () => {
    setDraftData(data || {})
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>AI Extracted Data</CardTitle>
          <CardDescription>
            Structured metadata captured from the uploaded {type === 'agreement' ? 'agreement' : 'application'}.
          </CardDescription>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} disabled={editingDisabled}>
                Edit
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {section.fields.map((field) => (
                    <tr key={field} className="border-b last:border-b-0">
                      <td className="bg-muted/60 px-4 py-3 font-medium">{labels[field] || field}</td>
                      <td className="px-4 py-3 align-top">
                        {renderFieldValue(field)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {equipmentItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Equipment Schedule
              </p>
              {isEditing && !editingDisabled && (
                <Button size="sm" variant="outline" onClick={addEquipmentItem}>
                  Add item
                </Button>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 text-left">
                    <th className="px-4 py-2 font-semibold">Quantity</th>
                    <th className="px-4 py-2 font-semibold">Description</th>
                    <th className="px-4 py-2 font-semibold">Serial Numbers</th>
                    {isEditing && !editingDisabled && <th className="px-4 py-2 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {equipmentItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground" colSpan={isEditing ? 4 : 3}>
                        No equipment captured.
                      </td>
                    </tr>
                  )}
                  {equipmentItems.map((item, index) => (
                    <tr key={`${item.serial_numbers}-${index}`} className="border-b last:border-b-0">
                      <td className="px-4 py-2">
                        {isEditing && !editingDisabled ? (
                          <Input
                            value={item?.quantity ?? ''}
                            onChange={(e) => handleEquipmentChange(index, 'quantity', e.target.value)}
                          />
                        ) : (
                          formatValue(item?.quantity)
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing && !editingDisabled ? (
                          <Textarea
                            rows={2}
                            value={item?.description ?? ''}
                            onChange={(e) => handleEquipmentChange(index, 'description', e.target.value)}
                          />
                        ) : (
                          formatValue(item?.description)
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing && !editingDisabled ? (
                          <Textarea
                            rows={2}
                            value={item?.serial_numbers ?? ''}
                            onChange={(e) => handleEquipmentChange(index, 'serial_numbers', e.target.value)}
                          />
                        ) : (
                          formatValue(item?.serial_numbers)
                        )}
                      </td>
                      {isEditing && !editingDisabled && (
                        <td className="px-4 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeEquipmentItem(index)} aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatValue(value: any) {
  if (value === undefined || value === null) {
    return 'N/A'
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'N/A'
  }

  const stringValue = String(value).trim()
  return stringValue.length ? stringValue : 'N/A'
}
