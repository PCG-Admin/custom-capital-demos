'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, FileUp, FileCheck, Download, ToggleLeft, ToggleRight, Settings } from 'lucide-react'
import { SupplierDialog } from '@/components/supplier-dialog'
import { FieldSelectionDialog } from '@/components/field-selection-dialog'
import { FieldHints } from '@/lib/extraction-fields'

// Type definition aligned with Supabase schema
export interface Supplier {
  id: string
  name: string
  description: string | null
  sample_pdf_url: string | null
  sample_pdf_name: string | null
  // Using 'any' for simpler JSON handling in frontend, can be typed strictly if needed
  sample_extraction: any
  field_hints: any
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SupplierManagementProps {
  initialSuppliers: Supplier[]
}

export function SupplierManagement({ initialSuppliers }: SupplierManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // Field selection dialog state
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false)
  const [fieldDialogSupplier, setFieldDialogSupplier] = useState<Supplier | null>(null)
  const [fieldDialogExtraction, setFieldDialogExtraction] = useState<any>(null)

  // Loading states
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const { toast } = useToast()

  // -- Handlers --

  const handleCreateOpen = () => {
    setEditingSupplier(null)
    setIsDialogOpen(true)
  }

  const handleEditOpen = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsDialogOpen(true)
  }

  const handleSave = async (formData: { name: string; description: string; is_active: boolean }) => {
    try {
      const isEditing = !!editingSupplier
      const url = isEditing ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save supplier')
      }

      if (isEditing) {
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? data.supplier : s))
        toast({ title: 'Updated', description: 'Supplier updated successfully' })
      } else {
        setSuppliers(prev => [...prev, data.supplier])
        toast({ title: 'Created', description: 'New supplier added successfully' })
      }

      // Close dialog only on success
      setIsDialogOpen(false)
      setEditingSupplier(null)
    } catch (error: any) {
      console.error('Save error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to delete')

      if (data.supplier) {
        // Soft delete (deactivated)
        setSuppliers(prev => prev.map(s => s.id === id ? data.supplier : s))
        toast({ title: 'Deactivated', description: 'Supplier marked as inactive (used in existing records)' })
      } else {
        // Hard delete
        setSuppliers(prev => prev.filter(s => s.id !== id))
        toast({ title: 'Deleted', description: 'Supplier removed permanently' })
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !supplier.is_active }),
      })
      if (!response.ok) throw new Error('Failed to update status')

      const data = await response.json()
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? data.supplier : s))
      toast({ title: 'Updated', description: `Supplier is now ${!supplier.is_active ? 'Active' : 'Inactive'}` })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update status' })
    }
  }

  // File upload logic kept simple
  const handleFileSelect = (supplierId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await uploadSample(supplierId, file)
      }
    }
    input.click()
  }

  const uploadSample = async (supplierId: string, file: File) => {
    setUploadingId(supplierId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('supplierId', supplierId)

      // Always extract for new uploads to improve DX
      formData.append('extractSample', 'true')

      const response = await fetch('/api/suppliers/upload-sample', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setSuppliers(prev => prev.map(s => s.id === supplierId ? data.supplier : s))
      toast({ title: 'Success', description: 'Sample uploaded and extracted' })

      // Open field selection dialog with the extracted data
      if (data.supplier && data.extracted) {
        setFieldDialogSupplier(data.supplier)
        setFieldDialogExtraction(data.supplier.sample_extraction)
        setIsFieldDialogOpen(true)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setUploadingId(null)
    }
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
      setSuppliers(prev => prev.map(s => s.id === fieldDialogSupplier.id ? data.supplier : s))
      toast({ title: 'Saved', description: 'Field template configured successfully' })
      setIsFieldDialogOpen(false)
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
      throw error // Re-throw to keep dialog open
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your supplier dictionary and extraction templates
          </p>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            {suppliers.length} configured supplier{suppliers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-dashed border-2">
              <p>No suppliers found.</p>
              <Button variant="link" onClick={handleCreateOpen}>Create your first supplier</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{supplier.name}</h3>
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
                      <p className="text-sm text-muted-foreground truncate">{supplier.description}</p>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(supplier)}
                      title={supplier.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {supplier.is_active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFileSelect(supplier.id)}
                      disabled={uploadingId === supplier.id}
                      title="Upload Sample PDF"
                    >
                      <FileUp className="h-4 w-4" />
                    </Button>

                    {supplier.sample_pdf_url && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(supplier.sample_pdf_url!, '_blank')}
                          title="View Sample"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConfigureFields(supplier)}
                          title="Configure Field Template"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditOpen(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier.id)}
                      disabled={deletingId === supplier.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        supplier={editingSupplier}
      />

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
