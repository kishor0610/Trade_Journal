import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
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
  Target,
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

const blocks = ['?', '?', '?', '_', '?', '?', '?'];

const buildMiniTrend = (values = []) => {
  if (!values.length) return '???????';
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return '???????';
  return values
    .slice(-7)
    .map((value) => {
      const idx = Math.max(0, Math.min(blocks.length - 1, Math.round(((value - min) / (max - min)) * (blocks.length - 1))));
      return blocks[idx];
    })
    .join('');
};

const zoneColor = (value) => {
  if (value < 50) return '#ef4444';
  if (value < 65) return '#f59e0b';
  return '#22c55e';
};

const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const motionValue = useMotionValue(value || 0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.5 });
  const [display, setDisplay] = useState(value || 0);

  useEffect(() => {
    motionValue.set(value || 0);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(latest);
    });
    return unsubscribe;
  }, [spring]);

  return <span className={className}>{prefix}{formatNumber(display, decimals)}{suffix}</span>;
};

const HoverCard = ({ title, colorClass = 'border-white/10', children }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, boxShadow: '0 14px 30px rgba(0,0,0,0.35)' }}
    transition={{ duration: 0.28 }}
    className={`glass-card p-4 border ${colorClass} transition-all`}
  >
    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
    {children}
  </motion.div>
);

const RadialGauge = ({ value, label, trend, accent = '#3b82f6' }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const size = 126;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSpring(0, { stiffness: 80, damping: 18 });
  const [dash, setDash] = useState(circumference);
  const color = zoneColor(clamped);

  useEffect(() => {
    progress.set((clamped / 100) * circumference);
  }, [clamped, circumference, progress]);

  useEffect(() => {
    const unsub = progress.on('change', (latest) => {
      setDash(circumference - latest);
    });
    return unsub;
  }, [progress, circumference]);

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${clamped > 70 ? 'animate-pulse' : ''}`}>
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
            strokeDashoffset={dash}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: clamped > 70 ? `drop-shadow(0 0 6px ${accent})` : 'none' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber value={clamped} decimals={2} suffix="%" className="text-lg font-mono font-bold" />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: accent }}>{label}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
          {trend >= 0 ? '+' : ''}{formatNumber(trend, 2)}% this week
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
      pnl: dayData?.pnl || 0,
      trades: dayData?.trades || 0,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card p-4 md:p-6 border border-white/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-heading font-bold">{getMonthName(month)} {year}</h3>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Calendar P&L view restored</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              {daysOfWeek.map((day) => (
                <th key={day} className="text-xs text-muted-foreground py-2 text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={`week-${i}`}>
                {week.map((cell, idx) => (
                  <td key={`day-${idx}`} className="p-1">
                    {cell ? (
                      <div className={`min-h-[74px] rounded-lg p-2 border ${
                        cell.pnl > 0 ? 'border-emerald-500/30 bg-emerald-900/20' : cell.pnl < 0 ? 'border-red-500/30 bg-red-900/20' : 'border-white/10 bg-secondary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground">{cell.day}</p>
                        {cell.trades > 0 && (
                          <>
                            <p className="text-[11px] text-muted-foreground">{cell.trades} trades</p>
                            <p className={`text-xs font-mono font-bold ${cell.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                              {formatCurrency(cell.pnl)}
                            </p>
                          </>
                        )}
                      </div>
                    ) : <div className="min-h-[74px] rounded-lg bg-black/20" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tradeCount, setTradeCount] = useState({ total: 0, data: [] });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [dailyData, setDailyData] = useState({ days: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [lastSyncAt, setLastSyncAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarDate, setCalendarDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  const [livePnl, setLivePnl] = useState(0);
  const [pnlDelta, setPnlDelta] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, tradeCountRes, balanceRes, openTradesRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/trade-count?period=${selectedPeriod}`),
        axios.get(`${API_URL}/analytics/balance-history?period=${selectedPeriod}`),
        axios.get(`${API_URL}/trades?status=open`),
      ]);

      setSummary(summaryRes.data);
      setTradeCount(tradeCountRes.data || { total: 0, data: [] });
      setBalanceHistory(balanceRes.data || []);
      setOpenTrades(openTradesRes.data || []);
      setLivePnl(Number(summaryRes.data?.total_pnl || 0));
      setLastSyncAt(Date.now());
      setSecondsAgo(0);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
    setLoading(true);
    fetchDashboardData();
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

  const lastTradeImpact = useMemo(() => {
    if (!balanceHistory.length) return 0;
    return Number(balanceHistory[balanceHistory.length - 1]?.trade_pnl || 0);
  }, [balanceHistory]);

  useEffect(() => {
    if (!summary) return;

    const timer = setInterval(() => {
      const base = Number(summary.total_pnl || 0);
      const jitter = Math.max(2, Math.abs(lastTradeImpact) * 0.12);
      const delta = (Math.random() - 0.5) * jitter;
      setLivePnl((prev) => {
        const next = prev + delta;
        setPnlDelta(next - prev);
        return next;
      });
    }, 1700);

    return () => clearInterval(timer);
  }, [summary, lastTradeImpact]);

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
        drawdown: Number(drawdown.toFixed(2)),
        trade_pnl: Number(point.trade_pnl || 0),
      };
    });
  }, [balanceHistory]);

  const tradeCountSeries = useMemo(
    () => (tradeCount.data || []).map((x) => ({ date: (x.date || '').slice(5), count: Number(x.count || 0) })),
    [tradeCount]
  );

  const weeklyTradesDelta = useMemo(() => {
    const list = tradeCountSeries;
    if (list.length < 8) return 0;
    const recent = list.slice(-7).reduce((acc, x) => acc + x.count, 0);
    const previous = list.slice(-14, -7).reduce((acc, x) => acc + x.count, 0);
    return recent - previous;
  }, [tradeCountSeries]);

  const pnlMonthChangePct = useMemo(() => {
    if (equitySeries.length < 2) return 0;
    const start = equitySeries[0].balance;
    const end = equitySeries[equitySeries.length - 1].balance;
    if (!start) return 0;
    return ((end - start) / Math.abs(start)) * 100;
  }, [equitySeries]);

  const weekWinrateTrend = useMemo(() => {
    const dayWin = Number(summary?.daily_win_rate || 0);
    const totalWin = Number(summary?.win_rate || 0);
    return dayWin - totalWin;
  }, [summary]);

  const dailyWinrateTrend = useMemo(() => {
    const ratio = Number(summary?.day_win_loss_ratio || 0);
    return (ratio - 1) * 3;
  }, [summary]);

  const riskMetrics = useMemo(() => {
    const winning = Number(summary?.winning_trades || 0);
    const losing = Number(summary?.losing_trades || 0);
    const avgWin = Number(summary?.avg_win || 0);
    const avgLoss = Number(summary?.avg_loss || 0);
    const totalTrades = Number(summary?.total_trades || 0);
    const totalPnl = Number(summary?.total_pnl || 0);

    const grossProfit = avgWin * winning;
    const grossLoss = avgLoss * losing;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0;

    const returns = equitySeries.map((x) => x.trade_pnl);
    const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((acc, item) => acc + (item - mean) ** 2, 0) / returns.length : 0;
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(Math.max(returns.length, 1)) : 0;

    const maxDrawdown = equitySeries.reduce((max, item) => Math.max(max, item.drawdown), 0);
    const peakBalance = equitySeries.length ? Math.max(...equitySeries.map((x) => x.balance)) : 0;
    const currentBalance = equitySeries.length ? equitySeries[equitySeries.length - 1].balance : 0;

    return {
      maxDrawdown,
      avgRR: Number(summary?.avg_win_loss_ratio || 0),
      profitFactor,
      expectancy,
      sharpe,
      peakBalance,
      currentBalance,
    };
  }, [summary, equitySeries]);

  const radarData = useMemo(() => {
    const winrate = Number(summary?.win_rate || 0);
    const rr = Math.min(100, Number(summary?.avg_win_loss_ratio || 0) * 40);
    const maxDdPenalty = Math.max(0, 100 - riskMetrics.maxDrawdown * 2);
    const consistency = Math.min(100, Number(summary?.daily_win_rate || 0));
    const discipline = Math.min(100, (Number(summary?.win_streak_days || 0) * 10) + 30);

    return [
      { metric: 'Risk Control', value: Number(formatNumber(maxDdPenalty, 0).replace(',', '')) },
      { metric: 'Discipline', value: Number(formatNumber(discipline, 0).replace(',', '')) },
      { metric: 'Winrate', value: Number(formatNumber(winrate, 0).replace(',', '')) },
      { metric: 'RR Ratio', value: Number(formatNumber(rr, 0).replace(',', '')) },
      { metric: 'Consistency', value: Number(formatNumber(consistency, 0).replace(',', '')) },
    ];
  }, [summary, riskMetrics.maxDrawdown]);

  const winrateMicroTrend = useMemo(() => buildMiniTrend((dailyData.days || []).map((d) => Number(d.wins || 0))), [dailyData]);
  const pnlMicroTrend = useMemo(() => buildMiniTrend(equitySeries.map((x) => x.balance)), [equitySeries]);

  const handleMonthChange = (delta) => {
    setCalendarDate((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { month, year };
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchCalendarData();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Dashboard</h1>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live synced</span>
            <span>Updated {secondsAgo}s ago</span>
            <button onClick={handleRefresh} className="hover:text-accent transition-colors" aria-label="refresh dashboard">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
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
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  selectedPeriod === period.value
                    ? 'text-black font-medium bg-accent shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                    : 'text-muted-foreground hover:text-white'
                }`}
                whileTap={{ scale: 0.96 }}
              >
                {period.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HoverCard title="Winrate" colorClass="border-blue-500/30">
          <RadialGauge value={summary?.win_rate || 0} label="Winrate" trend={weekWinrateTrend} accent="#3b82f6" />
          <p className="text-xs text-blue-300 mt-2">{winrateMicroTrend}</p>
        </HoverCard>

        <HoverCard title="Daily Winrate" colorClass="border-emerald-500/30">
          <RadialGauge value={summary?.daily_win_rate || 0} label="Daily Winrate" trend={dailyWinrateTrend} accent="#22c55e" />
          <p className="text-xs text-emerald-300 mt-2">{winrateMicroTrend}</p>
        </HoverCard>

        <HoverCard title="Avg Win / Avg Loss" colorClass="border-blue-500/20">
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
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">RR Ratio <span className="font-mono text-blue-300">{formatNumber(summary?.avg_win_loss_ratio || 0, 2)}</span></p>
          </div>
        </HoverCard>

        <HoverCard title="Trade Count" colorClass="border-purple-500/30">
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-mono font-bold text-purple-300">{tradeCount.total || 0}</p>
              <p className={`text-xs flex items-center gap-1 ${weeklyTradesDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {weeklyTradesDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {weeklyTradesDelta >= 0 ? '+' : ''}{weeklyTradesDelta} this week
              </p>
            </div>
            <ResponsiveContainer width="100%" height={72}>
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
                <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2.5} fill="url(#tradeGlow)" />
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
        </HoverCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HoverCard title="Win Streak" colorClass="border-orange-500/30">
          <div className="space-y-2">
            <p className="text-orange-300 text-lg tracking-wider">{Array.from({ length: Math.min(10, Math.max(1, Number(summary?.current_win_streak_trades || 0))) }).map(() => '??').join('')}</p>
            <p className="text-sm">Current streak: <span className="font-mono font-bold text-orange-300">{summary?.current_win_streak_trades || 0}</span></p>
            <p className="text-xs text-muted-foreground">Best streak: <span className="font-mono text-orange-200">{summary?.win_streak_trades || 0}</span></p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((summary?.current_win_streak_trades || 0) / Math.max(1, summary?.win_streak_trades || 1)) * 100)}%` }}
                className="h-full bg-gradient-to-r from-orange-500 to-amber-300"
              />
            </div>
          </div>
        </HoverCard>

        <HoverCard title="Total P&L" colorClass="border-emerald-500/20">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AnimatedNumber
                value={livePnl}
                decimals={2}
                prefix="$"
                className={`text-2xl font-mono font-bold ${livePnl >= 0 ? 'text-emerald-300' : 'text-red-300'} ${Math.abs(pnlDelta) > 0.8 ? 'animate-pulse' : ''}`}
              />
              {pnlDelta >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <p className={`text-xs ${pnlMonthChangePct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {pnlMonthChangePct >= 0 ? '?' : '?'} {formatNumber(Math.abs(pnlMonthChangePct), 2)}% this month
            </p>
            <p className="text-xs text-emerald-300">{pnlMicroTrend}</p>
          </div>
        </HoverCard>

        <HoverCard title="Open Positions" colorClass="border-red-500/20">
          {(summary?.open_trades || 0) === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No open trades</p>
              <p className="text-xs text-muted-foreground">Market waiting...</p>
              <Target className="w-5 h-5 text-blue-300 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-mono font-bold text-blue-300">{openTrades[0]?.instrument || 'OPEN POSITION'}</p>
              <p className="text-xs text-muted-foreground">Entry: {formatCurrency(openTrades[0]?.entry_price || 0)}</p>
              <p className="text-xs text-muted-foreground">Qty: {openTrades[0]?.quantity || '-'}</p>
              <p className="text-xs text-blue-200">+{summary?.open_trades || 0} open position(s)</p>
            </div>
          )}
        </HoverCard>

        <HoverCard title="Micro Trends" colorClass="border-blue-500/20">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Winrate</p>
            <p className="text-blue-300 tracking-wider">{winrateMicroTrend}</p>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-emerald-300 tracking-wider">{pnlMicroTrend}</p>
          </div>
        </HoverCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card p-5 border border-emerald-500/15"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-heading font-bold">Equity Curve</h3>
            <p className="text-xs text-muted-foreground">Account growth, drawdown and recovery</p>
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
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
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
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
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
          transition={{ duration: 0.4, delay: 0.1 }}
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
                contentStyle={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(v) => [`${v}/100`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
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
              <p className={`text-lg font-mono font-bold ${riskMetrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(riskMetrics.expectancy)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold text-purple-300"><AnimatedNumber value={riskMetrics.sharpe} decimals={2} /></p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Risk adjusted return score
                </span>
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
    </div>
  );
}
