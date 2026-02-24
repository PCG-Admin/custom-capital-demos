'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Trash2, FileUp, Download, Loader2, Settings, FileCheck } from 'lucide-react'
import { FieldSelectionDialog } from '@/components/field-selection-dialog'
import { FieldHints } from '@/lib/extraction-fields'

interface Supplier {
  id: string
  name: string
  description: string | null
  sample_pdf_url: string | null
  sample_pdf_name: string | null
  sample_extraction: any
  field_hints: any
  is_active: boolean
}

interface SupplierSettingsProps {
  initialSuppliers: Supplier[]
}

export function SupplierSettings({ initialSuppliers }: SupplierSettingsProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // Field selection dialog state
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false)
  const [fieldDialogSupplier, setFieldDialogSupplier] = useState<Supplier | null>(null)
  const [fieldDialogExtraction, setFieldDialogExtraction] = useState<any>(null)

  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Supplier name is required',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          is_active: isActive,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create supplier')
      }

      setSuppliers([...suppliers, data.supplier])
      setName('')
      setDescription('')
      setIsActive(true)

      toast({
        title: 'Success',
        description: 'Supplier created successfully',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create supplier',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete supplier')
      }

      if (data.supplier) {
        setSuppliers(suppliers.map(s => s.id === id ? data.supplier : s))
        toast({
          title: 'Info',
          description: 'Supplier deactivated (used in existing applications)',
        })
      } else {
        setSuppliers(suppliers.filter(s => s.id !== id))
        toast({
          title: 'Success',
          description: 'Supplier deleted successfully',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete supplier',
      })
    }
  }

  const handleUploadSample = async (supplierId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setUploadingId(supplierId)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('supplierId', supplierId)
        formData.append('extractSample', 'true')

        const response = await fetch('/api/suppliers/upload-sample', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload sample')
        }

        setSuppliers(suppliers.map(s => s.id === supplierId ? data.supplier : s))
        toast({
          title: 'Success',
          description: 'Sample PDF uploaded and extracted',
        })

        // Open field selection dialog with the extracted data
        if (data.supplier && data.extracted) {
          setFieldDialogSupplier(data.supplier)
          setFieldDialogExtraction(data.supplier.sample_extraction)
          setIsFieldDialogOpen(true)
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to upload sample',
        })
      } finally {
        setUploadingId(null)
      }
    }
    input.click()
  }

  const handleConfigureFields = (supplier: Supplier) => {
    setFieldDialogSupplier(supplier)
    setFieldDialogExtraction(supplier.sample_extraction)
    setIsFieldDialogOpen(true)
  }

  const handleSaveFieldHints = async (fieldHints: FieldHints) => {
    if (!fieldDialogSupplier) return

    try {
      const response = await fetch(`/api/suppliers/${fieldDialogSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_hints: fieldHints }),
      })

      if (!response.ok) throw new Error('Failed to save field configuration')

      const data = await response.json()
      setSuppliers(suppliers.map(s => s.id === fieldDialogSupplier.id ? data.supplier : s))
      toast({ title: 'Saved', description: 'Field template configured successfully' })
      setIsFieldDialogOpen(false)
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
      throw error // Re-throw to keep dialog open
    }
  }

  return (
    <div className="grid gap-6">
      {/* Add Supplier Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Supplier</CardTitle>
          <CardDescription>
            Create a new supplier to track and improve AI extraction accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier-name">
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplier-name"
                placeholder="e.g., Acme Rentals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-description">Description</Label>
              <Textarea
                id="supplier-description"
                placeholder="Optional notes about this supplier"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supplier-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="supplier-active" className="cursor-pointer">
                Active
              </Label>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Supplier
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No suppliers yet</p>
              <p className="text-sm mt-2">Create your first supplier above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{supplier.name}</h3>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'} className="text-[10px] h-5">
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {supplier.sample_pdf_url && (
                        <Badge variant="outline" className="text-[10px] h-5 text-emerald-600 border-emerald-200 bg-emerald-50">
                          <FileCheck className="h-3 w-3 mr-1" />
                          Template Ready
                        </Badge>
                      )}
                      {supplier.field_hints?.enabled_fields && (
                        <Badge variant="outline" className="text-[10px] h-5 text-blue-600 border-blue-200 bg-blue-50">
                          {supplier.field_hints.enabled_fields.length} fields
                        </Badge>
                      )}
                    </div>
                    {supplier.description && (
                      <p className="text-sm text-muted-foreground">{supplier.description}</p>
                    )}
                    {supplier.sample_pdf_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sample: {supplier.sample_pdf_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUploadSample(supplier.id)}
                      disabled={uploadingId === supplier.id}
                      title="Upload sample PDF"
                    >
                      {uploadingId === supplier.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="h-4 w-4" />
                      )}
                    </Button>

                    {supplier.sample_pdf_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(supplier.sample_pdf_url!, '_blank')}
                          title="Download sample"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureFields(supplier)}
                          title="Configure field template"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(supplier.id)}
                      title="Delete supplier"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {fieldDialogSupplier && (
        <FieldSelectionDialog
          open={isFieldDialogOpen}
          onOpenChange={setIsFieldDialogOpen}
          onSave={handleSaveFieldHints}
          initialFieldHints={fieldDialogSupplier.field_hints}
          supplierName={fieldDialogSupplier.name}
          extractedData={fieldDialogExtraction}
        />
      )}
    </div>
  )
}
