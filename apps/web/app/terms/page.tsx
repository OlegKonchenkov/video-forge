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
    title: '1. Acceptance of Terms',
    body: `By accessing or using VideoForge, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the service. We reserve the right to update these terms at any time with notice provided via email or dashboard notification.`,
  },
  {
    title: '2. Account Registration',
    body: `You must be at least 18 years old to create an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use at support@videoforge.app.`,
  },
  {
    title: '3. Acceptable Use',
    body: `You agree not to use VideoForge to generate content that is illegal, defamatory, fraudulent, misleading, or violates any third party's intellectual property rights. You may not use the service to create spam, malware, or content that promotes violence or discrimination. We reserve the right to suspend accounts that violate these rules without refund.`,
  },
  {
    title: '4. Content & Intellectual Property',
    body: `You retain all intellectual property rights to the content you submit (URLs, documents, text). You grant VideoForge a limited license to process your content solely for the purpose of generating your requested videos. The generated videos are owned by you. VideoForge retains rights to the underlying AI models and platform.`,
  },
  {
    title: '5. Credits and Billing',
    body: `Subscriptions are billed monthly in advance. Credits are allocated at the start of each billing cycle and reset monthly — unused credits do not roll over. One-off credits are valid for 12 months. All payments are processed by Stripe. We do not store card details. Refunds are issued at our discretion for technical failures.`,
  },
  {
    title: '6. Service Availability',
    body: `We strive for 99.5% uptime but do not guarantee uninterrupted availability. We may perform scheduled maintenance with prior notice. In the event of extended outages, affected credits will be compensated at our discretion. We are not liable for losses arising from service unavailability.`,
  },
  {
    title: '7. Limitation of Liability',
    body: `To the maximum extent permitted by law, VideoForge's total liability to you for any claim arising from these terms or use of the service shall not exceed the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages.`,
  },
  {
    title: '8. Termination',
    body: `You may cancel your account at any time from the Settings page. We may suspend or terminate your account for violation of these terms. Upon termination, your access ceases and your data will be deleted per our retention policy. Clauses 4, 7, and 8 survive termination.`,
  },
  {
    title: '9. Governing Law',
    body: `These terms are governed by the laws of Italy, without regard to conflict of law principles. Disputes shall be resolved exclusively in the courts of Milan, Italy, unless local consumer protection laws in your jurisdiction require otherwise.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-film-black">
      <MarketingNav />

      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 pb-8 border-b border-film-border">
          <span className="section-label mb-3 block">Legal</span>
          <h1 className="font-display text-5xl tracking-wider text-film-cream mb-3">TERMS OF SERVICE</h1>
          <p className="font-serif italic text-film-gray-light">Last updated: January 1, 2025</p>
          <p className="text-film-gray font-sans text-sm mt-4 leading-relaxed">
            Please read these Terms of Service carefully before using VideoForge. They govern your use of the platform and constitute a binding legal agreement between you and VideoForge.
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
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:legal@videoforge.app" className="text-film-amber link-amber">
              legal@videoforge.app
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
            <Link href="/privacy" className="hover:text-film-cream transition-colors">Privacy</Link>
            <Link href="/terms" className="text-film-amber">Terms</Link>
            <Link href="/contact" className="hover:text-film-cream transition-colors">Contact</Link>
          </div>
          <p className="text-film-gray font-sans text-xs">© {new Date().getFullYear()} VideoForge</p>
        </div>
      </footer>
    </div>
  );
}
