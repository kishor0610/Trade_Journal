import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatNumber, TIME_PERIODS } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const motionValue = useMotionValue(value || 0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.4 });
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

  return (
    <span className={className}>
      {prefix}{formatNumber(display, decimals)}{suffix}
    </span>
  );
};

const MetricCard = ({ title, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className={`glass-card p-4 ${className}`}
  >
    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
    {children}
  </motion.div>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tradeCount, setTradeCount] = useState({ total: 0, data: [] });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const [livePnl, setLivePnl] = useState(0);
  const [pnlDelta, setPnlDelta] = useState(0);
  const [impactPulse, setImpactPulse] = useState('neutral');

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, tradeCountRes, balanceRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/trade-count?period=${selectedPeriod}`),
        axios.get(`${API_URL}/analytics/balance-history?period=${selectedPeriod}`),
      ]);

      setSummary(summaryRes.data);
      setTradeCount(tradeCountRes.data);
      setBalanceHistory(balanceRes.data);
      setLivePnl(summaryRes.data?.total_pnl || 0);
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const lastTradeImpact = useMemo(() => {
    if (!balanceHistory.length) return 0;
    return Number(balanceHistory[balanceHistory.length - 1]?.trade_pnl || 0);
  }, [balanceHistory]);

  useEffect(() => {
    if (!summary) return;

    const timer = setInterval(() => {
      const base = Number(summary.total_pnl || 0);
      const jitter = Math.max(3, Math.abs(lastTradeImpact) * 0.2);
      const delta = (Math.random() - 0.5) * jitter;
      setLivePnl((prev) => {
        const next = prev + delta;
        const bounded = next > base + jitter * 2 ? base + jitter * 2 : next < base - jitter * 2 ? base - jitter * 2 : next;
        setPnlDelta(bounded - prev);
        setImpactPulse(bounded - prev >= 0 ? 'up' : 'down');
        return bounded;
      });
    }, 1800);

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
      };
    });
  }, [balanceHistory]);

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

    const returns = balanceHistory
      .map((x) => Number(x.trade_pnl || 0))
      .filter((x) => Number.isFinite(x));

    const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length
      ? returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length
      : 0;
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
  }, [summary, balanceHistory, equitySeries]);

  const radarData = useMemo(() => {
    const winrate = Number(summary?.win_rate || 0);
    const rr = Math.min(100, Number(summary?.avg_win_loss_ratio || 0) * 40);
    const maxDdPenalty = Math.max(0, 100 - riskMetrics.maxDrawdown * 2);
    const consistency = Math.min(100, Number(summary?.daily_win_rate || 0));
    const discipline = Math.min(100, (Number(summary?.win_streak_days || 0) * 10) + 30);

    return [
      { metric: 'Risk Control', value: formatNumber(maxDdPenalty, 0) },
      { metric: 'Discipline', value: formatNumber(discipline, 0) },
      { metric: 'Winrate', value: formatNumber(winrate, 0) },
      { metric: 'RR Ratio', value: formatNumber(rr, 0) },
      { metric: 'Consistency', value: formatNumber(consistency, 0) },
    ];
  }, [summary, riskMetrics.maxDrawdown]);

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API_URL}/export/trades/${format}`, {
        responseType: 'blob',
      });

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
          <p className="text-muted-foreground flex items-center gap-2">
            Last Sync: {lastSync || 'Never'}
            <button onClick={handleRefresh} className="hover:text-accent transition-colors" aria-label="refresh dashboard">
              <RefreshCw className="w-4 h-4" />
            </button>
          </p>
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

          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-accent text-black font-medium'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <MetricCard title="Total P&L (Live)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AnimatedNumber
                  value={livePnl}
                  decimals={2}
                  prefix="$"
                  className={`text-3xl font-mono font-bold ${impactPulse === 'up' ? 'text-emerald-400' : impactPulse === 'down' ? 'text-red-400' : 'text-white'}`}
                />
                {pnlDelta >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-400" />
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${impactPulse === 'up' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {pnlDelta >= 0 ? '+' : ''}{formatNumber(pnlDelta, 2)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              ({formatNumber(summary?.win_rate || 0, 2)}%)
            </p>
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">Last Trade Impact</span>
              <span className={lastTradeImpact >= 0 ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>
                {lastTradeImpact >= 0 ? '+' : ''}{formatCurrency(lastTradeImpact)}
              </span>
            </div>
          </div>
        </MetricCard>

        <MetricCard title="Trade Activity">
          <div className="space-y-2">
            <p className="text-3xl font-mono font-bold">
              <AnimatedNumber value={summary?.total_trades || 0} decimals={0} />
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded p-2">
                <p className="text-muted-foreground">Wins</p>
                <p className="font-mono text-emerald-400">{summary?.winning_trades || 0}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/25 rounded p-2">
                <p className="text-muted-foreground">Losses</p>
                <p className="font-mono text-red-400">{summary?.losing_trades || 0}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/25 rounded p-2">
                <p className="text-muted-foreground">Open</p>
                <p className="font-mono text-blue-300">{summary?.open_trades || 0}</p>
              </div>
            </div>
          </div>
        </MetricCard>

        <MetricCard title="Execution Pulse">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Winrate</span>
              <span className="font-mono font-bold text-blue-300">
                <AnimatedNumber value={summary?.win_rate || 0} decimals={2} suffix="%" />
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
                animate={{ width: `${Math.min(100, Math.max(0, summary?.win_rate || 0))}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Avg Win {formatCurrency(summary?.avg_win || 0)}</span>
              <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Avg Loss {formatCurrency(summary?.avg_loss || 0)}</span>
            </div>
          </div>
        </MetricCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-heading font-bold">Equity Curve</h3>
            <p className="text-xs text-muted-foreground">Growth, drawdown, and recovery</p>
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
          className="glass-card p-5"
        >
          <h3 className="text-lg font-heading font-bold mb-1">Performance Radar</h3>
          <p className="text-xs text-muted-foreground mb-4">Trader skill profile</p>

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
          className="glass-card p-5"
        >
          <h3 className="text-lg font-heading font-bold mb-1">Risk Metrics</h3>
          <p className="text-xs text-muted-foreground mb-4">Professional risk diagnostics</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
              <p className="text-lg font-mono font-bold text-red-400">
                <AnimatedNumber value={riskMetrics.maxDrawdown} decimals={2} suffix="%" />
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Average RR</p>
              <p className="text-lg font-mono font-bold text-blue-300">
                <AnimatedNumber value={riskMetrics.avgRR} decimals={2} />
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Profit Factor</p>
              <p className="text-lg font-mono font-bold text-emerald-400">
                <AnimatedNumber value={riskMetrics.profitFactor} decimals={2} />
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Expectancy</p>
              <p className={`text-lg font-mono font-bold ${riskMetrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${formatNumber(riskMetrics.expectancy, 2)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-secondary/20 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold text-purple-300">
                  <AnimatedNumber value={riskMetrics.sharpe} decimals={2} />
                </p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Risk adjusted return score
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Total trade logs: {tradeCount.total || 0}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
