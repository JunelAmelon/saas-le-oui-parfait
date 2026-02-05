import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-beige">
      <Sidebar />
      <Topbar />
      <main className="ml-0 md:ml-64 pt-16">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
