import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const ADDENDUM_TEMPLATE_FILENAME = 'CCF-Addendum.pdf'
const ADDENDUM_TEMPLATE_PATH = path.join(process.cwd(), 'public', ADDENDUM_TEMPLATE_FILENAME)

type ApplicationRecord = {
  id: string
  business_name?: string | null
  applicant_name?: string | null
  // ... other fields
}

type EquipmentRow = {
  quantity: string
  description: string
  serialNumbers: string
}

export type AddendumData = {
  and: string
  registrationNumber: string
  of: string
  equipmentRows: EquipmentRow[] // max 10 items
  signedAt: string
  on: string
  nameOfSignatory: string
  idNumber: string
  name: string
  signedAt2: string
  signedAt3: string
  on2: string
  fullNames: string
  capacity: string
  witness: string
}

export async function generateAndStoreAddendum(application: ApplicationRecord, data: AddendumData) {
  try {
    const pdfBytes = await buildAddendumPdf(application, data)
    const supabase = createServerClient()
    const fileName = `CCF-Addendum-${application.id.slice(0, 8)}.pdf`
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
      console.error('Failed to upload addendum', lastError)
      return null
    }

    const { error: dbError } = await supabase
      .from('supporting_documents')
      .insert({
        application_id: application.id,
        document_url: publicUrl,
        document_name: fileName,
        document_type: 'Addendum',
        uploaded_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Failed to insert addendum metadata', dbError)
      return null
    }

    return publicUrl
  } catch (error) {
    console.error('Error generating addendum:', error)
    return null
  }
}

async function buildAddendumPdf(application: ApplicationRecord, data: AddendumData) {
  let pdfDoc: PDFDocument

  try {
    console.log('[addendum] Loading template:', ADDENDUM_TEMPLATE_PATH)
    const templateBytes = await fs.readFile(ADDENDUM_TEMPLATE_PATH)
    pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

    const form = pdfDoc.getForm()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Debug: Log fields to help with field naming
    try {
      console.log('[addendum] PDF Fields:', form.getFields().map(f => f.getName()))
      console.log('[addendum] Data:', data)
    } catch (e) {
      console.warn('[addendum] Could not list fields', e)
    }

    const setField = (name: string, value: string) => {
      try {
        const field = form.getTextField(name)
        setTextFieldAutoSized(field, value || '', font)
        console.log(`[addendum] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
      } catch (e) {
        console.warn(`[addendum] ✗ Failed to set field "${name}":`, (e as Error).message)
      }
    }

    // Map data to PDF field names
    setField('and', data.and)
    setField('Registration number', data.registrationNumber)
    setField('of', data.of)

    // Equipment rows 1-10
    const equipmentRows = data.equipmentRows.slice(0, 10) // max 10 rows
    for (let i = 0; i < equipmentRows.length; i++) {
      const rowNum = i + 1
      const row = equipmentRows[i]
      setField(`QTYRow${rowNum}`, row.quantity)
      setField(`DESCRIPTIONRow${rowNum}`, row.description)
      setField(`SERIAL NUMBERSRow${rowNum}`, row.serialNumbers)
    }

    // Signatory fields (Renter)
    setField('Signed at', data.signedAt)
    setField('on', data.on)
    setField('On', data.on)  // Alternative field name
    setField('Name of Signatory', data.nameOfSignatory)
    setField('ID Number', data.idNumber)
    setField('Name', data.name)

    // Witness fields (CCF) - trying multiple field name variations
    setField('Signed at_2', data.signedAt2)
    setField('SignedAt2', data.signedAt2)  // Alternative
    setField('Signed at 2', data.signedAt2)  // Alternative
    setField('Signed at_3', data.signedAt3)
    setField('SignedAt3', data.signedAt3)  // Alternative
    setField('Signed at 3', data.signedAt3)  // Alternative
    setField('on_2', data.on2)
    setField('On_2', data.on2)  // Alternative
    setField('Full Names', data.fullNames)
    setField('Capacity', data.capacity)
    setField('Witness', data.witness)

    form.flatten()
    return pdfDoc.save()
  } catch (error) {
    console.error('[addendum] Failed to build PDF from template.', error)
    throw error // Rethrow so we know it failed
  }
}
