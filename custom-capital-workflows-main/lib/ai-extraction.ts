import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { APPLICATION_FIELD_DEFINITIONS } from '@/lib/extraction-fields'

export type DocumentType = 'rental-credit-application' | 'rental-agreement' | 'sample-template'

interface EquipmentItem {
  quantity?: string
  description?: string
  serial_numbers?: string
}

export interface AgreementExtractedData {
  rental_agreement_reference: string
  company_name: string
  renter_address: string
  registration_number: string
  vat_number: string
  contact_number: string
  contact_email: string
  installation_address: string
  id_passport_number: string
  agreed_monthly_rental: string
  vat_on_rental: string
  total_monthly_rental: string
  initial_rental_period: string
  annual_escalation_rate: string
  service_fee: string
  commencement_date: string
  date_adjustment_indicator: string
  bank_name: string
  bank_branch: string
  bank_branch_code: string
  account_holder_name: string
  account_number: string
  account_type: string
  debit_order_date: string
  renter_signed_by: string
  renter_signed_capacity: string
  renter_signed_date: string
  renter_signed_location: string
  resolution_date: string
  resolution_reg_no: string
  resolution_held_at: string
  resolution_company_name: string
  resolution_full_name: string
  equipment_items: EquipmentItem[]
}

export interface ApplicationExtractedData {
  // Applicant Information
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  business_name: string
  business_address: string
  street_address?: string
  postal_address?: string
  installation_address?: string
  delivery_address?: string
  registration_number: string
  vat_number: string
  contact_person: string
  fax_number?: string
  company_type?: string // PTY Ltd, Close Corp, Other
  nature_of_business?: string
  date_established?: string
  telephone?: string
  cell_number?: string

  // Financial Details
  rental_amount: string
  rental_excl_vat?: string
  rental_term: string
  payment_period?: string
  payout_amount?: string
  settlement?: string
  escalation?: string
  factor?: string
  doc_fee?: string
  valid_until?: string

  // Equipment Details
  equipment_description?: string
  equipment_quantity?: string
  equipment_items?: EquipmentItem[]

  // Banking Details
  bank_name?: string
  bank_branch?: string
  bank_branch_code?: string
  sort_code?: string
  account_number?: string
  account_holder?: string
  account_type?: string
  period_with_bank?: string

  // Supplier Information
  supplier_name: string
  supplier_email: string

  // Additional Information
  turnover?: string
  asset_value?: string
  solvency?: string
  auditors?: string
  auditors_tel?: string
  insurers?: string
  insurers_contact?: string
  insurers_policy_no?: string
  landlord?: string
  landlord_contact?: string
  landlord_address?: string
}

export interface AgreementDerivedFields {
  agreement_number?: string
  lessee_name?: string
  lessor_name?: string
  rental_amount?: number
  start_date?: string
  end_date?: string
}

export interface ApplicationDerivedFields {
  applicant_name?: string
  applicant_email?: string
  applicant_phone?: string
  business_name?: string
  rental_amount?: number
  rental_term?: string
}

export type DocumentExtractionResult =
  | {
    type: 'rental-agreement'
    extractedData: AgreementExtractedData
    derivedFields: AgreementDerivedFields
  }
  | {
    type: 'rental-credit-application'
    extractedData: ApplicationExtractedData
    derivedFields: ApplicationDerivedFields
  }

const genAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  : null

const DETECTION_PROMPT = `You are an expert document classifier for rental business workflows.

TASK: Analyze the attached document and classify its type with confidence level.

DOCUMENT TYPES:
1. "rental-credit-application" - Application forms where clients request rental services
   - Contains fields like: applicant details, business info, financial details, equipment requests
   - Usually blank or partially filled forms requesting approval

2. "rental-agreement" - Finalized rental contracts between parties
   - Contains: agreement terms, signatures, payment schedules, equipment details
   - Usually fully completed with legal binding terms

OUTPUT FORMAT: Return ONLY valid JSON with no markdown or extra text:
{
  "type": "rental-credit-application" | "rental-agreement",
  "certainty": "high" | "medium" | "low"
}

CLASSIFICATION RULES:
- Use "high" certainty if clear indicators are present
- Use "medium" if document has mixed characteristics
- Use "low" if document is unclear or ambiguous`

const AGREEMENT_PROMPT = `You are an expert at analyzing rental agreement documents. Extract the following fields from the document. Pay close attention to handwritten text and smaller fonts, ensuring maximum accuracy.

- rentalAgreementReference: The reference number for the rental agreement, typically found at the top right of the document, under 'RENTAL AGREEMENT NO (REFERENCE)'. (e.g., "4430209223")
- companyName: The name of the Renter's company, found next to the label "Renter:".
- renterAddress: The full address of the Renter, found next to the label "Address:".
- registrationNumber: The company registration number (Reg No.) for the Renter, found next to the label "Registration No:".
- vatNumber: The VAT registration number of the Renter, found next to the label "Vat No:".
- contactNumber: The contact telephone number of the Renter, found next to the label "Tel No:".
- contactEmail: The email address for communication regarding the rental, found next to the label "Invoice Email:".
- installationAddress: The address where the equipment is installed, found next to the label "Installation Address:".
- idPassportNumber: The ID or passport number of the Renter's signatory, found next to the label "ID/Passport No.".

- agreedMonthlyRental: The agreed monthly rental amount (numbers only, no currency symbol), found next to the label "Agreed Monthly Rental R".
- vatOnRental: The VAT amount on the rental (numbers only, no currency symbol), found next to the label "VAT R" under the "VAT" column.
- totalMonthlyRental: The total monthly rental including VAT (numbers only, no currency symbol), found next to the label "Total Monthly Rental R".
- initialRentalPeriod: The initial rental period in months, found next to the label "Initial Rental Period".
- annualEscalationRate: The annual escalation rate for the rental (percentage, e.g., "5%"), found next to the label "Annual Escalation Rate" and before the "%" symbol.
- serviceFee: The monthly service fee including VAT (numbers only, no currency symbol), found next to the label "Service fee R".
- commencementDate: The commencement date of the rental agreement (DD-MM-YYYY format preferred), found next to the label "Commencement Date".
- dateAdjustmentIndicator: The date adjustment indicator (e.g., "Y" or "N"), extracted from the checked checkbox next to "Date adjustment indicator".

- bankName: The name of the bank for rental payments, found next to the label "Bank:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.
- bankBranch: The branch name of the bank, found next to the label "Branch:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.
- bankBranchCode: The branch code of the bank, found next to the label "Branch Code:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section. Return "N/A" if not explicitly found or blank.
- accountHolderName: The name of the bank account holder, found next to the label "Name of Account Holder" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.
- accountNumber: The bank account number for rental payments, found next to the label "Account No:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.
- accountType: The type of bank account (e.g., "Cheque", "Savings"), found next to the label "Account Type:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.
- debitOrderDate: The debit order date (e.g., "Last working day of each month"), found next to the label "Debit Order Date:" in the "AUTHORITY AND MANDATE FOR DEBIT PAYMENT INSTRUCTIONS" section.

- renterSignedBy: The full name of the person who signed the agreement on behalf of the Renter, found from the "Name of Signatory" line in the right signatory block.
- renterSignedCapacity: The capacity of the Renter's signatory (e.g., "Member", "Director", "Sole Proprietor"), found from the "Capacity" line below "Name of Signatory" in the right signatory block.
- renterSignedDate: The date the Renter signed the agreement (DD-MM-YYYY format preferred), combine day, month, and year from "on the __ day of __ 20__" in the right signatory block (e.g., "5 August 2025" -> "05-08-2025"). Prioritize handwritten values.
- renterSignedLocation: The location where the Renter signed the agreement, found from the line next to "Signed on behalf of the Renter at:" in the right signatory block.

- resolutionDate: The date of the resolution (DD-MM-YYYY format preferred), combine day, month, and year from "on the __ day of __ 20__" in the "RESOLUTION" section (e.g., "10 January 2025" -> "10-01-2025"). Prioritize handwritten values.
- resolutionRegNo: The registration number mentioned in the resolution section, found next to the label "Reg No:" in the "RESOLUTION" section.
- resolutionHeldAt: The location where the resolution was held, found next to the label "held at:" in the "RESOLUTION" section.
- resolutionCompanyName: The company name mentioned in the resolution section, found next to the label "The Company/Close Corporation" in the "RESOLUTION" section.
- resolutionFullName: The full name of the person authorized to do whatever may be necessary, found next to the label "Full Names" in the "WHEREIN IT WAS RESOLVED" sub-section.

- equipmentItems: An array of objects, each with 'quantity', 'description', and 'serial_numbers' for items listed in the 'SCHEDULE OF EQUIPMENT' table. For each row, extract the value under "Quantity", "Description of Equipment", and "Serial Numbers". If a specific field within a row is blank, return "N/A" for that field. If no equipment is listed, return an empty array.

Important notes:
- Ensure all amounts are numeric values. Remove any currency symbols (e.g., "R") or commas.
- Dates should be in DD-MM-YYYY format.
- Percentages should be strings with "%" (e.g., "5%").
- Be highly accurate. You are reading a scanned document. Ensure you don’t misread similar characters (e.g., “5” vs “S” or “0” vs “O”).
- Be tolerant of layout variations, including handwritten entries and smaller fonts.
- Do not hallucinate. Only include fields that are clearly visible or inferable from layout and labels. If a field is not found or is blank, return "N/A" for single values or an empty array for lists.
- Return only a single JSON object with exactly these keys. Do not include any markdown code fences or extra text outside the JSON object.`

const APPLICATION_PROMPT = `You are a specialized AI assistant trained for high-accuracy document extraction in rental credit workflows.

OBJECTIVE: Extract structured data from rental credit application documents with maximum precision.

DOCUMENT CHARACTERISTICS:
- Multi-page forms with varying layouts
- Mix of printed text, handwritten entries, and checkboxes
- Critical fields often highlighted in red/pink or shaded backgrounds
- May contain multiple sections: applicant info, financial details, banking, equipment

EXTRACTION PRIORITIES:
1. CRITICAL RENTAL TERMS (usually highlighted):
   - supplierName: Supplier/vendor providing equipment
   - settlement: Settlement amount payable to supplier (numbers only, no "R" or commas)
   - escalation: Annual escalation percentage (include % sign, e.g., "10%")
   - paymentPeriod: Payment period in months (number only, e.g., "60")
   - rentalExclVat: Monthly rental excluding VAT (numbers only)

COMPANY/APPLICANT INFORMATION:
- businessName: Legal/trading name of the business (found near "Company name", "Legal Company Name", "Company Name").
- companyType: Type of company - must be one of: "PTY Ltd", "Close Corp", "Other". Check checkboxes or written indicators.
- registrationNumber: Company registration number (found near "Reg No", "Registration No", "REGISTRATION NO").
- vatNumber: VAT registration number (found near "VAT number", "VAT No", "VAT Nr").
- applicantName: Full name of primary applicant/contact person.
- contactPerson: Contact person name (may match applicant).
- applicantEmail: Email address for communication.
- applicantPhone: Primary phone/telephone number.
- cellNumber: Mobile/cellphone number if different from main phone.
- faxNumber: Fax number if provided.
- telephone: Telephone number.
- natureOfBusiness: Type/nature of business operations.
- dateEstablished: When the business was established/founded.

ADDRESSES (extract all separately):
- businessAddress: Primary business address.
- streetAddress: Street address if listed separately.
- postalAddress: Postal address (P.O. Box or mailing address).
- installationAddress: Installation address for equipment.
- deliveryAddress: Delivery address if different.

FINANCIAL/RENTAL DETAILS:
- rentalAmount: Total rental amount (numbers only, no currency symbols).
- rentalTerm: Rental term/period (e.g., "36 months", "3 years", "60 months").
- payoutAmount: Payout amount excluding VAT.
- factor: Factor/rate applied to rental.
- docFee: Document fee/admin fee.
- validUntil: Validity period of the application/quote.

EQUIPMENT DETAILS:
- equipmentDescription: Description of equipment to be financed.
- equipmentQuantity: Quantity of equipment.
- equipmentItems: Array of equipment items, each with {quantity, description, serial_numbers}.

BANKING DETAILS:
- bankName: Name of the bank (found near "Bankers", "Bank Name", "Bank").
- bankBranch: Bank branch name (found near "Branch").
- bankBranchCode: Branch code (found near "Branch Code", "Branch No").
- sortCode: Sort code if provided.
- accountNumber: Bank account number (found near "Account no", "Account Number", "Acc Nr").
- accountHolder: Account holder name (found near "Name of Account Holder", "Acc Holder").
- accountType: Type of account (e.g., "Cheque", "Savings", "Current").
- periodWithBank: How long with the bank (e.g., "3 years", "36 months").

SUPPLIER INFORMATION:
- supplierEmail: Email address of the supplier/vendor.

ADDITIONAL FINANCIAL INFO:
- turnover: Annual turnover or net asset value (found near "Annual Turnover", "Turnover").
- assetValue: Total asset value (found near "Asset Value", "Total Asset Value").
- solvency: Solvency status (Solvent/Insolvent).

OTHER CONTACTS:
- auditors: Name of auditors/accounting firm.
- auditorsTel: Auditors telephone number.
- insurers: Name of insurance company/broker.
- insurersContact: Insurance contact person.
- insurersPolicy: Insurance policy number.
- landlord: Landlord name.
- landlordContact: Landlord contact details.
- landlordAddress: Landlord address.

CRITICAL EXTRACTION RULES:
1. For amounts: Remove "R", currency symbols, and commas. Return numbers only (e.g., "R17 000.00" → "17000.00").
2. For percentages: Include the % sign (e.g., "10%").
3. For periods: Extract just the number if labeled in months (e.g., "60 months" → "60"), OR keep the full text if units vary.
4. For company type: Look for checkboxes or written indicators for "PTY Ltd", "Close Corp", or "Other".
5. Pay special attention to HIGHLIGHTED/SHADED fields - these are critical.
6. Check ALL pages of multi-page documents.
7. Handwritten entries are common - read carefully (watch for 5 vs S, 0 vs O, 1 vs I).
8. If a field is truly blank or not found, return "N/A".
9. Do not hallucinate data.

Return a single JSON object with camelCase keys matching the field names above. No markdown formatting, no extra text.
`

const SAMPLE_TEMPLATE_PROMPT = `You are an expert at analyzing rental credit application form templates. Your task is to identify ONLY the actual INPUT FIELDS that users fill in, NOT individual checkbox options or table column headers.

CRITICAL RULES FOR FIELD EXTRACTION:

1. **Group checkbox/radio options into ONE field** (MOST IMPORTANT):
   - "☐ PTY Ltd  ☐ Close Corp  ☐ Sole Prop  ☐ Trust  ☐ Other" → ONE field called "companyType"
   - "☐ Yes  ☐ No" next to "RSA Citizen?" → ONE field called "rsaCitizen"
   - DO NOT create separate fields for each checkbox option (no "ptyLtd", "closeCorp", etc.)

2. **Ignore filled-in example data**:
   - Templates may have sample data - IGNORE the values, only identify the field location
   - ALL values should be "N/A" since we only care about field NAMES, not data

3. **Don't extract table column headers as separate fields**:
   - Table with "Quantity | Description | Serial No" → ONE field "equipmentItems" (array)
   - Don't create "quantity1", "quantity2", etc.

4. **Don't extract repeated numbered variations unless truly different**:
   - If you see "Name/Surname: ___ ___ ___ ___" (4 blank lines for 4 people), extract as "shareholders" or "directors" (array)
   - Only create "shareholder1Name", "shareholder2Name" if they're explicitly labeled differently

WHAT TO EXTRACT:
- Text input fields: "Business Name: ___________" → businessName
- Date fields: "Date Established: ___________" → dateEstablished
- Signature fields: "Applicant Signature: ___________" → applicantSignature
- Numerical fields: "Rental Amount: ___________" → rentalAmount
- Checkbox/radio GROUPS (not individual options): "Company Type: ☐ PTY ☐ CC" → companyType
- Yes/No questions: "RSA Citizen? ☐ Yes ☐ No" → rsaCitizen

WHAT NOT TO EXTRACT:
- Individual checkbox options (like "ptyLtd", "closeCorp") - use the group name instead
- Section headings ("Applicant Information")
- Form titles ("Credit Application Form")
- Instructions ("Please complete in full")
- Column headers in tables
- Page numbers, footers
- Static labels without input spaces

FIELD NAMING:
- Use camelCase: "Business Name" → businessName
- For multiple similar items, use arrays: "shareholders" or "directors"
- For yes/no fields, use the question: "RSA Citizen?" → rsaCitizen

ALL VALUES MUST BE "N/A" - we only want field structure.

Return ONLY a JSON object with field names as keys and "N/A" as all values. No markdown formatting, no extra text.`

const agreementFieldMap: Record<string, keyof AgreementExtractedData> = {
  rentalAgreementReference: 'rental_agreement_reference',
  companyName: 'company_name',
  renterAddress: 'renter_address',
  registrationNumber: 'registration_number',
  vatNumber: 'vat_number',
  contactNumber: 'contact_number',
  contactEmail: 'contact_email',
  installationAddress: 'installation_address',
  idPassportNumber: 'id_passport_number',
  agreedMonthlyRental: 'agreed_monthly_rental',
  vatOnRental: 'vat_on_rental',
  totalMonthlyRental: 'total_monthly_rental',
  initialRentalPeriod: 'initial_rental_period',
  annualEscalationRate: 'annual_escalation_rate',
  serviceFee: 'service_fee',
  commencementDate: 'commencement_date',
  dateAdjustmentIndicator: 'date_adjustment_indicator',
  bankName: 'bank_name',
  bankBranch: 'bank_branch',
  bankBranchCode: 'bank_branch_code',
  accountHolderName: 'account_holder_name',
  accountNumber: 'account_number',
  accountType: 'account_type',
  debitOrderDate: 'debit_order_date',
  renterSignedBy: 'renter_signed_by',
  renterSignedCapacity: 'renter_signed_capacity',
  renterSignedDate: 'renter_signed_date',
  renterSignedLocation: 'renter_signed_location',
  resolutionDate: 'resolution_date',
  resolutionRegNo: 'resolution_reg_no',
  resolutionHeldAt: 'resolution_held_at',
  resolutionCompanyName: 'resolution_company_name',
  resolutionFullName: 'resolution_full_name',
  equipmentItems: 'equipment_items',
}

const applicationFieldMap: Record<string, keyof ApplicationExtractedData> = {
  applicantName: 'applicant_name',
  applicantEmail: 'applicant_email',
  applicantPhone: 'applicant_phone',
  businessName: 'business_name',
  businessAddress: 'business_address',
  streetAddress: 'street_address',
  postalAddress: 'postal_address',
  installationAddress: 'installation_address',
  deliveryAddress: 'delivery_address',
  registrationNumber: 'registration_number',
  vatNumber: 'vat_number',
  contactPerson: 'contact_person',
  faxNumber: 'fax_number',
  companyType: 'company_type',
  natureOfBusiness: 'nature_of_business',
  dateEstablished: 'date_established',
  telephone: 'telephone',
  cellNumber: 'cell_number',
  rentalAmount: 'rental_amount',
  rentalExclVat: 'rental_excl_vat',
  rentalTerm: 'rental_term',
  paymentPeriod: 'payment_period',
  payoutAmount: 'payout_amount',
  settlement: 'settlement',
  escalation: 'escalation',
  factor: 'factor',
  docFee: 'doc_fee',
  validUntil: 'valid_until',
  equipmentDescription: 'equipment_description',
  equipmentQuantity: 'equipment_quantity',
  equipmentItems: 'equipment_items',
  bankName: 'bank_name',
  bankBranch: 'bank_branch',
  bankBranchCode: 'bank_branch_code',
  sortCode: 'sort_code',
  accountNumber: 'account_number',
  accountHolder: 'account_holder',
  accountType: 'account_type',
  periodWithBank: 'period_with_bank',
  supplierName: 'supplier_name',
  supplierEmail: 'supplier_email',
  turnover: 'turnover',
  assetValue: 'asset_value',
  solvency: 'solvency',
  auditors: 'auditors',
  auditorsTel: 'auditors_tel',
  insurers: 'insurers',
  insurersContact: 'insurers_contact',
  insurersPolicy: 'insurers_policy_no',
  landlord: 'landlord',
  landlordContact: 'landlord_contact',
  landlordAddress: 'landlord_address',
}

export async function detectDocumentType(file: Blob): Promise<DocumentType | null> {
  if (!genAI) {
    return null
  }

  const buffer = await file.arrayBuffer()
  const base64Data = Buffer.from(buffer).toString('base64')
  const mimeType = file.type || 'application/pdf'

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  })

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: DETECTION_PROMPT },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent classification
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 256, // Small output for classification
      },
    })

    const response = await result.response
    const text = response.text()
    const json = parseModelJson(text)
    const rawType = String(json.type || json.documentType || '').toLowerCase()

    if (rawType.includes('agreement')) return 'rental-agreement'
    if (rawType.includes('application')) return 'rental-credit-application'

    const lower = text.toLowerCase()
    if (lower.includes('agreement')) return 'rental-agreement'
    if (lower.includes('application')) return 'rental-credit-application'
  } catch (error) {
    console.warn('[System] Document detection failed', error)
  }

  return null
}

export async function extractDocumentData(
  file: Blob,
  type: DocumentType,
  supplierId?: string | null
): Promise<DocumentExtractionResult> {
  if (!genAI) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
  }

  // Fetch supplier data if provided
  let supplier: any = null
  if (supplierId && supplierId !== 'unknown') {
    try {
      const { getSupplierById } = await import('@/lib/data')
      supplier = await getSupplierById(supplierId)
    } catch (error) {
      console.warn('[System] Failed to fetch supplier:', error)
    }
  }

  const buffer = await file.arrayBuffer()
  const base64Data = Buffer.from(buffer).toString('base64')
  const mimeType = file.type || 'application/pdf'

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  })

  // Build enhanced prompt with supplier-specific customization
  let basePrompt: string

  if (type === 'sample-template') {
    // For sample templates, use open-ended extraction to capture ALL fields
    basePrompt = SAMPLE_TEMPLATE_PROMPT
  } else if (type === 'rental-agreement') {
    basePrompt = AGREEMENT_PROMPT
  } else {
    basePrompt = APPLICATION_PROMPT
    // If supplier has field_hints, build a custom prompt
    if (supplier?.field_hints) {
      basePrompt = buildCustomApplicationPrompt(supplier.field_hints)
    }
  }

  // Add supplier context (sample extraction as few-shot example)
  let enhancedPrompt = basePrompt
  if (type !== 'sample-template' && supplier?.sample_extraction) {
    enhancedPrompt = `${basePrompt}\n\n${buildSupplierContext(supplier)}`
  }

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: enhancedPrompt },
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent, accurate extraction
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const response = await result.response
  const text = response.text()
  const jsonData = parseModelJson(text)

  if (type === 'rental-agreement') {
    const extractedData = buildAgreementData(jsonData)
    return {
      type,
      extractedData,
      derivedFields: buildAgreementDerivedFields(extractedData),
    }
  }

  // For both sample-template and rental-credit-application
  const extractedData = buildApplicationData(jsonData)
  return {
    type: type === 'sample-template' ? 'rental-credit-application' : type,
    extractedData,
    derivedFields: buildApplicationDerivedFields(extractedData),
  }
}

function parseModelJson(text: string) {
  try {
    // Remove markdown code fence markers
    let cleanText = text.trim()
    // Use String.fromCharCode to avoid backtick parsing issues
    const fence = String.fromCharCode(96, 96, 96) // ```
    const fenceJson = fence + 'json'
    if (cleanText.startsWith(fenceJson)) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith(fence)) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith(fence)) {
      cleanText = cleanText.slice(0, -3)
    }
    return JSON.parse(cleanText.trim())
  } catch (error: any) {
    console.error('JSON Parse Error. Raw text:', text)
    throw new Error(`Failed to parse AI response: ${error.message}. Response length: ${text.length}`)
  }
}

function buildCustomApplicationPrompt(fieldHints: any): string {
  const enabledFields = fieldHints.enabled_fields || []
  const fieldNotes = fieldHints.field_notes || {}
  const dynamicFields = fieldHints.dynamic_fields || {}

  if (enabledFields.length === 0 && Object.keys(dynamicFields).length === 0) {
    // If no fields enabled, fall back to default prompt
    return APPLICATION_PROMPT
  }

  // Build custom prompt with only enabled fields - all fields are treated as equally important
  let prompt = `You are an expert at analyzing rental credit application documents. Extract ALL of the following fields from the document with maximum accuracy. Pay close attention to handwritten text, smaller fonts, and highlighted/shaded areas.\n\n`

  // Group predefined fields by category
  const fieldDefs = APPLICATION_FIELD_DEFINITIONS.filter((f: any) => enabledFields.includes(f.key))
  const fieldsByCategory: Record<string, any[]> = {}

  for (const field of fieldDefs) {
    if (!fieldsByCategory[field.category]) {
      fieldsByCategory[field.category] = []
    }
    fieldsByCategory[field.category].push(field)
  }

  // Add all fields by category (all are treated as equally important)
  for (const [category, fields] of Object.entries(fieldsByCategory)) {
    prompt += `${category.toUpperCase()}:\n`
    for (const field of fields) {
      const note = fieldNotes[field.key] ? ` - ${fieldNotes[field.key]}` : ''
      prompt += `- ${field.promptKey}: ${field.description}${note}\n`
    }
    prompt += `\n`
  }

  // Add dynamic fields specific to this supplier
  if (Object.keys(dynamicFields).length > 0) {
    prompt += `SUPPLIER-SPECIFIC CUSTOM FIELDS (VERY IMPORTANT):\n`
    prompt += `These fields are unique to this supplier's application forms. Look for these field labels anywhere in the document, including:\n`
    prompt += `- Form sections, tables, or boxes specific to this supplier\n`
    prompt += `- Handwritten entries, checkboxes, or dropdown selections\n`
    prompt += `- Fields marked with asterisks, highlighting, or special formatting\n`
    prompt += `- Custom sections at the bottom or top of the form\n\n`

    console.log(`[System] Including ${Object.keys(dynamicFields).length} dynamic fields in extraction prompt:`, Object.keys(dynamicFields))
    for (const [fieldKey, fieldLabel] of Object.entries(dynamicFields)) {
      // Convert snake_case to camelCase for AI prompt
      const camelKey = fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      const note = fieldNotes[fieldKey] ? ` - ${fieldNotes[fieldKey]}` : ''
      prompt += `- ${camelKey}: Extract the value for "${fieldLabel}". Look for this exact label or similar wording anywhere in the document. Extract the value written next to or below this label.${note}\n`
    }
    prompt += `\nIMPORTANT: These supplier-specific fields are critical. Search the entire document carefully for each field label. If you cannot find a field, return "N/A".\n\n`
  }

  // Add extraction rules
  prompt += `EXTRACTION RULES:
1. For amounts: Remove "R", currency symbols, and commas. Return numbers only (e.g., "R17 000.00" → "17000.00").
2. For percentages: Include the % sign (e.g., "10%").
3. For periods: Extract just the number if labeled in months (e.g., "60 months" → "60"), OR keep the full text if units vary.
4. For company type: Look for checkboxes or written indicators for "PTY Ltd", "Close Corp", or "Other".
5. Pay special attention to HIGHLIGHTED/SHADED fields.
6. Check ALL pages of multi-page documents.
7. Handwritten entries are common - read carefully (watch for 5 vs S, 0 vs O, 1 vs I).
8. If a field is truly blank or not found, return "N/A".
9. Do not hallucinate data.
10. For equipment items: Extract as an array of objects with {quantity, description, serial_numbers}.
11. ALL fields are equally important - extract with maximum accuracy.

Return a single JSON object with camelCase keys matching the field names above. No markdown formatting, no extra text.
`

  return prompt
}

function buildSupplierContext(supplier: any): string {
  const sample = supplier.sample_extraction
  if (!sample) return ''

  // Build few-shot example from sample extraction
  let context = `
SUPPLIER-SPECIFIC CONTEXT:
This document is from supplier: ${supplier.name}

Here is a reference extraction from a previous ${supplier.name} application:
${JSON.stringify(sample, null, 2)}

IMPORTANT: Pay special attention to field locations and formats commonly used by this supplier.
Extract the current document using similar patterns and field locations as shown in the reference above.
This will significantly improve extraction accuracy for fields specific to ${supplier.name}.`

  return context
}

function buildAgreementData(jsonData: Record<string, any>): AgreementExtractedData {
  const extractedResult: AgreementExtractedData = {
    rental_agreement_reference: 'N/A',
    company_name: 'N/A',
    renter_address: 'N/A',
    registration_number: 'N/A',
    vat_number: 'N/A',
    contact_number: 'N/A',
    contact_email: 'N/A',
    installation_address: 'N/A',
    id_passport_number: 'N/A',
    agreed_monthly_rental: 'N/A',
    vat_on_rental: 'N/A',
    total_monthly_rental: 'N/A',
    initial_rental_period: 'N/A',
    annual_escalation_rate: 'N/A',
    service_fee: 'N/A',
    commencement_date: 'N/A',
    date_adjustment_indicator: 'N/A',
    bank_name: 'N/A',
    bank_branch: 'N/A',
    bank_branch_code: 'N/A',
    account_holder_name: 'N/A',
    account_number: 'N/A',
    account_type: 'N/A',
    debit_order_date: 'N/A',
    renter_signed_by: 'N/A',
    renter_signed_capacity: 'N/A',
    renter_signed_date: 'N/A',
    renter_signed_location: 'N/A',
    resolution_date: 'N/A',
    resolution_reg_no: 'N/A',
    resolution_held_at: 'N/A',
    resolution_company_name: 'N/A',
    resolution_full_name: 'N/A',
    equipment_items: [],
  }

  for (const [promptKey, schemaKey] of Object.entries(agreementFieldMap)) {
    const value = jsonData[promptKey]

    if (schemaKey === 'equipment_items') {
      extractedResult[schemaKey] = Array.isArray(value)
        ? value.map((item) => ({
          quantity: item?.quantity || 'N/A',
          description: item?.description || 'N/A',
          serial_numbers: item?.serial_numbers || 'N/A',
        }))
        : []
      continue
    }

    if (schemaKey === 'agreed_monthly_rental' || schemaKey === 'vat_on_rental' || schemaKey === 'total_monthly_rental' || schemaKey === 'service_fee') {
      extractedResult[schemaKey] = toFloat(value).toFixed(2)
      continue
    }

    if (schemaKey === 'commencement_date' || schemaKey === 'renter_signed_date' || schemaKey === 'resolution_date') {
      extractedResult[schemaKey] = formatDate(value)
      continue
    }

    extractedResult[schemaKey] =
      value === undefined || value === null || String(value).trim() === '' ? 'N/A' : String(value)
  }

  return extractedResult
}

function buildAgreementDerivedFields(data: AgreementExtractedData): AgreementDerivedFields {
  return {
    agreement_number: normalizeForColumn(data.rental_agreement_reference),
    lessee_name: normalizeForColumn(data.company_name),
    rental_amount:
      numericValue(data.total_monthly_rental) ??
      numericValue(data.agreed_monthly_rental),
    start_date: toISODate(data.commencement_date),
    end_date: undefined,
  }
}

function buildApplicationData(jsonData: Record<string, any>): ApplicationExtractedData {
  const extractedResult: ApplicationExtractedData = {
    applicant_name: 'N/A',
    applicant_email: 'N/A',
    applicant_phone: 'N/A',
    business_name: 'N/A',
    business_address: 'N/A',
    registration_number: 'N/A',
    vat_number: 'N/A',
    contact_person: 'N/A',
    rental_amount: 'N/A',
    rental_term: 'N/A',
    supplier_name: 'N/A',
    supplier_email: 'N/A',
  }

  // Track which keys we've processed from the predefined map
  const processedKeys = new Set<string>()

  for (const [promptKey, schemaKey] of Object.entries(applicationFieldMap)) {
    const value = jsonData[promptKey]
    processedKeys.add(promptKey)

    // Handle equipment items array
    if (schemaKey === 'equipment_items') {
      extractedResult[schemaKey] = Array.isArray(value)
        ? value.map((item) => ({
          quantity: item?.quantity || 'N/A',
          description: item?.description || 'N/A',
          serial_numbers: item?.serial_numbers || 'N/A',
        }))
        : undefined
      continue
    }

    // Handle monetary values
    if (['rental_amount', 'rental_excl_vat', 'payout_amount', 'settlement', 'factor', 'doc_fee'].includes(schemaKey)) {
      const numVal = toFloat(value)
        ; (extractedResult as any)[schemaKey] = numVal > 0 ? numVal.toFixed(2) : 'N/A'
      continue
    }

    // Handle all other fields
    const strValue = value === undefined || value === null || String(value).trim() === '' ? 'N/A' : String(value)
      ; (extractedResult as any)[schemaKey] = strValue
  }

  // Capture any dynamic fields (from supplier-specific templates) that weren't in the predefined map
  const dynamicFieldsCaptured: string[] = []
  for (const [camelKey, value] of Object.entries(jsonData)) {
    if (!processedKeys.has(camelKey) && value !== undefined && value !== null) {
      // Convert camelCase to snake_case
      const snakeKey = camelKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      const strValue = String(value).trim() === '' ? 'N/A' : String(value)
        ; (extractedResult as any)[snakeKey] = strValue
      dynamicFieldsCaptured.push(snakeKey)
    }
  }

  if (dynamicFieldsCaptured.length > 0) {
    console.log(`[System] Captured ${dynamicFieldsCaptured.length} dynamic fields from application:`, dynamicFieldsCaptured)
  }

  return extractedResult
}

function buildApplicationDerivedFields(data: ApplicationExtractedData): ApplicationDerivedFields {
  return {
    applicant_name: normalizeForColumn(data.applicant_name),
    applicant_email: normalizeForColumn(data.applicant_email),
    applicant_phone: normalizeForColumn(data.applicant_phone),
    business_name: normalizeForColumn(data.business_name),
    rental_amount: numericValue(data.rental_amount),
    rental_term: normalizeForColumn(data.rental_term),
  }
}

function normalizeForColumn(value?: string) {
  if (!value || value === 'N/A') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function numericValue(value?: string) {
  if (!value || value === 'N/A') {
    return undefined
  }
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toISODate(value?: string) {
  if (!value || value === 'N/A') {
    return undefined
  }

  const match = value.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (!match) {
    return undefined
  }

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function toFloat(val: string | number | null | undefined, defaultValue = 0): number {
  if (val === null || val === undefined || val === '') {
    return defaultValue
  }

  try {
    const cleanedVal = String(val).replace(/[^\d.-]/g, '')
    return Number.parseFloat(cleanedVal) || defaultValue
  } catch {
    return defaultValue
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A'

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      let day
      let month
      let year
      const dateMatchDDMMYYYY = dateStr.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
      const dateMatchYYYYMMDD = dateStr.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
      const dateMatchDayMonthYear = dateStr.match(/(\d{1,2})\s+(?:of)?\s*([A-Za-z]+)\s+(\d{4})/)
      const dateMatchDayYear = dateStr.match(/(\d{1,2})\s+day\s+of\s+(\d{4})/)

      if (dateMatchDDMMYYYY) {
        day = dateMatchDDMMYYYY[1]
        month = dateMatchDDMMYYYY[2]
        year = dateMatchDDMMYYYY[3]
      } else if (dateMatchYYYYMMDD) {
        year = dateMatchYYYYMMDD[1]
        month = dateMatchYYYYMMDD[2]
        day = dateMatchYYYYMMDD[3]
      } else if (dateMatchDayMonthYear) {
        day = dateMatchDayMonthYear[1]
        const monthName = dateMatchDayMonthYear[2].toLowerCase()
        const monthNames = [
          'january',
          'february',
          'march',
          'april',
          'may',
          'june',
          'july',
          'august',
          'september',
          'october',
          'november',
          'december',
        ]
        month = String(monthNames.indexOf(monthName) + 1)
        year = dateMatchDayMonthYear[3]
      } else if (dateMatchDayYear) {
        day = dateMatchDayYear[1]
        month = '01'
        year = dateMatchDayYear[2]
      } else {
        return 'N/A'
      }

      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
    }

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  } catch {
    return 'N/A'
  }
}
