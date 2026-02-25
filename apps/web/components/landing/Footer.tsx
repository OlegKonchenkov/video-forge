import Link from 'next/link';

const links = [
  { label: 'Privacy',  href: '/privacy' },
  { label: 'Terms',    href: '/terms' },
  { label: 'Pricing',  href: '#pricing' },
  { label: 'Contact',  href: 'mailto:hello@videoforge.ai' },
];

export function Footer() {
  return (
    <footer className="bg-film-black border-t border-film-border">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Wordmark */}
        <span className="font-display text-xl tracking-widest leading-none select-none">
          <span className="text-film-cream">VIDEO</span>
          <span className="text-film-amber">FORGE</span>
        </span>

        {/* Nav */}
        <ul className="flex items-center gap-8">
          {links.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-film-gray hover:text-film-cream transition-colors link-amber"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Copyright */}
        <p className="text-[0.6rem] tracking-[0.15em] uppercase text-film-gray/50">
          © 2026 VideoForge
        </p>
      </div>

      {/* Bottom amber line */}
      <div className="h-0.5 bg-film-amber/20" />
    </footer>
  );
}
