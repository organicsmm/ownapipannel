import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Wallet, ListOrdered, Settings,
  LifeBuoy, Shield, LogOut, Rocket, Sparkles, X, ChevronDown, Code2, Brain,
  KeyRound, Layers, Boxes, PackagePlus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency, CURRENCIES } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarProps { onClose?: () => void; }

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Rocket, label: 'Full Engagement', path: '/engagement-order', tag: 'NEW', requiresSub: true },
  { icon: PackagePlus, label: 'Mass Order', path: '/mass-order', tag: 'NEW', requiresSub: true },
  { icon: Brain, label: 'AI Intelligence', path: '/intelligence' },
  { icon: Sparkles, label: 'Engagement Orders', path: '/engagement-orders' },
  
  { icon: LifeBuoy, label: 'Support', path: '/support' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin, signOut, profile } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const canUsePro = isAdmin || hasActiveSubscription;
  const { currency, setCurrency, currencyInfo } = useCurrency();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  return (
    <aside className="h-full w-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md border border-primary/40 flex items-center justify-center bg-background">
            <span className="font-serif italic text-primary text-[18px] leading-none">v</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-medium tracking-tight text-foreground">BOOSTLY PRO</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">:LUXURY EDITION</span>
          </div>
        </Link>
        <button onClick={onClose} className="lg:hidden w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile */}
      {profile && (
        <div className="mx-5 mb-5 pb-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-[11px] font-medium bg-secondary text-foreground">
              {profile.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate text-foreground">{profile.full_name || 'User'}</p>
              <p className="text-[10px] truncate text-muted-foreground font-mono">{profile.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <p className="px-3 mb-2 lux-eyebrow">:menu</p>
        {userNavItems.filter((it) => !it.requiresSub || canUsePro).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              className={cn(
                'group flex items-center gap-3 h-10 px-3 mb-0.5 text-[12.5px] font-medium transition-all rounded-md',
                isActive
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              )}
            >
              <span className={cn('w-[2px] h-5 rounded-full transition-all', isActive ? 'bg-primary' : 'bg-transparent')} />
              <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1">{item.label}</span>
              {item.tag && (
                <span className="font-mono text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm border border-primary/30 text-primary">
                  {item.tag}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 mx-3 border-t border-sidebar-border" />
            <p className="px-3 mb-2 lux-eyebrow">:admin</p>
            <Link to="/admin" onClick={onClose}
              className={cn(
                'group flex items-center gap-3 h-10 px-3 text-[12.5px] font-medium transition-all rounded-md',
                location.pathname.startsWith('/admin')
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              )}>
              <span className={cn('w-[2px] h-5 rounded-full', location.pathname.startsWith('/admin') ? 'bg-primary' : 'bg-transparent')} />
              <Shield className={cn('w-4 h-4', location.pathname.startsWith('/admin') ? 'text-primary' : '')} />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
        {/* My Provider section (per-user) — visible to everyone; locked preview for non-subs */}
        <div className="my-4 mx-3 border-t border-sidebar-border" />
        <p className="px-3 mb-2 lux-eyebrow">:my provider</p>
        {[
          { icon: KeyRound, label: 'My Providers', path: '/my-providers' },
          { icon: Boxes, label: 'My Bundles', path: '/my-bundles' },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          const locked = !canUsePro;
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              className={cn(
                'group flex items-center gap-3 h-10 px-3 mb-0.5 text-[12.5px] font-medium transition-all rounded-md',
                isActive ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              )}
              title={locked ? 'Locked — subscribe to unlock' : undefined}
            >
              <span className={cn('w-[2px] h-5 rounded-full', isActive ? 'bg-primary' : 'bg-transparent')} />
              <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1 flex items-center gap-1.5">
                {item.label}
                {locked && <Lock className="w-3 h-3 text-muted-foreground/70" />}
              </span>
              <span className={cn(
                'font-mono text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm border',
                locked ? 'border-border text-muted-foreground' : 'border-primary/30 text-primary'
              )}>
                PRO
              </span>
            </Link>
          );
        })}

      </nav>

      {/* Currency */}
      <div className="px-3 pb-2 relative">
        <button onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
          className="w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-base">{currencyInfo.flag}</span>
            <span className="font-mono text-[11px] tracking-[0.15em]">:{currencyInfo.code}</span>
          </div>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showCurrencyPicker && 'rotate-180')} />
        </button>
        {showCurrencyPicker && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md overflow-hidden z-50 bg-popover border border-border shadow-2xl">
            {CURRENCIES.map((c) => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors',
                  currency === c.code ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}>
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 text-left font-mono tracking-wider">{c.code}</span>
                <span className="text-[10px] opacity-50">{c.symbol}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Telegram */}
      <div className="px-3 pb-2">
        <a href="https://t.me/whopcampaign" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-3 h-10 rounded-md text-[11.5px] font-medium text-muted-foreground hover:text-foreground border border-sidebar-border hover:border-primary/40 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase">:join telegram</span>
        </a>
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-md text-[12px] font-medium text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
