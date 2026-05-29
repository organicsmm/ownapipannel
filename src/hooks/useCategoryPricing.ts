import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryPrice {
  category: string;
  price_per_1k: number;
  updated_at?: string;
}

/**
 * Admin-controlled per-1K price for each category (Views, Likes, etc.).
 * Returns a map: { "Instagram Views": 0.50, ... }
 * Realtime: any admin edit propagates to all clients instantly.
 */
export function useCategoryPricing() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['category-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_pricing')
        .select('*')
        .order('category');
      if (error) throw error;
      return (data || []) as CategoryPrice[];
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel('category-pricing-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'category_pricing' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['category-pricing'] });
          queryClient.invalidateQueries({ queryKey: ['services'] });
          queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const priceMap: Record<string, number> = {};
  (query.data || []).forEach(r => {
    priceMap[r.category] = Number(r.price_per_1k) || 0;
  });

  return {
    rows: query.data || [],
    priceMap,
    getPrice: (category: string, fallback = 0) =>
      priceMap[category] != null ? priceMap[category] : fallback,
    isLoading: query.isLoading,
  };
}
