import { Navbar }         from '@/components/landing/Navbar';
import { Hero }           from '@/components/landing/Hero';
import { Marquee }        from '@/components/landing/Marquee';
import { HowItWorks }     from '@/components/landing/HowItWorks';
import { Stats }          from '@/components/landing/Stats';
import { InputTypes }     from '@/components/landing/InputTypes';
import { Pricing }        from '@/components/landing/Pricing';
import { FAQ }            from '@/components/landing/FAQ';
import { CTASection }     from '@/components/landing/CTA';
import { Footer }         from '@/components/landing/Footer';
import { MotionProvider } from '@/components/landing/MotionProvider';
import { CursorGlow }    from '@/components/landing/CursorGlow';

export default function HomePage() {
  return (
    <MotionProvider>
      <CursorGlow />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <HowItWorks />
        <Stats />
        <InputTypes />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </MotionProvider>
  );
}
