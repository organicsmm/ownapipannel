import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions, type TransactionFilter } from '@/hooks/useTransactions';
import { useCurrency } from '@/hooks/useCurrency';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  Zap,
} from 'lucide-react';

export default function Wallet() {
  const { wallet } = useWallet();
  const { formatPrice } = useCurrency();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const { data: transactions } = useTransactions(filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4" style={{ color: '#10b981' }} />;
      case 'order': return <ArrowUpRight className="h-4 w-4" style={{ color: '#ef4444' }} />;
      case 'refund': return <RefreshCw className="h-4 w-4" style={{ color: '#16a34a' }} />;
      default: return <WalletIcon className="h-4 w-4" style={{ color: '#999' }} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'deposit': return 'rgba(16,185,129,.1)';
      case 'order': return 'rgba(239,68,68,.1)';
      case 'refund': return 'rgba(22, 163, 74,.1)';
      default: return 'rgba(0,0,0,.04)';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'deposit': return '#10b981';
      case 'order': return '#ef4444';
      case 'refund': return '#16a34a';
      default: return '#1a1a2e';
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>Wallet</h1>
          <p className="text-[13px] mt-1" style={{ color: '#999' }}>Manage your balance and transactions.</p>
        </div>

        {/* Balance Card */}
        <div className="rounded-2xl p-6 md:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #831843, #166534, #16a34a)', boxShadow: '0 8px 32px rgba(190,24,93,.2)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,.08)', filter: 'blur(40px)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,.15)' }}>
                <WalletIcon className="h-4 w-4 text-white" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Wallet Balance</p>
            </div>
            <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1">Total Available</p>
            <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">{formatPrice(wallet?.balance || 0)}</p>

            <div className="grid grid-cols-2 gap-4 pt-4 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,.15)' }}>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Total Deposited</p>
                <p className="text-lg font-bold text-white">{formatPrice(wallet?.total_deposited || 0)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Total Spent</p>
                <p className="text-lg font-bold text-white/80">{formatPrice(wallet?.total_spent || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deposit Section — UPI / Cards only (USDT removed for security) */}
        <RazorpayDepositCard />

        {/* Transaction History */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Transaction History</h2>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,.03)' }}>
              {(['all', 'deposit', 'order', 'refund'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: filter === f ? '#16a34a' : 'transparent',
                    color: filter === f ? 'white' : '#888',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : f === 'order' ? 'Orders' : 'Refunds'}
                </button>
              ))}
            </div>
          </div>

          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors"
                  style={{ background: 'rgba(0,0,0,.015)', border: '1px solid rgba(0,0,0,.04)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: getIconBg(tx.type) }}>
                      {getIcon(tx.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[13px] leading-tight truncate max-w-[260px]" style={{ color: '#1a1a2e' }}>
                        {tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {tx.payment_method && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,.04)', color: '#888' }}>
                            {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: tx.status === 'pending' ? 'rgba(245,158,11,.1)' : tx.status === 'completed' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                            color: tx.status === 'pending' ? '#f59e0b' : tx.status === 'completed' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {tx.status}
                        </span>
                        <span className="text-[11px]" style={{ color: '#bbb' }}>{fmtDate(tx.created_at!)}</span>
                        {tx.payment_reference && tx.payment_method === 'usdt_bep20' && (
                          <a
                            href={`https://bscscan.com/tx/${tx.payment_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] flex items-center gap-0.5 hover:underline"
                            style={{ color: '#16a34a' }}
                          >
                            BSCScan <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-[15px]" style={{ color: getAmountColor(tx.type) }}>
                      {tx.type === 'order' ? '−' : '+'}${Math.abs(Number(tx.amount)).toFixed(2)}
                    </p>
                    {tx.balance_after != null && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#bbb' }}>
                        Bal: ${Number(tx.balance_after).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(22, 163, 74,.08)' }}>
                <WalletIcon className="h-6 w-6" style={{ color: '#16a34a' }} />
              </div>
              <p className="font-medium text-[14px]" style={{ color: '#666' }}>No transactions yet</p>
              <p className="text-[12px] mt-1" style={{ color: '#bbb' }}>Your deposits and spending history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
