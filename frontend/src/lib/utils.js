import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined) return '-';
  
  // Use appropriate locale for currency
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
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

export function formatDateTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const INSTRUMENTS = [
  { value: 'XAU/USD', label: 'Gold (XAU/USD)', color: '#F59E0B', category: 'commodities' },
  { value: 'XAG/USD', label: 'Silver (XAG/USD)', color: '#C0C0C0', category: 'commodities' },
  { value: 'BTC/USD', label: 'Bitcoin (BTC/USD)', color: '#F7931A', category: 'crypto' },
  { value: 'ETH/USD', label: 'Ethereum (ETH/USD)', color: '#627EEA', category: 'crypto' },
  { value: 'EUR/USD', label: 'EUR/USD', color: '#3B82F6', category: 'forex' },
  { value: 'GBP/USD', label: 'GBP/USD', color: '#8B5CF6', category: 'forex' },
  { value: 'USD/JPY', label: 'USD/JPY', color: '#EC4899', category: 'forex' },
  { value: 'AUD/USD', label: 'AUD/USD', color: '#14B8A6', category: 'forex' },
  { value: 'NAS100', label: 'NASDAQ 100', color: '#10B981', category: 'indices' },
  { value: 'US30', label: 'Dow Jones 30', color: '#6366F1', category: 'indices' },
  { value: 'SPX500', label: 'S&P 500', color: '#F43F5E', category: 'indices' },
];

export const POSITIONS = [
  { value: 'buy', label: 'Buy / Long' },
  { value: 'sell', label: 'Sell / Short' }
];

export const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' }
];

export const TIME_PERIODS = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'All' }
];

export function getInstrumentColor(instrument) {
  const found = INSTRUMENTS.find(i => i.value === instrument);
  return found ? found.color : '#10B981';
}

export function getInstrumentCategory(instrument) {
  const found = INSTRUMENTS.find(i => i.value === instrument);
  return found ? found.category : 'other';
}

// Calendar helpers
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month];
}

// Calculate weekly totals for calendar
export function calculateWeeklyTotals(dailyData, year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weeks = [];
  let currentWeek = { days: [], total: 0 };
  
  // Fill empty days at start
  for (let i = 0; i < firstDay; i++) {
    currentWeek.days.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dailyData.find(d => d.date === dateStr);
    
    currentWeek.days.push({
      day,
      date: dateStr,
      pnl: dayData?.pnl || 0,
      trades: dayData?.trades || 0,
      wins: dayData?.wins || 0
    });
    
    if (dayData?.pnl) {
      currentWeek.total += dayData.pnl;
    }
    
    // End of week (Saturday) or end of month
    if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
      // Fill remaining days if end of month
      while (currentWeek.days.length < 7) {
        currentWeek.days.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = { days: [], total: 0 };
    }
  }
  
  return weeks;
}
