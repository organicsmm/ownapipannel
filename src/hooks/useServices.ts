import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service } from '@/lib/supabase';
import { useCategoryPricing } from './useCategoryPricing';

/**
 * Fetches active services and OVERRIDES each service.price with the admin-set
 * category price (from `category_pricing`). Provider's actual cost doesn't matter —
 * users pay the per-1K rate that admin set for that category.
 */
export function useServices() {
  const queryClient = useQueryClient();
  const { priceMap } = useCategoryPricing();

  const { data: rawServices, isLoading, ...rest } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel('services-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['services'] });
          queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Apply category pricing override
  const services = useMemo(() => {
    if (!rawServices) return rawServices;
    return rawServices.map(s => {
      const catPrice = priceMap[s.category];
      return catPrice != null && catPrice > 0
        ? { ...s, price: catPrice }
        : s;
    });
  }, [rawServices, priceMap]);

  return {
    services,
    isLoading,
    markupPercent: 0,
    ...rest,
  };
}
