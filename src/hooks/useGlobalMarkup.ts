import { useCallback } from 'react';

/**
 * @deprecated Global markup system is REMOVED. Admin sets the final price per 1K
 * directly on each service in Admin → Services. This hook returns identity values
 * so legacy call-sites keep working without recomputing prices.
 */
export function useGlobalMarkup() {
  const applyMarkup = useCallback((basePrice: number): number => basePrice, []);
  return { markupPercent: 0, applyMarkup, isLoading: false };
}
