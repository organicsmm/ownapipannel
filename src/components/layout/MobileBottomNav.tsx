import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, LayoutGrid, Rocket, ListOrdered, Boxes } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const baseItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutGrid, requiresSub: false },
  { to: '/engagement-order', label: 'Engage', icon: Rocket, requiresSub: true },
  { to: '/engagement-orders', label: 'Orders', icon: ListOrdered, requiresSub: false },
  { to: '/my-bundles', label: 'Bundles', icon: Boxes, requiresSub: true },
];

export function MobileBottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const canUsePro = isAdmin || hasActiveSubscription;
  const bottomItems = baseItems.filter((it) => !it.requiresSub || canUsePro);

  return (
    <>
      {/* Top header (mobile only) */}
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md border border-primary/40 flex items-center justify-center bg-card">
              <span className="font-serif italic text-primary text-[14px] leading-none">v</span>
            </div>
            <span className="text-[13px] font-medium tracking-tight text-foreground">BOOSTLY PRO</span>
          </div>
          <button onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom nav (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 h-16">
          {bottomItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-b-full" />}
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-[10px] font-mono uppercase tracking-[0.12em]">{label}</span>
              </NavLink>
            );
          })}
          <button onClick={() => setSidebarOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-[18px] h-[18px]" strokeWidth={1.6} />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em]">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-in full sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden overflow-y-auto">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
