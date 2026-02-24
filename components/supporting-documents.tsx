'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink, Clock, Eye, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MRADialog } from '@/components/mra-dialog'
import { FirstRentalDialog } from '@/components/first-rental-dialog'
import { AddendumDialog } from '@/components/addendum-dialog'
import { InstallCOADialog } from '@/components/install-coa-dialog'
import { InsuranceDialog } from '@/components/insurance-dialog'
import { InstallVerificationDialog } from '@/components/install-verification-dialog'
import { LandlordConsentDialog } from '@/components/landlord-consent-dialog'
import { GuaranteeDialog } from '@/components/guarantee-dialog'

interface SupportingDocumentsProps {
  applicationId?: string
  documentUrl?: string | null
  documentName?: string | null
  supportingDocuments?: {
    id: string
    document_url: string
    document_name: string
    document_type?: string | null
    uploaded_at?: string | null
  }[]
  generatedAgreement?: {
    url: string
    name?: string | null
    number?: string | null
    createdAt?: string | null
  }
  workflowStatus?: string | null
  currentStep?: number
  applicationData?: {
    businessName?: string | null
    applicantName?: string | null
    applicantEmail?: string | null
    applicantPhone?: string | null
    businessAddress?: string
    regNumber?: string
    vatNumber?: string
    contactPerson?: string
    rentalAmount?: string
    escalation?: string
    rentalTerm?: string
    equipmentDescription?: string
    bankName?: string
    bankBranch?: string
    bankBranchCode?: string
    accountNumber?: string
    accountHolder?: string
    accountType?: string
    equipmentItems?: any[]
    installationAddress?: string
  }
}

export function SupportingDocuments({
  applicationId,
  documentUrl,
  documentName,
  supportingDocuments = [],
  generatedAgreement,
  workflowStatus,
  currentStep,
  applicationData,
}: SupportingDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)

  const [mraDialogOpen, setMraDialogOpen] = useState(false)
  const [firstRentalDialogOpen, setFirstRentalDialogOpen] = useState(false)
  const [addendumDialogOpen, setAddendumDialogOpen] = useState(false)
  const [installCOADialogOpen, setInstallCOADialogOpen] = useState(false)
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false)
  const [installVerificationDialogOpen, setInstallVerificationDialogOpen] = useState(false)
  const [landlordConsentDialogOpen, setLandlordConsentDialogOpen] = useState(false)
  const [guaranteeDialogOpen, setGuaranteeDialogOpen] = useState(false)

  const { toast } = useToast()
  const canGenerateAgreement = workflowStatus?.toLowerCase() === 'approved' && Boolean(applicationId)

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

  // Helper function to check if a document is already generated
  const isDocumentGenerated = (docType: string) => {
    return supportingDocuments.some(doc => doc.document_type === docType)
  }

  // Separate generated documents from user-uploaded supporting documents
  const generatedDocTypes = [
    'Approval Letter',
    'Master Rental Agreement',
    'First Rental',
    'Addendum',
    'Install COA',
    'Insurance Agreement',
    'Installation Verification',
    'Landlord Consent',
    'Personal Guarantee'
  ]

  const generatedDocuments = supportingDocuments.filter(doc =>
    generatedDocTypes.includes(doc.document_type || '')
  )

  const uploadedDocuments = supportingDocuments.filter(doc =>
    !generatedDocTypes.includes(doc.document_type || '')
  )

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!applicationId) {
      toast({
        title: 'Missing target',
        description: 'No workflow id found to attach this document.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('applicationId', applicationId)
    formData.append('documentType', 'Supporting Document')

    try {
      const response = await fetch('/api/upload-supporting-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      })

      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const openPreview = (url: string, name?: string | null) => {
    setPreviewUrl(url)
    setPreviewName(name || 'Document preview')
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewName(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentUrl ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{documentName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Original Document</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  asChild
                >
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => openPreview(documentUrl, documentName)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">No source document stored</p>
              <p>
                This workflow was created from an uploaded file, but the binary was not kept.
              </p>
            </div>
          )}

          {/* Generated Documents Section */}
          {generatedDocuments.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-semibold text-emerald-900 mb-3">Generated Documents</p>
              <div className="space-y-2">
                {generatedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border border-emerald-200 bg-white p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-emerald-900 truncate">{doc.document_type}</p>
                      <p className="text-xs text-emerald-800">
                        {formatStableDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                        onClick={() => openPreview(doc.document_url, doc.document_name)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        asChild
                      >
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer" download={doc.document_name || undefined}>
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="border-t pt-4">
            <Label className="mb-2 block">Upload Additional Document</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {isUploading && <Clock className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Upload supporting documents like bank statements, IDs, etc.
            </p>
          </div>

          {/* Document Generation Section - Only visible after Step 5 approval */}
          {canGenerateAgreement && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Generate Documents</p>
              <p className="text-xs text-muted-foreground">
                Generate required documents for this approved application. Click each button to fill in details and create the PDF.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Master Rental Agreement', type: 'Master Rental Agreement', handler: () => setMraDialogOpen(true) },
                  { name: 'First Rental', type: 'First Rental', handler: () => setFirstRentalDialogOpen(true) },
                  { name: 'Addendum', type: 'Addendum', handler: () => setAddendumDialogOpen(true) },
                  { name: 'Install COA', type: 'Install COA', handler: () => setInstallCOADialogOpen(true) },
                  { name: 'Insurance', type: 'Insurance Agreement', handler: () => setInsuranceDialogOpen(true) },
                  { name: 'Install Verification', type: 'Installation Verification', handler: () => setInstallVerificationDialogOpen(true) },
                  { name: 'Landlord Consent', type: 'Landlord Consent', handler: () => setLandlordConsentDialogOpen(true) },
                  { name: 'Personal Guarantee', type: 'Personal Guarantee', handler: () => setGuaranteeDialogOpen(true) },
                ].map((doc) => {
                  const isGenerated = isDocumentGenerated(doc.type)
                  return (
                    <button
                      key={doc.type}
                      onClick={doc.handler}
                      disabled={isGenerated}
                      className={`
                        w-full relative rounded-md border-2 p-3 text-left transition-all
                        ${isGenerated
                          ? 'border-green-300 bg-green-50 cursor-not-allowed'
                          : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`
                            rounded-md p-2
                            ${isGenerated ? 'bg-green-100' : 'bg-blue-100'}
                          `}>
                            <FileText className={`h-4 w-4 ${isGenerated ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${isGenerated ? 'text-green-900' : 'text-gray-900'}`}>
                              {doc.name}
                            </div>
                            {isGenerated && (
                              <div className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                        {isGenerated && (
                          <div className="rounded-full bg-green-500 text-white p-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* User-Uploaded Supporting Documents Section */}
          {uploadedDocuments.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Supporting Documents</p>
              <div className="space-y-2">
                {uploadedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type || 'Supporting Document'}
                        {doc.uploaded_at ? ` - ${formatStableDateTime(doc.uploaded_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openPreview(doc.document_url, doc.document_name)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog - Custom Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-70" onClick={closePreview} />

          {/* Dialog */}
          <div className="relative z-50 bg-white rounded-lg shadow-xl w-[95vw] max-w-5xl h-[85vh] flex flex-col m-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{previewName || 'Document preview'}</h2>
                <p className="text-sm text-gray-500 mt-1">Preview in-page. Use "Open in new tab" for a full view.</p>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewUrl}
                title={previewName || 'Document preview'}
                className="h-full w-full"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
              <Button variant="secondary" onClick={closePreview}>
                Close
              </Button>
              <Button asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Generation Dialogs */}
      <MRADialog
        open={mraDialogOpen}
        onOpenChange={setMraDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <FirstRentalDialog
        open={firstRentalDialogOpen}
        onOpenChange={setFirstRentalDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <AddendumDialog
        open={addendumDialogOpen}
        onOpenChange={setAddendumDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <InstallCOADialog
        open={installCOADialogOpen}
        onOpenChange={setInstallCOADialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <InsuranceDialog
        open={insuranceDialogOpen}
        onOpenChange={setInsuranceDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <InstallVerificationDialog
        open={installVerificationDialogOpen}
        onOpenChange={setInstallVerificationDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <LandlordConsentDialog
        open={landlordConsentDialogOpen}
        onOpenChange={setLandlordConsentDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

      <GuaranteeDialog
        open={guaranteeDialogOpen}
        onOpenChange={setGuaranteeDialogOpen}
        applicationId={applicationId || ''}
        applicationData={applicationData}
      />

    </>
  )
}
