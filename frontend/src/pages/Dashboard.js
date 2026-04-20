import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import axios from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatNumber,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthName,
  TIME_PERIODS,
} from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const playSound = (src = '/sounds/tick.mp3', volume = 0.18) => {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
};

const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 88, damping: 20, mass: 0.6 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(Number(value || 0));
  }, [value, motionValue]);

  useEffect(() => {
    const unsub = spring.on('change', (latest) => setDisplay(latest));
    return unsub;
  }, [spring]);

  return <span className={className}>{prefix}{formatNumber(display, decimals)}{suffix}</span>;
};

const DashboardRefreshContext = React.createContext(false);

const Shimmer = () => (
  <motion.div
    initial={{ x: '-100%' }}
    animate={{ x: '100%' }}
    transition={{ duration: 0.8, ease: 'easeInOut' }}
    className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent"
  />
);

const cardHover = {
  whileHover: {
    y: -3,
    scale: 1.006,
    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
  },
};

const DashboardCard = ({ title, borderClass = 'border-white/10', className = '', children }) => {
  const isRefreshing = React.useContext(DashboardRefreshContext);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      {...cardHover}
      className={`glass-card p-4 border ${borderClass} ${className} relative overflow-hidden transition-transform duration-200 shadow-[0_8px_16px_rgba(0,0,0,0.18)]`}
      style={{ backfaceVisibility: 'hidden' }}
    >
      {isRefreshing && <Shimmer />}
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {children}
    </motion.div>
  );
};

const getGaugeColor = (value) => {
  if (value < 50) return '#ef4444';
  if (value < 65) return '#f59e0b';
  return '#22c55e';
};

const RadialGauge = ({ value, label, weeklyDelta, accentClass }) => {
  const target = Math.max(0, Math.min(100, Number(value || 0)));
  const color = getGaugeColor(target);
  const size = 118;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const [dashOffset, setDashOffset] = useState(circumference);
  const [settledPulse, setSettledPulse] = useState(false);

  useEffect(() => {
    const unsub = progress.on('change', (latest) => {
      setDashOffset(circumference - latest);
    });
    return unsub;
  }, [progress, circumference]);

  useEffect(() => {
    // Always restart from empty so users see the arc sweep on load/switch.
    progress.set(0);
    const targetLen = (target / 100) * circumference;
    const controls = animate(progress, targetLen, {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1],
    });

    setSettledPulse(false);
    const timer = setTimeout(() => setSettledPulse(true), 1180);
    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [target, circumference, progress]);

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className="relative"
        animate={settledPulse ? { scale: [1, 1.03, 1], filter: ['drop-shadow(0 0 0px transparent)', `drop-shadow(0 0 8px ${color})`, 'drop-shadow(0 0 0px transparent)'] } : { scale: 1, filter: 'drop-shadow(0 0 0px transparent)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedNumber value={target} decimals={2} suffix="%" className="text-lg font-mono font-bold" />
        </div>
      </motion.div>
      <div>
        <p className={`font-semibold ${accentClass}`}>{label}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {weeklyDelta >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
          {weeklyDelta >= 0 ? '+' : ''}{formatNumber(weeklyDelta, 2)}% this week
        </p>
      </div>
    </div>
  );
};

const CalendarCell = ({ cell, currency }) => {
  const [hovered, setHovered] = useState(false);
  const isStrongProfit = cell.pnl > 100;
  const isStrongLoss = cell.pnl < -100;
  return (
    <motion.div
      className={`h-[104px] rounded-xl p-2 border relative overflow-visible flex flex-col justify-start cursor-default ${
        cell.pnl > 0
          ? 'border-emerald-500/40 bg-emerald-900/30'
          : cell.pnl < 0
            ? 'border-red-500/40 bg-red-900/30'
            : 'border-white/10 bg-slate-900/50'
      }`}
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {(isStrongProfit || isStrongLoss) && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: isStrongProfit
              ? ['inset 0 0 0px rgba(0,255,100,0)', 'inset 0 0 14px rgba(0,255,100,0.45)', 'inset 0 0 0px rgba(0,255,100,0)']
              : ['inset 0 0 0px rgba(255,50,50,0)', 'inset 0 0 12px rgba(255,50,50,0.45)', 'inset 0 0 0px rgba(255,50,50,0)'],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}
      <p className="text-sm text-slate-300">{cell.day}</p>
      {cell.trades > 0 ? (
        <div className="mt-2 min-h-[38px]">
          <p className="text-xs text-slate-200">{cell.trades} trades</p>
          <p className={`text-sm font-mono font-bold ${cell.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {formatCurrency(cell.pnl, currency)}
          </p>
        </div>
      ) : (
        <div className="mt-2 min-h-[38px]" />
      )}
      <AnimatePresence>
        {hovered && cell.trades > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[108%] left-1/2 -translate-x-1/2 z-50 w-40 rounded-lg border border-white/15 bg-slate-900/95 p-2.5 text-xs shadow-xl pointer-events-none"
          >
            <p className="text-slate-300 font-semibold border-b border-white/10 pb-1 mb-1.5">
              {new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-slate-400">Trades: <span className="text-white font-mono">{cell.trades}</span></p>
            <p className={`font-mono font-bold mt-1 ${cell.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {cell.pnl >= 0 ? '+' : ''}{formatCurrency(cell.pnl, currency)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TradingCalendar = ({ year, month, dailyData, onMonthChange, currency = 'USD' }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyDataByDate = useMemo(
    () => new Map((dailyData || []).map((item) => [item.date, item])),
    [dailyData]
  );

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyDataByDate.get(dateStr);
      days.push({
        day,
        pnl: Number(dayData?.pnl || 0),
        trades: Number(dayData?.trades || 0),
        date: dateStr,
      });
    }

    return days;
  }, [dailyDataByDate, daysInMonth, firstDay, month, year]);

  const weeks = useMemo(() => {
    const nextWeeks = [];
    let row = [];
    calendarDays.forEach((item, idx) => {
      row.push(item);
      if (row.length === 7 || idx === calendarDays.length - 1) {
        while (row.length < 7) row.push(null);
        nextWeeks.push(row);
        row = [];
      }
    });
    return nextWeeks;
  }, [calendarDays]);

  const weeklySummary = useMemo(() => weeks.map((week, index) => {
    const points = week.filter(Boolean);
    const pnl = points.reduce((acc, p) => acc + p.pnl, 0);
    const tradingDays = points.filter((p) => p.trades > 0).length;
    const first = points[0]?.date;
    const last = points[points.length - 1]?.date;
    return {
      title: `Week ${index + 1}`,
      pnl,
      tradingDays,
      range: first && last ? `${new Date(first).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(last).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '-',
    };
  }), [weeks]);

  const { monthDays, monthPnl } = useMemo(() => ({
    monthPnl: (dailyData || []).reduce((acc, d) => acc + Number(d.pnl || 0), 0),
    monthDays: (dailyData || []).filter((d) => Number(d.trades || 0) > 0).length,
  }), [dailyData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="glass-card p-4 md:p-6 border border-blue-500/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-[31px] leading-none font-heading font-bold min-w-[190px] text-center">{getMonthName(month)} {year}</h3>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              const now = new Date();
              onMonthChange(now.getMonth() - month + (now.getFullYear() - year) * 12);
            }}
          >
            <Calendar className="w-3 h-3" />
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm rounded-xl bg-blue-500/10 border border-blue-500/25 px-3 py-2">
          <span className={monthPnl >= 0 ? 'text-emerald-300 font-mono' : 'text-red-300 font-mono'}>PnL: {formatCurrency(monthPnl, currency)}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Days: <span className="text-white font-mono">{monthDays}</span></span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed">
            <thead>
              <tr>
                {daysOfWeek.map((day) => (
                  <th key={day} className="text-xs text-blue-200/80 font-normal py-2 text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, i) => (
                <tr key={`wk-${i}`}>
                  {week.map((cell, idx) => (
                    <td key={`d-${idx}`} className="p-1 align-top">
                      {cell ? (
                        <CalendarCell cell={cell} currency={currency} />
                      ) : (
                        <div className="h-[104px] rounded-xl bg-slate-900/35 border border-white/5" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="xl:w-72 space-y-2">
          <p className="text-sm text-blue-200/90">Weekly Summary</p>
          {weeklySummary.map((week) => (
            <div key={week.title} className="rounded-xl border border-white/10 bg-slate-900/40 p-3 min-h-[96px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{week.title}</p>
                <p className="text-xs text-muted-foreground">{week.range}</p>
              </div>
              <p className={`text-sm mt-1 font-mono ${week.pnl > 0 ? 'text-emerald-300' : week.pnl < 0 ? 'text-red-300' : 'text-muted-foreground'}`}>
                PnL: {week.pnl === 0 ? 'No trades' : formatCurrency(week.pnl, currency)}
              </p>
              <p className="text-xs text-muted-foreground">Days: {week.tradingDays}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tradeCount, setTradeCount] = useState({ total: 0, data: [] });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [dailyData, setDailyData] = useState({ days: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [lastSyncAt, setLastSyncAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [periodTransition, setPeriodTransition] = useState(false);
  const [pnlFlash, setPnlFlash] = useState(null);
  const [streakGlow, setStreakGlow] = useState(false);
  const currency = summary?.currency || 'USD';
  const currencySymbol = currency === 'INR' ? '₹' : '$';
  const [calendarDate, setCalendarDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const firstLoadRef = useRef(true);
  const prevTotalPnl = useRef(null);
  const prevStreak = useRef(0);

  const fetchDashboardData = React.useCallback(async (mode = 'normal') => {
    try {
      const [summaryRes, tradeCountRes, balanceRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/trade-count?period=${selectedPeriod}`),
        axios.get(`${API_URL}/analytics/balance-history?period=${selectedPeriod}`),
      ]);

      setSummary(summaryRes.data);
      setTradeCount(tradeCountRes.data || { total: 0, data: [] });
      setBalanceHistory(balanceRes.data || []);
      setLastSyncAt(Date.now());
      setSecondsAgo(0);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      if (mode === 'initial') {
        setLoading(false);
      }
      if (mode === 'period') {
        setPeriodTransition(false);
      }
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  const fetchCalendarData = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/analytics/daily?year=${calendarDate.year}&month=${calendarDate.month + 1}`);
      setDailyData(response.data || { days: [] });
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  }, [calendarDate.month, calendarDate.year]);

  useEffect(() => {
    if (firstLoadRef.current) {
      setLoading(true);
      fetchDashboardData('initial');
      firstLoadRef.current = false;
    } else {
      setPeriodTransition(true);
      fetchDashboardData('period');
    }
  }, [fetchDashboardData, selectedPeriod]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncAt]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData('refresh');
    fetchCalendarData();
  };

  const handleMonthChange = (delta) => {
    setCalendarDate((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API_URL}/export/trades/${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trades_export_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Trades exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export trades');
    }
  };

  const tradeCountSeries = useMemo(
    () => (tradeCount.data || []).map((x) => ({ date: (x.date || '').slice(5), count: Number(x.count || 0) })),
    [tradeCount]
  );

  const equitySeries = useMemo(() => {
    if (!balanceHistory.length) return [];
    let peak = Number(balanceHistory[0]?.balance || 0);
    return balanceHistory.map((point) => {
      const balance = Number(point.balance || 0);
      peak = Math.max(peak, balance);
      const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      return {
        date: (point.date || '').slice(5),
        balance,
        drawdown,
        trade_pnl: Number(point.trade_pnl || 0),
      };
    });
  }, [balanceHistory]);

  const weeklyTradesDelta = useMemo(() => {
    if (tradeCountSeries.length < 8) return 0;
    const recent = tradeCountSeries.slice(-7).reduce((acc, x) => acc + x.count, 0);
    const prev = tradeCountSeries.slice(-14, -7).reduce((acc, x) => acc + x.count, 0);
    return recent - prev;
  }, [tradeCountSeries]);

  const weekWinrateDelta = useMemo(() => {
    const wr = Number(summary?.win_rate || 0);
    const dwr = Number(summary?.daily_win_rate || 0);
    return dwr - wr;
  }, [summary]);

  const dailyWinrateDelta = useMemo(() => {
    const ratio = Number(summary?.day_win_loss_ratio || 0);
    return (ratio - 1) * 3;
  }, [summary]);

  const pnlMonthChangePct = useMemo(() => {
    if (equitySeries.length < 2) return 0;
    const first = equitySeries[0].balance;
    const last = equitySeries[equitySeries.length - 1].balance;
    if (first === 0) return 0;
    return ((last - first) / Math.abs(first)) * 100;
  }, [equitySeries]);

  const riskMetrics = useMemo(() => {
    const wins = Number(summary?.winning_trades || 0);
    const losses = Number(summary?.losing_trades || 0);
    const avgWin = Number(summary?.avg_win || 0);
    const avgLoss = Number(summary?.avg_loss || 0);
    const totalTrades = Number(summary?.total_trades || 0);
    const totalPnl = Number(summary?.total_pnl || 0);

    const grossProfit = avgWin * wins;
    const grossLoss = avgLoss * losses;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0;

    const returns = equitySeries.map((x) => x.trade_pnl);
    const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((acc, item) => acc + (item - mean) ** 2, 0) / returns.length : 0;
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(Math.max(returns.length, 1)) : 0;

    return {
      maxDrawdown: equitySeries.reduce((max, x) => Math.max(max, x.drawdown), 0),
      avgRR: Number(summary?.avg_win_loss_ratio || 0),
      profitFactor,
      expectancy,
      sharpe,
      peakBalance: equitySeries.length ? Math.max(...equitySeries.map((x) => x.balance)) : 0,
      currentBalance: equitySeries.length ? equitySeries[equitySeries.length - 1].balance : 0,
    };
  }, [summary, equitySeries]);

  const streakGoal = 30;

  // EMA + regime data for premium equity curve
  const equityChartData = useMemo(() => {
    if (!equitySeries.length) return [];
    const period = 8;
    const k = 2 / (period + 1);
    let ema = equitySeries[0].balance;
    return equitySeries.map((p, i) => {
      if (i > 0) ema = p.balance * k + ema * (1 - k);
      const above = p.balance >= ema;
      return {
        ...p,
        ema: Math.round(ema * 100) / 100,
        regimeAbove: above ? p.balance : ema,
        regimeBelow: above ? ema : p.balance,
        isAboveEma: above,
      };
    });
  }, [equitySeries]);

  const [equityZoom, setEquityZoom] = useState({ start: 0, end: 100 });

  useEffect(() => {
    if (!summary) return undefined;
    const nextPnl = Number(summary.total_pnl || 0);
    if (prevTotalPnl.current !== null && nextPnl !== prevTotalPnl.current) {
      setPnlFlash(nextPnl > prevTotalPnl.current ? 'up' : 'down');
      if (nextPnl > prevTotalPnl.current) playSound();
      const timer = setTimeout(() => setPnlFlash(null), 520);
      prevTotalPnl.current = nextPnl;
      return () => clearTimeout(timer);
    }
    prevTotalPnl.current = nextPnl;
    return undefined;
  }, [summary]);

  useEffect(() => {
    if (!summary) return undefined;
    const curr = Number(summary.current_win_streak_trades || 0);
    if (curr > prevStreak.current) {
      setStreakGlow(true);
      playSound();
      const timer = setTimeout(() => setStreakGlow(false), 800);
      prevStreak.current = curr;
      return () => clearTimeout(timer);
    }
    prevStreak.current = curr;
    return undefined;
  }, [summary]);

  const radarData = useMemo(() => {
    const winrate = Number(summary?.win_rate || 0);
    const rr = Math.min(100, Number(summary?.avg_win_loss_ratio || 0) * 40);
    const riskControl = Math.max(0, 100 - riskMetrics.maxDrawdown * 2);
    const consistency = Math.min(100, Number(summary?.daily_win_rate || 0));
    const discipline = Math.min(100, 30 + Number(summary?.win_streak_days || 0) * 10);
    return [
      { metric: 'Risk Control', value: Math.round(riskControl) },
      { metric: 'Discipline', value: Math.round(discipline) },
      { metric: 'Winrate', value: Math.round(winrate) },
      { metric: 'RR Ratio', value: Math.round(rr) },
      { metric: 'Consistency', value: Math.round(consistency) },
    ];
  }, [summary, riskMetrics.maxDrawdown]);

  const biasStats = useMemo(() => {
    const bull = Number(summary?.winning_trades || 0);
    const bear = Number(summary?.losing_trades || 0);
    const totalPnl = Number(summary?.total_pnl || 0);
    const avgGain = Number(summary?.avg_win || 0);
    const avgLoss = Number(summary?.avg_loss || 0);
    const knownOutcomes = Math.max(0, bull + bear);
    const totalTrades = Number(summary?.total_trades || 0);
    const bullPct = knownOutcomes > 0 ? (bull / knownOutcomes) * 100 : 50;
    const bearPct = knownOutcomes > 0 ? (bear / knownOutcomes) * 100 : 50;
    // Move marker by net PnL intensity: losses push left, profits push right.
    // Lower base scale makes movement visibly responsive for typical journal PnL values.
    const pnlScaleBase = Math.max(250, (Math.abs(avgGain) + Math.abs(avgLoss)) * 0.6);
    const pnlTilt = pnlScaleBase > 0 ? Math.tanh(totalPnl / pnlScaleBase) : 0;
    const markerPosition = Math.max(4, Math.min(96, 50 + pnlTilt * 46));
    const duelState = totalPnl > 0 ? 'profit' : totalPnl < 0 ? 'loss' : 'neutral';
    const confidence = Math.max(bullPct, bearPct);
    const positiveWinRate = knownOutcomes > 0 ? (bull / knownOutcomes) * 100 : 0;
    const negativeWinRate = knownOutcomes > 0 ? (bear / knownOutcomes) * 100 : 0;
    return {
      bull,
      bear,
      totalTrades,
      bullPct,
      bearPct,
      markerPosition,
      duelState,
      confidence,
      positiveWinRate,
      negativeWinRate,
      avgGain,
      avgLoss,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardRefreshContext.Provider value={refreshing || periodTransition}>
    <div className="space-y-6 relative overflow-hidden" data-testid="dashboard-page">
      <style>{`
        .gradient-flow-green {
          background: linear-gradient(90deg, #10b981, #34d399, #10b981);
          background-size: 200% 100%;
          animation: gradientFlow 4s linear infinite;
        }
        .gradient-flow-red {
          background: linear-gradient(90deg, #ef4444, #f87171, #ef4444);
          background-size: 200% 100%;
          animation: gradientFlow 4s linear infinite;
        }
        .gradient-flow-orange {
          background: linear-gradient(90deg, #f97316, #fbbf24, #f97316);
          background-size: 200% 100%;
          animation: gradientFlow 4s linear infinite;
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ x: [0, 10, 0], y: [0, 6, 0], opacity: [0.08, 0.13, 0.08] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ x: [0, -10, 0], y: [0, -6, 0], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.05) 1px, transparent 0)',
            backgroundSize: '30px 30px',
          }}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.span
            key={`particle-${i}`}
            className="absolute h-[2px] w-[2px] rounded-full bg-slate-300/20"
            style={{ left: `${16 + i * 20}%`, top: `${20 + (i % 2) * 30}%` }}
            animate={{ opacity: [0.06, 0.22, 0.06], y: [0, -2, 0] }}
            transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Dashboard</h1>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live synced</span>
            <span>Updated {secondsAgo}s ago</span>
            <button onClick={handleRefresh} className="hover:text-accent transition-colors" aria-label="refresh dashboard">
              <motion.span className="inline-flex" animate={refreshing ? { rotate: 360, scale: [1, 1.06, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.9, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'text-accent' : ''}`} />
              </motion.span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="export-btn">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>Export as Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-white/10">
            {TIME_PERIODS.map((period) => (
              <motion.button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                whileTap={{ scale: 0.96 }}
                animate={selectedPeriod === period.value ? { scale: 1.04 } : { scale: 1 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  selectedPeriod === period.value
                    ? 'text-black font-medium bg-accent shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {period.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPeriod}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: periodTransition ? 0.65 : 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard title="Winrate" borderClass="border-blue-500/30">
          <RadialGauge value={summary?.win_rate || 0} label="Winrate" weeklyDelta={weekWinrateDelta} accentClass="text-blue-300" />
        </DashboardCard>

        <DashboardCard title="Daily Winrate" borderClass="border-emerald-500/30">
          <RadialGauge value={summary?.daily_win_rate || 0} label="Daily Winrate" weeklyDelta={dailyWinrateDelta} accentClass="text-emerald-300" />
        </DashboardCard>

        <DashboardCard title="Avg Win / Avg Loss" borderClass="border-blue-500/20">
          <div className="space-y-2" title="Last 30 trades">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-300">Avg Win</span>
                <span className="font-mono text-emerald-300">+{formatCurrency(summary?.avg_win || 0, currency)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Number(summary?.avg_win || 0) / Math.max(1, Number(summary?.avg_win || 0) + Number(summary?.avg_loss || 0))) * 100)}%` }}
                  transition={{ duration: 1.05, ease: 'easeOut' }}
                  className="h-full gradient-flow-green"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-300">Avg Loss</span>
                <span className="font-mono text-red-300">-{formatCurrency(summary?.avg_loss || 0, currency)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Number(summary?.avg_loss || 0) / Math.max(1, Number(summary?.avg_win || 0) + Number(summary?.avg_loss || 0))) * 100)}%` }}
                  transition={{ duration: 1.05, ease: 'easeOut' }}
                  className="h-full gradient-flow-red"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">RR Ratio <span className="font-mono text-blue-300">{formatNumber(summary?.avg_win_loss_ratio || 0, 2)}</span></p>
          </div>
        </DashboardCard>

        <DashboardCard title="Trade Count" borderClass="border-purple-500/30">
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-mono font-bold text-purple-300"><AnimatedNumber value={tradeCount.total || 0} /></p>
              <p className={`text-xs flex items-center gap-1 ${weeklyTradesDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {weeklyTradesDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {weeklyTradesDelta >= 0 ? '+' : ''}{weeklyTradesDelta} this week
              </p>
            </div>
            <ResponsiveContainer width="100%" height={74}>
              <AreaChart data={tradeCountSeries}>
                <defs>
                  <linearGradient id="tradeGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v) => [v, 'Trades']}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#a855f7"
                  strokeWidth={2.2}
                  fill="url(#tradeGlow)"
                  isAnimationActive
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {tradeCountSeries.length > 0 && (
                  <ReferenceDot
                    x={tradeCountSeries[tradeCountSeries.length - 1]?.date}
                    y={tradeCountSeries[tradeCountSeries.length - 1]?.count}
                    r={4}
                    fill="#e879f9"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard title="Win Streak" borderClass="border-orange-500/30">
          <div className="space-y-2">
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Flame
                  key={`fl-${i}`}
                  className={`w-4 h-4 ${i < Math.min(10, Number(summary?.current_win_streak_trades || 0)) ? 'text-orange-400' : 'text-white/20'} ${i === 0 && Number(summary?.current_win_streak_trades || 0) > 0 ? 'animate-pulse' : ''}`}
                />
              ))}
            </div>
            <p className="text-sm">Current streak: <span className={`font-mono font-bold text-orange-300 ${streakGlow ? 'drop-shadow-[0_0_8px_rgba(251,146,60,0.9)]' : ''}`}>{summary?.current_win_streak_trades || 0}</span></p>
            <p className="text-xs text-muted-foreground">Best streak: <span className="font-mono text-orange-200">{summary?.win_streak_trades || 0}</span></p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((summary?.current_win_streak_trades || 0) / streakGoal) * 100)}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="h-full gradient-flow-orange"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Goal: {streakGoal} trades</p>
          </div>
        </DashboardCard>

        <DashboardCard title="Total P&L" borderClass="border-emerald-500/30">
          <motion.div
            className={`space-y-2 rounded-lg p-1 ${pnlFlash === 'up' ? 'bg-emerald-500/10' : pnlFlash === 'down' ? 'bg-red-500/10' : ''}`}
            animate={pnlFlash ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={summary?.total_pnl || 0}
                decimals={2}
                prefix={currencySymbol}
                className={`text-3xl font-mono font-bold ${(summary?.total_pnl || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
              />
              {(summary?.total_pnl || 0) >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <p className={`text-xs ${pnlMonthChangePct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {pnlMonthChangePct >= 0 ? 'Up' : 'Down'} {formatNumber(Math.abs(pnlMonthChangePct), 2)}% this month
            </p>
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={equitySeries.slice(-20)}>
                <defs>
                  <linearGradient id="pnlMini" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#pnlMini)" isAnimationActive animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </DashboardCard>

        <DashboardCard title="Behavioral Bias" borderClass="border-blue-500/25" className="md:col-span-2 xl:col-span-2">
          <div className="space-y-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <motion.div
                  className={`rounded-lg border px-3 py-2 ${biasStats.duelState === 'profit' ? 'border-emerald-400/40 bg-emerald-500/10' : biasStats.duelState === 'loss' ? 'border-red-400/40 bg-red-500/10' : 'border-yellow-400/40 bg-yellow-500/10'}`}
                  animate={{ boxShadow: biasStats.duelState === 'profit' ? ['0 0 0 rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.25)', '0 0 0 rgba(34,197,94,0)'] : biasStats.duelState === 'loss' ? ['0 0 0 rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.25)', '0 0 0 rgba(239,68,68,0)'] : ['0 0 0 rgba(250,204,21,0)', '0 0 20px rgba(250,204,21,0.22)', '0 0 0 rgba(250,204,21,0)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <p className="text-xs tracking-[0.12em] text-slate-300">MARKET SENTIMENT</p>
                  <p className={`text-sm font-bold ${biasStats.duelState === 'profit' ? 'text-emerald-300' : biasStats.duelState === 'loss' ? 'text-red-300' : 'text-yellow-300'}`}>
                    {biasStats.duelState === 'profit' ? 'BULLISH' : biasStats.duelState === 'loss' ? 'BEARISH' : 'NEUTRAL'}
                  </p>
                  <p className="text-sm text-slate-300">Confidence: <span className="font-mono text-blue-100">{formatNumber(biasStats.confidence, 0)}%</span></p>
                </motion.div>
              </div>
              <p className="text-sm text-slate-300">Total Trades: <AnimatedNumber value={biasStats.totalTrades} className="font-mono font-bold text-blue-100" /></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.div
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"
                whileHover={{ scale: 1.02, y: -3, boxShadow: '0 10px 25px rgba(239,68,68,0.2)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="text-sm tracking-wide text-red-200">Negative Trades</p>
                <p className="mt-1 text-xl font-mono font-bold text-red-300 flex items-center gap-2">
                  <span className="text-lg leading-none" aria-label="bear icon" role="img">🐻</span>
                  <AnimatedNumber value={biasStats.bear} className="font-mono" /> Trades
                </p>
                <p className="text-sm text-slate-300 mt-1">Win Rate: <span className="font-mono text-red-200">{formatNumber(biasStats.negativeWinRate, 1)}%</span></p>
                <p className="text-sm text-slate-300">Avg Loss: <span className="font-mono text-red-200">{currencySymbol}{formatNumber(biasStats.avgLoss, 2)}</span></p>
              </motion.div>

              <motion.div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
                whileHover={{ scale: 1.02, y: -3, boxShadow: '0 10px 25px rgba(16,185,129,0.2)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="text-sm tracking-wide text-emerald-200">Positive Trades</p>
                <p className="mt-1 text-xl font-mono font-bold text-emerald-300 flex items-center gap-2">
                  <span className="text-lg leading-none" aria-label="bull icon" role="img">🐂</span>
                  <AnimatedNumber value={biasStats.bull} className="font-mono" /> Trades
                </p>
                <p className="text-sm text-slate-300 mt-1">Win Rate: <span className="font-mono text-emerald-200">{formatNumber(biasStats.positiveWinRate, 1)}%</span></p>
                <p className="text-sm text-slate-300">Avg Gain: <span className="font-mono text-emerald-200">+{currencySymbol}{formatNumber(biasStats.avgGain, 2)}</span></p>
              </motion.div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>🐻 Bear Pressure</span>
                <span>Bull Pressure 🐂</span>
              </div>
              <motion.div
                className="relative h-4 rounded-full overflow-hidden border border-blue-400/20 bg-slate-900/70"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500"
                  style={{ boxShadow: biasStats.duelState === 'profit' ? '0 0 18px rgba(34,197,94,0.45)' : biasStats.duelState === 'loss' ? '0 0 18px rgba(239,68,68,0.45)' : '0 0 12px rgba(250,204,21,0.32)' }}
                />
                <motion.div
                  className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-white/90 bg-white"
                  initial={{ left: '50%' }}
                  animate={{ left: `calc(${biasStats.markerPosition}% - 10px)` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}
                />
              </motion.div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-red-300">0% ({formatNumber(biasStats.bearPct, 1)} bear)</span>
                <span className="text-emerald-300">100% ({formatNumber(biasStats.bullPct, 1)} bull)</span>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-5 border border-emerald-500/20 relative overflow-hidden"
      >
        {/* Ambient bg glows */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-emerald-500/6 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-blue-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-80 h-40 rounded-full bg-emerald-500/3 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-heading font-bold flex items-center gap-2">
              Equity Curve
              <motion.span
                className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.35, 0.85] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ boxShadow: '0 0 8px rgba(74,222,128,0.8)' }}
              />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Account growth · EMA regime · drawdown integrated</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <motion.div whileHover={{ scale: 1.04, y: -1 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/12 border border-emerald-500/30 text-emerald-300">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[11px] text-emerald-300/60">Peak</span>
              <span className="font-mono font-bold">{formatCurrency(riskMetrics.peakBalance, currency)}</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -1 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/12 border border-blue-500/30 text-blue-300">
              <Activity className="w-3 h-3" />
              <span className="text-[11px] text-blue-300/60">Current</span>
              <span className="font-mono font-bold">{formatCurrency(riskMetrics.currentBalance, currency)}</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -1 }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold ${riskMetrics.maxDrawdown > 15 ? 'bg-red-500/12 border-red-500/30 text-red-300' : 'bg-yellow-500/12 border-yellow-500/30 text-yellow-300'}`}>
              <TrendingDown className="w-3 h-3" />
              <span className={`text-[11px] font-normal ${riskMetrics.maxDrawdown > 15 ? 'text-red-300/60' : 'text-yellow-300/60'}`}>Max DD</span>
              -{formatNumber(riskMetrics.maxDrawdown, 1)}%
            </motion.div>
          </div>
        </div>

        {equityChartData.length > 0 ? (() => {
          const peakIdx = equityChartData.reduce((best, p, i) => p.balance > equityChartData[best].balance ? i : best, 0);
          const peakPoint = equityChartData[peakIdx];
          // compute visible slice for zoom
          const total = equityChartData.length;
          const startI = Math.floor((equityZoom.start / 100) * total);
          const endI   = Math.ceil((equityZoom.end / 100) * total);
          const visibleData = equityChartData.slice(startI, endI);

          return (
            <div>
              {/* ── Main Chart ── */}
              <ResponsiveContainer width="100%" height={330}>
                <ComposedChart data={visibleData} margin={{ top: 18, right: 14, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Volumetric 3-layer equity fill */}
                    <linearGradient id="equityFill3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.65} />
                      <stop offset="30%"  stopColor="#22c55e" stopOpacity={0.28} />
                      <stop offset="70%"  stopColor="#16a34a" stopOpacity={0.07} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    {/* Outer glow fill layer */}
                    <linearGradient id="equityGlow3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                    {/* EMA regime fills */}
                    <linearGradient id="regimeGreenFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="regimeRedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                    {/* Drawdown from-line fill */}
                    <linearGradient id="ddFromLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.08} />
                    </linearGradient>
                    {/* Heavy glow filter on equity line */}
                    <filter id="heavyGlow" x="-30%" y="-120%" width="160%" height="340%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
                      <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="dotPulse" x="-120%" y="-120%" width="340%" height="340%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid stroke="rgba(255,255,255,0.035)" strokeDasharray="3 8" vertical={false} />

                  <XAxis dataKey="date" stroke="rgba(161,161,170,0.2)" tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="eq"
                    stroke="rgba(161,161,170,0.2)"
                    tick={{ fill: '#3f3f46', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${currencySymbol}${Math.round(v)}`}
                    width={64}
                  />
                  <YAxis
                    yAxisId="dd"
                    orientation="right"
                    stroke="rgba(161,161,170,0.2)"
                    tick={{ fill: '#3f3f46', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v)}%`}
                    width={36}
                  />

                  {/* Background regime tint areas */}
                  {visibleData.map((d, i) => {
                    if (i === 0) return null;
                    const prev = visibleData[i - 1];
                    const bothAbove = d.isAboveEma && prev.isAboveEma;
                    const bothBelow = !d.isAboveEma && !prev.isAboveEma;
                    if (!bothAbove && !bothBelow) return null;
                    return (
                      <ReferenceArea
                        key={`regime-${i}`}
                        yAxisId="eq"
                        x1={prev.date}
                        x2={d.date}
                        fill={bothAbove ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.045)'}
                        ifOverflow="hidden"
                      />
                    );
                  })}

                  {/* Custom glassmorphism tooltip */}
                  <Tooltip
                    cursor={{ stroke: 'rgba(148,163,184,0.2)', strokeWidth: 1, strokeDasharray: '3 4' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const eq  = payload.find(p => p.dataKey === 'balance');
                      const ema = payload.find(p => p.dataKey === 'ema');
                      const dd  = payload.find(p => p.dataKey === 'drawdown');
                      const pnl = eq?.payload?.trade_pnl ?? 0;
                      const isAbove = eq?.payload?.isAboveEma;
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.1 }}
                          style={{
                            background: 'rgba(7,11,22,0.92)',
                            border: `1px solid ${isAbove ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                            borderRadius: 14,
                            padding: '12px 16px',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${isAbove ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)'}`,
                            minWidth: 165,
                          }}
                        >
                          <p style={{ color: isAbove ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {isAbove ? '▲' : '▼'} {label}
                          </p>
                          {eq && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                            <span style={{ color: '#64748b', fontSize: 11 }}>Equity</span>
                            <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{formatCurrency(eq.value, currency)}</span>
                          </div>}
                          {ema && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                            <span style={{ color: '#64748b', fontSize: 11 }}>EMA</span>
                            <span style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(ema.value, currency)}</span>
                          </div>}
                          {pnl !== 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                            <span style={{ color: '#64748b', fontSize: 11 }}>Profit</span>
                            <span style={{ color: pnl > 0 ? '#86efac' : '#fca5a5', fontFamily: 'monospace', fontSize: 12 }}>{pnl > 0 ? '+' : ''}{formatCurrency(pnl, currency)}</span>
                          </div>}
                          {dd && dd.value > 0.01 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                            <span style={{ color: '#64748b', fontSize: 11 }}>Drawdown</span>
                            <span style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12 }}>-{formatNumber(dd.value, 2)}%</span>
                          </div>}
                        </motion.div>
                      );
                    }}
                  />

                  {/* Drawdown area — anchored to equity, bleeding downward */}
                  <Area
                    yAxisId="dd"
                    type="monotone"
                    dataKey="drawdown"
                    stroke="rgba(239,68,68,0.55)"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    fill="url(#ddFromLine)"
                    dot={false}
                    isAnimationActive
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />

                  {/* Equity outer glow layer */}
                  <Area
                    yAxisId="eq"
                    type="monotone"
                    dataKey="balance"
                    stroke="#4ade80"
                    strokeWidth={8}
                    fill="url(#equityGlow3)"
                    dot={false}
                    legendType="none"
                    isAnimationActive={false}
                    style={{ opacity: 0.15, filter: 'blur(5px)' }}
                    tooltipType="none"
                    name="_outer"
                  />

                  {/* EMA line — dim, regime context */}
                  <Line
                    yAxisId="eq"
                    type="monotone"
                    dataKey="ema"
                    stroke="#818cf8"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive
                    animationDuration={1200}
                    name="EMA"
                    opacity={0.65}
                  />

                  {/* Main equity line — sharp + heavy glow */}
                  <Area
                    yAxisId="eq"
                    type="monotone"
                    dataKey="balance"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="url(#equityFill3)"
                    isAnimationActive
                    animationDuration={1600}
                    animationEasing="ease-out"
                    style={{ filter: 'url(#heavyGlow)' }}
                    name="Equity"
                    dot={(dotProps) => {
                      const { cx, cy, index, payload } = dotProps;
                      if (cx == null || cy == null) return null;
                      const isLast = index === visibleData.length - 1;
                      const isPeak = payload.date === peakPoint?.date;
                      const pnl = payload.trade_pnl ?? 0;

                      if (isLast) {
                        return (
                          <g key={`live-${index}`} style={{ filter: 'url(#dotPulse)' }}>
                            <circle cx={cx} cy={cy} r={14} fill="#22c55e" opacity={0}>
                              <animate attributeName="r" values="6;18;6" dur="2.4s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r={7} fill="#22c55e" opacity={0}>
                              <animate attributeName="r" values="5;10;5" dur="2.4s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.45;0.05;0.45" dur="2.4s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r={4.5} fill="#86efac" stroke="#22c55e" strokeWidth={1.5} />
                          </g>
                        );
                      }
                      if (isPeak) {
                        return (
                          <g key={`peak-${index}`}>
                            <circle cx={cx} cy={cy} r={8} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6}>
                              <animate attributeName="r" values="7;11;7" dur="3s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r={3.5} fill="#fbbf24" />
                            <text x={cx} y={cy - 14} textAnchor="middle" fill="#fbbf24" fontSize={9} fontWeight="700" letterSpacing="0.5">PEAK</text>
                          </g>
                        );
                      }
                      if (pnl > 0) {
                        return (
                          <g key={`win-${index}`}>
                            <circle cx={cx} cy={cy} r={5} fill="#22c55e" opacity={0.2}>
                              <animate attributeName="r" values="5;9;5" dur="1.8s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.2;0;0.2" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r={3.5} fill="#4ade80" stroke="#86efac" strokeWidth={0.8} />
                          </g>
                        );
                      }
                      if (pnl < 0) {
                        return (
                          <g key={`loss-${index}`}>
                            <circle cx={cx} cy={cy} r={5} fill="#ef4444" opacity={0.2}>
                              <animate attributeName="r" values="5;9;5" dur="1.8s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.2;0;0.2" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#fca5a5" strokeWidth={0.8} />
                          </g>
                        );
                      }
                      return null;
                    }}
                    activeDot={{ r: 5.5, fill: '#4ade80', stroke: '#fff', strokeWidth: 1.5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* ── Range Scrubber ── */}
              <div className="mt-3 px-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                  <span>Performance vs. EMA (Equity | Regime)</span>
                  <span className="font-mono">{visibleData[0]?.date} → {visibleData[visibleData.length - 1]?.date}</span>
                </div>
                <div className="relative h-10 rounded-xl bg-slate-900/60 border border-white/8 overflow-hidden select-none">
                  {/* Mini sparkline in the scrubber */}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityChartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scrubFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={1} fill="url(#scrubFill)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* Zoom highlight overlay */}
                  <div
                    className="absolute top-0 bottom-0 border-x-2 border-emerald-500/60 bg-emerald-500/8 rounded"
                    style={{ left: `${equityZoom.start}%`, right: `${100 - equityZoom.end}%` }}
                  />
                  {/* Range inputs */}
                  <input type="range" min={0} max={90} value={equityZoom.start}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                    onChange={e => {
                      const v = Number(e.target.value);
                      if (v < equityZoom.end - 10) setEquityZoom(z => ({ ...z, start: v }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400 inline-block rounded" /> Equity</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 border-dashed border-t border-indigo-400 inline-block" /> EMA</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/80 inline-block" /> Win</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400/80 inline-block" /> Loss</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-400/60">▲ Gain</span>
                    <span className="text-red-400/60">▼ Drawdown</span>
                  </span>
                </div>
              </div>

              {/* ── Drawdown mini chart ── */}
              <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-red-300/80 flex items-center gap-1.5"><TrendingDown className="w-3 h-3" /> Drawdown Timeline</p>
                  <span className="text-[11px] font-mono text-red-300">Max {formatNumber(riskMetrics.maxDrawdown, 1)}%</span>
                </div>
                <ResponsiveContainer width="100%" height={68}>
                  <BarChart data={visibleData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddBarFill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.92} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="rgba(161,161,170,0.15)" tick={{ fill: '#3f3f46', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#fff', fontSize: 11 }}
                      formatter={(v) => [`${formatNumber(v, 2)}%`, 'Drawdown']}
                      cursor={{ fill: 'rgba(239,68,68,0.07)' }}
                    />
                    <Bar dataKey="drawdown" fill="url(#ddBarFill2)" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })() : (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <TrendingUp className="w-10 h-10 opacity-20" />
            <p>No balance data yet. Start closing trades to build your equity curve.</p>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-5 border border-blue-500/15"
        >
          <h3 className="text-lg font-heading font-bold mb-1 flex items-center gap-2">
            Performance Radar
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-blue-400"
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Your trading DNA — scored 0–100</p>

          {/* Score badges row */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {radarData.map((d) => {
              const color = d.value >= 70 ? '#22c55e' : d.value >= 45 ? '#3b82f6' : '#ef4444';
              return (
                <motion.span
                  key={d.metric}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border"
                  style={{ borderColor: color + '55', backgroundColor: color + '18', color }}
                >
                  {d.metric.split(' ')[0]} {d.value}
                </motion.span>
              );
            })}
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <RadarChart data={radarData}>
              <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.12} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="rgba(99,179,255,0.15)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ payload, x, y, cx, cy, ...rest }) => {
                  const val = radarData.find((r) => r.metric === payload.value)?.value ?? 0;
                  const col = val >= 70 ? '#86efac' : val >= 45 ? '#93c5fd' : '#fca5a5';
                  return (
                    <text {...rest} x={x} y={y} fill={col} fontSize={11} textAnchor="middle" dominantBaseline="central" fontWeight="600">
                      {payload.value}
                    </text>
                  );
                }}
              />
              <Radar
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={2.2}
                fill="url(#radarFill)"
                fillOpacity={1}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '10px', color: '#fff', fontSize: 12 }}
                formatter={(v) => {
                  const col = v >= 70 ? '#86efac' : v >= 45 ? '#93c5fd' : '#fca5a5';
                  return [<span style={{ color: col, fontWeight: 700 }}>{v}/100</span>, 'Score'];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-5 border border-purple-500/25 relative overflow-hidden"
        >
          {/* Background ambient glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

          <h3 className="text-lg font-heading font-bold mb-1 flex items-center gap-2">
            Risk Metrics
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Professional risk diagnostics</p>

          <div className="space-y-3">
            {/* Row 1: Max Drawdown + Avg RR */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-red-500/0 via-red-400/70 to-red-500/0" />
                <p className="text-[11px] uppercase tracking-wide text-red-300/70 mb-1">Max Drawdown</p>
                <p className="text-xl font-mono font-black text-red-400">
                  <AnimatedNumber value={riskMetrics.maxDrawdown} decimals={2} suffix="%" />
                </p>
                <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, riskMetrics.maxDrawdown)}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-blue-500/25 bg-blue-500/8 p-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-blue-500/0 via-blue-400/70 to-blue-500/0" />
                <p className="text-[11px] uppercase tracking-wide text-blue-300/70 mb-1">Average RR</p>
                <p className="text-xl font-mono font-black text-blue-300">
                  <AnimatedNumber value={riskMetrics.avgRR} decimals={2} />
                </p>
                <p className="text-[11px] text-blue-400/60 mt-1">{riskMetrics.avgRR >= 1.5 ? '🔥 Excellent' : riskMetrics.avgRR >= 1 ? '✅ Positive' : '⚠️ Below 1:1'}</p>
              </motion.div>
            </div>

            {/* Row 2: Profit Factor + Expectancy */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-emerald-500/0 via-emerald-400/70 to-emerald-500/0" />
                <p className="text-[11px] uppercase tracking-wide text-emerald-300/70 mb-1">Profit Factor</p>
                <p className="text-xl font-mono font-black text-emerald-400">
                  <AnimatedNumber value={riskMetrics.profitFactor} decimals={2} />
                </p>
                <p className="text-[11px] text-emerald-400/60 mt-1">{riskMetrics.profitFactor >= 2 ? '🔥 Elite' : riskMetrics.profitFactor >= 1.5 ? '✅ Strong' : riskMetrics.profitFactor >= 1 ? '📈 Profitable' : '❌ Losing'}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.18 }}
                className={`rounded-xl border p-3 relative overflow-hidden ${riskMetrics.expectancy >= 0 ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/25 bg-red-500/8'}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-transparent ${riskMetrics.expectancy >= 0 ? 'via-emerald-400/70' : 'via-red-400/70'} to-transparent`} />
                <p className={`text-[11px] uppercase tracking-wide mb-1 ${riskMetrics.expectancy >= 0 ? 'text-emerald-300/70' : 'text-red-300/70'}`}>Expectancy</p>
                <p className={`text-xl font-mono font-black ${riskMetrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(riskMetrics.expectancy, currency)}
                </p>
                <p className="text-[11px] text-slate-400/70 mt-1">per trade avg</p>
              </motion.div>
            </div>

            {/* Row 3: Sharpe Ratio — full width highlight */}
            <motion.div
              whileHover={{ scale: 1.01, y: -2 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-purple-500/30 bg-purple-500/8 p-3 relative overflow-hidden"
              animate={{
                boxShadow: ['0 0 0px rgba(168,85,247,0)', '0 0 18px rgba(168,85,247,0.18)', '0 0 0px rgba(168,85,247,0)'],
              }}
              // @ts-ignore
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-purple-500/0 via-purple-400/80 to-purple-500/0" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/70 mb-1">Sharpe Ratio</p>
                  <p className="text-2xl font-mono font-black text-purple-300">
                    <AnimatedNumber value={riskMetrics.sharpe} decimals={2} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mb-1">
                    <Activity className="w-3 h-3" /> Risk-adjusted
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    riskMetrics.sharpe >= 2 ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' :
                    riskMetrics.sharpe >= 1 ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' :
                    'border-red-500/40 bg-red-500/15 text-red-300'
                  }`}>
                    {riskMetrics.sharpe >= 2 ? 'Excellent' : riskMetrics.sharpe >= 1 ? 'Acceptable' : 'Needs Work'}
                  </span>
                </div>
              </div>
              {/* Sharpe visual bar */}
              <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, (riskMetrics.sharpe / 3) * 100))}%` }}
                  transition={{ duration: 1.3, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-600 via-violet-400 to-purple-300"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0</span><span>1 (good)</span><span>3+</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <TradingCalendar
        year={calendarDate.year}
        month={calendarDate.month}
        dailyData={dailyData.days || []}
        onMonthChange={handleMonthChange}
        currency={currency}
      />
        </motion.div>
      </AnimatePresence>
    </div>
    </DashboardRefreshContext.Provider>
  );
}
