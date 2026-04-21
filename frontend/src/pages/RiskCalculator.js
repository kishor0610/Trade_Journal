import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatNumber } from '../lib/utils';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { Copy, ChevronDown, AlertTriangle, TrendingUp, TrendingDown, Zap, Shield, Target } from 'lucide-react';

// â”€â”€ Instruments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const INSTRUMENTS = [
  { value: 'XAUUSD',  label: 'Gold (XAU/USD)',      pip: 0.01,   type: 'Commodity', icon: 'ðŸ¥‡' },
  { value: 'XAGUSD',  label: 'Silver (XAG/USD)',     pip: 0.01,   type: 'Commodity', icon: 'ðŸ¥ˆ' },
  { value: 'BTCUSD',  label: 'Bitcoin (BTC/USD)',    pip: 1,      type: 'Crypto',    icon: 'â‚¿'  },
  { value: 'ETHUSD',  label: 'Ethereum (ETH/USD)',   pip: 0.01,   type: 'Crypto',    icon: 'Îž'  },
  { value: 'EURUSD',  label: 'EUR/USD',              pip: 0.0001, type: 'Forex',     icon: 'â‚¬'  },
  { value: 'GBPUSD',  label: 'GBP/USD',              pip: 0.0001, type: 'Forex',     icon: 'Â£'  },
  { value: 'USDJPY',  label: 'USD/JPY',              pip: 0.01,   type: 'Forex',     icon: 'Â¥'  },
  { value: 'USDCAD',  label: 'USD/CAD',              pip: 0.0001, type: 'Forex',     icon: '$'  },
  { value: 'AUDUSD',  label: 'AUD/USD',              pip: 0.0001, type: 'Forex',     icon: 'A$' },
  { value: 'US30',    label: 'Dow Jones (US30)',      pip: 1,      type: 'Index',     icon: 'ðŸ“ˆ' },
  { value: 'US500',   label: 'S&P 500 (US500)',      pip: 0.1,    type: 'Index',     icon: 'ðŸ“Š' },
  { value: 'NAS100',  label: 'Nasdaq (NAS100)',      pip: 0.1,    type: 'Index',     icon: 'ðŸ’¹' },
];

const RISK_PRESETS = [
  { label: 'Safe',       value: 0.5, icon: Shield, colorClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { label: 'Normal',     value: 1,   icon: Target, colorClass: 'bg-blue-500/20 border-blue-500/40 text-blue-300'         },
  { label: 'Aggressive', value: 2,   icon: Zap,    colorClass: 'bg-orange-500/20 border-orange-500/40 text-orange-300'   },
];

function getPipValuePerLot(instrument) {
  if (instrument.type === 'Forex')  return 10;
  if (instrument.value === 'XAUUSD') return 1;
  if (instrument.value === 'XAGUSD') return 0.5;
  if (['BTCUSD','ETHUSD'].includes(instrument.value)) return 1;
  if (['US30','US500','NAS100'].includes(instrument.value)) return 1;
  return 10;
}

function calcLots({ balance, riskPercent, stopPips, pipValue }) {
  if (!balance || !riskPercent || !stopPips || !pipValue) return 0;
  return Math.max(0, (balance * (riskPercent / 100)) / (stopPips * pipValue));
}

function riskColor(r) {
  if (r <= 1) return { track: 'from-emerald-500 to-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30' };
  if (r <= 2) return { track: 'from-emerald-400 to-yellow-400',  text: 'text-yellow-300',  border: 'border-yellow-500/30'  };
  return       { track: 'from-yellow-400 to-red-500',            text: 'text-red-300',     border: 'border-red-500/30'     };
}

// â”€â”€ Visual Trade Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TradeBar({ entry, stop, take, direction, stopPips, takePips }) {
  const hasTake = take && take !== entry;
  const totalRange = hasTake ? Math.abs(take - stop) : Math.abs(entry - stop) * 4;
  const entryFromBottom = Math.abs(entry - stop) / totalRange;
  const isLong = direction === 'long';

  const entryPct = isLong
    ? (1 - entryFromBottom) * 100
    : entryFromBottom * 100;

  return (
    <div className="relative flex gap-3 items-stretch" style={{ height: 180 }}>
      {/* Bar */}
      <div className="relative w-10 h-full rounded-2xl overflow-hidden flex flex-col border border-white/8">
        {/* Top zone */}
        <div
          className={isLong ? 'bg-emerald-500/25' : 'bg-rose-500/25'}
          style={{ height: `${entryPct}%` }}
        />
        {/* Entry line */}
        <div className="h-0.5 w-full bg-white/70 flex-shrink-0" />
        {/* Bottom zone */}
        <div
          className={isLong ? 'bg-rose-500/25' : 'bg-emerald-500/25'}
          style={{ flex: 1 }}
        />
      </div>

      {/* Labels */}
      <div className="flex flex-col justify-between py-0.5 text-[11px]">
        {/* TP label */}
        {hasTake ? (
          <div className={`font-bold ${isLong ? 'text-emerald-300' : 'text-rose-300'}`}>
            <div>TP {take}</div>
            <div className="text-[10px] opacity-70">+{formatNumber(takePips, 0)}p</div>
          </div>
        ) : (
          <div className="text-slate-700 text-[10px]">No TP</div>
        )}
        {/* Entry label */}
        <div className="text-blue-300 font-bold">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{entry}</div>
          <div className="text-[10px] text-slate-500">Entry</div>
        </div>
        {/* SL label */}
        <div className="text-rose-300 font-bold">
          <div>SL {stop}</div>
          <div className="text-[10px] opacity-70">-{formatNumber(stopPips, 0)}p</div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RiskCalculator() {
  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [direction,  setDirection]  = useState('long');
  const [balance,    setBalance]    = useState(1500);
  const [risk,       setRisk]       = useState(1);
  const [entry,      setEntry]      = useState(4520);
  const [stop,       setStop]       = useState(4490);
  const [take,       setTake]       = useState(4550);
  const [showTP,     setShowTP]     = useState(true);
  const [showAdv,    setShowAdv]    = useState(false);
  const [leverage,   setLeverage]   = useState(30);
  const [mode,       setMode]       = useState('risk');
  const [fixedLots,  setFixedLots]  = useState(0.1);
  const [copied,     setCopied]     = useState(false);

  const pipValue  = getPipValuePerLot(instrument);
  const stopPips  = useMemo(() => Math.abs(entry - stop) / instrument.pip, [entry, stop, instrument]);
  const takePips  = useMemo(() => showTP && take ? Math.abs(take - entry) / instrument.pip : 0, [take, entry, instrument, showTP]);
  const riskAmt   = balance * (risk / 100);
  const lots      = mode === 'risk' ? calcLots({ balance, riskPercent: risk, stopPips, pipValue }) : fixedLots;
  const rr        = takePips && stopPips ? takePips / stopPips : 0;
  const profit    = takePips ? lots * takePips * pipValue : 0;
  const margin    = (lots * entry) / leverage;
  const rc        = riskColor(risk);
  const maxLots   = useMemo(() => calcLots({ balance, riskPercent: 5, stopPips, pipValue }), [balance, stopPips, pipValue]);
  const recLots   = useMemo(() => calcLots({ balance, riskPercent: 1, stopPips, pipValue }), [balance, stopPips, pipValue]);

  const warnings = [];
  if (risk > 2)       warnings.push({ text: `High risk: ${risk}% per trade`, type: 'danger' });
  if (stopPips < 3)   warnings.push({ text: 'Stop too tight â€” spread risk', type: 'warn' });
  if (rr > 0 && rr < 1) warnings.push({ text: 'Unfavourable R:R (< 1:1)', type: 'warn' });

  const copyTrade = useCallback(() => {
    const dir  = direction === 'long' ? 'Buy' : 'Sell';
    const text = [
      `${dir} ${instrument.value}`,
      `Entry: ${entry}`,
      `SL: ${stop}`,
      showTP ? `TP: ${take}` : null,
      `Lots: ${formatNumber(lots, 2)}`,
      `Risk: $${formatNumber(riskAmt, 2)}`,
      rr ? `R:R: 1:${formatNumber(rr, 1)}` : null,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [direction, instrument, entry, stop, take, lots, riskAmt, rr, showTP]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Risk Calculator</h1>
        <p className="text-sm text-slate-500 mt-0.5">Drag to size your position. Zero thinking required.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* â”€â”€ LEFT: Inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">

          {/* Instrument + Direction */}
          <div className="bg-card/60 backdrop-blur rounded-2xl border border-white/8 p-5 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Instrument</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">{instrument.icon}</span>
                <select
                  value={instrument.value}
                  onChange={e => setInstrument(INSTRUMENTS.find(i => i.value === e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-white/10 text-white text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:border-blue-500/40"
                >
                  {INSTRUMENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Pip: {instrument.pip} Â· {instrument.type}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['long','short'].map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border transition-all ${
                    direction === d
                      ? d === 'long' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-white/4 border-white/8 text-slate-500 hover:text-white'
                  }`}
                >
                  {d === 'long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Balance + Mode */}
          <div className="bg-card/60 backdrop-blur rounded-2xl border border-white/8 p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Balance</label>
                <span className="text-sm font-mono font-bold text-white">${formatNumber(balance, 0)}</span>
              </div>
              <input type="number" value={balance} onChange={e => setBalance(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-background border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-blue-500/40"
                placeholder="1500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => setMode('risk')}
                className={`py-1.5 rounded-lg font-semibold border transition-all ${mode === 'risk' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/4 border-white/8 text-slate-500'}`}
              >Risk-based</button>
              <button onClick={() => setMode('fixed')}
                className={`py-1.5 rounded-lg font-semibold border transition-all ${mode === 'fixed' ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-white/4 border-white/8 text-slate-500'}`}
              >Fixed Lot</button>
            </div>
          </div>

          {/* Risk slider / Fixed lot */}
          <AnimatePresence mode="wait">
            {mode === 'risk' ? (
              <motion.div key="risk" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`bg-card/60 backdrop-blur rounded-2xl border p-5 space-y-4 ${rc.border}`}
              >
                <div className="flex justify-between items-start">
                  <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Risk %</label>
                  <div className="text-right">
                    <div className={`text-2xl font-black font-mono ${rc.text}`}>{risk}%</div>
                    <div className="text-[10px] text-slate-600">${formatNumber(riskAmt, 2)}</div>
                  </div>
                </div>
                {/* Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {RISK_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setRisk(p.value)}
                      className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                        risk === p.value ? p.colorClass : 'bg-white/4 border-white/8 text-slate-500 hover:text-white'
                      }`}
                    >
                      <p.icon className="w-3 h-3" />{p.label} <span className="opacity-70">{p.value}%</span>
                    </button>
                  ))}
                </div>
                {/* Slider */}
                <div className="relative">
                  <div className="relative h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${rc.track} transition-all duration-100`}
                      style={{ width: `${(risk / 5) * 100}%` }} />
                  </div>
                  <input type="range" min={0.25} max={5} step={0.25} value={risk}
                    onChange={e => setRisk(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
                    <span>0.25%</span><span className="text-emerald-600">Safe</span><span className="text-yellow-600">2%</span><span className="text-red-600">5%</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="fixed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-card/60 backdrop-blur rounded-2xl border border-fuchsia-500/20 p-5"
              >
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Fixed Lots</label>
                  <span className="text-xl font-black font-mono text-fuchsia-300">{formatNumber(fixedLots, 2)}</span>
                </div>
                <div className="relative">
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-400"
                      style={{ width: `${(fixedLots / 1) * 100}%` }} />
                  </div>
                  <input type="range" min={0.01} max={1} step={0.01} value={fixedLots}
                    onChange={e => setFixedLots(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">0.01 â†’ 1.00 lots</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entry / SL / TP */}
          <div className="bg-card/60 backdrop-blur rounded-2xl border border-white/8 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Entry</label>
                <input type="number" value={entry} step={instrument.pip * 10} onChange={e => setEntry(Number(e.target.value))}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border border-blue-500/20 text-blue-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Stop Loss</label>
                <input type="number" value={stop} step={instrument.pip * 10} onChange={e => setStop(Number(e.target.value))}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border border-rose-500/20 text-rose-200 text-sm font-mono font-bold focus:outline-none focus:border-rose-500/50"
                />
                <p className="text-[11px] text-rose-400/80 mt-1">{formatNumber(stopPips, 1)} pips</p>
              </div>
            </div>

            {/* TP toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Take Profit</label>
                <button onClick={() => setShowTP(!showTP)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${showTP ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/4 border-white/8 text-slate-500'}`}
                >{showTP ? 'ON' : 'OFF'}</button>
              </div>
              <AnimatePresence>
                {showTP && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <input type="number" value={take} step={instrument.pip * 10} onChange={e => setTake(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-emerald-500/20 text-emerald-200 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-[11px] text-emerald-400/80 mt-1">{formatNumber(takePips, 1)} pips</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced */}
            <button onClick={() => setShowAdv(!showAdv)}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdv ? 'rotate-180' : ''}`} />
              Advanced (Leverage Â· Margin)
            </button>
            <AnimatePresence>
              {showAdv && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 border-t border-white/8 pt-3"
                >
                  <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Leverage</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[1,10,20,30,50,100,200,500].map(l => (
                      <button key={l} onClick={() => setLeverage(l)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${leverage === l ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/4 border-white/8 text-slate-500 hover:text-white'}`}
                      >1:{l}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs pt-1.5">
                    <span className="text-slate-500">Margin required</span>
                    <span className="font-mono text-cyan-300">${formatNumber(margin, 2)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Warnings */}
          <AnimatePresence>
            {warnings.map((w, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold border ${w.type === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}`}
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{w.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* â”€â”€ RIGHT: Output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">

          {/* Hero card */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 rounded-2xl border border-white/10 p-6">
            {/* Top row */}
            <div className="flex items-center justify-between mb-5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${direction === 'long' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
                {direction === 'long' ? 'â–² Long' : 'â–¼ Short'} Â· {instrument.value}
              </span>
              <span className="text-[11px] text-slate-600 font-mono">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </div>

            {/* Big number */}
            <motion.div key={formatNumber(lots, 2)} initial={{ scale: 0.95, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
              className="text-5xl font-black text-cyan-300 font-mono leading-none mb-1"
            >
              {formatNumber(lots, 2)}<span className="text-lg font-bold text-cyan-500 ml-2">LOTS</span>
            </motion.div>
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-5">
              <span>Risk: <span className={`font-mono font-bold ${rc.text}`}>${formatNumber(riskAmt, 2)}</span></span>
              {rr > 0 && <span>R:R: <span className={`font-mono font-bold ${rr >= 2 ? 'text-emerald-300' : rr >= 1 ? 'text-yellow-300' : 'text-red-300'}`}>1:{formatNumber(rr, 1)}</span></span>}
            </div>

            {/* Risk bar */}
            <div className="mb-6">
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div className={`h-full rounded-full bg-gradient-to-r ${rc.track}`}
                  animate={{ width: `${Math.min(100, (risk / 5) * 100)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>{risk}% risk</span><span>5% max</span></div>
            </div>

            {/* Visual bar + preview */}
            <div className="flex gap-4 items-start">
              <TradeBar entry={entry} stop={stop} take={showTP ? take : null} direction={direction} stopPips={stopPips} takePips={takePips} />
              <div className="flex-1 space-y-2 pt-1">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Trade Preview</p>
                {showTP && take && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${direction === 'long' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="text-slate-400">Take Profit</span>
                    <span className="ml-auto font-mono font-bold text-white">{take}</span>
                    <span className={`text-[11px] font-mono ${direction === 'long' ? 'text-emerald-400' : 'text-rose-400'}`}>+{formatNumber(takePips, 0)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-slate-400">Entry</span>
                  <span className="ml-auto font-mono font-bold text-white">{entry}</span>
                  <span className="text-[11px] font-mono text-blue-400">+{formatNumber(lots, 2)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-slate-400">Stop Loss</span>
                  <span className="ml-auto font-mono font-bold text-white">{stop}</span>
                  <span className="text-[11px] font-mono text-rose-400">-{formatNumber(stopPips, 0)}</span>
                </div>
                {rr > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/8 text-xs">
                    <span className="text-slate-500">R:R ratio</span>
                    <span className={`ml-auto font-mono font-bold ${rr >= 2 ? 'text-emerald-300' : rr >= 1 ? 'text-yellow-300' : 'text-red-300'}`}>
                      1:{formatNumber(rr, 1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Risk Amount',     value: `$${formatNumber(riskAmt, 2)}`,      color: 'text-amber-300'   },
              { label: 'Pip Value / Lot', value: `$${formatNumber(pipValue, 2)}`,     color: 'text-fuchsia-300' },
              { label: 'Pips at Risk',    value: `${formatNumber(stopPips, 1)} pips`, color: 'text-rose-300'    },
              { label: 'Potential Profit',value: `$${formatNumber(profit, 2)}`,       color: 'text-emerald-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card/60 backdrop-blur rounded-xl border border-white/8 px-4 py-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Lot context bar */}
          {mode === 'risk' && (
            <div className="bg-card/60 backdrop-blur rounded-2xl border border-white/8 p-4">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-3">Lot size context</p>
              <div className="relative h-2 rounded-full bg-white/8 overflow-hidden mb-2">
                <div className="absolute top-0 h-full w-0.5 bg-yellow-400/60"
                  style={{ left: `${Math.min(99, (recLots / Math.max(maxLots, lots, 0.01)) * 100)}%` }} />
                <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                  animate={{ width: `${Math.min(100, (lots / Math.max(maxLots, lots, 0.01)) * 100)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>0.01</span>
                <span className="text-yellow-400/70">Rec: {formatNumber(recLots, 2)}</span>
                <span>Max (5%): {formatNumber(maxLots, 2)}</span>
              </div>
            </div>
          )}

          {/* Copy Trade */}
          <motion.button onClick={copyTrade} whileTap={{ scale: 0.97 }}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
              copied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/8 border-white/15 text-white hover:bg-white/12'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : `Copy Trade Â· ${direction === 'long' ? 'Buy' : 'Sell'} ${instrument.value} ${formatNumber(lots, 2)} lots`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default withSubscriptionLock(RiskCalculator, 'risk-calculator');
