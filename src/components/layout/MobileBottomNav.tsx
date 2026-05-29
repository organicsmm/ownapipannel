import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MobileBottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md border border-primary/40 flex items-center justify-center bg-card">
              <span className="font-serif italic text-primary text-[14px] leading-none">v</span>
            </div>
            <span className="text-[13px] font-medium tracking-tight text-foreground">VOTING PRO</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
