import { Syne, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap'
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap'
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap'
});
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Funded",
  description: "Household Finance Control Center",
  manifest: "/manifest.json?v=3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Funded",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased bg-background">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-light-512x512.png?v=3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detect Standalone (PWA) Mode
              if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
                document.documentElement.classList.add('standalone-mode');
              }

              // Force Service Worker Update and Cache Clear to bust stale PWA builds
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for (var i = 0; i < registrations.length; i++) {
                        registrations[i].unregister();
                      }
                    });
                  } else {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(reg) {
                        reg.update(); // Force update SW
                      }
                    );
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className={`h-[100dvh] w-screen flex flex-col overflow-hidden bg-background ${syne.variable} ${instrument.variable} ${jetbrains.variable} font-body relative`}>
        {/* Green Haze Background */}
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-primary opacity-[0.08] dark:opacity-15 blur-[150px] pointer-events-none -z-10 translate-x-1/4 translate-y-1/4 rounded-full" />
        
        {/* Session is resolved client-side in AppProvider (see AppContext).
            No server-side session prefetch here — reading cookies() in the
            root layout would force the entire app to render dynamically under
            cacheComponents, defeating static prerender and turning every soft
            navigation into a per-request serverless RSC fetch (see #47). */}
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
