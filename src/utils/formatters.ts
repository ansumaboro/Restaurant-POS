/**
 * Currency & Number Formatters for Commercial POS
 */

export const formatCurrency = (amount: number | string | null | undefined): string => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(numeric)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export const formatQuantity = (qty: number | string | null | undefined, unit?: string): string => {
  const numeric = typeof qty === 'number' ? qty : parseFloat(String(qty || 0));
  if (isNaN(numeric)) return `0 ${unit || ''}`.trim();
  const formatted = numeric % 1 === 0 ? numeric.toString() : numeric.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDateOnly = (dateString?: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const formatVariance = (variance: number, unit?: string): { text: string; colorClass: string } => {
  const formatted = variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2);
  const withUnit = unit ? `${formatted} ${unit}` : formatted;
  
  if (variance > 0) {
    return { text: withUnit, colorClass: 'text-emerald-700 font-bold' };
  } else if (variance < 0) {
    return { text: withUnit, colorClass: 'text-rose-600 font-bold' };
  }
  return { text: withUnit, colorClass: 'text-stone-600 font-medium' };
};
