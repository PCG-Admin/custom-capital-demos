import { Suspense } from 'react'
import { UploadAndExtractContent } from '@/components/upload-and-extract-content'

export const dynamic = 'force-dynamic'

export default function UploadAndExtractPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading upload interface...</div>}>
      <UploadAndExtractContent />
    </Suspense>
  )
}
