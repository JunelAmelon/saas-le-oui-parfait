import './globals.css';
import type { Metadata } from 'next';
import { Inter, Libre_Baskerville } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

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

export const metadata: Metadata = {
  title: 'Le Oui Parfait - Plateforme Wedding Planning',
  description: 'Plateforme SaaS professionnelle de gestion d\'événements pour Wedding Planners',
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
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
          </TimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
