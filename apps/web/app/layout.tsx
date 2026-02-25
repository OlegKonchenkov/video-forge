import type { Metadata } from 'next';
import { Bebas_Neue, DM_Serif_Display, Syne } from 'next/font/google';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VideoForge — AI Video Ads in Minutes',
  description: 'Turn any website, PDF, or prompt into a professional video ad with AI. No editing skills needed.',
  openGraph: {
    title: 'VideoForge — AI Video Ads in Minutes',
    description: 'Turn any website, PDF, or prompt into a professional video ad.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${dmSerifDisplay.variable} ${syne.variable}`}
    >
      <body className="bg-film-black text-film-cream font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
