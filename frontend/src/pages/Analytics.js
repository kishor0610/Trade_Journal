import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Filter,
  Pause,
  Play,
  SkipForward,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createChart, CrosshairMode } from 'lightweight-charts';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseTimestamp(value) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function getTradePnl(trade) {
  if (typeof trade?.pnl === 'number') return trade.pnl;
  return 0;
}

function getTradeSession(trade) {
  const ts = parseTimestamp(trade?.entry_date) ?? parseTimestamp(trade?.exit_date);
  if (!ts) return 'Unknown';
  const hour = new Date(ts).getUTCHours();
  if (hour < 8) return 'Asia';
  if (hour < 13) return 'London';
  if (hour < 21) return 'New York';
  return 'After Hours';
}

function getStrategyLabel(trade) {
  const tags = String(trade?.tags || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (tags.length) return tags[0];

  const notesBlob = `${trade?.pre_trade_analysis || ''} ${trade?.notes || ''}`;
  const match = notesBlob.match(/strategy\s*:\s*([\w\s-]{2,30})/i);
  if (match?.[1]) return match[1].trim();

  return 'Unlabeled Setup';
}

function getPlannedRR(trade) {
  const rr = Number(trade?.risk_reward || 0);
  if (rr > 0) return rr;

  const entry = Number(trade?.entry_price);
  const stopLoss = Number(trade?.stop_loss);
  const takeProfit = Number(trade?.take_profit);
  const pos = String(trade?.position || '').toLowerCase();
  if (![entry, stopLoss, takeProfit].every(Number.isFinite)) return null;

  if (pos === 'sell' || pos === 'short') {
    const risk = stopLoss - entry;
    const reward = entry - takeProfit;
    return risk > 0 && reward > 0 ? reward / risk : null;
  }

  const risk = entry - stopLoss;
  const reward = takeProfit - entry;
  return risk > 0 && reward > 0 ? reward / risk : null;
}

function getActualRR(trade) {
  const entry = Number(trade?.entry_price);
  const stopLoss = Number(trade?.stop_loss);
  const exit = Number(trade?.exit_price);
  const pos = String(trade?.position || '').toLowerCase();

  if (![entry, stopLoss, exit].every(Number.isFinite)) return null;

  if (pos === 'sell' || pos === 'short') {
    const risk = stopLoss - entry;
    const reward = entry - exit;
    return risk > 0 ? reward / risk : null;
  }

  const risk = entry - stopLoss;
  const reward = exit - entry;
  return risk > 0 ? reward / risk : null;
}

function normalizeMarketSymbol(instrument) {
  const clean = String(instrument || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const alias = {
    BTCUSD: 'BTCUSDT',
    ETHUSD: 'ETHUSDT',
    BNBUSD: 'BNBUSDT',
    SOLUSD: 'SOLUSDT',
    XAUUSD: 'XAUUSD',
    XAGUSD: 'XAGUSD',
    EURUSD: 'EURUSD',
    GBPUSD: 'GBPUSD',
    USDJPY: 'USDJPY',
    AUDUSD: 'AUDUSD',
    NAS100: 'NAS100',
    US30: 'US30',
    SPX500: 'SPX500',
  };
  return alias[clean] || clean || 'BTCUSDT';
}

function IntelligenceCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#27272A] bg-[#121212] shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${className}`}>
      <div className="px-4 py-3 border-b border-[#27272A]">
        <h3 className="text-sm md:text-base font-semibold tracking-wide text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ReplayChart({ candles, entryTs, exitTs, entryPrice, exitPrice, playbackIndex }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const entryLineRef = useRef(null);
  const exitLineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;
    const chart = createChart(containerRef.current, {
      height: 330,
      layout: {
        background: { color: '#0A0A0A' },
        textColor: '#A1A1AA',
      },
      grid: {
        vertLines: { color: 'rgba(39,39,42,0.8)' },
        horzLines: { color: 'rgba(39,39,42,0.8)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#27272A',
      },
      timeScale: {
        borderColor: '#27272A',
        timeVisible: true,
      },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      const width = containerRef.current?.clientWidth || 800;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      entryLineRef.current = null;
      exitLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const sliceEnd = Math.max(1, Math.min(playbackIndex, candles.length));
    const visible = candles.slice(0, sliceEnd);
    seriesRef.current.setData(visible);

    // --- Remove old price lines ---
    if (entryLineRef.current) {
      try { seriesRef.current.removePriceLine(entryLineRef.current); } catch (_) {}
      entryLineRef.current = null;
    }
    if (exitLineRef.current) {
      try { seriesRef.current.removePriceLine(exitLineRef.current); } catch (_) {}
      exitLineRef.current = null;
    }

    // --- Add exact price lines (always visible at the correct price) ---
    if (entryPrice && Number.isFinite(entryPrice)) {
      entryLineRef.current = seriesRef.current.createPriceLine({
        price: entryPrice,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `Entry ${entryPrice}`,
      });
    }
    if (exitPrice && Number.isFinite(exitPrice)) {
      exitLineRef.current = seriesRef.current.createPriceLine({
        price: exitPrice,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `Exit ${exitPrice}`,
      });
    }

    // --- Snap markers to nearest candle timestamp ---
    const findNearestCandleTime = (targetSec) => {
      if (!targetSec || !visible.length) return null;
      let closest = null;
      let minDiff = Infinity;
      for (const c of visible) {
        const diff = Math.abs(c.time - targetSec);
        if (diff < minDiff) { minDiff = diff; closest = c.time; }
      }
      return closest;
    };

    const entrySec = entryTs ? Math.floor(entryTs / 1000) : null;
    const exitSec = exitTs ? Math.floor(exitTs / 1000) : null;
    const markers = [];

    const entrySnapped = findNearestCandleTime(entrySec);
    if (entrySnapped) {
      markers.push({
        time: entrySnapped,
        position: 'belowBar',
        color: '#10B981',
        shape: 'arrowUp',
        text: `Entry @ ${entryPrice ?? ''}`,
      });
    }
    const exitSnapped = findNearestCandleTime(exitSec);
    if (exitSnapped && exitSnapped !== entrySnapped) {
      markers.push({
        time: exitSnapped,
        position: 'aboveBar',
        color: '#EF4444',
        shape: 'arrowDown',
        text: `Exit @ ${exitPrice ?? ''}`,
      });
    }

    seriesRef.current.setMarkers(markers);
    chartRef.current.timeScale().fitContent();
  }, [candles, playbackIndex, entryTs, exitTs, entryPrice, exitPrice]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-[#27272A]" />;
}

function Analytics() {
  const [trades, setTrades] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayCandles, setReplayCandles] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [playbackIndex, setPlaybackIndex] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [interval, setIntervalValue] = useState('5m');

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    instrument: 'ALL',
    strategy: 'ALL',
    session: 'ALL',
  });

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const [tradesRes, summaryRes] = await Promise.all([
          axios.get(`${API_URL}/trades?status=closed`),
          axios.get(`${API_URL}/analytics/summary`),
        ]);
        const rows = Array.isArray(tradesRes.data) ? tradesRes.data : [];
        setTrades(rows);
        if (rows.length) {
          setSelectedTradeId(rows[0].id);
        }
        const summaryCurrency = summaryRes?.data?.currency;
        const tradeCurrency = rows.find((t) => t?.currency)?.currency;
        setCurrency(summaryCurrency || tradeCurrency || 'USD');
      } catch (error) {
        console.error('Failed to fetch analytics intelligence data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const strategyOptions = useMemo(() => {
    return ['ALL', ...Array.from(new Set(trades.map(getStrategyLabel)))];
  }, [trades]);

  const instrumentOptions = useMemo(() => {
    return ['ALL', ...Array.from(new Set(trades.map((t) => t.instrument).filter(Boolean)))];
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const exitTs = parseTimestamp(trade.exit_date || trade.entry_date);
      const startTs = filters.startDate ? Date.parse(`${filters.startDate}T00:00:00Z`) : null;
      const endTs = filters.endDate ? Date.parse(`${filters.endDate}T23:59:59Z`) : null;

      if (startTs && exitTs && exitTs < startTs) return false;
      if (endTs && exitTs && exitTs > endTs) return false;
      if (filters.instrument !== 'ALL' && trade.instrument !== filters.instrument) return false;
      if (filters.strategy !== 'ALL' && getStrategyLabel(trade) !== filters.strategy) return false;
      if (filters.session !== 'ALL' && getTradeSession(trade) !== filters.session) return false;
      return true;
    });
  }, [trades, filters]);

  const selectedTrade = useMemo(() => {
    return filteredTrades.find((t) => t.id === selectedTradeId) || filteredTrades[0] || null;
  }, [filteredTrades, selectedTradeId]);

  useEffect(() => {
    if (!selectedTrade && filteredTrades.length) {
      setSelectedTradeId(filteredTrades[0].id);
    }
  }, [selectedTrade, filteredTrades]);

  const fetchReplay = useCallback(async () => {
    if (!selectedTrade) {
      setReplayCandles([]);
      return;
    }

    const entryTs = parseTimestamp(selectedTrade.entry_date);
    const exitTs = parseTimestamp(selectedTrade.exit_date) || entryTs;
    if (!entryTs) {
      setReplayCandles([]);
      return;
    }

    const from = Math.floor((entryTs - 6 * 60 * 60 * 1000) / 1000);
    const to = Math.floor(((exitTs || entryTs) + 6 * 60 * 60 * 1000) / 1000);

    setReplayLoading(true);
    try {
      const symbol = normalizeMarketSymbol(selectedTrade.instrument);
      const response = await axios.get(`${API_URL}/market/candles`, {
        params: {
          symbol,
          interval,
          from,
          to,
          limit: 700,
        },
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      const normalized = rows
        .map((c) => ({
          time: Math.floor(Number(c.time) / 1000),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
        .filter((c) => [c.time, c.open, c.high, c.low, c.close].every(Number.isFinite));

      setReplayCandles(normalized);
      setPlaybackIndex(Math.min(90, Math.max(40, normalized.length)));
      setIsPlaying(false);
    } catch (error) {
      console.error('Replay candles fetch failed:', error);
      setReplayCandles([]);
    } finally {
      setReplayLoading(false);
    }
  }, [selectedTrade, interval]);

  useEffect(() => {
    fetchReplay();
  }, [fetchReplay]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const delay = speed === 1 ? 850 : speed === 2 ? 450 : 220;
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= replayCandles.length) {
          setIsPlaying(false);
          return replayCandles.length;
        }
        return next;
      });
    }, delay);
    return () => clearInterval(timer);
  }, [isPlaying, speed, replayCandles.length]);

  const totals = useMemo(() => {
    const pnl = filteredTrades.map(getTradePnl);
    const wins = pnl.filter((x) => x > 0);
    const losses = pnl.filter((x) => x < 0);
    const total = pnl.reduce((a, b) => a + b, 0);
    return {
      totalTrades: filteredTrades.length,
      totalPnl: total,
      winRate: filteredTrades.length ? (wins.length / filteredTrades.length) * 100 : 0,
      avgWin: wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
      avgLoss: losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0,
      winningTrades: wins.length,
      losingTrades: losses.length,
    };
  }, [filteredTrades]);

  const behavior = useMemo(() => {
    const earlyExit = filteredTrades.filter((trade) => {
      const planned = getPlannedRR(trade);
      const actual = getActualRR(trade);
      return planned && actual && actual > 0 && actual < planned * 0.65;
    });

    const dayCounts = filteredTrades.reduce((acc, trade) => {
      const d = String(trade?.entry_date || trade?.exit_date || '').slice(0, 10);
      if (!d) return acc;
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    const overtradingDays = Object.entries(dayCounts)
      .filter(([, count]) => count >= 4)
      .map(([day, count]) => ({ day, count }));

    const rrValues = filteredTrades
      .map((t) => getPlannedRR(t))
      .filter((x) => Number.isFinite(x) && x > 0);
    const mean = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;
    const variance = rrValues.length
      ? rrValues.reduce((acc, x) => acc + (x - mean) ** 2, 0) / rrValues.length
      : 0;
    const std = Math.sqrt(variance);
    const cv = mean > 0 ? std / mean : 0;

    const warnings = [];
    if (earlyExit.length >= 2) {
      warnings.push({
        title: 'Early Exit Pattern Detected',
        detail: `${earlyExit.length} trades closed before planned objective.`,
        action: 'Use partial take-profit and trail stop after first R milestone.',
        severity: 'high',
      });
    }
    if (overtradingDays.length) {
      warnings.push({
        title: 'Overtrading Sessions',
        detail: `${overtradingDays.length} day(s) crossed 4+ trades.`,
        action: 'Set a hard session cap and pause after 2 consecutive losses.',
        severity: 'medium',
      });
    }
    if (cv > 0.45 && rrValues.length >= 4) {
      warnings.push({
        title: 'Risk Inconsistency',
        detail: `Planned RR variability is high (CV ${cv.toFixed(2)}).`,
        action: 'Standardize setup templates with fixed invalidation rules.',
        severity: 'medium',
      });
    }

    if (!warnings.length) {
      warnings.push({
        title: 'Behavior Stable',
        detail: 'No major behavioral red flags in current filter set.',
        action: 'Keep logging rationale to strengthen setup-level analysis.',
        severity: 'low',
      });
    }

    return {
      warnings,
      earlyExitCount: earlyExit.length,
      overtradingDays,
      riskCv: cv,
    };
  }, [filteredTrades]);

  const strategyPerformance = useMemo(() => {
    const map = {};
    for (const trade of filteredTrades) {
      const key = getStrategyLabel(trade);
      if (!map[key]) {
        map[key] = { strategy: key, trade_count: 0, wins: 0, total_pnl: 0 };
      }
      map[key].trade_count += 1;
      const pnl = getTradePnl(trade);
      map[key].total_pnl += pnl;
      if (pnl > 0) map[key].wins += 1;
    }
    return Object.values(map)
      .map((x) => ({
        ...x,
        win_rate: x.trade_count ? (x.wins / x.trade_count) * 100 : 0,
      }))
      .sort((a, b) => b.total_pnl - a.total_pnl);
  }, [filteredTrades]);

  const pnlByHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      pnl: 0,
    }));
    filteredTrades.forEach((trade) => {
      const ts = parseTimestamp(trade.exit_date || trade.entry_date);
      if (!ts) return;
      const hour = new Date(ts).getUTCHours();
      buckets[hour].pnl += getTradePnl(trade);
    });
    return buckets;
  }, [filteredTrades]);

  const pnlByWeekday = useMemo(() => {
    const buckets = WEEKDAYS.map((day) => ({ day, pnl: 0 }));
    filteredTrades.forEach((trade) => {
      const ts = parseTimestamp(trade.exit_date || trade.entry_date);
      if (!ts) return;
      const dow = new Date(ts).getUTCDay();
      const index = dow === 0 ? 6 : dow - 1;
      buckets[index].pnl += getTradePnl(trade);
    });
    return buckets;
  }, [filteredTrades]);

  const distribution = useMemo(() => {
    if (!filteredTrades.length) return [];
    const values = filteredTrades.map(getTradePnl);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [{ bucket: `${min.toFixed(0)}`, frequency: values.length }];
    }
    const binCount = 10;
    const width = (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      bucket: `${(min + i * width).toFixed(0)} to ${(min + (i + 1) * width).toFixed(0)}`,
      frequency: 0,
    }));

    values.forEach((val) => {
      const raw = Math.floor((val - min) / width);
      const idx = Math.max(0, Math.min(binCount - 1, raw));
      bins[idx].frequency += 1;
    });

    return bins;
  }, [filteredTrades]);

  const replayProgress = replayCandles.length ? Math.round((playbackIndex / replayCandles.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div className="rounded-2xl border border-[#27272A] bg-[#121212] p-5 md:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Behavioral Intelligence Analytics</h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Replay every trade, detect behavior drift, and surface setup-level edge.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2">
              <p className="text-[#A1A1AA]">Filtered Trades</p>
              <p className="text-white font-semibold mt-0.5">{totals.totalTrades}</p>
            </div>
            <div className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2">
              <p className="text-[#A1A1AA]">Win Rate</p>
              <p className="text-[#10B981] font-semibold mt-0.5">{totals.winRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2">
              <p className="text-[#A1A1AA]">Warnings</p>
              <p className="text-[#F59E0B] font-semibold mt-0.5">{behavior.warnings.length}</p>
            </div>
            <div className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2">
              <p className="text-[#A1A1AA]">Total P&L</p>
              <p className={`font-semibold mt-0.5 ${totals.totalPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {formatCurrency(totals.totalPnl, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <IntelligenceCard title="Global Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
          <label className="text-xs text-[#A1A1AA]">
            Start Date
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2.5 py-2 text-white"
            />
          </label>
          <label className="text-xs text-[#A1A1AA]">
            End Date
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2.5 py-2 text-white"
            />
          </label>
          <label className="text-xs text-[#A1A1AA]">
            Instrument
            <select
              value={filters.instrument}
              onChange={(e) => setFilters((prev) => ({ ...prev, instrument: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2.5 py-2 text-white"
            >
              {instrumentOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#A1A1AA]">
            Strategy
            <select
              value={filters.strategy}
              onChange={(e) => setFilters((prev) => ({ ...prev, strategy: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2.5 py-2 text-white"
            >
              {strategyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#A1A1AA]">
            Session
            <select
              value={filters.session}
              onChange={(e) => setFilters((prev) => ({ ...prev, session: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2.5 py-2 text-white"
            >
              {['ALL', 'Asia', 'London', 'New York', 'After Hours', 'Unknown'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFilters({ startDate: '', endDate: '', instrument: 'ALL', strategy: 'ALL', session: 'ALL' })}
            className="h-[42px] rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] text-sm font-medium hover:bg-[#10B981]/20 transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Reset
          </button>
        </div>
      </IntelligenceCard>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#27272A] bg-[#121212] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#A1A1AA]">Total P&L</p>
            {totals.totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-[#10B981]" /> : <TrendingDown className="w-4 h-4 text-[#EF4444]" />}
          </div>
          <p className={`text-2xl font-bold font-mono mt-2 ${totals.totalPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {formatCurrency(totals.totalPnl, currency)}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-[#27272A] bg-[#121212] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#A1A1AA]">Win Rate</p>
            <Target className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-white">{totals.winRate.toFixed(1)}%</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-[#27272A] bg-[#121212] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#A1A1AA]">Behavior Alerts</p>
            <BrainCircuit className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-[#F59E0B]">{behavior.warnings.length}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-[#27272A] bg-[#121212] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#A1A1AA]">Risk Variability</p>
            <Activity className="w-4 h-4 text-white/60" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-white">{(behavior.riskCv * 100).toFixed(0)}%</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <IntelligenceCard title="Trade Replay Engine">
            {selectedTrade ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                  <select
                    value={selectedTradeId}
                    onChange={(e) => setSelectedTradeId(e.target.value)}
                    className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                  >
                    {filteredTrades.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.instrument} - {String(t.entry_date || '').slice(0, 16)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={interval}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                  >
                    {['1m', '5m', '15m', '1h'].map((v) => (
                      <option key={v} value={v}>{v} Replay</option>
                    ))}
                  </select>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      disabled={!replayCandles.length}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] disabled:opacity-50"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaybackIndex((v) => Math.min(replayCandles.length, v + 1))}
                      disabled={!replayCandles.length}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] disabled:opacity-50"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="h-9 rounded-lg border border-[#27272A] bg-[#0A0A0A] px-2 text-sm text-white"
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={3}>4x</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-[#27272A] overflow-hidden">
                    <div className="h-full bg-[#10B981]" style={{ width: `${replayProgress}%` }} />
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1">Replay progress: {replayProgress}%</p>
                </div>

                {replayLoading ? (
                  <div className="h-[330px] flex items-center justify-center text-[#A1A1AA]">Loading replay candles...</div>
                ) : replayCandles.length ? (
                  <ReplayChart
                    candles={replayCandles}
                    entryTs={parseTimestamp(selectedTrade.entry_date)}
                    exitTs={parseTimestamp(selectedTrade.exit_date)}
                    entryPrice={Number(selectedTrade.entry_price) || null}
                    exitPrice={Number(selectedTrade.exit_price) || null}
                    playbackIndex={playbackIndex}
                  />
                ) : (
                  <div className="h-[330px] flex items-center justify-center text-[#A1A1AA]">No candle data available for this trade window.</div>
                )}

                {/* Trade details from journal */}
                {selectedTrade && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 px-3 py-2">
                      <p className="text-[#A1A1AA] mb-0.5">Entry Price</p>
                      <p className="font-mono font-bold text-[#10B981] text-sm">{selectedTrade.entry_price ?? '—'}</p>
                      <p className="text-[#A1A1AA] mt-0.5">{String(selectedTrade.entry_date || '').slice(0, 16).replace('T', ' ')} UTC</p>
                    </div>
                    <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 px-3 py-2">
                      <p className="text-[#A1A1AA] mb-0.5">Exit Price</p>
                      <p className="font-mono font-bold text-[#EF4444] text-sm">{selectedTrade.exit_price ?? '—'}</p>
                      <p className="text-[#A1A1AA] mt-0.5">{String(selectedTrade.exit_date || '').slice(0, 16).replace('T', ' ')} UTC</p>
                    </div>
                    <div className="rounded-lg bg-[#27272A] border border-[#27272A] px-3 py-2">
                      <p className="text-[#A1A1AA] mb-0.5">Direction</p>
                      <p className={`font-semibold text-sm ${String(selectedTrade.position || '').toLowerCase().includes('sell') || String(selectedTrade.position || '').toLowerCase().includes('short') ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {String(selectedTrade.position || '').toUpperCase()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#27272A] border border-[#27272A] px-3 py-2">
                      <p className="text-[#A1A1AA] mb-0.5">P&L</p>
                      <p className={`font-mono font-bold text-sm ${(selectedTrade.pnl ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {formatCurrency(selectedTrade.pnl ?? 0, currency)}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-[#A1A1AA]">No trades for current filters.</div>
            )}
          </IntelligenceCard>

          <IntelligenceCard title="Time-Based Analysis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#A1A1AA] mb-2">P&L by Hour (UTC)</p>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={pnlByHour}>
                    <CartesianGrid stroke="rgba(39,39,42,0.6)" strokeDasharray="3 3" />
                    <XAxis dataKey="hour" hide />
                    <YAxis stroke="#A1A1AA" width={55} />
                    <Tooltip formatter={(value) => [formatCurrency(value, currency), 'P&L']} />
                    <Line type="monotone" dataKey="pnl" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-[#A1A1AA] mb-2">P&L by Day of Week</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={pnlByWeekday}>
                    <CartesianGrid stroke="rgba(39,39,42,0.6)" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#A1A1AA" />
                    <YAxis stroke="#A1A1AA" width={55} />
                    <Tooltip formatter={(value) => [formatCurrency(value, currency), 'P&L']} />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                      {pnlByWeekday.map((item) => (
                        <Cell key={item.day} fill={item.pnl >= 0 ? '#10B981' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </IntelligenceCard>
        </div>

        <div className="space-y-6">
          <IntelligenceCard title="Behavior Analysis Engine">
            <div className="space-y-3">
              {behavior.warnings.map((warning, idx) => (
                <div
                  key={`${warning.title}-${idx}`}
                  className={`rounded-xl border p-3 ${
                    warning.severity === 'high'
                      ? 'border-[#EF4444]/35 bg-[#EF4444]/10'
                      : warning.severity === 'medium'
                        ? 'border-[#F59E0B]/35 bg-[#F59E0B]/10'
                        : 'border-[#10B981]/35 bg-[#10B981]/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-white/80" />
                    <div>
                      <p className="font-semibold text-sm text-white">{warning.title}</p>
                      <p className="text-xs text-[#A1A1AA] mt-1">{warning.detail}</p>
                      <p className="text-xs text-[#10B981] mt-2">Suggestion: {warning.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </IntelligenceCard>

          <IntelligenceCard title="Behavior Heat">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#A1A1AA]">Early exits</span>
                <span className="font-mono text-[#EF4444]">{behavior.earlyExitCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1A1AA]">Overtrading days</span>
                <span className="font-mono text-[#F59E0B]">{behavior.overtradingDays.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1A1AA]">Risk CV</span>
                <span className="font-mono text-white">{behavior.riskCv.toFixed(2)}</span>
              </div>
            </div>
          </IntelligenceCard>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IntelligenceCard title="Strategy Performance Module">
          {strategyPerformance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A1A1AA] border-b border-[#27272A]">
                    <th className="text-left pb-2">Strategy / Setup</th>
                    <th className="text-right pb-2">Trades</th>
                    <th className="text-right pb-2">Win Rate</th>
                    <th className="text-right pb-2">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyPerformance.map((row) => (
                    <tr key={row.strategy} className="border-b border-[#27272A]">
                      <td className="py-2 pr-3 text-white">{row.strategy}</td>
                      <td className="py-2 text-right font-mono text-[#A1A1AA]">{row.trade_count}</td>
                      <td className="py-2 text-right font-mono text-[#10B981]">{row.win_rate.toFixed(1)}%</td>
                      <td className={`py-2 text-right font-mono ${row.total_pnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {formatCurrency(row.total_pnl, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#A1A1AA]">No strategy records for current filters.</div>
          )}
        </IntelligenceCard>

        <IntelligenceCard title="Trade Distribution (P&L Histogram)">
          {distribution.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution}>
                <CartesianGrid stroke="rgba(39,39,42,0.6)" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke="#A1A1AA" hide />
                <YAxis stroke="#A1A1AA" width={35} />
                <Tooltip />
                <Legend />
                <Bar dataKey="frequency" fill="#10B981" name="Outcome Frequency" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#A1A1AA]">No distribution data to display.</div>
          )}
        </IntelligenceCard>
      </div>

      <IntelligenceCard title="Outcome Flow">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            data={filteredTrades
              .slice()
              .sort((a, b) => String(a.exit_date || a.entry_date).localeCompare(String(b.exit_date || b.entry_date)))
              .reduce((acc, trade, idx) => {
                const prev = idx ? acc[idx - 1].equity : 0;
                acc.push({
                  index: idx + 1,
                  equity: prev + getTradePnl(trade),
                });
                return acc;
              }, [])}
          >
            <defs>
              <linearGradient id="eqGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(39,39,42,0.6)" strokeDasharray="3 3" />
            <XAxis dataKey="index" stroke="#A1A1AA" />
            <YAxis stroke="#A1A1AA" />
            <Tooltip formatter={(value) => [formatCurrency(value, currency), 'Equity']} />
            <Area type="monotone" dataKey="equity" stroke="#10B981" strokeWidth={2} fill="url(#eqGlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </IntelligenceCard>
    </div>
  );
}

export default withSubscriptionLock(Analytics, 'analytics');
