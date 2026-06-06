import { Nav } from '@/components/marketing/landing/Nav'
import { Hero } from '@/components/marketing/landing/Hero'
import { LogoWall } from '@/components/marketing/landing/LogoWall'
import { Capabilities } from '@/components/marketing/landing/Capabilities'
import { HowItWorks } from '@/components/marketing/landing/HowItWorks'
import { SampleReport } from '@/components/marketing/landing/SampleReport'
import { Testimonials } from '@/components/marketing/landing/Testimonials'
import { Pricing } from '@/components/marketing/landing/Pricing'
import { CtaBand } from '@/components/marketing/landing/CtaBand'
import { SiteFooter } from '@/components/marketing/landing/SiteFooter'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LogoWall />
        <Capabilities />
        <HowItWorks />
        <SampleReport />
        <Testimonials />
        <Pricing />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  )
}
