import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service } from '@/lib/supabase';

/**
 * Fetches active services. `services.price` is the FINAL price per 1K set by admin.
 * Subscribes to realtime changes so admin price edits propagate to all clients instantly.
 */
export function useServices() {
  const queryClient = useQueryClient();

  const { data: services, isLoading, ...rest } = useQuery({
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
    staleTime: 30 * 1000,        // 30s — realtime will refresh sooner anyway
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Realtime: any change in services table → refetch immediately
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

  return {
    services,
    isLoading,
    markupPercent: 0, // legacy compat
    ...rest,
  };
}
