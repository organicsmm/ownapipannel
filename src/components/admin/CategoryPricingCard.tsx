import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Tag } from 'lucide-react';
import { useCategoryPricing } from '@/hooks/useCategoryPricing';

/**
 * Pricing boxes auto-generated from active bundles.
 * Jaise hi kisi bundle me naya engagement type (comments, etc.) add hota hai —
 * yahan apne aap box dikh jata hai. Price INR me set hoti hai aur live user panel me reflect hoti hai.
 */

// Platform display name normalizer
const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const platformLabel = (p: string) => PLATFORM_LABELS[p?.toLowerCase()] || cap(p || '');
const categoryFor = (platform: string, engType: string) =>
  `${platformLabel(platform)} ${cap(engType)}`;

export function CategoryPricingCard() {
  const queryClient = useQueryClient();
  const { rows: priceRows, isLoading: pricingLoading } = useCategoryPricing();
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Fetch active bundles + their engagement types (realtime)
  const { data: bundleData, isLoading: bundlesLoading } = useQuery({
    queryKey: ['bundles-for-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagement_bundles')
        .select('id, platform, is_active, bundle_items(engagement_type)')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Realtime: bundles/items change → refetch derived categories
  useEffect(() => {
    const ch = supabase
      .channel('bundles-pricing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_bundles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['bundles-for-pricing'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['bundles-for-pricing'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // Derive grouped categories: { Instagram: ['Instagram Likes', ...], TikTok: [...] }
  const grouped = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (bundleData || []).forEach((b: any) => {
      const pLabel = platformLabel(b.platform);
      if (!map.has(pLabel)) map.set(pLabel, new Set());
      (b.bundle_items || []).forEach((it: any) => {
        map.get(pLabel)!.add(categoryFor(b.platform, it.engagement_type));
      });
    });
    return Array.from(map.entries())
      .map(([platform, cats]) => ({ platform, categories: Array.from(cats).sort() }))
      .sort((a, b) => a.platform.localeCompare(b.platform));
  }, [bundleData]);

  // Map of saved prices by category
  const priceByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    priceRows.forEach(r => { m[r.category] = Number(r.price_per_1k) || 0; });
    return m;
  }, [priceRows]);

  // Sync DB prices → draft (only first time per key)
  useEffect(() => {
    setDraft(prev => {
      const next = { ...prev };
      Object.entries(priceByCategory).forEach(([cat, price]) => {
        if (next[cat] === undefined) next[cat] = String(price);
      });
      // Also seed any bundle-derived category that has no row yet
      grouped.forEach(g => g.categories.forEach(cat => {
        if (next[cat] === undefined) next[cat] = '0';
      }));
      return next;
    });
  }, [priceByCategory, grouped]);

  const saveMutation = useMutation({
    mutationFn: async ({ category, price }: { category: string; price: number }) => {
      const { error } = await supabase
        .from('category_pricing')
        .upsert({ category, price_per_1k: price, updated_at: new Date().toISOString() }, { onConflict: 'category' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Price updated');
      queryClient.invalidateQueries({ queryKey: ['category-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (category: string) => {
    const val = parseFloat(draft[category] || '0');
    if (isNaN(val) || val < 0) return toast.error('Valid price daalo');
    saveMutation.mutate({ category, price: val });
  };

  const isLoading = pricingLoading || bundlesLoading;
  const hasAny = grouped.some(g => g.categories.length > 0);

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Bundle Pricing (per 1K) — INR</h2>
          <p className="text-xs text-muted-foreground">
            Boxes apne aap bundles se aate hain. Jo ₹ rate yahan set karoge wahi user ko har service par lagega.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      ) : !hasAny ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Koi active bundle nahi mila. Pehle Admin → Bundles me bundle banao, fir pricing yahan apne aap aa jayegi.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(g => (
            <div key={g.platform} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80">{g.platform}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.categories.map(cat => {
                  // Strip platform prefix for cleaner label, e.g. "Instagram Likes" → "Likes"
                  const shortLabel = cat.replace(`${g.platform} `, '');
                  return (
                    <div key={cat} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{shortLabel}</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft[cat] ?? ''}
                            onChange={(e) => setDraft({ ...draft, [cat]: e.target.value })}
                            className="input-glass pl-7"
                            placeholder="0.00"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => handleSave(cat)}
                          disabled={saveMutation.isPending}
                          className="gap-1"
                          title="Save"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
