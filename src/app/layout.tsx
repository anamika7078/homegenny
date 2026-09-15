import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';

// Self-hosted (latin subset from Google Fonts, SIL OFL). next/font/google
// downloads fonts during `next build`, and the server's docker build cannot
// reach fonts.googleapis.com, so the production build hung retrying there.
const syne = localFont({
  src: [{ path: './fonts/Syne-Variable.woff2', weight: '400 800', style: 'normal' }],
  variable: '--font-syne',
  display: 'swap',
});

const figtree = localFont({
  src: [{ path: './fonts/Figtree-Variable.woff2', weight: '300 900', style: 'normal' }],
  variable: '--font-figtree',
  display: 'swap',
});

const dmMono = localFont({
  src: [
    { path: './fonts/DMMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/DMMono-Medium.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HomeGenny — Enterprise Staffing Management',
  description: 'Premium enterprise-grade domestic staffing and workforce management platform.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${figtree.variable} ${dmMono.variable} dark`}>
      <body className="bg-background text-foreground font-figtree antialiased selection:bg-primary/30 selection:text-primary-foreground">
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
