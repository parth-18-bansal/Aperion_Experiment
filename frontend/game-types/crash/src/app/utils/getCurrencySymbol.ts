
import { getCurrencySymbol } from '@angular/common';

const customSymbols: Record<string, string> = {
  FUN: '$',  // or "FUN$"
  DMO: '$',  // or "DMO$"
};

export function getCurrencySym(
  code: string | null | undefined
): string {
  if (!code) return '';
  
  // If custom currency, return our mapped symbol
  if (customSymbols[code]) {
    return customSymbols[code];
  }

  // Otherwise fallback to Angular built-in
  return getCurrencySymbol(code, 'narrow');
}