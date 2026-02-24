'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Phone, Building, Calendar, Clock, Pencil, Check, X, Package } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { RandIcon } from '@/components/rand-icon'
import { Badge } from '@/components/ui/badge'

export function ApplicationDetails({ application }: { application: any }) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(application.document_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const formatStableDate = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 10)
  }
  const formatStableDateTime = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().replace('T', ' ').slice(0, 16)
  }

  const handleSaveName = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/update-application-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: application.id,
          document_name: editedName,
        }),
      })

      if (!response.ok) throw new Error('Failed to update name')

      toast({
        title: 'Success',
        description: 'Application name updated successfully',
      })
      setIsEditingName(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update application name',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 w-[300px]"
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSaving}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{application.document_name}</span>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Prioritized Business Name - Use extracted_data if edited, otherwise use top-level */}
          {(application.extracted_data?.business_name || application.business_name) && (
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{application.extracted_data?.business_name || application.business_name}</p>
              </div>
            </div>
          )}

          {(application.extracted_data?.applicant_name || application.applicant_name) && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Applicant Name</p>
                <p className="font-medium">{application.extracted_data?.applicant_name || application.applicant_name}</p>
              </div>
            </div>
          )}

          {(application.extracted_data?.applicant_email || application.applicant_email) && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{application.extracted_data?.applicant_email || application.applicant_email}</p>
              </div>
            </div>
          )}

          {(application.extracted_data?.applicant_phone || application.extracted_data?.telephone || application.applicant_phone) && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{application.extracted_data?.applicant_phone || application.extracted_data?.telephone || application.applicant_phone}</p>
              </div>
            </div>
          )}

          {(application.extracted_data?.rental_amount || application.extracted_data?.rental_excl_vat || application.rental_amount) && (
            <div className="flex items-center gap-3">
              <RandIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rental Amount</p>
                <p className="font-medium">R{Number(application.extracted_data?.rental_amount || application.extracted_data?.rental_excl_vat || application.rental_amount).toLocaleString('en-ZA')}</p>
              </div>
            </div>
          )}

          {(application.extracted_data?.rental_term || application.rental_term) && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rental Term</p>
                <p className="font-medium">{application.extracted_data?.rental_term || application.rental_term}</p>
              </div>
            </div>
          )}

          {application.supplier && (
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{application.supplier.name}</p>
              </div>
            </div>
          )}

          {application.created_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Stored Date</p>
                <p className="font-medium">{formatStableDate(application.created_at)}</p>
              </div>
            </div>
          )}

          {(application.credit_score !== null && application.credit_score !== undefined) ||
            application.credit_notes ||
            (application.credit_details && Object.keys(application.credit_details || {}).length > 0) ? (
            <div className="sm:col-span-2 rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Credit info</Badge>
                {application.credit_checked_at && (
                  <p className="text-xs text-muted-foreground">
                    Captured {formatStableDateTime(application.credit_checked_at)}
                    {application.credit_checked_by ? ` by ${application.credit_checked_by}` : ''}
                  </p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {application.credit_score !== null && application.credit_score !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Credit score</p>
                    <p className="font-medium">{application.credit_score}</p>
                  </div>
                )}
                {application.credit_details?.bureau && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bureau</p>
                    <p className="font-medium">{application.credit_details.bureau}</p>
                  </div>
                )}
                {application.credit_details?.reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium">{application.credit_details.reference}</p>
                  </div>
                )}
                {application.credit_details?.rating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-medium">{application.credit_details.rating}</p>
                  </div>
                )}
              </div>
              {application.credit_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{application.credit_notes}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
