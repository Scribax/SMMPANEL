import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FollowArg — Seguidores, Likes y Vistas Reales",
    template: "%s | FollowArg",
  },
  description:
    "Comprá seguidores, likes y vistas reales para Instagram, TikTok y YouTube. Entrega rápida, pagos seguros con MercadoPago. El panel SMM #1 de Argentina.",
  keywords: [
    "seguidores instagram",
    "seguidores tiktok",
    "vistas youtube",
    "comprar seguidores argentina",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FollowArg",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "FollowArg — Crecé en redes sociales",
    description:
      "Seguidores, likes y vistas reales. Entrega instantánea, pagás con MercadoPago.",
    type: "website",
    images: [{ url: "/icon-512.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes pwa-pulse {
              0%, 100% { transform: scale(0.9); opacity: 0.5; }
              50% { transform: scale(1.15); opacity: 1; }
            }
            @keyframes pwa-zoom {
              0% { transform: scale(0.85); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes pwa-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes pwa-logo-anim {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          `
        }} />
      </head>
      <body className="min-h-screen bg-dark-300 text-white antialiased">
        {/* PWA Splash Screen Overlay */}
        <div id="pwa-splash" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          transition: 'opacity 0.4s ease-out, visibility 0.4s',
        }}>
          {/* Glowing Pulse circle in the background */}
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
            borderRadius: '50%',
            animation: 'pwa-pulse 2s infinite ease-in-out',
          }}></div>

          {/* Logo container */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            animation: 'pwa-zoom 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(99,102,241,0.4)',
              position: 'relative',
            }}>
              {/* Arrow growth graphic */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '44px', height: '44px', animation: 'pwa-logo-anim 2s infinite ease-in-out' }}>
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              {/* Glow back-layer */}
              <div style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '32px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                zIndex: -1,
                opacity: 0.5,
                filter: 'blur(8px)',
              }}></div>
            </div>

            <div style={{
              fontSize: '24px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginTop: '8px',
            }}>
              FollowArg
            </div>
            
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'pwa-spin 0.8s linear infinite',
              marginTop: '12px',
            }}></div>
          </div>
        </div>

        {/* Script to dismiss splash screen */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function hideSplash() {
                var splash = document.getElementById('pwa-splash');
                if (splash && splash.style.opacity !== '0') {
                  splash.style.opacity = '0';
                  setTimeout(function() {
                    splash.style.display = 'none';
                  }, 400);
                }
              }
              // Wait for full page load
              window.addEventListener('load', function() {
                setTimeout(hideSplash, 1000);
              });
              // Safety fallback (2.5s max)
              setTimeout(hideSplash, 2500);
            })();
          `
        }} />

        {children}
        <FloatingWhatsApp />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e1e2e",
              color: "#e2e8f0",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "12px",
            },
            success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
