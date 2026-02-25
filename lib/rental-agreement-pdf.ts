import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getWorkflowBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

type ApplicationRecord = {
  id: string
  business_name?: string | null
  applicant_name?: string | null
  applicant_email?: string | null
  applicant_phone?: string | null
  rental_amount?: number | null
  rental_term?: string | null
  document_name?: string | null
  created_at?: string | null
  extracted_data?: any
}

type GeneratedAgreementMeta = {
  url: string
  name: string
  number: string
}

type EquipmentRow = {
  quantity: string
  description: string
  serial: string
}

type DateParts = {
  day: string
  month: string
  year: string
}

type AgreementContext = {
  businessName: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  businessAddress: string
  registrationNumber: string
  vatNumber: string
  contactPerson: string
  rentalAmount: number
  monthlyVat: number
  totalMonthly: number
  annualEscalation: string
  rentalTerm: string
  commencementDate: string
  agreementNumber: string
  bankName: string
  branchName: string
  branchCode: string
  accountNumber: string
  accountHolder: string
  accountType: string
  idNumber: string
  boardLocation: string
  boardCompany: string
  boardRegNo: string
  boardFullName: string
  boardDateParts: DateParts
  ccfDateParts: DateParts
  renterDateParts: DateParts
  renterSignLocation: string
  ccfSignLocation: string
  ccfName: string
  debitDay: string
  witnessOne: string
  witnessTwo: string
  equipmentRows: EquipmentRow[]
  applicantInitials: string
  signatoryCapacity: string
  dateAdjustment: 'Y' | 'N' | ''
}

const AGREEMENT_TEMPLATE_FILENAMES = [
  'CCF-Rental-Agreement-Non-CPA.pdf',
  'Rental-agreement.pdf',
]

export async function generateAndStoreRentalAgreement(application: ApplicationRecord, customData?: any): Promise<GeneratedAgreementMeta> {
  const pdfBytes = await buildAgreementPdf(application, customData)
  const supabase = createServerClient()
  const fileName = buildAgreementFileName(application)
  const bucketCandidates = getWorkflowBucketCandidates('rental-agreement')
  const storagePath = buildAgreementStoragePath(application, fileName)

  let publicUrl: string | null = null
  let lastError: any = null

  for (const bucket of bucketCandidates) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      lastError = uploadError
      continue
    }

    const { data: urlData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    if (urlError) {
      lastError = urlError
      continue
    }

    publicUrl = urlData.publicUrl
    break
  }

  if (!publicUrl) {
    throw new Error(lastError?.message || 'Failed to upload generated agreement')
  }

  // Save MRA to supporting_documents table so it shows in Step 5
  const { error: dbError } = await supabase
    .from('custom_supporting_documents')
    .insert({
      application_id: application.id,
      document_url: publicUrl,
      document_name: fileName,
      document_type: 'Master Rental Agreement',
      uploaded_at: new Date().toISOString()
    })

  if (dbError) {
    console.error('Failed to insert MRA metadata to supporting_documents', dbError)
    // Don't throw - still return the agreement metadata as it was uploaded successfully
  }

  return {
    url: publicUrl,
    name: fileName,
    number: buildAgreementNumber(application),
  }
}

async function buildAgreementPdf(application: ApplicationRecord, customData?: any) {
  const parsedExtracted = normalizeExtracted(application.extracted_data)
  const context = deriveAgreementContext(application, parsedExtracted, customData)

  try {
    const templateBytes = await loadAgreementTemplate()
    if (templateBytes) {
      return await buildAgreementFromTemplate(context, templateBytes)
    }
  } catch (err) {
    console.warn('[agreement] Failed to render template, falling back to vector layout', err)
  }

  return buildAgreementFromScratch(context)
}

async function loadAgreementTemplate() {
  for (const fileName of AGREEMENT_TEMPLATE_FILENAMES) {
    const filePath = path.join(process.cwd(), 'public', fileName)
    try {
      return await fs.readFile(filePath)
    } catch {
      // Try next candidate
    }
  }

  console.warn(
    `[agreement] Template PDF missing. Checked: ${AGREEMENT_TEMPLATE_FILENAMES
      .map((f) => path.join(process.cwd(), 'public', f))
      .join(', ')}`
  )
  return null
}

function deriveAgreementContext(application: ApplicationRecord, parsedExtracted: Record<string, any>, customData?: any): AgreementContext {
  const hasCustom = (key: string) => Boolean(customData && Object.prototype.hasOwnProperty.call(customData, key))
  const customText = (key: string) => (hasCustom(key) ? safe(customData[key]) : null)

  // Prioritize explicit customData (including intentional blank), then extracted_data/application.
  const businessName = customText('businessName') ?? safe(application.business_name) ?? safe(parsedExtracted.business_name)
  const applicantName = customText('renterSignatoryName') ?? safe(application.applicant_name) ?? safe(parsedExtracted.applicant_name)
  const applicantEmail = customText('applicantEmail') ?? safe(application.applicant_email) ?? safe(parsedExtracted.applicant_email)
  const applicantPhone = customText('applicantPhone') ?? safe(application.applicant_phone) ?? safe(parsedExtracted.applicant_phone)
  const businessAddress = customText('businessAddress') ?? safe(parsedExtracted.business_address)
  const registrationNumber = customText('registrationNumber') ?? safe(parsedExtracted.registration_number)
  const vatNumber = customText('vatNumber') ?? safe(parsedExtracted.vat_number)
  const contactPerson = customText('contactPerson') ?? safe(parsedExtracted.contact_person) ?? applicantName

  const rentalAmount = hasCustom('rentalAmount')
    ? (numberFrom(customData?.rentalAmount) ?? 0)
    : (numberFrom(application.rental_amount) ?? numberFrom(parsedExtracted.rental_amount) ?? 0)
  const monthlyVat = hasCustom('monthlyVat')
    ? (numberFrom(customData?.monthlyVat) ?? 0)
    : (rentalAmount * 0.15)
  const totalMonthly = hasCustom('totalMonthly')
    ? (numberFrom(customData?.totalMonthly) ?? 0)
    : (rentalAmount + monthlyVat)
  const annualEscalation = customText('annualEscalation') ?? safe(parsedExtracted.escalation)
  const rentalTerm = customText('rentalTerm') ?? safe(application.rental_term) ?? safe(parsedExtracted.rental_term)
  const commencementDate = customText('commencementDate') ?? formatDate(application.created_at)
  const agreementNumber = buildAgreementNumber(application)

  const bankName = customText('bankName') ?? safe(parsedExtracted.bank_name) ?? safe(parsedExtracted.bank)
  const branchName = customText('branchName') ?? safe(parsedExtracted.branch_name) ?? safe(parsedExtracted.branch)
  const branchCode = customText('branchCode') ?? safe(parsedExtracted.branch_code)
  const accountNumber = customText('accountNumber') ?? safe(parsedExtracted.account_number)
  const accountHolder = customText('accountHolder') ?? safe(parsedExtracted.account_holder) ?? businessName
  const accountType = customText('accountType') ?? safe(parsedExtracted.account_type)
  const idNumber = customText('idNumber') ?? safe(parsedExtracted.contact_id) ?? safe(parsedExtracted.director_id)
  const boardLocation = customText('boardResolutionLocation') ?? safe(parsedExtracted.board_location) ?? safe(parsedExtracted.board_resolution_location) ?? businessAddress
  const boardCompany = customText('boardResolutionCompany') ?? businessName
  const boardRegNo = customText('boardResolutionRegNo') ?? registrationNumber
  const boardFullName = customText('boardResolutionFullName') ?? applicantName
  const renterSignLocation = customText('renterSignLocation') ?? safe(parsedExtracted.renter_sign_location) ?? businessAddress
  const ccfSignLocation = customText('ccfSignedOnBehalfOf') ?? boardLocation
  const ccfName = customText('ccfSignatoryName') ?? ''
  const debitDay = customText('debitDay') ?? safe(parsedExtracted.debit_day)
  const witnessOne = customText('witnessOne') ?? safe(parsedExtracted.witness_one)
  const witnessTwo = customText('witnessTwo') ?? safe(parsedExtracted.witness_two)
  const ccfDateParts = resolveCustomDateParts(
    safe(customData?.ccfSignDay),
    safe(customData?.ccfSignMonth),
    safe(customData?.ccfSignYear),
    safe(customData?.ccfSignDate)
  )
  const renterDateParts = resolveCustomDateParts(
    safe(customData?.renterSignDay),
    safe(customData?.renterSignMonth),
    safe(customData?.renterSignYear),
    safe(customData?.renterSignDate)
  )
  const boardDateParts = (
    hasCustom('boardResolutionDay') ||
    hasCustom('boardResolutionMonth') ||
    hasCustom('boardResolutionYear') ||
    hasCustom('boardResolutionDate')
  )
    ? resolveCustomDateParts(
      safe(customData?.boardResolutionDay),
      safe(customData?.boardResolutionMonth),
      safe(customData?.boardResolutionYear),
      safe(customData?.boardResolutionDate)
    )
    : splitDateParts(safe(parsedExtracted.board_resolution_date) || commencementDate)
  const equipmentRows = hasCustom('equipmentItems') ? resolveEquipmentRowsFromCustom(customData.equipmentItems) : resolveEquipmentRows(parsedExtracted)
  const applicantInitials = hasCustom('applicantInitials')
    ? safe(customData?.applicantInitials)
    : initialsFromName(applicantName || businessName)
  const signatoryCapacity = customText('boardResolutionCapacity') ?? safe(parsedExtracted.signatory_capacity)
  const dateAdjustment = hasCustom('dateAdjustment')
    ? ((safe(customData?.dateAdjustment).toUpperCase().startsWith('N') ? 'N' : safe(customData?.dateAdjustment).toUpperCase().startsWith('Y') ? 'Y' : '') as 'Y' | 'N' | '')
    : ((safe(parsedExtracted.date_adjustment_indicator) || 'Y').toUpperCase().startsWith('N') ? 'N' : 'Y')

  return {
    businessName,
    applicantName,
    applicantEmail,
    applicantPhone,
    businessAddress,
    registrationNumber,
    vatNumber,
    contactPerson,
    rentalAmount,
    monthlyVat,
    totalMonthly,
    annualEscalation,
    rentalTerm,
    commencementDate,
    agreementNumber,
    bankName,
    branchName,
    branchCode,
    accountNumber,
    accountHolder,
    accountType,
    idNumber,
    boardLocation,
    boardCompany,
    boardRegNo,
    boardFullName,
    boardDateParts,
    ccfDateParts,
    renterDateParts,
    renterSignLocation,
    ccfSignLocation,
    ccfName,
    debitDay,
    witnessOne,
    witnessTwo,
    equipmentRows,
    applicantInitials,
    signatoryCapacity,
    dateAdjustment,
  }
}

async function buildAgreementFromTemplate(context: AgreementContext, templateBytes: Uint8Array) {
  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()
  const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  form.updateFieldAppearances(defaultFont)

  setTextField(form, 'RENTAL AGREEMENT NO REFERENCE', context.agreementNumber)
  setTextField(form, 'Renter', context.businessName)
  setTextField(form, 'Address', context.businessAddress)
  setTextField(form, 'Registration No', context.registrationNumber)
  setTextField(form, 'Vat No', context.vatNumber)
  setTextField(form, 'Tel No', context.applicantPhone)
  setTextField(form, 'Invoice Email', context.applicantEmail)
  setTextField(form, 'Installation Address', context.businessAddress)
  setTextField(form, 'IDPassport No', context.idNumber)

  setEquipmentRows(form, context.equipmentRows)

  setTextField(form, 'Agreed Monthly Rental', formatCurrency(context.rentalAmount))
  setTextField(form, 'VAT', formatCurrency(context.monthlyVat))
  setTextField(form, 'Total Monthly Rental', formatCurrency(context.totalMonthly))
  setTextField(form, 'Initial Rental Period', context.rentalTerm)
  setTextField(form, 'Annual Escalation Rate', context.annualEscalation)

  setTextField(form, 'Bank', context.bankName)
  setTextField(form, 'Branch Code', context.branchCode)
  setTextField(form, 'Account No', context.accountNumber)
  setTextField(form, 'Branch', context.branchName)
  setTextField(form, 'Name of Account Holder', context.accountHolder)
  setTextField(form, 'Account Type', context.accountType)

  setTextField(form, 'Extract of the minutes of the meeting of the Board of Directors  Members of', context.boardCompany)
  setTextField(form, 'Reg No', context.boardRegNo)
  setTextField(form, 'held at', context.boardLocation)
  setTextField(form, 'Full Names', context.boardFullName)
  setTextField(form, 'In hisher capacity as', context.signatoryCapacity)

  setTextField(form, 'Witness', context.witnessOne)
  setTextField(form, 'Witness_2', context.witnessTwo)
  setDateGroup(form, '', context.ccfDateParts)
  setDateGroup(form, '_2', context.renterDateParts)
  setDateGroup(form, '_3', context.boardDateParts)

  setTextField(form, 'Text56', context.ccfSignLocation)
  setTextField(form, 'Text57', context.renterSignLocation)
  setTextField(form, 'Text58', context.ccfName)
  setTextField(form, 'Text59', context.applicantName)
  setTextField(form, 'Text62', context.boardFullName)
  setTextField(form, 'Text63', '')
  setTextField(form, 'Text64', '')
  setTextField(form, 'Text65', '')

  setTextField(form, 'Renter initials', context.applicantInitials)
  setTextField(form, 'CCF initials', 'CCF')

  setCheckbox(form, 'Check Box60', context.dateAdjustment === 'Y')
  setCheckbox(form, 'Check Box61', context.dateAdjustment === 'N')

  form.flatten()
  return pdfDoc.save()
}

async function buildAgreementFromScratch(context: AgreementContext) {
  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()
  const margin = 36
  let cursorY = height - margin

  page.drawText('RENTAL AGREEMENT (NON-CPA)', {
    x: margin,
    y: cursorY,
    size: 18,
    font: boldFont,
    color: rgb(0.15, 0.15, 0.15),
  })

  page.drawText('between Custom Capital Finance (Pty) Ltd and the Renter listed below.', {
    x: margin,
    y: cursorY - 18,
    size: 10,
    font: regularFont,
    color: rgb(0.15, 0.15, 0.15),
  })

  cursorY -= 40
  drawSectionHeading(page, 'Renter Information', cursorY, boldFont)
  cursorY -= 16
  const infoRows = [
    ['Renter', context.businessName],
    ['Agreement No.', context.agreementNumber],
    ['Address', context.businessAddress],
    ['Registration No.', context.registrationNumber],
    ['VAT No.', context.vatNumber],
    ['Contact Person', context.contactPerson],
    ['Email', context.applicantEmail],
    ['Phone', context.applicantPhone],
  ]
  cursorY = drawKeyValueGrid(page, infoRows, margin, cursorY, width - margin * 2, regularFont)

  cursorY -= 20
  drawSectionHeading(page, 'Schedule of Rental', cursorY, boldFont)
  cursorY -= 16
  const rentalRows = [
    ['Agreed Monthly Rental', formatCurrency(context.rentalAmount)],
    ['VAT on Rental (15%)', formatCurrency(context.monthlyVat)],
    ['Total Monthly Rental', formatCurrency(context.totalMonthly)],
    ['Initial Rental Period', context.rentalTerm],
    ['Annual Escalation Rate', context.annualEscalation],
    ['Commencement Date', context.commencementDate],
    ['Service Fee', 'R69.00 p/m incl. VAT'],
    ['Date Adjustment Indicator', context.dateAdjustment],
  ]
  cursorY = drawKeyValueGrid(page, rentalRows, margin, cursorY, width - margin * 2, regularFont)

  cursorY -= 20
  drawSectionHeading(page, 'Schedule of Equipment', cursorY, boldFont)
  cursorY -= 18
  const equipmentForTable = context.equipmentRows.filter((item) => item.description?.length)
  drawEquipmentTable(
    page,
    equipmentForTable.length ? equipmentForTable : [
      {
        quantity: 'Varies',
        description: `Equipment financed for ${context.businessName}`,
        serial: 'Provided on delivery',
      },
    ],
    margin,
    cursorY,
    width - margin * 2,
    regularFont
  )
  cursorY -= 90

  drawSectionHeading(page, 'Authority and Mandate for Debit Payment Instructions', cursorY, boldFont)
  cursorY -= 16
  cursorY = drawWrappedText(
    page,
    'The Renter authorises Custom Capital Finance (CCF) to issue payment instructions against the stated bank account for the rental obligations under this agreement. Instructions will only match the obligations agreed herein. If a payment day falls on a weekend or public holiday, CCF may process on the next business day.',
    margin,
    cursorY,
    width - margin * 2,
    12,
    regularFont
  )

  cursorY -= 12
  cursorY = drawWrappedText(
    page,
    'The Renter acknowledges that cancellations of this mandate do not cancel the underlying rental agreement and that the mandate may be ceded if the agreement is ceded.',
    margin,
    cursorY,
    width - margin * 2,
    12,
    regularFont
  )

  cursorY -= 20
  drawSectionHeading(page, 'Board Resolution Summary', cursorY, boldFont)
  cursorY -= 16
  cursorY = drawWrappedText(
    page,
    'It was resolved that the company enters into rental agreements with Custom Capital Finance and that the authorised signatory below may sign all documents and perform all actions required to give effect to this resolution.',
    margin,
    cursorY,
    width - margin * 2,
    12,
    regularFont
  )

  cursorY -= 20
  drawSignatureBlock(page, {
    renterName: context.businessName,
    signatory: context.applicantName,
    capacity: context.signatoryCapacity,
    location: context.renterSignLocation,
    date: context.commencementDate || '____ / ____ / ______',
  }, margin, cursorY, width - margin * 2, regularFont, boldFont)

  const termsPage = pdfDoc.addPage([595, 842])
  drawSectionHeading(termsPage, 'Conditions of Hire', 806, boldFont)
  drawTermsContent(termsPage, regularFont)

  return pdfDoc.save()
}

function resolveEquipmentRows(parsed: any): EquipmentRow[] {
  const fromArray = Array.isArray(parsed?.equipment) ? parsed.equipment : []
  const mapped: EquipmentRow[] = fromArray
    .map((item: any) => ({
      quantity: safe(item?.quantity),  // Allow empty - no hardcoded '1' default
      description: safe(item?.description) || '',
      serial: safe(item?.serial),  // Allow empty - no hardcoded 'To be provided' default
    }))
    .filter((item: EquipmentRow) => item.description.length > 0)

  if (!mapped.length) {
    mapped.push({
      quantity: safe(parsed?.equipment_quantity),  // Allow empty - no hardcoded '1' default
      description: safe(parsed?.equipment_description),
      serial: safe(parsed?.equipment_serial),  // Allow empty - no hardcoded 'To be provided' default
    })
  }

  while (mapped.length < 3) {
    mapped.push({ quantity: '', description: '', serial: '' })
  }

  return mapped.slice(0, 3)
}

function resolveEquipmentRowsFromCustom(items: any[]): EquipmentRow[] {
  if (!Array.isArray(items)) {
    return [{ quantity: '', description: '', serial: '' }]  // No hardcoded defaults
  }

  const mapped: EquipmentRow[] = items
    .map((item: any) => ({
      quantity: safe(item?.quantity),  // Allow empty - no hardcoded '1' default
      description: safe(item?.description) || '',
      serial: safe(item?.serial),  // Allow empty - no hardcoded 'To be provided' default
    }))
    .filter((item: EquipmentRow) => item.description.length > 0)

  while (mapped.length < 3) {
    mapped.push({ quantity: '', description: '', serial: '' })
  }

  return mapped.slice(0, 3)
}

function setEquipmentRows(form: ReturnType<PDFDocument['getForm']>, rows: EquipmentRow[]) {
  const [row1, row2, row3] = rows
  if (row1) {
    setTextField(form, 'Quantity 1', row1.quantity)
    setTextField(form, '1', row1.description)
    setTextField(form, 'Serial Numbers 1', row1.serial)
  }
  if (row2) {
    setTextField(form, 'Quantity 2', row2.quantity)
    setTextField(form, '2', row2.description)
    setTextField(form, 'Serial Numbers 2', row2.serial)
  }
  if (row3) {
    setTextField(form, 'undefined_3', row3.quantity)
    setTextField(form, 'undefined_4', row3.description)
    setTextField(form, 'undefined_5', row3.serial)
  }
}

function setTextField(form: ReturnType<PDFDocument['getForm']>, name: string, value: string) {
  try {
    const field = form.getTextField(name)
    const defaultFont = (form as any).getDefaultFont?.()
    if (defaultFont) {
      setTextFieldAutoSized(field, value || '', defaultFont)
      return
    }
    // Fallback if default font is unavailable.
    field.setText(value || '')
    field.setFontSize(10)
  } catch {
    // Field not present in the template, ignore.
  }
}

function setCheckbox(form: ReturnType<PDFDocument['getForm']>, name: string, checked: boolean) {
  try {
    const field = form.getCheckBox(name)
    if (checked) {
      field.check()
    } else {
      field.uncheck()
    }
  } catch {
    // Field not present in the template, ignore.
  }
}

function setDateGroup(form: ReturnType<PDFDocument['getForm']>, suffix: '' | '_2' | '_3', parts: DateParts) {
  const yearSuffix = parts.year.slice(-2)
  setTextField(form, `on the${suffix}`, parts.day)
  setTextField(form, `day of${suffix}`, parts.month)
  setTextField(form, `20${suffix}`, yearSuffix)
}

function buildAgreementStoragePath(application: ApplicationRecord, fileName: string) {
  const safeId = (application.id || 'application').replace(/[^\w-]/g, '_')
  return `agreements/generated/${safeId}/${fileName}`
}

function normalizeExtracted(raw: any) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw
}

function safe(value?: string | null) {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed.length || trimmed.toLowerCase() === 'n/a') {
    return ''
  }
  return trimmed
}

function numberFrom(value?: string | number | null) {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'R0.00'
  return `R${value.toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) {
    const now = new Date()
    return now.toISOString().substring(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toISOString().substring(0, 10)
}

function splitDateParts(value: string): DateParts {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '' }
  }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleString('en-ZA', { month: 'long' }),
    year: String(date.getFullYear()),
  }
}

function resolveCustomDateParts(day: string, month: string, year: string, fallbackDate = ''): DateParts {
  // If any explicit part is provided, trust manual input and normalize lightly.
  if (day || month || year) {
    const cleanDay = day ? day.replace(/[^\d]/g, '').slice(0, 2) : ''
    const cleanYear = year ? year.replace(/[^\d]/g, '').slice(0, 4) : ''
    return {
      day: cleanDay,
      month: month || '',
      year: cleanYear,
    }
  }

  // Backward compatibility with old single date input payload.
  if (fallbackDate) {
    return splitDateParts(fallbackDate)
  }

  return { day: '', month: '', year: '' }
}

function initialsFromName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function buildAgreementNumber(application: ApplicationRecord) {
  const year = application.created_at ? new Date(application.created_at).getFullYear() : new Date().getFullYear()
  return `CCF-AG-${year}-${application.id.slice(0, 4).toUpperCase()}`
}

function buildAgreementFileName(application: ApplicationRecord) {
  const base = application.business_name || application.document_name || 'Rental-Agreement'
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'rental-agreement'
  return `${slug}-agreement.pdf`
}

function drawSectionHeading(page: any, text: string, y: number, font: any) {
  page.drawText(text.toUpperCase(), {
    x: 36,
    y,
    font,
    size: 10,
    color: rgb(0.33, 0.29, 0.18),
  })
  page.drawLine({
    start: { x: 36, y: y - 2 },
    end: { x: 559, y: y - 2 },
    thickness: 0.5,
    color: rgb(0.83, 0.82, 0.78),
  })
}

function drawKeyValueGrid(page: any, rows: string[][], x: number, startY: number, width: number, font: any) {
  const halfWidth = width / 2 - 8
  let y = startY
  rows.forEach((row, index) => {
    const columnX = index % 2 === 0 ? x : x + halfWidth + 16
    if (index % 2 === 0 && index !== 0) {
      y -= 28
    }
    page.drawText(row[0], { x: columnX, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
    page.drawText(row[1] || '', { x: columnX, y: y - 12, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
  })
  return y - 32
}

function drawEquipmentTable(page: any, items: EquipmentRow[], x: number, y: number, width: number, font: any) {
  const headers = ['Quantity', 'Description of Equipment', 'Serial Numbers']
  const columnWidths = [80, width - 200, 120]
  let currentX = x
  headers.forEach((header, index) => {
    page.drawText(header, { x: currentX, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
    currentX += columnWidths[index]
  })
  let rowY = y - 14
  items.forEach((item) => {
    page.drawText(item.quantity || '', { x, y: rowY, size: 10, font })
    page.drawText(item.description || '', { x: x + columnWidths[0], y: rowY, size: 10, font })
    page.drawText(item.serial || '', { x: x + columnWidths[0] + columnWidths[1], y: rowY, size: 10, font })
    rowY -= 16
  })
  page.drawLine({ start: { x, y: y + 4 }, end: { x: x + width, y: y + 4 }, thickness: 0.5, color: rgb(0.83, 0.82, 0.78) })
  page.drawLine({ start: { x, y: rowY + 10 }, end: { x: x + width, y: rowY + 10 }, thickness: 0.5, color: rgb(0.83, 0.82, 0.78) })
}

function drawWrappedText(page: any, text: string, x: number, startY: number, maxWidth: number, lineHeight: number, font: any) {
  const words = text.split(/\s+/)
  let line = ''
  let y = startY
  words.forEach((word) => {
    const testLine = line.length ? `${line} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, 10)
    if (width > maxWidth) {
      page.drawText(line, { x, y, size: 10, font })
      line = word
      y -= lineHeight
    } else {
      line = testLine
    }
  })
  if (line) {
    page.drawText(line, { x, y, size: 10, font })
    y -= lineHeight
  }
  return y
}

function drawSignatureBlock(page: any, details: { renterName: string; signatory: string; capacity: string; location: string; date: string }, x: number, y: number, width: number, font: any, boldFont: any) {
  const boxHeight = 90
  page.drawRectangle({
    x,
    y: y - boxHeight,
    width,
    height: boxHeight,
    borderColor: rgb(0.83, 0.82, 0.78),
    borderWidth: 0.5,
  })

  page.drawText('Signed on behalf of the Renter', { x: x + 10, y: y - 20, size: 10, font: boldFont })
  page.drawText(`Renter: ${details.renterName}`, { x: x + 10, y: y - 35, size: 10, font })
  page.drawText(`Name of Signatory: ${details.signatory}`, { x: x + 10, y: y - 50, size: 10, font })
  page.drawText(`Capacity: ${details.capacity}`, { x: x + 10, y: y - 65, size: 10, font })
  page.drawText(`Signed at: ${details.location}`, { x: x + width / 2, y: y - 50, size: 10, font })
  page.drawText(`Date: ${details.date}`, { x: x + width / 2, y: y - 65, size: 10, font })
}

function drawTermsContent(page: any, font: any) {
  let y = 780
  TERMS_PARAGRAPHS.forEach((paragraph) => {
    page.drawText(paragraph.title, { x: 36, y, font, size: 11, color: rgb(0.15, 0.15, 0.15) })
    y -= 14
    y = drawWrappedText(page, paragraph.body, 36, y, 523, 12, font) - 8
  })
}

const TERMS_PARAGRAPHS = [
  {
    title: '1. Interpretation and Duration',
    body: 'This agreement governs the hire of the equipment described on the cover page. It commences once Custom Capital Finance purchases the equipment and settles the supplier invoice. The initial rental period is stated in the Schedule of Rental and automatically renews to the next anniversary unless either party gives 90 days written notice prior to the anniversary date.',
  },
  {
    title: '2. Delivery and Ownership',
    body: 'The equipment is selected by the Renter and delivered by the supplier. Risk passes to the Renter on delivery. Ownership remains with Custom Capital Finance (or its cessionary) at all times, and the Renter must keep the equipment insured, maintained, and within the Republic of South Africa.',
  },
  {
    title: '3. Rentals and Escalations',
    body: 'Rentals are payable monthly in advance via debit order. Late payments may attract interest at prime plus six percent. Rentals escalate annually at the agreed escalation rate and may also adjust if applicable tax or regulatory changes impact Custom Capital Finance.',
  },
  {
    title: '4. Insurance and Liability',
    body: 'The Renter must insure the equipment for its full replacement value, ceding the policy to Custom Capital Finance. Loss or damage must be reported immediately and does not relieve the Renter from rental obligations.',
  },
  {
    title: '5. Breach',
    body: 'Failure to pay rentals, insolvency events, unauthorised relocation, or other breaches constitute an event of default. Custom Capital Finance may cancel the agreement, repossess the equipment, and claim all amounts still due for the remainder of the term.',
  },
  {
    title: '6. Jurisdiction and Costs',
    body: "The parties consent to the jurisdiction of the Magistrate's Court. The Renter is liable for all legal and collection costs on an attorney-and-own-client scale if enforcement action is required.",
  },
]
