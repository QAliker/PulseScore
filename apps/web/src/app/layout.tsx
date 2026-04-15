import type { Metadata } from 'next';
import { Archivo, Big_Shoulders } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { AppShell } from '@/components/app/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const bigShoulders = Big_Shoulders({
  variable: '--font-big-shoulders',
  subsets: ['latin'],
  weight: ['500', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PulseScore Arena — Live Football Scores',
    template: '%s · PulseScore Arena',
  },
  description:
    'Real-time football scores for England Championship and France Ligue 2. Updates the instant a goal happens.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${archivo.variable} ${bigShoulders.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <AppShell>{children}</AppShell>
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
