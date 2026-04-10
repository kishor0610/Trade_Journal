import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { Calculator, Copy } from 'lucide-react';

const INSTRUMENTS = [
  { value: 'XAUUSD', label: 'Gold (XAUUSD)', pip: 0.01, type: 'Commodity' },
  { value: 'XAGUSD', label: 'Silver (XAGUSD)', pip: 0.01, type: 'Commodity' },
  { value: 'BTCUSD', label: 'Bitcoin (BTCUSD)', pip: 0.01, type: 'Crypto' },
  { value: 'EURUSD', label: 'EUR/USD', pip: 0.0001, type: 'Forex' },
  { value: 'GBPUSD', label: 'GBP/USD', pip: 0.0001, type: 'Forex' },
  { value: 'USDJPY', label: 'USD/JPY', pip: 0.01, type: 'Forex' },
];

const LEVERAGES = [1,2,5,10,20,30,50,100,200,500];
const RISK_LEVELS = [0.5, 1, 2, 3];
const QUICK_BALANCES = [5000, 10000, 25000, 50000];

function calcPositionSize({ balance, riskPercent, stopPips, pipValue }) {
  if (!balance || !riskPercent || !stopPips || !pipValue) return 0;
  const riskAmount = balance * (riskPercent / 100);
  const lots = riskAmount / (stopPips * pipValue);
  return Math.max(0, lots);
}

function RiskCalculator() {
  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [direction, setDirection] = useState('long');
  const [balance, setBalance] = useState(5000);
  const [risk, setRisk] = useState(1);
  const [leverage, setLeverage] = useState(30);
  const [entry, setEntry] = useState(4500);
  const [stop, setStop] = useState(4490);
  const [take, setTake] = useState(4520);
  const [pipValue, setPipValue] = useState(1);

  const stopPips = Math.abs(entry - stop) / instrument.pip;
  const takePips = take ? Math.abs(take - entry) / instrument.pip : 0;
  const riskAmount = balance * (risk / 100);
  const lots = calcPositionSize({ balance, riskPercent: risk, stopPips, pipValue });
  const margin = (lots * entry) / leverage;
  const rr = takePips && stopPips ? (takePips / stopPips).toFixed(2) : '-';
  const potentialProfit = takePips ? lots * takePips * pipValue : 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Calculator className="w-7 h-7 text-fuchsia-400 drop-shadow-glow animate-pulse" />
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-fuchsia-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-glow">Position Calculator <span className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent ml-2">Beta</span></h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Inputs */}
        <div className="space-y-6 bg-card/70 rounded-2xl p-6 border border-fuchsia-500/20 shadow-lg">
          <div>
            <label className="block text-sm font-bold mb-1 text-fuchsia-300">Instrument</label>
            <select value={instrument.value} onChange={e => setInstrument(INSTRUMENTS.find(i => i.value === e.target.value))} className="w-full p-2 rounded-lg bg-background border border-fuchsia-500/30 text-lg">
              {INSTRUMENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            <div className="text-xs text-muted-foreground mt-1">Pip: {instrument.pip} | Type: {instrument.type}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDirection('long')} className={cn("flex-1 py-2 rounded-lg font-bold text-lg border transition-all", direction==='long' ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg" : "bg-background border-white/10 text-muted-foreground")}>Long</button>
            <button onClick={() => setDirection('short')} className={cn("flex-1 py-2 rounded-lg font-bold text-lg border transition-all", direction==='short' ? "bg-rose-500/20 border-rose-400 text-rose-300 shadow-lg" : "bg-background border-white/10 text-muted-foreground")}>Short</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-fuchsia-300">Balance</label>
              <input type="number" value={balance} onChange={e => setBalance(Number(e.target.value))} className="w-full p-2 rounded-lg bg-background border border-fuchsia-500/30 text-lg" />
              <div className="flex gap-2 mt-1 flex-wrap">
                {QUICK_BALANCES.map(b => <button key={b} onClick={() => setBalance(b)} className="px-2 py-1 rounded bg-fuchsia-500/10 text-fuchsia-300 text-xs font-bold hover:bg-fuchsia-500/20">${b/1000}k</button>)}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-fuchsia-300">Risk %</label>
              <input type="number" value={risk} onChange={e => setRisk(Number(e.target.value))} className="w-full p-2 rounded-lg bg-background border border-fuchsia-500/30 text-lg" />
              <div className="flex gap-2 mt-1 flex-wrap">
                {RISK_LEVELS.map(r => <button key={r} onClick={() => setRisk(r)} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20">{r}%</button>)}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-fuchsia-300">Leverage</label>
            <div className="flex gap-2 flex-wrap">
              {LEVERAGES.map(l => <button key={l} onClick={() => setLeverage(l)} className={cn("px-2 py-1 rounded border text-xs font-bold", leverage===l ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow" : "bg-background border-white/10 text-muted-foreground")}>{`1:${l}`}</button>)}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-fuchsia-300">Entry</label>
              <input type="number" value={entry} onChange={e => setEntry(Number(e.target.value))} className="w-full p-2 rounded-lg bg-background border border-fuchsia-500/30 text-lg" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-rose-300">Stop Loss</label>
              <input type="number" value={stop} onChange={e => setStop(Number(e.target.value))} className="w-full p-2 rounded-lg bg-background border border-rose-500/30 text-lg" />
              <div className="text-xs text-rose-400 mt-1">= {formatNumber(stopPips, 1)} pips</div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-emerald-300">Take Profit (optional)</label>
              <input type="number" value={take} onChange={e => setTake(Number(e.target.value))} className="w-full p-2 rounded-lg bg-background border border-emerald-500/30 text-lg" />
              <div className="text-xs text-emerald-400 mt-1">= {formatNumber(takePips, 1)} pips</div>
            </div>
          </div>
        </div>
        {/* Right: Results */}
        <div className="space-y-6 bg-card/70 rounded-2xl p-6 border border-cyan-500/20 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn("px-2 py-1 rounded-full text-xs font-bold", direction==='long' ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>{direction==='long' ? 'Long' : 'Short'}</span>
            <span className="text-xs text-muted-foreground">Standard 1 lot = 100,000 units</span>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Position Size</div>
              <div className="text-3xl font-extrabold text-cyan-300 drop-shadow-glow">{formatNumber(lots, 2)} <span className="text-base font-bold text-cyan-400">lots</span></div>
            </div>
            <button className="ml-2 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 text-xs font-bold flex items-center gap-1 hover:bg-cyan-500/20"><Copy className="w-3 h-3" /> Copy</button>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Standard: {formatNumber(lots*1,2)}</span>
            <span>Mini: {formatNumber(lots*10,2)}</span>
            <span>Micro: {formatNumber(lots*100,2)}</span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-cyan-300 mb-1">Risk Exposure</div>
            <div className="w-full h-2 bg-cyan-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" style={{ width: `${risk}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>{risk}% (${formatNumber(riskAmount,2)})</span>
              <span className="text-muted-foreground">Standard professional risk management</span>
            </div>
          </div>
          <div className="mt-4 bg-background/80 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("w-2 h-2 rounded-full", direction==='long' ? "bg-emerald-400" : "bg-rose-400")} />
              <span className="font-bold text-lg">Trade Preview</span>
              <span className={cn("ml-auto px-2 py-1 rounded-full text-xs font-bold", direction==='long' ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>{direction==='long' ? 'Long' : 'Short'}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Take Profit</span>
                <span className="ml-auto font-mono font-bold text-emerald-300">{take}</span>
                <span className="ml-2 text-xs font-bold text-emerald-400">+{formatNumber(takePips,1)} pips</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Entry</span>
                <span className="ml-auto font-mono font-bold text-blue-300">{entry}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Stop Loss</span>
                <span className="ml-auto font-mono font-bold text-rose-300">{stop}</span>
                <span className="ml-2 text-xs font-bold text-rose-400">-{formatNumber(stopPips,1)} pips</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>R:R</span>
              <span className="font-mono font-bold text-cyan-300">{rr}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Risk Amount</div>
              <div className="font-mono font-bold text-amber-300 text-lg">{formatCurrency(riskAmount)}</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Pip Value</div>
              <div className="font-mono font-bold text-fuchsia-300 text-lg">${formatNumber(pipValue,2)}</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Pips at Risk</div>
              <div className="font-mono font-bold text-rose-300 text-lg">{formatNumber(stopPips,1)}</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Pips to Target</div>
              <div className="font-mono font-bold text-emerald-300 text-lg">{formatNumber(takePips,1)}</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Est. Margin</div>
              <div className="font-mono font-bold text-cyan-300 text-lg">{formatCurrency(margin)}</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-muted-foreground">Potential Profit</div>
              <div className="font-mono font-bold text-emerald-300 text-lg">{formatCurrency(potentialProfit)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withSubscriptionLock(RiskCalculator, 'risk-calculator');
