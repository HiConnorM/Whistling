import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: {
    default: 'Whistling.io — Customer Intelligence for Local Businesses',
    template: '%s | Whistling.io',
  },
  description:
    'Connect your reviews, comments, and competitor profiles. Every week, get a clear report on what customers are saying, what competitors are winning at, and what to fix next.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://whistling.io'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
