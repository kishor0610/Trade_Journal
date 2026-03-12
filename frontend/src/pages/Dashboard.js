import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import axios from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
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

const cardHover = {
  whileHover: {
    y: -3,
    scale: 1.006,
    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
  },
};

const DashboardCard = ({ title, borderClass = 'border-white/10', className = '', children }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28 }}
    {...cardHover}
    className={`glass-card p-4 border ${borderClass} ${className} transition-transform duration-200 will-change-transform transform-gpu shadow-[0_8px_16px_rgba(0,0,0,0.18)]`}
    style={{ backfaceVisibility: 'hidden' }}
  >
    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
    {children}
  </motion.div>
);

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

const TradingCalendar = ({ year, month, dailyData, onMonthChange }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = [];
  for (let i = 0; i < firstDay; i += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dailyData.find((d) => d.date === dateStr);
    calendarDays.push({
      day,
      pnl: Number(dayData?.pnl || 0),
      trades: Number(dayData?.trades || 0),
      date: dateStr,
    });
  }

  const weeks = [];
  let row = [];
  calendarDays.forEach((item, idx) => {
    row.push(item);
    if (row.length === 7 || idx === calendarDays.length - 1) {
      while (row.length < 7) row.push(null);
      weeks.push(row);
      row = [];
    }
  });

  const weeklySummary = weeks.map((week, index) => {
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
  });

  const monthPnl = dailyData.reduce((acc, d) => acc + Number(d.pnl || 0), 0);
  const monthDays = dailyData.filter((d) => Number(d.trades || 0) > 0).length;

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
          <Button variant="outline" size="sm" className="gap-1">
            <Calendar className="w-3 h-3" />
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm rounded-xl bg-blue-500/10 border border-blue-500/25 px-3 py-2">
          <span className={monthPnl >= 0 ? 'text-emerald-300 font-mono' : 'text-red-300 font-mono'}>PnL: {formatCurrency(monthPnl)}</span>
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
                        <div className={`h-[104px] rounded-xl p-2 border transition-colors flex flex-col justify-start ${
                          cell.pnl > 0
                            ? 'border-emerald-500/40 bg-emerald-900/30'
                            : cell.pnl < 0
                              ? 'border-red-500/40 bg-red-900/30'
                              : 'border-white/10 bg-slate-900/50'
                        }`}>
                          <p className="text-sm text-slate-300">{cell.day}</p>
                          {cell.trades > 0 ? (
                            <div className="mt-2 min-h-[38px]">
                              <p className="text-xs text-slate-200">{cell.trades} trades</p>
                              <p className={`text-sm font-mono font-bold ${cell.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                {formatCurrency(cell.pnl)}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 min-h-[38px]" />
                          )}
                        </div>
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
                PnL: {week.pnl === 0 ? 'No trades' : formatCurrency(week.pnl)}
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
  const [calendarDate, setCalendarDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const firstLoadRef = useRef(true);
  const prevTotalPnl = useRef(null);
  const prevStreak = useRef(0);

  const fetchDashboardData = async (mode = 'normal') => {
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
  };

  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(`${API_URL}/analytics/daily?year=${calendarDate.year}&month=${calendarDate.month + 1}`);
      setDailyData(response.data || { days: [] });
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  useEffect(() => {
    if (firstLoadRef.current) {
      setLoading(true);
      fetchDashboardData('initial');
      firstLoadRef.current = false;
    } else {
      setPeriodTransition(true);
      fetchDashboardData('period');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  useEffect(() => {
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDate]);

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

  useEffect(() => {
    if (!summary) return undefined;
    const nextPnl = Number(summary.total_pnl || 0);
    if (prevTotalPnl.current !== null && nextPnl !== prevTotalPnl.current) {
      setPnlFlash(nextPnl > prevTotalPnl.current ? 'up' : 'down');
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
    <div className="space-y-6 relative overflow-hidden" data-testid="dashboard-page">
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
                <span className="font-mono text-emerald-300">+{formatCurrency(summary?.avg_win || 0)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Number(summary?.avg_win || 0) / Math.max(1, Number(summary?.avg_win || 0) + Number(summary?.avg_loss || 0))) * 100)}%` }}
                  transition={{ duration: 1.05, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-300">Avg Loss</span>
                <span className="font-mono text-red-300">-{formatCurrency(summary?.avg_loss || 0)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Number(summary?.avg_loss || 0) / Math.max(1, Number(summary?.avg_win || 0) + Number(summary?.avg_loss || 0))) * 100)}%` }}
                  transition={{ duration: 1.05, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400"
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
                className="h-full bg-gradient-to-r from-orange-500 to-amber-300"
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
                prefix="$"
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
                  <p className="text-[10px] tracking-[0.14em] text-muted-foreground">MARKET SENTIMENT</p>
                  <p className={`text-sm font-bold ${biasStats.duelState === 'profit' ? 'text-emerald-300' : biasStats.duelState === 'loss' ? 'text-red-300' : 'text-yellow-300'}`}>
                    {biasStats.duelState === 'profit' ? 'BULLISH' : biasStats.duelState === 'loss' ? 'BEARISH' : 'NEUTRAL'}
                  </p>
                  <p className="text-xs text-muted-foreground">Confidence: <span className="font-mono text-blue-100">{formatNumber(biasStats.confidence, 0)}%</span></p>
                </motion.div>
              </div>
              <p className="text-sm text-muted-foreground">Total Trades: <AnimatedNumber value={biasStats.totalTrades} className="font-mono font-bold text-blue-100" /></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.div
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"
                whileHover={{ scale: 1.02, y: -3, boxShadow: '0 10px 25px rgba(239,68,68,0.2)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="text-xs tracking-wide text-red-200/90">Negative Trades</p>
                <p className="mt-1 text-xl font-mono font-bold text-red-300 flex items-center gap-2">
                  <span className="text-lg leading-none" aria-label="bear icon" role="img">🐻</span>
                  <AnimatedNumber value={biasStats.bear} className="font-mono" /> Trades
                </p>
                <p className="text-xs text-muted-foreground mt-1">Win Rate: <span className="font-mono text-red-200">{formatNumber(biasStats.negativeWinRate, 1)}%</span></p>
                <p className="text-xs text-muted-foreground">Avg Loss: <span className="font-mono text-red-200">${formatNumber(biasStats.avgLoss, 2)}</span></p>
              </motion.div>

              <motion.div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
                whileHover={{ scale: 1.02, y: -3, boxShadow: '0 10px 25px rgba(16,185,129,0.2)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="text-xs tracking-wide text-emerald-200/90">Positive Trades</p>
                <p className="mt-1 text-xl font-mono font-bold text-emerald-300 flex items-center gap-2">
                  <span className="text-lg leading-none" aria-label="bull icon" role="img">🐂</span>
                  <AnimatedNumber value={biasStats.bull} className="font-mono" /> Trades
                </p>
                <p className="text-xs text-muted-foreground mt-1">Win Rate: <span className="font-mono text-emerald-200">{formatNumber(biasStats.positiveWinRate, 1)}%</span></p>
                <p className="text-xs text-muted-foreground">Avg Gain: <span className="font-mono text-emerald-200">+${formatNumber(biasStats.avgGain, 2)}</span></p>
              </motion.div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
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
        className="glass-card p-5 border border-emerald-500/15"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-heading font-bold">Equity Curve</h3>
            <p className="text-xs text-muted-foreground">Account growth, drawdown, and recovery</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">Peak {formatCurrency(riskMetrics.peakBalance)}</span>
            <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/25 text-blue-300">Current {formatCurrency(riskMetrics.currentBalance)}</span>
          </div>
        </div>

        {equitySeries.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={equitySeries}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11} />
                <YAxis yAxisId="left" stroke="#A1A1AA" fontSize={11} tickFormatter={(v) => `$${Math.round(v)}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#A1A1AA" fontSize={11} tickFormatter={(v) => `${Math.round(v)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fill="url(#equityFill)" name="Equity" />
                <Area yAxisId="right" type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#ddFill)" name="Drawdown %" />
              </AreaChart>
            </ResponsiveContainer>

            <div>
              <h4 className="text-sm text-muted-foreground mb-2">Drawdown Overlay</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={equitySeries}>
                  <XAxis dataKey="date" stroke="#A1A1AA" fontSize={10} />
                  <YAxis stroke="#A1A1AA" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    formatter={(v) => [`${formatNumber(v, 2)}%`, 'Drawdown']}
                  />
                  <Bar dataKey="drawdown" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No balance data yet. Start closing trades to build your equity curve.
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
          <h3 className="text-lg font-heading font-bold mb-1">Performance Radar</h3>
          <p className="text-xs text-muted-foreground mb-4">Risk Control, Discipline, Winrate, RR, Consistency</p>

          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.2)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#d4d4d8', fontSize: 12 }} />
              <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                formatter={(v) => [`${v}/100`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-5 border border-purple-500/15"
        >
          <h3 className="text-lg font-heading font-bold mb-1">Risk Metrics</h3>
          <p className="text-xs text-muted-foreground mb-4">Professional risk diagnostics</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
              <p className="text-lg font-mono font-bold text-red-400"><AnimatedNumber value={riskMetrics.maxDrawdown} decimals={2} suffix="%" /></p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Average RR</p>
              <p className="text-lg font-mono font-bold text-blue-300"><AnimatedNumber value={riskMetrics.avgRR} decimals={2} /></p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Profit Factor</p>
              <p className="text-lg font-mono font-bold text-emerald-400"><AnimatedNumber value={riskMetrics.profitFactor} decimals={2} /></p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Expectancy</p>
              <p className={`text-lg font-mono font-bold ${riskMetrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(riskMetrics.expectancy)}</p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold text-purple-300"><AnimatedNumber value={riskMetrics.sharpe} decimals={2} /></p>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Risk adjusted return score</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <TradingCalendar
        year={calendarDate.year}
        month={calendarDate.month}
        dailyData={dailyData.days || []}
        onMonthChange={handleMonthChange}
      />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
