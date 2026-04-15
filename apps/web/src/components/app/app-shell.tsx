import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background text-foreground">
      <AppHeader />
      <div className="grid lg:grid-cols-[256px_1fr]">
        <AppSidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
