import './globals.css';
import type { Metadata } from 'next';
import { Inter, Libre_Baskerville } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { WhatsAppChat } from '@/components/WhatsAppChat';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-baskerville',
  display: 'swap',
});

const siteUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.json',
  themeColor: '#4B4456',
  appleWebApp: {
    capable: true,
    title: 'Le Oui Parfait',
    statusBarStyle: 'default',
  },
  title: 'Le Oui Parfait - Plateforme Wedding Planning',
  description: 'Plateforme SaaS professionnelle de gestion d\'événements pour Wedding Planners',
  openGraph: {
    title: 'Le Oui Parfait - Plateforme Wedding Planning',
    description: 'Plateforme SaaS professionnelle de gestion d\'événements pour Wedding Planners',
    siteName: 'Le Oui Parfait',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Le Oui Parfait',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Le Oui Parfait - Plateforme Wedding Planning',
    description: 'Plateforme SaaS professionnelle de gestion d\'événements pour Wedding Planners',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${libreBaskerville.variable} antialiased`}>
        <AuthProvider>
          <TimerProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
            <WhatsAppChat />
          </TimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
