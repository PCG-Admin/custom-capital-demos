import { promises as fs } from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function run() {
    try {
        const pdfPath = path.join(process.cwd(), 'public', 'Declined.pdf')
        console.log('Reading PDF from:', pdfPath)
        const pdfBytes = await fs.readFile(pdfPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)

        const form = pdfDoc.getForm()
        const fields = form.getFields().map(f => ({
            name: f.getName(),
            type: f.constructor.name
        }))

        console.log('Field Analysis Result:')
        console.log(JSON.stringify({
            hasForm: !!form,
            fieldCount: fields.length,
            fields
        }, null, 2))
    } catch (error) {
        console.error('Error:', error)
    }
}

run()
