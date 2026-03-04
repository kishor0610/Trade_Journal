import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercentage(value) {
  if (value === null || value === undefined) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export const INSTRUMENTS = [
  { value: 'XAU/USD', label: 'Gold (XAU/USD)', color: '#F59E0B' },
  { value: 'BTC', label: 'Bitcoin (BTC)', color: '#F7931A' },
  { value: 'ETH', label: 'Ethereum (ETH)', color: '#627EEA' },
  { value: 'Silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'EUR/USD', label: 'EUR/USD', color: '#3B82F6' },
  { value: 'GBP/USD', label: 'GBP/USD', color: '#8B5CF6' },
  { value: 'Stocks', label: 'Stocks/Indices', color: '#10B981' }
];

export const POSITIONS = [
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' }
];

export const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' }
];

export function getInstrumentColor(instrument) {
  const found = INSTRUMENTS.find(i => i.value === instrument);
  return found ? found.color : '#10B981';
}
