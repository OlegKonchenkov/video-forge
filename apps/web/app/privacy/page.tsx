import Link from 'next/link';

function MarketingNav() {
  return (
    <header className="border-b border-film-border bg-film-black sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl tracking-wider text-film-cream">VIDEO</span>
          <span className="font-display text-xl tracking-wider text-film-amber">FORGE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-film-gray hover:text-film-cream font-sans text-sm transition-colors">Pricing</Link>
          <Link href="/contact" className="text-film-gray hover:text-film-cream font-sans text-sm transition-colors">Contact</Link>
          <Link href="/login" className="btn-ghost !py-2 !px-4 !text-xs">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly to us when you create an account, such as your name, email address, and password. When you use VideoForge, we collect the content you submit (website URLs, documents, text prompts) to generate your videos. We also collect usage data, log files, and cookies necessary for the operation of the service.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: provide, maintain, and improve VideoForge; process video generation jobs; send transactional emails (e.g. video ready notifications); respond to your support requests; prevent fraud and abuse; and comply with legal obligations. We do not sell your personal data to third parties.`,
  },
  {
    title: '3. Data Retention',
    body: `We retain your account information for as long as your account is active. Generated video files are retained for 14 days on free plans and 90 days on paid plans. You may delete your videos or close your account at any time from the Settings page.`,
  },
  {
    title: '4. Sharing of Information',
    body: `We share your data with trusted service providers (Supabase for database hosting, Stripe for payments, cloud storage providers) solely to operate VideoForge. These providers are bound by confidentiality obligations. We may disclose data if required by law or to protect rights and safety.`,
  },
  {
    title: '5. Cookies',
    body: `VideoForge uses essential cookies required for authentication and session management. We do not use advertising trackers or third-party analytics cookies without your consent. You may disable cookies in your browser settings, but some features of the service may not function properly.`,
  },
  {
    title: '6. Security',
    body: `We implement industry-standard security measures including TLS encryption in transit, encrypted storage at rest, and access controls. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security, but we strive to protect your data using best practices.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, to object to or restrict processing, or to data portability. To exercise these rights, contact us at privacy@videoforge.app. We will respond within 30 days.`,
  },
  {
    title: '8. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice on the dashboard. Your continued use of VideoForge after changes constitutes acceptance of the updated policy.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-film-black">
      <MarketingNav />

      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 pb-8 border-b border-film-border">
          <span className="section-label mb-3 block">Legal</span>
          <h1 className="font-display text-5xl tracking-wider text-film-cream mb-3">PRIVACY POLICY</h1>
          <p className="font-serif italic text-film-gray-light">Last updated: January 1, 2025</p>
          <p className="text-film-gray font-sans text-sm mt-4 leading-relaxed">
            VideoForge (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding that data.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-0 border border-film-border">
          {sections.map(({ title, body }, i) => (
            <div key={i} className={`p-6 ${i < sections.length - 1 ? 'border-b border-film-border' : ''}`}>
              <h2 className="font-display text-lg tracking-wider text-film-cream mb-3">{title}</h2>
              <p className="text-film-gray font-sans text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 film-card p-6">
          <span className="section-label mb-2 block">Questions?</span>
          <p className="text-film-cream font-sans text-sm">
            If you have any questions about this Privacy Policy, contact us at{' '}
            <a href="mailto:privacy@videoforge.app" className="text-film-amber link-amber">
              privacy@videoforge.app
            </a>{' '}
            or through our{' '}
            <Link href="/contact" className="text-film-amber link-amber">contact page</Link>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-film-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-lg tracking-wider text-film-cream">VIDEO</span>
            <span className="font-display text-lg tracking-wider text-film-amber">FORGE</span>
          </Link>
          <div className="flex gap-6 text-film-gray font-sans text-xs">
            <Link href="/privacy" className="text-film-amber">Privacy</Link>
            <Link href="/terms" className="hover:text-film-cream transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-film-cream transition-colors">Contact</Link>
          </div>
          <p className="text-film-gray font-sans text-xs">© {new Date().getFullYear()} VideoForge</p>
        </div>
      </footer>
    </div>
  );
}
