import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const INSURANCE_TEMPLATE_FILENAME = 'CCF-Insurance.pdf'
const INSURANCE_TEMPLATE_PATH = path.join(process.cwd(), 'public', INSURANCE_TEMPLATE_FILENAME)

type ApplicationRecord = {
  id: string
  business_name?: string | null
  applicant_name?: string | null
  // ... other fields
}

type EquipmentRow = {
  description: string
  installationAddress: string
}

export type InsuranceData = {
  rentalContractDated: string
  equipmentRows: EquipmentRow[] // max 4 items
  and: string
  initials: string
  signedOnBehalfOfCCFAt1: string
  signedOnBehalfOfCCFAt2: string
  signature: string
  nameInFull: string
  address: string
  date: string
  signedOnBehalfOfRenterAt1: string
  signedOnBehalfOfRenterAt2: string
  signature2: string
  nameInFull2: string
  address2: string
  date2: string
  text4: string
  text5: string
  text6: string
}

export async function generateAndStoreInsurance(application: ApplicationRecord, data: InsuranceData) {
  try {
    const pdfBytes = await buildInsurancePdf(application, data)
    const supabase = createServerClient()
    const fileName = `Insurance-Agreement-${application.id.slice(0, 8)}.pdf`
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
      console.error('Failed to upload insurance agreement', lastError)
      return null
    }

    const { error: dbError } = await supabase
      .from('custom_supporting_documents')
      .insert({
        application_id: application.id,
        document_url: publicUrl,
        document_name: fileName,
        document_type: 'Insurance Agreement',
        uploaded_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Failed to insert insurance agreement metadata', dbError)
      return null
    }

    return publicUrl
  } catch (error) {
    console.error('Error generating insurance agreement:', error)
    return null
  }
}

async function buildInsurancePdf(application: ApplicationRecord, data: InsuranceData) {
  let pdfDoc: PDFDocument

  try {
    console.log('[insurance] Loading template:', INSURANCE_TEMPLATE_PATH)
    const templateBytes = await fs.readFile(INSURANCE_TEMPLATE_PATH)
    pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

    const form = pdfDoc.getForm()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Debug: Log fields to help with field naming
    try {
      console.log('[insurance] PDF Fields:', form.getFields().map(f => f.getName()))
      console.log('[insurance] Data:', data)
    } catch (e) {
      console.warn('[insurance] Could not list fields', e)
    }

    const setField = (name: string, value: string) => {
      try {
        const field = form.getTextField(name)
        setTextFieldAutoSized(field, value || '', font)
        console.log(`[insurance] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
      } catch (e) {
        console.warn(`[insurance] ✗ Failed to set field "${name}":`, (e as Error).message)
      }
    }

    // Map data to PDF field names
    setField('Rental Contract Dated', data.rentalContractDated)

    // Equipment rows 1-4
    const equipmentRows = data.equipmentRows.slice(0, 4) // max 4 rows
    for (let i = 0; i < equipmentRows.length; i++) {
      const rowNum = i + 1
      const row = equipmentRows[i]
      setField(`DESCRIPTION OF GOODS AND SERIAL NUMBERSRow${rowNum}`, row.description)
      setField(`INSTALLATION ADDRESSRow${rowNum}`, row.installationAddress)
    }

    setField('AND', data.and)
    setField('Initials', data.initials)

    // CCF Signatory fields
    setField('Signed on behalf of CCF at 1', data.signedOnBehalfOfCCFAt1)
    setField('Signed on behalf of CCF at 2', data.signedOnBehalfOfCCFAt2)
    setField('Signature', data.signature)
    setField('Name in full', data.nameInFull)
    setField('Address', data.address)
    setField('Date', data.date)

    // Renter Signatory fields
    setField('Signed on behalf of Renter at 1', data.signedOnBehalfOfRenterAt1)
    setField('Signed on behalf of Renter at 2', data.signedOnBehalfOfRenterAt2)
    setField('Signature_2', data.signature2)
    setField('Name in full_2', data.nameInFull2)
    setField('Address_2', data.address2)
    setField('Date_2', data.date2)

    // Additional text fields
    setField('Text4', data.text4)
    setField('Text5', data.text5)
    setField('Text6', data.text6)

    form.flatten()
    return pdfDoc.save()
  } catch (error) {
    console.error('[insurance] Failed to build PDF from template.', error)
    throw error // Rethrow so we know it failed
  }
}
