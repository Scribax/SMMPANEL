import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'FollowArg — Social Media Growth Platform',
  description:
    'Grow your Instagram, TikTok, and YouTube presence with real followers, likes, and views. Fast delivery, secure payments.',
  keywords: ['instagram followers', 'tiktok followers', 'youtube views', 'social media growth'],
  openGraph: {
    title: 'FollowArg — Social Media Growth Platform',
    description: 'Boost your social media presence instantly.',
    type: 'website',
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
