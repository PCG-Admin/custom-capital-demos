import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

export async function GET() {
    try {
        const pdfPath = path.join(process.cwd(), 'public', 'Declined.pdf')
        const pdfBytes = await fs.readFile(pdfPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)

        const form = pdfDoc.getForm()
        const fields = form.getFields().map(f => ({
            name: f.getName(),
            type: f.constructor.name
        }))

        return NextResponse.json({
            hasForm: !!form,
            fieldCount: fields.length,
            fields
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
