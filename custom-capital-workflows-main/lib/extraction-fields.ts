/**
 * Field definitions for document extraction
 * Used for supplier template configuration and custom prompt building
 */

export interface FieldDefinition {
  key: string
  label: string
  category: string
  description: string
  promptKey: string // Key used in AI prompts (camelCase)
  schemaKey: string // Key used in database (snake_case)
}

export const APPLICATION_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Rental Terms (key rental and payment information)
  {
    key: 'supplierName',
    label: 'Supplier Name',
    category: 'Rental Terms',
    description: 'Name of the supplier/vendor providing the equipment',
    promptKey: 'supplierName',
    schemaKey: 'supplier_name'
  },
  {
    key: 'settlement',
    label: 'Settlement Amount',
    category: 'Rental Terms',
    description: 'Settlement amount payable to supplier',
    promptKey: 'settlement',
    schemaKey: 'settlement'
  },
  {
    key: 'escalation',
    label: 'Annual Escalation',
    category: 'Rental Terms',
    description: 'Annual escalation percentage',
    promptKey: 'escalation',
    schemaKey: 'escalation'
  },
  {
    key: 'paymentPeriod',
    label: 'Payment Period',
    category: 'Rental Terms',
    description: 'Payment period in months',
    promptKey: 'paymentPeriod',
    schemaKey: 'payment_period'
  },
  {
    key: 'rentalExclVat',
    label: 'Rental Excl. VAT',
    category: 'Rental Terms',
    description: 'Monthly rental amount excluding VAT',
    promptKey: 'rentalExclVat',
    schemaKey: 'rental_excl_vat'
  },

  // Company/Applicant Information
  {
    key: 'businessName',
    label: 'Business Name',
    category: 'Company Information',
    description: 'Legal/trading name of the business',
    promptKey: 'businessName',
    schemaKey: 'business_name'
  },
  {
    key: 'companyType',
    label: 'Company Type',
    category: 'Company Information',
    description: 'Type of company (PTY Ltd, Close Corp, Other)',
    promptKey: 'companyType',
    schemaKey: 'company_type'
  },
  {
    key: 'registrationNumber',
    label: 'Registration Number',
    category: 'Company Information',
    description: 'Company registration number',
    promptKey: 'registrationNumber',
    schemaKey: 'registration_number'
  },
  {
    key: 'vatNumber',
    label: 'VAT Number',
    category: 'Company Information',
    description: 'VAT registration number',
    promptKey: 'vatNumber',
    schemaKey: 'vat_number'
  },
  {
    key: 'applicantName',
    label: 'Applicant Name',
    category: 'Company Information',
    description: 'Full name of primary applicant/contact person',
    promptKey: 'applicantName',
    schemaKey: 'applicant_name'
  },
  {
    key: 'contactPerson',
    label: 'Contact Person',
    category: 'Company Information',
    description: 'Contact person name',
    promptKey: 'contactPerson',
    schemaKey: 'contact_person'
  },
  {
    key: 'applicantEmail',
    label: 'Email Address',
    category: 'Company Information',
    description: 'Email address for communication',
    promptKey: 'applicantEmail',
    schemaKey: 'applicant_email'
  },
  {
    key: 'applicantPhone',
    label: 'Phone Number',
    category: 'Company Information',
    description: 'Primary phone/telephone number',
    promptKey: 'applicantPhone',
    schemaKey: 'applicant_phone'
  },
  {
    key: 'cellNumber',
    label: 'Cell Number',
    category: 'Company Information',
    description: 'Mobile/cellphone number',
    promptKey: 'cellNumber',
    schemaKey: 'cell_number'
  },
  {
    key: 'telephone',
    label: 'Telephone',
    category: 'Company Information',
    description: 'Telephone number',
    promptKey: 'telephone',
    schemaKey: 'telephone'
  },
  {
    key: 'faxNumber',
    label: 'Fax Number',
    category: 'Company Information',
    description: 'Fax number',
    promptKey: 'faxNumber',
    schemaKey: 'fax_number'
  },
  {
    key: 'natureOfBusiness',
    label: 'Nature of Business',
    category: 'Company Information',
    description: 'Type/nature of business operations',
    promptKey: 'natureOfBusiness',
    schemaKey: 'nature_of_business'
  },
  {
    key: 'dateEstablished',
    label: 'Date Established',
    category: 'Company Information',
    description: 'When the business was established/founded',
    promptKey: 'dateEstablished',
    schemaKey: 'date_established'
  },

  // Addresses
  {
    key: 'businessAddress',
    label: 'Business Address',
    category: 'Addresses',
    description: 'Primary business address',
    promptKey: 'businessAddress',
    schemaKey: 'business_address'
  },
  {
    key: 'streetAddress',
    label: 'Street Address',
    category: 'Addresses',
    description: 'Street address',
    promptKey: 'streetAddress',
    schemaKey: 'street_address'
  },
  {
    key: 'postalAddress',
    label: 'Postal Address',
    category: 'Addresses',
    description: 'Postal address (P.O. Box or mailing address)',
    promptKey: 'postalAddress',
    schemaKey: 'postal_address'
  },
  {
    key: 'installationAddress',
    label: 'Installation Address',
    category: 'Addresses',
    description: 'Installation address for equipment',
    promptKey: 'installationAddress',
    schemaKey: 'installation_address'
  },
  {
    key: 'deliveryAddress',
    label: 'Delivery Address',
    category: 'Addresses',
    description: 'Delivery address',
    promptKey: 'deliveryAddress',
    schemaKey: 'delivery_address'
  },

  // Financial/Rental Details
  {
    key: 'rentalAmount',
    label: 'Rental Amount',
    category: 'Financial Details',
    description: 'Total rental amount',
    promptKey: 'rentalAmount',
    schemaKey: 'rental_amount'
  },
  {
    key: 'rentalTerm',
    label: 'Rental Term',
    category: 'Financial Details',
    description: 'Rental term/period',
    promptKey: 'rentalTerm',
    schemaKey: 'rental_term'
  },
  {
    key: 'payoutAmount',
    label: 'Payout Amount',
    category: 'Financial Details',
    description: 'Payout amount excluding VAT',
    promptKey: 'payoutAmount',
    schemaKey: 'payout_amount'
  },
  {
    key: 'factor',
    label: 'Factor',
    category: 'Financial Details',
    description: 'Factor/rate applied to rental',
    promptKey: 'factor',
    schemaKey: 'factor'
  },
  {
    key: 'docFee',
    label: 'Document Fee',
    category: 'Financial Details',
    description: 'Document fee/admin fee',
    promptKey: 'docFee',
    schemaKey: 'doc_fee'
  },
  {
    key: 'validUntil',
    label: 'Valid Until',
    category: 'Financial Details',
    description: 'Validity period of the application/quote',
    promptKey: 'validUntil',
    schemaKey: 'valid_until'
  },

  // Equipment Details
  {
    key: 'equipmentDescription',
    label: 'Equipment Description',
    category: 'Equipment Details',
    description: 'Description of equipment to be financed',
    promptKey: 'equipmentDescription',
    schemaKey: 'equipment_description'
  },
  {
    key: 'equipmentQuantity',
    label: 'Equipment Quantity',
    category: 'Equipment Details',
    description: 'Quantity of equipment',
    promptKey: 'equipmentQuantity',
    schemaKey: 'equipment_quantity'
  },
  {
    key: 'equipmentItems',
    label: 'Equipment Items',
    category: 'Equipment Details',
    description: 'Array of equipment items with quantity, description, serial numbers',
    promptKey: 'equipmentItems',
    schemaKey: 'equipment_items'
  },

  // Banking Details
  {
    key: 'bankName',
    label: 'Bank Name',
    category: 'Banking Details',
    description: 'Name of the bank',
    promptKey: 'bankName',
    schemaKey: 'bank_name'
  },
  {
    key: 'bankBranch',
    label: 'Bank Branch',
    category: 'Banking Details',
    description: 'Bank branch name',
    promptKey: 'bankBranch',
    schemaKey: 'bank_branch'
  },
  {
    key: 'bankBranchCode',
    label: 'Bank Branch Code',
    category: 'Banking Details',
    description: 'Branch code',
    promptKey: 'bankBranchCode',
    schemaKey: 'bank_branch_code'
  },
  {
    key: 'sortCode',
    label: 'Sort Code',
    category: 'Banking Details',
    description: 'Sort code',
    promptKey: 'sortCode',
    schemaKey: 'sort_code'
  },
  {
    key: 'accountNumber',
    label: 'Account Number',
    category: 'Banking Details',
    description: 'Bank account number',
    promptKey: 'accountNumber',
    schemaKey: 'account_number'
  },
  {
    key: 'accountHolder',
    label: 'Account Holder',
    category: 'Banking Details',
    description: 'Account holder name',
    promptKey: 'accountHolder',
    schemaKey: 'account_holder'
  },
  {
    key: 'accountType',
    label: 'Account Type',
    category: 'Banking Details',
    description: 'Type of account (Cheque, Savings, Current)',
    promptKey: 'accountType',
    schemaKey: 'account_type'
  },
  {
    key: 'periodWithBank',
    label: 'Period with Bank',
    category: 'Banking Details',
    description: 'How long with the bank',
    promptKey: 'periodWithBank',
    schemaKey: 'period_with_bank'
  },

  // Supplier Information
  {
    key: 'supplierEmail',
    label: 'Supplier Email',
    category: 'Supplier Information',
    description: 'Email address of the supplier/vendor',
    promptKey: 'supplierEmail',
    schemaKey: 'supplier_email'
  },

  // Additional Financial Info
  {
    key: 'turnover',
    label: 'Annual Turnover',
    category: 'Additional Information',
    description: 'Annual turnover or net asset value',
    promptKey: 'turnover',
    schemaKey: 'turnover'
  },
  {
    key: 'assetValue',
    label: 'Asset Value',
    category: 'Additional Information',
    description: 'Total asset value',
    promptKey: 'assetValue',
    schemaKey: 'asset_value'
  },
  {
    key: 'solvency',
    label: 'Solvency',
    category: 'Additional Information',
    description: 'Solvency status (Solvent/Insolvent)',
    promptKey: 'solvency',
    schemaKey: 'solvency'
  },

  // Other Contacts
  {
    key: 'auditors',
    label: 'Auditors',
    category: 'Other Contacts',
    description: 'Name of auditors/accounting firm',
    promptKey: 'auditors',
    schemaKey: 'auditors'
  },
  {
    key: 'auditorsTel',
    label: 'Auditors Tel',
    category: 'Other Contacts',
    description: 'Auditors telephone number',
    promptKey: 'auditorsTel',
    schemaKey: 'auditors_tel'
  },
  {
    key: 'insurers',
    label: 'Insurers',
    category: 'Other Contacts',
    description: 'Name of insurance company/broker',
    promptKey: 'insurers',
    schemaKey: 'insurers'
  },
  {
    key: 'insurersContact',
    label: 'Insurers Contact',
    category: 'Other Contacts',
    description: 'Insurance contact person',
    promptKey: 'insurersContact',
    schemaKey: 'insurers_contact'
  },
  {
    key: 'insurersPolicy',
    label: 'Insurance Policy No',
    category: 'Other Contacts',
    description: 'Insurance policy number',
    promptKey: 'insurersPolicy',
    schemaKey: 'insurers_policy_no'
  },
  {
    key: 'landlord',
    label: 'Landlord',
    category: 'Other Contacts',
    description: 'Landlord name',
    promptKey: 'landlord',
    schemaKey: 'landlord'
  },
  {
    key: 'landlordContact',
    label: 'Landlord Contact',
    category: 'Other Contacts',
    description: 'Landlord contact details',
    promptKey: 'landlordContact',
    schemaKey: 'landlord_contact'
  },
  {
    key: 'landlordAddress',
    label: 'Landlord Address',
    category: 'Other Contacts',
    description: 'Landlord address',
    promptKey: 'landlordAddress',
    schemaKey: 'landlord_address'
  },
]

export interface FieldHints {
  enabled_fields: string[] // Array of field keys that this supplier uses
  field_notes: Record<string, string> // Custom notes per field (e.g., "Usually in red box at top right")
  dynamic_fields?: Record<string, string> // Dynamic fields specific to this supplier (snake_case key -> label)
}

/**
 * Get field definitions grouped by category
 */
export function getFieldsByCategory(): Record<string, FieldDefinition[]> {
  const grouped: Record<string, FieldDefinition[]> = {}

  for (const field of APPLICATION_FIELD_DEFINITIONS) {
    if (!grouped[field.category]) {
      grouped[field.category] = []
    }
    grouped[field.category].push(field)
  }

  return grouped
}

/**
 * Get field definition by key
 */
export function getFieldDefinition(key: string): FieldDefinition | undefined {
  return APPLICATION_FIELD_DEFINITIONS.find(f => f.key === key)
}

/**
 * Get all field keys
 */
export function getAllFieldKeys(): string[] {
  return APPLICATION_FIELD_DEFINITIONS.map(f => f.key)
}

/**
 * Default field hints for new suppliers (no fields enabled by default)
 * Fields should be auto-detected from sample extraction
 */
export function getDefaultFieldHints(): FieldHints {
  return {
    enabled_fields: [],
    field_notes: {},
    dynamic_fields: {}
  }
}
