import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../lib/utils';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { Copy, ChevronDown, AlertTriangle, TrendingUp, TrendingDown, Zap, Shield, Target } from 'lucide-react';

const INSTRUMENTS = [
  { value: 'XAUUSD', label: 'Gold / XAU',   pip: 0.01,   type: 'Commodity' },
  { value: 'XAGUSD', label: 'Silver / XAG', pip: 0.01,   type: 'Commodity' },
  { value: 'BTCUSD', label: 'Bitcoin / BTC',pip: 1,      type: 'Crypto'    },
  { value: 'ETHUSD', label: 'Ether / ETH',  pip: 0.01,   type: 'Crypto'    },
  { value: 'EURUSD', label: 'EUR / USD',    pip: 0.0001, type: 'Forex'     },
  { value: 'GBPUSD', label: 'GBP / USD',    pip: 0.0001, type: 'Forex'     },
  { value: 'USDJPY', label: 'USD / JPY',    pip: 0.01,   type: 'Forex'     },
  { value: 'USDCAD', label: 'USD / CAD',    pip: 0.0001, type: 'Forex'     },
  { value: 'AUDUSD', label: 'AUD / USD',    pip: 0.0001, type: 'Forex'     },
  { value: 'US30',   label: 'Dow Jones 30', pip: 1,      type: 'Index'     },
  { value: 'US500',  label: 'S&P 500',      pip: 0.1,    type: 'Index'     },
  { value: 'NAS100', label: 'Nasdaq 100',   pip: 0.1,    type: 'Index'     },
];

const TYPE_COLOR = {
  Forex:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Commodity: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Crypto:    'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  Index:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const RISK_PRESETS = [
  { label: 'Safe',  icon: Shield, value: 0.5, color: 'text-emerald-300 border-emerald-500/40' },
  { label: '1%',    icon: Target, value: 1,   color: 'text-blue-300 border-blue-500/40'       },
  { label: 'Risky', icon: Zap,    value: 2,   color: 'text-orange-300 border-orange-500/40'   },
];

function getPipValuePerLot(inst) {
  if (inst.type === 'Forex') return 10;
  if (inst.value === 'XAUUSD') return 1;
  if (inst.value === 'XAGUSD') return 0.5;
  return 1;
}

function riskBadge(r) {
  if (r <= 1)  return { ring: 'ring-emerald-500/40', glow: '0 0 30px rgba(16,185,129,0.25)', text: 'text-emerald-300', bar: 'from-emerald-500 to-emerald-400' };
  if (r <= 2)  return { ring: 'ring-yellow-500/40',  glow: '0 0 30px rgba(234,179,8,0.2)',   text: 'text-yellow-300',  bar: 'from-emerald-400 to-yellow-400'  };
  return       { ring: 'ring-red-500/40',    glow: '0 0 30px rgba(239,68,68,0.25)',  text: 'text-red-300',    bar: 'from-yellow-400 to-red-500'       };
}

// ── Trade Bar ─────────────────────────────────────────────────────────────────
function TradeBar({ entry, stop, take, direction, stopPips, takePips }) {
  const hasTake = take && take !== entry;
  const totalRange = hasTake ? Math.abs(take - stop) : Math.abs(entry - stop) * 4;
  const entryFromBottom = Math.abs(entry - stop) / totalRange;
  const isLong = direction === 'long';
  const entryPct = isLong ? (1 - entryFromBottom) * 100 : entryFromBottom * 100;
  return (
    <div className="flex gap-3 items-stretch" style={{ height: 176 }}>
      <div className="relative w-9 h-full rounded-xl overflow-hidden flex flex-col border border-white/10">
        <div className={isLong ? 'bg-emerald-500/20' : 'bg-rose-500/20'} style={{ height: `${entryPct}%` }} />
        <div className="h-px w-full bg-white/60 flex-shrink-0" />
        <div className={`flex-1 ${isLong ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`} />
      </div>
      <div className="flex flex-col justify-between py-0.5 text-[11px] font-mono">
        {hasTake ? (
          <div className={`font-bold ${isLong ? 'text-emerald-300' : 'text-rose-300'}`}>
            <div>{take}</div><div className="text-[10px] opacity-60">+{formatNumber(takePips, 0)}p</div>
          </div>
        ) : <div className="text-slate-700 text-[10px]">—</div>}
        <div className="text-blue-300 font-bold">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{entry}</div>
          <div className="text-[10px] text-slate-600">Entry</div>
        </div>
        <div className="text-rose-300 font-bold">
          <div>{stop}</div><div className="text-[10px] opacity-60">-{formatNumber(stopPips, 0)}p</div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function RiskCalculator() {
  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [direction,  setDirection]  = useState('long');
  const [balance,    setBalance]    = useState(1500);
  const [lots,       setLots]       = useState(0.10);
  const [entry,      setEntry]      = useState(4520);
  const [stop,       setStop]       = useState(4490);
  const [take,       setTake]       = useState(4550);
  const [showTP,     setShowTP]     = useState(true);
  const [showAdv,    setShowAdv]    = useState(false);
  const [leverage,   setLeverage]   = useState(30);
  const [presetRisk,    setPresetRisk]    = useState(null);
  const [copied,        setCopied]        = useState(false);
  const [sliderHovered, setSliderHovered] = useState(false);
  const sliderRef = useRef(null);

  // SL direction validation
  const stopValid = useMemo(() => {
    if (!entry || !stop) return true;
    return direction === 'long' ? stop < entry : stop > entry;
  }, [direction, entry, stop]);

  const pipValue  = getPipValuePerLot(instrument);
  const stopPips  = useMemo(() => {
    if (!stopValid || !parseFloat(entry) || !parseFloat(stop)) return 0;
    return Math.abs(entry - stop) / instrument.pip;
  }, [entry, stop, instrument, stopValid]);
  const takePips  = useMemo(() => showTP && take && entry ? Math.abs(take - entry) / instrument.pip : 0, [take, entry, instrument, showTP]);
  const riskAmt   = lots * stopPips * pipValue;
  const riskPct   = balance > 0 ? (riskAmt / balance) * 100 : 0;
  const profit    = takePips ? lots * takePips * pipValue : 0;
  const rr        = takePips && stopPips ? takePips / stopPips : 0;
  const margin    = (lots * entry) / leverage;
  const rb        = riskBadge(riskPct);

  // When user picks a preset, calculate lots from risk%
  const applyPreset = useCallback((pct) => {
    setPresetRisk(pct);
    if (balance && stopPips && pipValue) {
      const newLots = (balance * pct / 100) / (stopPips * pipValue);
      setLots(Math.max(0.01, parseFloat(newLots.toFixed(2))));
    }
  }, [balance, stopPips, pipValue]);

  const warnings = [];
  if (riskPct > 2)     warnings.push({ text: `High risk: ${formatNumber(riskPct, 1)}% per trade`, type: 'danger' });
  if (stopPips < 3 && stopPips > 0) warnings.push({ text: 'Stop too tight — spread risk', type: 'warn' });
  if (rr > 0 && rr < 1) warnings.push({ text: 'Bad R:R (< 1:1)', type: 'warn' });

  const copyTrade = useCallback(() => {
    const dir = direction === 'long' ? 'Buy' : 'Sell';
    const lines = [
      `${dir} ${instrument.value}`,
      `Entry: ${entry}  |  SL: ${stop}${showTP ? `  |  TP: ${take}` : ''}`,
      `Lots: ${formatNumber(lots, 2)}  |  Risk: $${formatNumber(riskAmt, 2)} (${formatNumber(riskPct, 1)}%)`,
      rr ? `R:R: 1:${formatNumber(rr, 1)}` : null,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [direction, instrument, entry, stop, take, lots, riskAmt, riskPct, rr, showTP]);

  const isLong = direction === 'long';

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Risk Calculator</h1>
          <p className="text-sm text-slate-500 mt-0.5">Drag lots. See risk. Trade smarter.</p>
        </div>
        <div className="flex gap-2">
          <AnimatePresence>
            {warnings.map((w, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${w.type === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}
              >
                <AlertTriangle className="w-3 h-3" />{w.text}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
        <motion.div
          animate={{ boxShadow: isLong ? '0 0 0 1px rgba(16,185,129,0.15), 0 8px 40px rgba(16,185,129,0.06)' : '0 0 0 1px rgba(239,68,68,0.15), 0 8px 40px rgba(239,68,68,0.06)' }}
          className="rounded-2xl bg-[#0d1117] border border-white/8 overflow-hidden"
        >
          {/* Direction tab strip */}
          <div className="grid grid-cols-2">
            {['long','short'].map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={`py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  direction === d
                    ? d === 'long'
                      ? 'bg-emerald-500/15 text-emerald-300 border-b-2 border-emerald-500'
                      : 'bg-rose-500/15 text-rose-300 border-b-2 border-rose-500'
                    : 'text-slate-600 border-b border-white/6 hover:text-slate-400'
                }`}
              >
                {d === 'long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {d === 'long' ? 'Long / Buy' : 'Short / Sell'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* Instrument */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Instrument</label>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLOR[instrument.type]}`}>{instrument.type}</span>
              </div>
              <div className="relative">
                <select
                  value={instrument.value}
                  onChange={e => setInstrument(INSTRUMENTS.find(i => i.value === e.target.value))}
                  style={{ colorScheme: 'dark', backgroundColor: '#0d1117' }}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/8 text-white text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:border-white/20 hover:border-white/15 transition-colors"
                >
                  {INSTRUMENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">pip = {instrument.pip} &nbsp;·&nbsp; pip val/lot = ${pipValue}</p>
            </div>

            <div className="h-px bg-white/5" />

            {/* Balance */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Account Balance</label>
                <span className="text-sm font-black font-mono text-white">${formatNumber(balance, 0)}</span>
              </div>
              <input type="number" value={balance} onChange={e => setBalance(Number(e.target.value))}
                style={{ colorScheme: 'dark', backgroundColor: '#0d1117' }}
                className="w-full px-3 py-2.5 rounded-xl border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-white/20 hover:border-white/15 transition-colors"
              />
            </div>

            <div className="h-px bg-white/5" />

            {/* Lots slider — the main control */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Position Size</label>
                <div className="flex items-center gap-2">
                  {/* Live risk badge */}
                  <motion.span
                    key={formatNumber(riskPct, 1)}
                    initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      riskPct > 2 ? 'bg-red-500/15 border-red-500/30 text-red-300'
                      : riskPct > 1 ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {formatNumber(riskPct, 2)}% risk
                  </motion.span>
                  <motion.span key={formatNumber(lots, 2)} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-black font-mono text-cyan-300"
                  >{formatNumber(lots, 2)}</motion.span>
                  <span className="text-sm text-cyan-600 font-bold">lots</span>
                </div>
              </div>
              {/* Slider */}
              <div className="my-3" style={{ position: 'relative', height: '10px' }}
                onMouseEnter={() => setSliderHovered(true)}
                onMouseLeave={() => setSliderHovered(false)}
              >
                {/* Track */}
                <div className="absolute inset-0 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    animate={{ width: `${Math.min(100, (lots / 2) * 100)}%` }}
                    transition={{ duration: 0.08 }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      riskPct > 2 ? 'from-yellow-400 to-red-500' : riskPct > 1 ? 'from-emerald-400 to-yellow-400' : 'from-cyan-500 to-emerald-400'
                    }`}
                  />
                </div>
                {/* Thumb circle — centered on the 10px tall track */}
                <motion.div
                  initial={false}
                  animate={{ opacity: sliderHovered ? 1 : 0, scale: sliderHovered ? 1 : 0.3 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(100, (lots / 2) * 100)}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 20, height: 20,
                    borderRadius: '50%',
                    border: '2px solid white',
                    pointerEvents: 'none',
                    zIndex: 10,
                    backgroundColor: riskPct > 2 ? '#ef4444' : riskPct > 1 ? '#eab308' : '#06b6d4',
                    boxShadow: `0 0 12px ${riskPct > 2 ? 'rgba(239,68,68,0.8)' : riskPct > 1 ? 'rgba(234,179,8,0.8)' : 'rgba(6,182,212,0.8)'}`,
                  }}
                />
                {/* Invisible range input */}
                <input type="range" min={0.01} max={2} step={0.01} value={lots}
                  onChange={e => { setLots(Number(e.target.value)); setPresetRisk(null); }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.01</span>
                <span>0.50</span>
                <span>1.00</span>
                <span>2.00 lots</span>
              </div>
              {/* Risk presets */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {RISK_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p.value)}
                    className={`py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                      presetRisk === p.value ? `${p.color} bg-white/5` : 'bg-white/3 border-white/8 text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <p.icon className="w-3 h-3" />{p.label} <span className="opacity-60">{p.value}%</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Entry / SL / TP */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Entry</label>
                  <input type="number" value={entry} step={instrument.pip * 10} onChange={e => setEntry(Number(e.target.value))}
                    style={{ colorScheme: 'dark', backgroundColor: 'rgba(59,130,246,0.06)' }}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-blue-500/20 text-blue-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-500/40 hover:border-blue-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Stop Loss</label>
                  <input type="number" value={stop} step={instrument.pip * 10} onChange={e => setStop(Number(e.target.value))}
                    style={{ colorScheme: 'dark', backgroundColor: stopValid ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.15)' }}
                    className={`w-full mt-1.5 px-3 py-2 rounded-xl border text-sm font-mono font-bold focus:outline-none transition-colors ${
                      stopValid
                        ? 'border-rose-500/20 text-rose-200 focus:border-rose-500/40 hover:border-rose-500/30'
                        : 'border-red-500/70 text-red-300 focus:border-red-500'
                    }`}
                  />
                  {!stopValid ? (
                    <p className="text-[10px] text-red-400 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {direction === 'long' ? 'SL must be below entry' : 'SL must be above entry'}
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-400/70 mt-1 font-mono">{formatNumber(stopPips, 1)} pips</p>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Take Profit</label>
                  <button onClick={() => setShowTP(!showTP)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${showTP ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/4 border-white/8 text-slate-600'}`}
                  >{showTP ? 'ON' : 'OFF'}</button>
                </div>
                <AnimatePresence>
                  {showTP && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <input type="number" value={take} step={instrument.pip * 10} onChange={e => setTake(Number(e.target.value))}
                        style={{ colorScheme: 'dark', backgroundColor: 'rgba(16,185,129,0.06)' }}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/20 text-emerald-200 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500/40 hover:border-emerald-500/30 transition-colors"
                      />
                      <p className="text-[10px] text-emerald-400/70 mt-1 font-mono">{formatNumber(takePips, 1)} pips</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdv(!showAdv)}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-300 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdv ? 'rotate-180' : ''}`} />
              Leverage & Margin
            </button>
            <AnimatePresence>
              {showAdv && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="border-t border-white/6 pt-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {[1,10,20,30,50,100,200,500].map(l => (
                      <button key={l} onClick={() => setLeverage(l)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${leverage === l ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/3 border-white/8 text-slate-600 hover:text-slate-300'}`}
                      >1:{l}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Margin required</span>
                    <span className="font-mono font-bold text-cyan-300">${formatNumber(margin, 2)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Hero output card */}
          <motion.div
            animate={{ boxShadow: rb.glow }}
            className={`rounded-2xl bg-[#0d1117] border ring-1 ${rb.ring} border-white/8 overflow-hidden`}
          >
            {/* Top bar */}
            <div className={`flex items-center justify-between px-5 py-3 border-b border-white/6 ${isLong ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ backgroundColor: isLong ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)' }}
                  className="w-2 h-2 rounded-full"
                />
                <span className={`text-xs font-bold ${isLong ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isLong ? 'Long' : 'Short'} &nbsp;·&nbsp; {instrument.value}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 font-mono">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            </div>

            <div className="p-5">
              {/* Big lots number */}
              <div className="flex items-end gap-3 mb-1">
                <motion.span
                  key={formatNumber(lots, 2)}
                  initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}
                  className="text-6xl font-black font-mono text-white leading-none"
                >
                  {formatNumber(lots, 2)}
                </motion.span>
                <div className="pb-1.5">
                  <div className="text-lg font-black text-slate-400">LOTS</div>
                  <motion.div key={formatNumber(riskPct, 2)} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    className={`text-xs font-black ${rb.text}`}
                  >{formatNumber(riskPct, 2)}% risk</motion.div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-5">
                <span>Risking <span className={`font-mono font-bold ${rb.text}`}>${formatNumber(riskAmt, 2)}</span></span>
                {rr > 0 && <span>R:R <span className={`font-bold ${rr >= 2 ? 'text-emerald-300' : rr >= 1 ? 'text-yellow-300' : 'text-red-300'}`}>1:{formatNumber(rr, 1)}</span></span>}
              </div>

              {/* Risk bar */}
              <div className="mb-5">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    animate={{ width: `${Math.min(100, (riskPct / 5) * 100)}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${rb.bar}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                  <span>{formatNumber(riskPct, 2)}%</span><span>5% max</span>
                </div>
              </div>

              {/* Trade bar + preview */}
              <div className="flex gap-4 items-start">
                <TradeBar entry={entry} stop={stop} take={showTP ? take : null} direction={direction} stopPips={stopPips} takePips={takePips} />
                <div className="flex-1 space-y-2 text-xs">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2.5">Trade Preview</p>
                  {showTP && take && (
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isLong ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-slate-500">TP</span>
                      <span className="ml-auto font-mono font-bold text-white">{take}</span>
                      <span className={`font-mono text-[11px] ${isLong ? 'text-emerald-400' : 'text-rose-400'}`}>+{formatNumber(takePips, 0)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-slate-500">Entry</span>
                    <span className="ml-auto font-mono font-bold text-white">{entry}</span>
                    <span className="font-mono text-[11px] text-blue-400">{formatNumber(lots, 2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-slate-500">SL</span>
                    <span className="ml-auto font-mono font-bold text-white">{stop}</span>
                    <span className="font-mono text-[11px] text-rose-400">-{formatNumber(stopPips, 0)}</span>
                  </div>
                  {rr > 0 && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-white/6">
                      <span className="text-slate-600">R:R</span>
                      <span className={`ml-auto font-mono font-bold ${rr >= 2 ? 'text-emerald-300' : rr >= 1 ? 'text-yellow-300' : 'text-red-300'}`}>
                        1:{formatNumber(rr, 1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Risk Amount',      value: `$${formatNumber(riskAmt, 2)}`,      color: 'text-amber-300'   },
              { label: 'Pip Value / Lot',  value: `$${formatNumber(pipValue, 2)}`,     color: 'text-fuchsia-300' },
              { label: 'Pips at Risk',     value: `${formatNumber(stopPips, 1)}`,      color: 'text-rose-300'    },
              { label: 'Potential Profit', value: `$${formatNumber(profit, 2)}`,       color: 'text-emerald-300' },
            ].map(({ label, value, color }) => (
              <motion.div key={label} whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-[#0d1117] border border-white/8 px-4 py-3"
              >
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              </motion.div>
            ))}
          </div>

          {/* Copy button */}
          <motion.button onClick={copyTrade} whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/12 text-white hover:bg-white/8 hover:border-white/18'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied to clipboard!' : `Copy · ${isLong ? 'Buy' : 'Sell'} ${instrument.value} ${formatNumber(lots, 2)} lots`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default withSubscriptionLock(RiskCalculator, 'risk-calculator');
