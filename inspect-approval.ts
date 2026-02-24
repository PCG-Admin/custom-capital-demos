
import { PDFDocument } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'

async function inspectPdf() {
    try {
        const pdfPath = path.join(process.cwd(), 'public', 'Approval-letter.pdf')
        const pdfBytes = await fs.readFile(pdfPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)
        const form = pdfDoc.getForm()
        const fields = form.getFields()

        console.log('Fields found in Approval-letter.pdf:')
        fields.forEach(f => {
            console.log(`- ${f.getName()} (Type: ${f.constructor.name})`)
        })
    } catch (err) {
        console.error('Error inspecting PDF:', err)
    }
}

inspectPdf()
