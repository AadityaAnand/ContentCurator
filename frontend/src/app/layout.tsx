import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import { Navigation } from '@/components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Curator - Multi-Modal Knowledge Discovery',
  description: 'An intelligent content aggregation and knowledge discovery platform powered by Ollama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navigation />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
