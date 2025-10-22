/**
 * Formatação brasileira para moeda, datas e números
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const parseFormattedCurrency = (value: string): number => {
  return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
};
