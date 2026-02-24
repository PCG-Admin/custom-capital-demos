
import { PDFDocument } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'

// Allow passing a filename argument, default to 'approval unchecked.pdf' if none provided
const filename = process.argv[2] || 'approval unchecked.pdf'

async function inspectTemplate() {
    try {
        const templatePath = path.join(process.cwd(), 'Custom-generated templates', filename)
        console.log(`\n===== Inspecting: ${filename} =====`)
        console.log(`Full path: ${templatePath}`)

        const pdfBytes = await fs.readFile(templatePath)
        const pdfDoc = await PDFDocument.load(pdfBytes)

        const form = pdfDoc.getForm()
        const fields = form.getFields()

        console.log(`Found ${fields.length} fields:`)
        fields.forEach(f => {
            const type = f.constructor.name
            const name = f.getName()
            console.log(`- [${type}] "${name}"`)
        })
        console.log('=====================================\n')

    } catch (err) {
        console.error(`Error inspecting ${filename}:`, err)
    }
}

inspectTemplate()
