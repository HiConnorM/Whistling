import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'

const cabinetGrotesk = localFont({
  src: '../fonts/CabinetGrotesk-Variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: 'Whistling.io: Customer Intelligence for Local Businesses',
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
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${cabinetGrotesk.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
