/**
 * Formatiert einen Betrag mit Euro-Symbol hinten
 * z.B. 100.50 → "100,50 €"
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' €';
};

/**
 * Formatiert ein Datum als TT.MM.YYYY
 * z.B. new Date('2026-01-14') → "14.01.2026"
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
};
