import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const CHART_SYMBOLS = [
  { label: 'BTC/USDT', value: 'BTCUSDT' },
  { label: 'ETH/USDT', value: 'ETHUSDT' },
  { label: 'XAU/USD (Gold)', value: 'XAUUSD' },
  { label: 'XAG/USD (Silver)', value: 'XAGUSD' },
  { label: 'EUR/USD', value: 'EURUSD' },
  { label: 'GBP/USD', value: 'GBPUSD' },
  { label: 'USD/JPY', value: 'USDJPY' },
  { label: 'AUD/USD', value: 'AUDUSD' },
  { label: 'NAS100', value: 'NAS100' },
  { label: 'US30', value: 'US30' },
  { label: 'SPX500', value: 'SPX500' },
  { label: 'BNB/USDT', value: 'BNBUSDT' },
  { label: 'SOL/USDT', value: 'SOLUSDT' },
];

const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

const TV_SYMBOL_MAP = {
  BTCUSDT: 'BINANCE:BTCUSDT',
  ETHUSDT: 'BINANCE:ETHUSDT',
  BNBUSDT: 'BINANCE:BNBUSDT',
  SOLUSDT: 'BINANCE:SOLUSDT',
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  EURUSD: 'OANDA:EURUSD',
  GBPUSD: 'OANDA:GBPUSD',
  USDJPY: 'OANDA:USDJPY',
  AUDUSD: 'OANDA:AUDUSD',
  NAS100: 'OANDA:NAS100USD',
  US30: 'OANDA:US30USD',
  SPX500: 'OANDA:SPX500USD',
};

const TV_INTERVAL_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

let tvScriptPromise;

const loadTradingViewScript = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TradingView script'));
    document.head.appendChild(script);
  });

  return tvScriptPromise;
};

const TradingViewEmbed = ({ symbol, interval }) => {
  const containerId = useMemo(() => `tv-widget-${Math.random().toString(36).slice(2, 9)}`, []);

  useEffect(() => {
    let isMounted = true;

    loadTradingViewScript()
      .then(() => {
        if (!isMounted || !window.TradingView) return;
        // eslint-disable-next-line no-new
        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          save_image: true,
          withdateranges: true,
          studies: [],
          container_id: containerId,
        });
      })
      .catch(() => {
        // Keep page usable even if widget script fails.
      });

    return () => {
      isMounted = false;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '';
    };
  }, [symbol, interval, containerId]);

  return <div id={containerId} className="w-full h-full" />;
};

export default function LiveMarket() {
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT');
  const [chartInterval, setChartInterval] = useState('5m');

  const tvSymbol = TV_SYMBOL_MAP[chartSymbol] || `BINANCE:${chartSymbol}`;
  const tvInterval = TV_INTERVAL_MAP[chartInterval] || '5';

  return (
    <div className="space-y-6" data-testid="live-market-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Live Market</h1>
          <p className="text-muted-foreground">Real-time TradingView market chart</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-4 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 text-emerald-400" />
          Live feed
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={chartSymbol} onValueChange={setChartSymbol}>
            <SelectTrigger className="bg-secondary border-white/10 h-9">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              {CHART_SYMBOLS.map((symbol) => (
                <SelectItem key={symbol.value} value={symbol.value}>{symbol.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={chartInterval} onValueChange={setChartInterval}>
            <SelectTrigger className="bg-secondary border-white/10 h-9">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              {CHART_INTERVALS.map((interval) => (
                <SelectItem key={interval} value={interval}>{interval}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full h-[72vh] min-h-[520px] rounded-lg overflow-hidden border border-white/10" data-testid="live-market-widget">
          <TradingViewEmbed symbol={tvSymbol} interval={tvInterval} />
        </div>
      </motion.div>
    </div>
  );
}
