import type { Metadata } from 'next';
import { Syne, Figtree, DM_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';

const syne = Syne({ 
  subsets: ['latin'], 
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800']
});

const figtree = Figtree({ 
  subsets: ['latin'], 
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600', '700', '800', '900']
});

const dmMono = DM_Mono({ 
  subsets: ['latin'], 
  variable: '--font-dm-mono',
  weight: ['400', '500']
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
