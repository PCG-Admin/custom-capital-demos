'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ExtractedDataTable } from '@/components/extracted-data-table'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-client'
import { buildStoragePath } from '@/lib/storage'

export function UploadApplication() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null)
  const [derivedFields, setDerivedFields] = useState<any>(null)
  const [documentMeta, setDocumentMeta] = useState<{ name: string, mime: string, size: number, storagePath: string, bucket: string } | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [suppliers, setSuppliers] = useState<Array<any>>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>(undefined)
  const [supplierFieldHints, setSupplierFieldHints] = useState<any>(null)
  const [isEditingExtractedData, setIsEditingExtractedData] = useState(false)
  const { toast } = useToast()

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers')
        if (response.ok) {
          const data = await response.json()
          setSuppliers(data.suppliers.filter((s: any) => s.is_active))
        }
      } catch (error) {
        console.error('Failed to fetch suppliers:', error)
      }
    }
    fetchSuppliers()
  }, [])

  // Update field hints when supplier changes
  useEffect(() => {
    if (selectedSupplier) {
      const supplier = suppliers.find(s => s.id === selectedSupplier)
      setSupplierFieldHints(supplier?.field_hints || null)
    } else {
      setSupplierFieldHints(null)
    }
  }, [selectedSupplier, suppliers])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const file = files[0]
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file',
        variant: 'destructive',
      })
      return
    }

    await uploadFile(file)
  }, [toast])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    await uploadFile(files[0])
  }, [])

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setExtractedData(null)
    setCreatedRecordId(null)
    setOriginalFile(null)
    setIsEditingExtractedData(false)

    try {
      // 1. Upload to Supabase Storage
      const supabase = createClient()
      // 1. Get Signed Upload URL
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_APPLICATION_BUCKET || 'Credit Applications'
      const storagePath = buildStoragePath('applications', file.name)

      const urlResponse = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: storagePath, bucketName: bucket })
      })

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { signedUrl } = await urlResponse.json()

      // 2. Upload to Supabase Storage using direct PUT (bypassing Client SDK to avoid RLS issues)
      const storageResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!storageResponse.ok) {
        const errorText = await storageResponse.text()
        throw new Error(`Storage upload failed: ${storageResponse.status} ${errorText}`)
      }

      // 2. Call API for extraction (sending path instead of file)
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath,
          bucket,
          type: 'rental-credit-application',
          supplierId: selectedSupplier,
          mimeType: file.type,
          fileName: file.name
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const errorMessage = errorBody.details
          ? `${errorBody.error}: ${errorBody.details}`
          : (errorBody.error || 'Upload failed')
        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (result.mismatch && result.detectedType === 'rental-agreement') {
        toast({
          title: 'Unsupported document',
          description: 'Only rental credit applications can be uploaded. Agreements are generated automatically after approval.',
          variant: 'destructive',
        })
        setIsUploading(false)
        return
      }

      setExtractedData(result.extractedData || null)
      setDerivedFields(result.derivedFields || null)
      setDocumentMeta({
        name: result.documentName,
        mime: result.documentMime,
        size: result.documentSize,
        storagePath: storagePath,
        bucket: bucket,
      })
      setOriginalFile(file)

      toast({
        title: 'Application analyzed successfully',
        description: 'Review the extracted data below and click Save to proceed.',
      })
    } catch (error) {
      console.error('[System] Upload error:', error)
      toast({
        title: 'Analysis failed',
        description: 'Please try again or contact support',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!extractedData || !documentMeta || !originalFile) {
      toast({
        title: 'Missing data',
        description: 'Please upload a document before saving.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/save-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: documentMeta.storagePath,
          bucket: documentMeta.bucket,
          type: 'rental-credit-application',
          extractedData,
          derivedFields: derivedFields || {},
          supplierId: selectedSupplier,
          fileInfo: {
            name: documentMeta.name,
            mime: documentMeta.mime,
            size: documentMeta.size
          }
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const extra =
          errorBody.details ||
          (errorBody.bucketsTried ? `Buckets tried: ${errorBody.bucketsTried.join(', ')}` : '')
        throw new Error(errorBody.error || extra || 'Save failed')
      }

      const result = await response.json()
      setCreatedRecordId(result.record?.id || null)
      setIsEditingExtractedData(false)

      toast({
        title: 'Application saved successfully',
        description: 'Workflow created in the database.',
      })
    } catch (error: any) {
      console.error('[System] Save error:', error)
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save to the database.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Application
          </CardTitle>
          <CardDescription>
            Drop a rental credit application document or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <Label htmlFor="supplier-select" className="text-gray-900">Supplier (Optional)</Label>
            <select
              id="supplier-select"
              value={selectedSupplier || ''}
              onChange={(e) => setSelectedSupplier(e.target.value || undefined)}
              className="w-full h-9 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select supplier or leave blank if unknown</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id} className="text-gray-900">
                  {supplier.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600">
              Selecting a supplier improves AI extraction accuracy for known suppliers
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <input
              type="file"
              id="application-upload"
              className="sr-only"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <label htmlFor="application-upload" className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium mb-1">
                {isUploading ? 'Processing...' : 'Drop your document here'}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF or image files supported
              </p>
            </label>
          </div>

          {!isUploading && (
            <Button
              onClick={() => document.getElementById('application-upload')?.click()}
              className="w-full mt-4"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          )}
        </CardContent>
      </Card>

      {extractedData && !createdRecordId && (
        <div className="space-y-4">
          <ExtractedDataTable
            data={extractedData}
            type="application"
            onDataChange={setExtractedData}
            supplierFieldHints={supplierFieldHints}
            isEditing={isEditingExtractedData}
            onIsEditingChange={setIsEditingExtractedData}
            showHeaderEditButton={false}
          />
          <div className="flex justify-between items-center gap-3">
            <Button
              onClick={() => {
                setExtractedData(null)
                setDerivedFields(null)
                setDocumentMeta(null)
                setOriginalFile(null)
                setIsEditingExtractedData(false)
              }}
              variant="outline"
              className="bg-white hover:bg-slate-50"
            >
              Upload Another
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-white hover:bg-slate-50"
                onClick={() => setIsEditingExtractedData(true)}
                disabled={isSaving}
              >
                Edit
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[#d4af37] text-[#2b2207] hover:bg-[#c29b24]">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Create Workflow
              </Button>
            </div>
          </div>
        </div>
      )}

      {createdRecordId && (
        <div className="space-y-4">
          <ExtractedDataTable
            data={extractedData!}
            type="application"
            canEdit={false}
            supplierFieldHints={supplierFieldHints}
          />
          <div className="flex gap-3">
            <Button asChild className="flex-1 sm:flex-none bg-[#65a9b6] hover:bg-[#548f9a]">
              <Link href={`/rental-credit-application/${createdRecordId}`}>
                View Workflow
              </Link>
            </Button>
            <Button
              onClick={() => {
                setExtractedData(null)
                setDerivedFields(null)
                setDocumentMeta(null)
                setOriginalFile(null)
                setCreatedRecordId(null)
              }}
              variant="outline"
              className="flex-1 sm:flex-none bg-white hover:bg-slate-50"
            >
              Upload Another
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

