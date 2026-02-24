'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

// -- Schema --
const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

// -- Props --
interface SupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: SupplierFormValues) => Promise<void>
  supplier: { name: string; description: string | null; is_active: boolean } | null
}

export function SupplierDialog({ open, onOpenChange, onSave, supplier }: SupplierDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', description: '', is_active: true },
  })

  // Sync form with supplier prop
  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? '',
        description: supplier?.description ?? '',
        is_active: supplier?.is_active ?? true,
      })
    }
  }, [open, supplier, reset])

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      await onSave(data)
      // Parent handles closing on success usually, but we can double check
    } catch (error) {
      // Error handled by parent toast
    }
  }

  // Prevent closing when submitting
  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting && !newOpen) return
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {supplier ? 'Edit supplier details below.' : 'Create a new supplier profile.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Name Field */}
          <div className="grid gap-2">
            <Label htmlFor="supplier-form-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="supplier-form-name"
              placeholder="e.g. Acme Rentals"
              {...register('name')}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description Field */}
          <div className="grid gap-2">
            <Label htmlFor="supplier-form-desc">Description</Label>
            <Textarea
              id="supplier-form-desc"
              placeholder="Internal notes..."
              {...register('description')}
              disabled={isSubmitting}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="supplier-form-active"
              className="h-4 w-4 rounded border-gray-300"
              {...register('is_active')}
              disabled={isSubmitting}
            />
            <Label htmlFor="supplier-form-active" className="cursor-pointer">
              Active Status
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
