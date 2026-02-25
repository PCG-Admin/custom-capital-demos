import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: 'Mindrift - Rental Finance Management',
  description: 'Streamline rental credit applications and agreements with AI-powered workflow automation',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 bg-[#deeffa] overflow-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}






