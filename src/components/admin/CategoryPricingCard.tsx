import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Tag } from 'lucide-react';
import { useCategoryPricing } from '@/hooks/useCategoryPricing';

/**
 * Simple admin card: per-category price-per-1K boxes.
 * Admin types the rate, hits Save, price updates live across the whole site.
 */
export function CategoryPricingCard() {
  const queryClient = useQueryClient();
  const { rows, isLoading } = useCategoryPricing();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Sync DB rows → local draft inputs (only on initial / new keys)
  useEffect(() => {
    setDraft(prev => {
      const next = { ...prev };
      rows.forEach(r => {
        if (next[r.category] === undefined) {
          next[r.category] = String(r.price_per_1k ?? 0);
        }
      });
      return next;
    });
  }, [rows]);

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

  const deleteMutation = useMutation({
    mutationFn: async (category: string) => {
      const { error } = await supabase
        .from('category_pricing')
        .delete()
        .eq('category', category);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removed');
      queryClient.invalidateQueries({ queryKey: ['category-pricing'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (category: string) => {
    const val = parseFloat(draft[category] || '0');
    if (isNaN(val) || val < 0) {
      toast.error('Valid price daalo');
      return;
    }
    saveMutation.mutate({ category, price: val });
  };

  const handleAdd = () => {
    const cat = newCat.trim();
    const price = parseFloat(newPrice || '0');
    if (!cat) return toast.error('Category naam likho');
    if (isNaN(price) || price < 0) return toast.error('Sahi price daalo');
    saveMutation.mutate(
      { category: cat, price },
      {
        onSuccess: () => {
          setNewCat('');
          setNewPrice('');
        },
      }
    );
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Tag className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Category Pricing (per 1K)</h2>
          <p className="text-xs text-muted-foreground">
            Yahan jo price set karoge wahi user ko har service par lagega — provider ka cost matter nahi karta.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <div key={r.category} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{r.category}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={draft[r.category] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [r.category]: e.target.value })}
                    className="input-glass pl-7"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => handleSave(r.category)}
                  disabled={saveMutation.isPending}
                  className="gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Remove pricing for "${r.category}"?`)) deleteMutation.mutate(r.category);
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new category row */}
      <div className="pt-4 border-t border-border">
        <Label className="text-xs text-muted-foreground mb-2 block">+ Add new category price</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Category name (e.g. Instagram Reels Views)"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="input-glass flex-1"
          />
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.00"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="input-glass pl-7"
            />
          </div>
          <Button onClick={handleAdd} disabled={saveMutation.isPending} variant="gradient">
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
