import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'FollowArg — Crecé en redes sociales',
  description:
    'Seguidores, likes y vistas reales para Instagram, TikTok y YouTube. Entrega rápida, pagos seguros con MercadoPago.',
  keywords: ['seguidores instagram', 'seguidores tiktok', 'vistas youtube', 'comprar seguidores argentina'],
  icons: {
    icon: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  openGraph: {
    title: 'FollowArg — Crecé en redes sociales',
    description: 'Seguidores, likes y vistas reales. Entrega instantánea, pagás con MercadoPago.',
    type: 'website',
    images: [{ url: '/logo.jpeg' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-dark-300 text-white antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e1e2e',
              color: '#e2e8f0',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
