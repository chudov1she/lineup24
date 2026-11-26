import type { Metadata } from 'next';
import type React from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans, Unbounded } from 'next/font/google';
import { AppProviders } from '@/components/providers';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BRAND } from '@/lib/brand';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
});

const unbounded = Unbounded({
  variable: '--font-heading',
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
  },
  twitter: {
    card: 'summary',
    title: BRAND.name,
    description: BRAND.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${plexSans.variable} ${unbounded.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Toaster>
          <TooltipProvider>
            <AppProviders>{children}</AppProviders>
          </TooltipProvider>
        </Toaster>
      </body>
    </html>
  );
}
