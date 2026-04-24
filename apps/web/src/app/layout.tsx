import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { AppShell } from '@/components/app/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const workSans = localFont({
  src: [
    { path: '../../font/Work_Sans/WorkSans-VariableFont_wght.ttf', style: 'normal' },
    { path: '../../font/Work_Sans/WorkSans-Italic-VariableFont_wght.ttf', style: 'italic' },
  ],
  variable: '--font-work-sans',
  weight: '100 900',
  display: 'swap',
});

const bigShoulders = localFont({
  src: '../../font/Big_Shoulders/BigShoulders-VariableFont_opsz,wght.ttf',
  variable: '--font-big-shoulders',
  weight: '100 900',
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
      className={`${workSans.variable} ${bigShoulders.variable}`}
    >
      <head />
      <body className="min-h-screen antialiased">
        <ThemeScript />
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
