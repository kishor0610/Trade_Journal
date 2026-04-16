import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  ShieldAlert,
  Zap,
  Activity,
  BarChart2,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── helpers ─────────────────────────────────────────────────────────────────

const BIAS_COLORS = {
  bullish: {
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    glow: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    icon: TrendingUp,
    label: 'Bullish',
  },
  bearish: {
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    glow: 'border-red-500/30',
    bar: 'bg-red-500',
    icon: TrendingDown,
    label: 'Bearish',
  },
  neutral: {
    badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    glow: 'border-yellow-400/30',
    bar: 'bg-yellow-400',
    icon: Minus,
    label: 'Neutral',
  },
};

const TREND_LABEL = { up: '↑ Uptrend', down: '↓ Downtrend', sideways: '→ Ranging' };
const TREND_COLOR = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  sideways: 'text-yellow-400',
};

const INTERVALS = [
  { value: '5m',  label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '1h',  label: '1 Hour' },
  { value: '4h',  label: '4 Hour' },
  { value: '1d',  label: 'Daily' },
];

function ScoreRing({ score }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width="60" height="60" className="rotate-[-90deg]">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
      />
      <text
        x="30" y="35" textAnchor="middle"
        fill="white" fontSize="13" fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: '30px 30px' }}
      >
        {score}
      </text>
    </svg>
  );
}

// ── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ signal, isExpanded, onToggle }) {
  const b = BIAS_COLORS[signal.bias] || BIAS_COLORS.neutral;
  const BiasIcon = b.icon;
  const rr = signal.entry && signal.stop_loss && signal.take_profit
    ? Math.abs(signal.take_profit - signal.entry) / Math.abs(signal.stop_loss - signal.entry)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`glass-card border ${b.glow} overflow-hidden cursor-pointer`}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="p-4 flex items-center gap-4">
        {/* Score ring */}
        <div className="shrink-0">
          <ScoreRing score={signal.score} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-bold text-white text-base">{signal.symbol}</span>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{signal.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.badge}`}>
              <BiasIcon className="inline w-3 h-3 mr-1" />{b.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-white/90 truncate">{signal.pattern}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${TREND_COLOR[signal.trend]}`}>
              {TREND_LABEL[signal.trend] || signal.trend}
            </span>
            {signal.tags.map(tag => (
              <span key={tag} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        {/* Right stats */}
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500 mb-1">Confidence</p>
          <p className="text-lg font-mono font-bold text-white">{Math.round(signal.confidence * 100)}%</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1 bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${signal.confidence * 100}%` }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className={`h-full ${b.bar}`}
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Why this signal */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Why this signal?</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-gray-300">Trend:</span>
                      <span className={`font-semibold ${TREND_COLOR[signal.trend]}`}>{TREND_LABEL[signal.trend]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-gray-300">Volume:</span>
                      <span className={`font-semibold ${signal.high_volume ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {signal.high_volume ? 'Above Average ✓' : 'Normal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-gray-300">Location:</span>
                      <span className={`font-semibold ${signal.at_key_level ? 'text-amber-400' : 'text-gray-400'}`}>
                        {signal.at_key_level ? 'Key Level ✓' : 'Mid-Range'}
                      </span>
                    </div>
                    {signal.all_patterns && signal.all_patterns.length > 1 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <span className="text-gray-300">All patterns: <span className="text-cyan-300">{signal.all_patterns.join(', ')}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Entry / SL / TP */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Levels</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-white" />
                        <span className="text-sm text-gray-300">Entry</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{signal.entry}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-300">Stop Loss</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-red-400">{signal.stop_loss}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-gray-300">Take Profit</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-emerald-400">{signal.take_profit}</span>
                    </div>
                    {rr && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-violet-500/10">
                        <span className="text-sm text-gray-300">Risk:Reward</span>
                        <span className="text-sm font-mono font-bold text-violet-400">1:{rr.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Current price + timestamp */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Current price: <span className="text-white font-mono">{signal.current_price}</span></span>
                <span>{signal.last_candle_time}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

function PriceActionInsights() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interval, setIntervalVal] = useState('1h');
  const [minScore, setMinScore] = useState(40);
  const [expandedId, setExpandedId] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [scanned, setScanned] = useState(0);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/market/price-action-signals`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { interval, min_score: minScore },
      });
      setSignals(res.data.signals || []);
      setScanned(res.data.scanned || 0);
      setLastFetched(new Date());
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to fetch signals';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [interval, minScore]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const bullishCount = signals.filter(s => s.bias === 'bullish').length;
  const bearishCount = signals.filter(s => s.bias === 'bearish').length;
  const neutralCount = signals.filter(s => s.bias === 'neutral').length;
  const highProbCount = signals.filter(s => s.score >= 70).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-white flex items-center gap-3">
              <span className="text-2xl">📊</span>
              Price Action Insights
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time candlestick pattern scanner for Forex &amp; Commodities · Powered by Twelve Data
            </p>
          </div>
          <Button
            onClick={fetchSignals}
            disabled={loading}
            className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-black font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning…' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: 'Signals Found', value: signals.length, color: 'text-white', icon: Activity },
          { label: 'High Probability (≥70)', value: highProbCount, color: 'text-violet-400', icon: CheckCircle2 },
          { label: 'Bullish', value: bullishCount, color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Bearish', value: bearishCount, color: 'text-red-400', icon: TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <span className={`text-2xl font-bold font-heading ${color}`}>{value}</span>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-white">Filters</span>
          {lastFetched && (
            <span className="ml-auto text-xs text-gray-500">
              Last scan: {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Timeframe */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Timeframe</label>
            <div className="flex gap-1.5 flex-wrap">
              {INTERVALS.map(iv => (
                <button
                  key={iv.value}
                  onClick={() => setIntervalVal(iv.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    interval === iv.value
                      ? 'bg-accent text-black font-bold'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min score slider */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1.5">
              Min Score: <span className="text-white font-bold">{minScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>0 (All)</span>
              <span>50 (Good)</span>
              <span>70 (High)</span>
              <span>90 (Top)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Signal list */}
      <div className="space-y-3">
        {loading && signals.length === 0 && (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Scanning {scanned || 9} instruments for patterns…</p>
          </div>
        )}

        {!loading && signals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card border border-white/5 p-10 text-center"
          >
            <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No patterns found</p>
            <p className="text-gray-400 text-sm">
              Try lowering the minimum score or switching to a different timeframe.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {signals.map((signal, idx) => (
            <SignalCard
              key={`${signal.symbol_key}-${signal.pattern_key}-${idx}`}
              signal={signal}
              isExpanded={expandedId === idx}
              onToggle={() => setExpandedId(expandedId === idx ? null : idx)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Disclaimer */}
      {signals.length > 0 && (
        <p className="text-xs text-gray-600 text-center pb-4">
          ⚠️ These signals are for informational purposes only. Always manage your risk and conduct your own analysis before trading.
        </p>
      )}
    </div>
  );
}

export default withSubscriptionLock(PriceActionInsights);
