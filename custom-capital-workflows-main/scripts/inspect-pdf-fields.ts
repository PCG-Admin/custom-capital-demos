import { PDFDocument } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Utility script to inspect PDF form fields
 * Usage: npx tsx scripts/inspect-pdf-fields.ts <filename>
 */

async function inspectPDFFields(filename: string) {
  const filePath = path.join(process.cwd(), 'public', filename)

  try {
    const pdfBytes = await fs.readFile(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    console.log(`\n=== ${filename} ===`)
    console.log(`Total fields: ${fields.length}\n`)

    fields.forEach((field, index) => {
      const type = field.constructor.name
      const name = field.getName()
      console.log(`${index + 1}. [${type}] "${name}"`)
    })

    console.log('\n')
  } catch (error) {
    console.error(`Error inspecting ${filename}:`, error)
  }
}

const filename = process.argv[2]
if (!filename) {
  console.error('Usage: npx tsx scripts/inspect-pdf-fields.ts <filename.pdf>')
  process.exit(1)
}

inspectPDFFields(filename)
