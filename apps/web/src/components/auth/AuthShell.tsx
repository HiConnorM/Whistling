import type { ReactNode } from 'react'
import { Logo } from '@/components/marketing/landing/Logo'
import { ProductPreview } from '@/components/marketing/landing/ProductPreview'

/**
 * Split-screen auth layout. Left: the form column over the canvas. Right: a
 * coral-to-charcoal brand panel anchored by a real product preview. The brand
 * panel is hidden below lg so the form takes the full width on mobile.
 */
export function AuthShell({
  heading,
  subheading,
  children,
  footer,
}: {
  heading: string
  subheading: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-10 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {heading}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subheading}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand to-foreground lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[10%] top-[12%] h-[36rem] w-[36rem] rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <p className="font-display text-3xl font-semibold leading-snug tracking-tight text-white xl:text-4xl">
            One clear read on what your customers are saying.
          </p>
          <p className="mt-4 max-w-md leading-relaxed text-white/80">
            Every Monday, the win, the risk, and the one move worth making. Here is what lands in
            your inbox.
          </p>
          <div className="mt-10 max-w-md">
            <ProductPreview />
          </div>
        </div>
      </div>
    </div>
  )
}
