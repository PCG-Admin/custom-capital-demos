'use client'

import { UploadApplication } from '@/components/upload-application'

export function UploadAndExtractContent() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-[#84754e] font-semibold">Smart Document Processing</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Upload & Extract</h1>

      </div>

      <div className="rounded-2xl border bg-card/60 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#463d28]">Document type</p>
          <p className="text-2xl font-bold text-[#1a1a1a]">Rental Credit Application</p>
          <p className="text-sm text-muted-foreground">
            Agreements are generated automatically when an application clears every workflow stage. Simply upload the original
            application PDF or image below to kick off the process.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <UploadApplication />
      </div>
    </div>
  )
}
