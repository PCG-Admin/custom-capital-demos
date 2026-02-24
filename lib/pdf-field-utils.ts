import type { PDFFont, PDFTextField } from 'pdf-lib'

type AutoSizeOptions = {
  defaultSize?: number
  minSize?: number
  maxSize?: number
  padding?: number
  step?: number
  lineHeightFactor?: number
}

const DEFAULT_OPTIONS: Required<AutoSizeOptions> = {
  defaultSize: 10,
  minSize: 6,
  maxSize: 12,
  padding: 2,
  step: 0.5,
  lineHeightFactor: 1.2,
}

export function computeAutoFontSize(
  field: PDFTextField,
  text: string,
  font: PDFFont,
  options: AutoSizeOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const safeText = String(text || '')
  if (!safeText) return opts.defaultSize

  try {
    const widget = field.acroField.getWidgets()[0]
    const rect = widget?.getRectangle()
    if (!rect) return opts.defaultSize

    const availableWidth = Math.max(0, rect.width - opts.padding * 2)
    const availableHeight = Math.max(0, rect.height - opts.padding * 2)
    if (!availableWidth || !availableHeight) return opts.minSize

    const startSize = Math.min(opts.maxSize, opts.defaultSize)
    for (let size = startSize; size >= opts.minSize; size -= opts.step) {
      const width = font.widthOfTextAtSize(safeText, size)
      const height = size * opts.lineHeightFactor
      if (width <= availableWidth && height <= availableHeight) {
        return size
      }
    }
  } catch {
    return opts.defaultSize
  }

  return opts.minSize
}

export function setTextFieldAutoSized(
  field: PDFTextField,
  value: string,
  font: PDFFont,
  options: AutoSizeOptions = {}
) {
  const text = String(value || '')
  field.setText(text)
  field.setFontSize(computeAutoFontSize(field, text, font, options))
  field.updateAppearances(font)
}

