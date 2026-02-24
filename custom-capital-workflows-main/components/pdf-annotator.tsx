'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Type, Edit3, Save, X, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Annotation {
  id: string
  type: 'text' | 'signature'
  x: number
  y: number
  content: string
  fontSize?: number
}

interface PDFAnnotatorProps {
  pdfUrl: string
  documentName: string
  onClose: () => void
  onSave?: (annotatedPdfUrl: string) => void
}

export function PDFAnnotator({ pdfUrl, documentName, onClose, onSave }: PDFAnnotatorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [mode, setMode] = useState<'view' | 'text' | 'signature'>('view')
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(12)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signaturePath, setSignaturePath] = useState<Array<{x: number, y: number}>>([])
  const [isSaving, setIsSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Handle click on overlay to add text
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'text' && textInput.trim()) {
      const rect = overlayRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x,
        y,
        content: textInput,
        fontSize,
      }

      setAnnotations([...annotations, newAnnotation])
      setTextInput('')
      setMode('view')
    }
  }

  // Handle signature drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'signature') return
    setIsDrawing(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setSignaturePath([{ x, y }])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'signature') return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setSignaturePath([...signaturePath, { x, y }])

    // Draw on canvas
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || signaturePath.length === 0) return

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    ctx.beginPath()
    const last = signaturePath[signaturePath.length - 1]
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && signaturePath.length > 0) {
      // Save signature as annotation
      const canvas = canvasRef.current
      if (canvas) {
        const signatureData = canvas.toDataURL('image/png')
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'signature',
          x: 0,
          y: 0,
          content: signatureData,
        }
        setAnnotations([...annotations, newAnnotation])
      }

      // Clear canvas
      const ctx = canvas?.getContext('2d')
      ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0)
      setSignaturePath([])
    }
    setIsDrawing(false)
    setMode('view')
  }

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  const handleSave = async () => {
    if (annotations.length === 0) {
      toast({
        title: 'No annotations',
        description: 'Please add at least one annotation before saving.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/save-annotated-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl,
          documentName,
          annotations,
        }),
      })

      if (!response.ok) throw new Error('Failed to save annotations')

      const { url } = await response.json()
      toast({
        title: 'Success',
        description: 'Annotations saved successfully',
      })

      if (onSave) onSave(url)
      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save annotations',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-70" onClick={onClose} />

      <div className="relative z-50 bg-white rounded-lg shadow-xl w-[95vw] max-w-6xl h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Annotate: {documentName}</h2>
            <p className="text-sm text-gray-500">Add text or draw your signature</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
          <Button
            size="sm"
            variant={mode === 'text' ? 'default' : 'outline'}
            onClick={() => setMode('text')}
          >
            <Type className="h-4 w-4 mr-2" />
            Add Text
          </Button>
          <Button
            size="sm"
            variant={mode === 'signature' ? 'default' : 'outline'}
            onClick={() => setMode('signature')}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Draw Signature
          </Button>

          {mode === 'text' && (
            <>
              <div className="ml-4 flex items-center gap-2">
                <Label className="text-sm">Text:</Label>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text..."
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Size:</Label>
                <Input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-16"
                  min="8"
                  max="72"
                />
              </div>
            </>
          )}

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAnnotations([])}
              disabled={annotations.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={annotations.length === 0 || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* PDF Preview with Annotation Overlay */}
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={documentName}
          />

          {/* Annotation Overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-auto"
            onClick={handleOverlayClick}
            style={{ cursor: mode === 'text' && textInput ? 'crosshair' : 'default' }}
          >
            {/* Render text annotations */}
            {annotations.filter(a => a.type === 'text').map((annotation) => (
              <div
                key={annotation.id}
                className="absolute bg-yellow-200 bg-opacity-50 px-2 py-1 border border-yellow-400 group"
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  fontSize: `${annotation.fontSize}px`,
                }}
              >
                {annotation.content}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteAnnotation(annotation.id)
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Render signature annotations */}
            {annotations.filter(a => a.type === 'signature').map((annotation, idx) => (
              <div
                key={annotation.id}
                className="absolute group"
                style={{
                  left: 20,
                  bottom: 20 + (idx * 120),
                }}
              >
                <img src={annotation.content} alt="Signature" className="max-w-xs border-2 border-blue-400 bg-white" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteAnnotation(annotation.id)
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Signature Drawing Canvas */}
          {mode === 'signature' && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg shadow-xl p-4 pointer-events-auto">
                <p className="text-sm mb-2 text-center font-medium">Draw your signature below</p>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border-2 border-gray-300 bg-white cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const ctx = canvasRef.current?.getContext('2d')
                    ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0)
                    setSignaturePath([])
                  }}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={stopDrawing}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Annotations List */}
        {annotations.length > 0 && (
          <div className="p-4 border-t bg-gray-50 max-h-32 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Annotations ({annotations.length}):</p>
            <div className="flex flex-wrap gap-2">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="text-xs bg-white px-2 py-1 rounded border flex items-center gap-2">
                  {annotation.type === 'text' ? (
                    <Type className="h-3 w-3" />
                  ) : (
                    <Edit3 className="h-3 w-3" />
                  )}
                  <span className="truncate max-w-xs">
                    {annotation.type === 'text' ? annotation.content : 'Signature'}
                  </span>
                  <button
                    onClick={() => deleteAnnotation(annotation.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
