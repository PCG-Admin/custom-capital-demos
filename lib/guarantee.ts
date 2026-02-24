import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const GUARANTEE_TEMPLATE_FILENAME = 'CCF-Guarantee.pdf'
const GUARANTEE_TEMPLATE_PATH = path.join(process.cwd(), 'public', GUARANTEE_TEMPLATE_FILENAME)

type ApplicationRecord = {
  id: string
  business_name?: string | null
  applicant_name?: string | null
  // ... other fields
}

type GuarantorInfo = {
  iWe: string
  idRegNo: string
  signedAt: string
  on: string
  identityNumber: string
  streetAddress: string
  postalAddress1: string
  postalAddress2: string
  witnessFullName: string
}

export type GuaranteeData = {
  theDebtsOf: string
  legalEntity: string
  regNo: string
  guarantor1: GuarantorInfo
  guarantor2: GuarantorInfo
}

export async function generateAndStoreGuarantee(application: ApplicationRecord, data: GuaranteeData) {
  try {
    const pdfBytes = await buildGuaranteePdf(application, data)
    const supabase = createServerClient()
    const fileName = `CCF-Guarantee-${application.id.slice(0, 8)}.pdf`
    const storagePath = `applications/${application.id}/${fileName}`

    let publicUrl: string | null = null
    let lastError: any = null
    const bucketCandidates = getSupportingBucketCandidates() // ['supporting-documents', 'supporting_documents']

    for (const bucket of bucketCandidates) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError) {
        lastError = uploadError
        continue
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      if (urlData?.publicUrl) {
        publicUrl = urlData.publicUrl
        break
      }
    }

    if (!publicUrl) {
      console.error('Failed to upload guarantee document', lastError)
      return null
    }

    const { error: dbError } = await supabase
      .from('custom_supporting_documents')
      .insert({
        application_id: application.id,
        document_url: publicUrl,
        document_name: fileName,
        document_type: 'Personal Guarantee',
        uploaded_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Failed to insert guarantee metadata', dbError)
      return null
    }

    return publicUrl
  } catch (error) {
    console.error('Error generating guarantee document:', error)
    return null
  }
}

async function buildGuaranteePdf(application: ApplicationRecord, data: GuaranteeData) {
  let pdfDoc: PDFDocument

  try {
    console.log('[guarantee] Loading template:', GUARANTEE_TEMPLATE_PATH)
    const templateBytes = await fs.readFile(GUARANTEE_TEMPLATE_PATH)
    pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

    const form = pdfDoc.getForm()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Debug: Log fields to help identify field names
    try {
      console.log('[guarantee] PDF Fields:', form.getFields().map(f => f.getName()))
      console.log('[guarantee] Data:', data)
    } catch (e) {
      console.warn('[guarantee] Could not list fields', e)
    }

    const setField = (name: string, value: string) => {
      try {
        const field = form.getTextField(name)
        setTextFieldAutoSized(field, value || '', font)
        console.log(`[guarantee] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
      } catch (e) {
        console.warn(`[guarantee] ✗ Failed to set field "${name}":`, (e as Error).message)
      }
    }

    const formatGuaranteeDate = (value: string) => {
      const raw = String(value || '').trim()
      if (!raw) return ''
      // Date picker values come in as YYYY-MM-DD; render as "D Month YYYY" for the single PDF date fields.
      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (isoMatch) {
        const [, year, month, day] = isoMatch
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        const monthIndex = Number(month) - 1
        const dayNumber = Number(day)
        if (monthIndex >= 0 && monthIndex < 12 && Number.isFinite(dayNumber)) {
          return `${dayNumber} ${monthNames[monthIndex]} ${year}`
        }
      }
      return raw
    }

    const guarantor1Date = formatGuaranteeDate(data.guarantor1.on)
    const guarantor2Date = formatGuaranteeDate(data.guarantor2.on)

    // Map data to PDF field names
    // Debt information
    setField('the Debts of', data.theDebtsOf)
    setField('Legal Entity', data.legalEntity)
    setField('Reg No', data.regNo)

    // Guarantor 1
    setField('IWe', data.guarantor1.iWe)
    setField('IDReg No', data.guarantor1.idRegNo)
    setField('1 Signed at', data.guarantor1.signedAt)
    setField('Signed at', data.guarantor1.signedAt)  // Alternative field name
    setField('on', guarantor1Date)
    setField('On', guarantor1Date)  // Alternative field name
    setField('Identity Number', data.guarantor1.identityNumber)
    setField('Street Address', data.guarantor1.streetAddress)
    setField('Postal Address 1', data.guarantor1.postalAddress1)
    setField('Postal Address 2', data.guarantor1.postalAddress2)
    setField('Witness Full Name', data.guarantor1.witnessFullName)

    // Guarantor 2
    setField('IWe_2', data.guarantor2.iWe)
    setField('IDReg No_2', data.guarantor2.idRegNo)
    setField('2 Signed at', data.guarantor2.signedAt)
    setField('Signed at_2', data.guarantor2.signedAt)  // Alternative field name
    setField('on_2', guarantor2Date)
    setField('On_2', guarantor2Date)  // Alternative field name
    setField('Identity Number_2', data.guarantor2.identityNumber)
    setField('Street Address_2', data.guarantor2.streetAddress)
    setField('Postal Address', data.guarantor2.postalAddress1) // Field name in template is just "Postal Address"
    setField('Postal Address_2', data.guarantor2.postalAddress1)  // Alternative field name
    // setField('Postal Address 2_2', data.guarantor2.postalAddress2) // Field not found in template inspection
    setField('Witness Full Name_2', data.guarantor2.witnessFullName)

    form.flatten()
    return pdfDoc.save()
  } catch (error) {
    console.error('[guarantee] Failed to build PDF from template.', error)
    throw error // Rethrow so we know it failed
  }
}
