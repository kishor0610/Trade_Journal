import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Filter, X, Search, SlidersHorizontal, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Share2, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatDate, INSTRUMENTS, POSITIONS, STATUSES, getInstrumentColor } from '../lib/utils';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API_URL = `${BACKEND_URL}/api`;
const LIVE_STREAM_WS_URL = BACKEND_URL.replace(/^http/i, 'ws');

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

// ShareTradeDialog Component
const ShareTradeDialog = ({ trade, isOpen, onClose, currency = 'USD' }) => {
  const shareImageRef = useRef(null);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();

  const isProfitable = (trade?.pnl || 0) >= 0;
  const userName = user?.name || 'Trader';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const copyImage = async () => {
    if (!shareImageRef.current) return;
    setCopying(true);
    try {
      const canvas = await html2canvas(shareImageRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success('Trade image copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
          toast.error('Failed to copy image. Try downloading instead.');
        }
        setCopying(false);
      });
    } catch (err) {
      console.error('Failed to generate image:', err);
      toast.error('Failed to generate image');
      setCopying(false);
    }
  };

  const downloadImage = async () => {
    if (!shareImageRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareImageRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `trade-${trade.instrument}-${new Date().getTime()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Trade image downloaded!');
        setDownloading(false);
      });
    } catch (err) {
      console.error('Failed to download:', err);
      toast.error('Failed to download image');
      setDownloading(false);
    }
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Share Trade</DialogTitle>
          <DialogDescription>Your trade image is ready to share or download.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Trade Share Card */}
          <div ref={shareImageRef} className="relative rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%)',
            padding: '32px',
          }}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            {/* Chart Visualization (decorative) */}
            <div className="absolute right-0 top-0 w-64 h-64 opacity-20">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <path
                  d={isProfitable 
                    ? "M0,120 Q50,100 100,80 T200,40"
                    : "M0,40 Q50,80 100,100 T200,160"
                  }
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.5"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/80 text-sm">Closed Trade</span>
                </div>
                <span className="text-white font-medium">{userName}</span>
              </div>

              {/* Profit */}
              <div className="text-center py-4">
                <div className="text-white/80 text-sm mb-2">PROFIT</div>
                <div className="text-5xl font-bold text-white">
                  {isProfitable ? '' : '-'}{currencySymbol}{Math.abs(trade.pnl || 0).toFixed(2)}
                </div>
              </div>

              {/* Trade Details */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  trade.position === 'buy' || trade.position === 'long'
                    ? 'bg-emerald-500 text-white'
                    : trade.position === 'sell' || trade.position === 'short'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {trade.position?.toUpperCase() || 'UNKNOWN'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium">
                  {trade.quantity || 0} lots
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium">
                  {trade.instrument}
                </span>
              </div>

              {/* Price Details */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <div className="text-white/60 text-xs mb-1">Open price:</div>
                  <div className="text-white font-mono">{currencySymbol}{trade.entry_price?.toFixed(2) || '0.00'}</div>
                  <div className="text-white/60 text-xs mt-0.5">
                    {new Date(trade.entry_date).toLocaleDateString()} {new Date(trade.entry_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-xs mb-1">Close price:</div>
                  <div className="text-white font-mono">{currencySymbol}{trade.exit_price?.toFixed(2) || '0.00'}</div>
                  <div className="text-white/60 text-xs mt-0.5">
                    {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : ''} {trade.exit_date ? new Date(trade.exit_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={copyImage}
              disabled={copying}
            >
              <Copy className="w-4 h-4" />
              {copying ? 'Copying...' : 'Copy Image'}
            </Button>
            <Button
              className="flex-1 gap-2 bg-accent text-black hover:bg-accent/90"
              onClick={downloadImage}
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
          allow_symbol_change: true,
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

const INTERVAL_SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

const TradeForm = ({ trade, onSubmit, onClose, currency = 'USD' }) => {
  const [formData, setFormData] = useState({
    instrument: trade?.instrument || 'XAU/USD',
    position: trade?.position || 'buy',
    entry_price: trade?.entry_price || '',
    exit_price: trade?.exit_price || '',
    quantity: trade?.quantity || '',
    entry_date: trade?.entry_date?.slice(0, 10) || new Date().toISOString().split('T')[0],
    exit_date: trade?.exit_date?.slice(0, 10) || '',
    notes: trade?.notes || '',
    status: trade?.status || 'open',
    stop_loss: trade?.stop_loss || '',
    take_profit: trade?.take_profit || '',
    commission: trade?.commission || '',
    swap: trade?.swap || '',
    currency: trade?.currency || currency,
    // Trading journal fields
    pre_trade_analysis: trade?.pre_trade_analysis || '',
    post_trade_review: trade?.post_trade_review || '',
    emotions: trade?.emotions || '',
    lessons: trade?.lessons || '',
    tags: trade?.tags || '',
    rating: trade?.rating || 5,
    risk_reward: trade?.risk_reward || null,
    // Execution checklist
    check_htf: trade?.check_htf || false,
    check_risk: trade?.check_risk || false,
    check_plan: trade?.check_plan || false,
    check_levels: trade?.check_levels || false,
    check_news: trade?.check_news || false,
    // Screenshots
    screenshots: trade?.screenshots || []
  });
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    checklist: true,
    preAnalysis: false,
    postReview: false,
    psychology: false,
    screenshots: false
  });
  const [screenshotPreviews, setScreenshotPreviews] = useState([]);

  // Initialize screenshot previews when editing existing trade
  useEffect(() => {
    if (trade?.screenshots && trade.screenshots.length > 0) {
      const previews = trade.screenshots.map((url, index) => ({
        url,
        name: `Screenshot ${index + 1}`
      }));
      setScreenshotPreviews(previews);
    }
  }, [trade]);

  // Calculate checklist completion
  const checklistItems = [
    { key: 'check_htf', label: 'Checked higher timeframe' },
    { key: 'check_risk', label: 'Risk within limits' },
    { key: 'check_plan', label: 'Fits my trading plan' },
    { key: 'check_levels', label: 'Key levels identified' },
    { key: 'check_news', label: 'Economic calendar checked' }
  ];
  
  const completedChecks = checklistItems.filter(item => formData[item.key]).length;
  const checklistProgress = `${completedChecks}/${checklistItems.length}`;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChecklistToggle = (key) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleScreenshotUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          setScreenshotPreviews(prev => [...prev, { url: dataUrl, name: file.name }]);
          setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, dataUrl] }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeScreenshot = (index) => {
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, screenshots: prev.screenshots.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        entry_price: parseFloat(formData.entry_price),
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        quantity: parseFloat(formData.quantity),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        commission: formData.commission ? parseFloat(formData.commission) : 0,
        swap: formData.swap ? parseFloat(formData.swap) : 0,
        exit_date: formData.exit_date || null,
        rating: formData.rating ? parseInt(formData.rating) : null,
        risk_reward: formData.risk_reward ? parseInt(formData.risk_reward) : null
      };
      
      await onSubmit(payload);
      onClose();
      toast.success(trade ? 'Trade updated successfully!' : 'Trade added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
      {/* Header - Trade Info */}
      {trade && (
        <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 p-4 rounded-lg border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{formData.instrument}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-md ${
                formData.position === 'buy' || formData.position === 'long'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-400 text-white'
                  : 'bg-gradient-to-r from-red-500 to-pink-400 text-white'
              }`}>
                {formData.position?.toUpperCase()}
              </span>
              {trade.pnl !== undefined && (
                <span className={`font-mono text-lg font-bold ${
                  trade.pnl >= 0 
                    ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                    : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'
                }`}>
                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl, currency)}
                </span>
              )}
            </div>
            <div className="text-sm text-white/80 font-medium">
              {formData.quantity} lots
            </div>
          </div>
        </div>
      )}

      {/* Basic Trade Details Section - MOVED TO TOP */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('basic')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg hover:from-blue-500/30 hover:to-cyan-500/30 transition-all border border-blue-500/30 shadow-md"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <span className="text-xl">📊</span>
            TRADE DETAILS
          </span>
          <span className="text-white/80">{expandedSections.basic ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.basic && (
          <div className="space-y-4 pl-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select value={formData.instrument} onValueChange={(v) => setFormData({ ...formData, instrument: v })}>
                  <SelectTrigger className="bg-secondary border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                          {i.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                  <SelectTrigger className="bg-secondary border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Price</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                  className="bg-secondary border-white/10 font-mono"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Exit Price</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.exit_price}
                  onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                  className="bg-secondary border-white/10 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lot Size</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="bg-secondary border-white/10 font-mono"
                  placeholder="0.01"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Stop Loss</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.stop_loss}
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                  className="bg-secondary border-white/10 font-mono"
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Take Profit</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.take_profit}
                  onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                  className="bg-secondary border-white/10 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="bg-secondary border-white/10"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Exit Date</Label>
                <Input
                  type="date"
                  value={formData.exit_date}
                  onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                  className="bg-secondary border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-secondary border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Risk / Reward</Label>
                <Select value={formData.risk_reward?.toString() || ''} onValueChange={(v) => setFormData({ ...formData, risk_reward: v ? parseInt(v) : null })}>
                  <SelectTrigger className="bg-secondary border-white/10">
                    <SelectValue placeholder="Select R:R" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1:1</SelectItem>
                    <SelectItem value="2">1:2</SelectItem>
                    <SelectItem value="3">1:3</SelectItem>
                    <SelectItem value="4">1:4</SelectItem>
                    <SelectItem value="5">1:5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Checklist Section - MOVED AFTER TRADE DETAILS */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('checklist')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-lg hover:from-emerald-500/30 hover:to-green-500/30 transition-all border border-emerald-500/30 shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">✅</span>
              EXECUTION CHECKLIST
            </span>
            <span className="text-xs px-2 py-1 bg-emerald-400/30 text-emerald-300 rounded-full font-medium">{checklistProgress}</span>
          </div>
          <span className="text-white/80">{expandedSections.checklist ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.checklist && (
          <div className="space-y-2 pl-4">
            {checklistItems.map((item) => (
              <label key={item.key} className="flex items-center gap-3 p-3 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-emerald-500/20">
                <input
                  type="checkbox"
                  checked={formData[item.key]}
                  onChange={() => handleChecklistToggle(item.key)}
                  className="w-5 h-5 rounded border-emerald-500/30 bg-secondary checked:bg-emerald-500"
                />
                <span className="text-sm text-white/90">{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Pre-Trade Analysis Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('preAnalysis')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg hover:from-purple-500/30 hover:to-indigo-500/30 transition-all border border-purple-500/30 shadow-md"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <span className="text-xl">🧠</span>
            PRE-TRADE ANALYSIS
          </span>
          <span className="text-white/80">{expandedSections.preAnalysis ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.preAnalysis && (
          <div className="space-y-2 pl-4">
            <Label className="text-white/80">What did you see? Plan, thesis, levels, risk...</Label>
            <textarea
              value={formData.pre_trade_analysis}
              onChange={(e) => setFormData({ ...formData, pre_trade_analysis: e.target.value })}
              className="w-full h-24 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              placeholder="Market structure, support/resistance levels, trading thesis..."
            />
          </div>
        )}
      </div>

      {/* Post-Trade Review Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('postReview')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-lg hover:from-orange-500/30 hover:to-amber-500/30 transition-all border border-orange-500/30 shadow-md"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <span className="text-xl">📈</span>
            POST-TRADE REVIEW
          </span>
          <span className="text-white/80">{expandedSections.postReview ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.postReview && (
          <div className="space-y-2 pl-4">
            <Label className="text-white/80">What happened? Execution, slippage, improvements...</Label>
            <textarea
              value={formData.post_trade_review}
              onChange={(e) => setFormData({ ...formData, post_trade_review: e.target.value })}
              className="w-full h-24 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
              placeholder="Trade execution, what went well, what to improve..."
            />
          </div>
        )}
      </div>

      {/* Psychology Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('psychology')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-lg hover:from-pink-500/30 hover:to-rose-500/30 transition-all border border-pink-500/30 shadow-md"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <span className="text-xl">💭</span>
            EMOTIONS & LESSONS
          </span>
          <span className="text-white/80">{expandedSections.psychology ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.psychology && (
          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <Label className="text-white/80">Emotions</Label>
              <textarea
                value={formData.emotions}
                onChange={(e) => setFormData({ ...formData, emotions: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                placeholder="Calm, anxious, FOMO, confident..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Lessons Learned</Label>
              <textarea
                value={formData.lessons}
                onChange={(e) => setFormData({ ...formData, lessons: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                placeholder="Key takeaways to repeat or avoid..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Tags</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="bg-secondary border-white/10"
                placeholder="breakout, trend, news (comma separated)"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/90 font-semibold">Trade Rating</Label>
                <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                  formData.rating <= 3 ? 'text-red-400 bg-red-500/20' :
                  formData.rating <= 5 ? 'text-orange-400 bg-orange-500/20' :
                  formData.rating <= 7 ? 'text-yellow-400 bg-yellow-500/20' :
                  formData.rating <= 9 ? 'text-lime-400 bg-lime-500/20' :
                  'text-green-400 bg-green-500/20'
                }`}>
                  {formData.rating}/10
                </span>
              </div>
              
              <div className="relative pt-2">
                {/* Gradient background track */}
                <div className="absolute w-full h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"></div>
                
                {/* Slider input */}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                  className="relative w-full h-3 appearance-none cursor-pointer bg-transparent"
                  style={{
                    '--thumb-color': formData.rating <= 3 ? '#f87171' :
                                    formData.rating <= 5 ? '#fb923c' :
                                    formData.rating <= 7 ? '#facc15' :
                                    formData.rating <= 9 ? '#a3e635' :
                                    '#4ade80'
                  }}
                />
                
                <style jsx>{`
                  input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--thumb-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 0 12px var(--thumb-color), 0 4px 8px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                  }
                  
                  input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                    box-shadow: 0 0 20px var(--thumb-color), 0 6px 12px rgba(0,0,0,0.4);
                  }
                  
                  input[type="range"]::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--thumb-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 0 12px var(--thumb-color), 0 4px 8px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                  }
                  
                  input[type="range"]::-moz-range-thumb:hover {
                    transform: scale(1.2);
                    box-shadow: 0 0 20px var(--thumb-color), 0 6px 12px rgba(0,0,0,0.4);
                  }
                `}</style>
              </div>
              
              {/* Number markers 1-10 */}
              <div className="flex justify-between text-xs font-mono mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: num })}
                    className={`w-7 h-7 rounded-full transition-all ${
                      formData.rating === num
                        ? num <= 3 ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                          : num <= 5 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                          : num <= 7 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                          : num <= 9 ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/50'
                          : 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                        : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screenshots Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('screenshots')}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg hover:from-cyan-500/30 hover:to-teal-500/30 transition-all border border-cyan-500/30 shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🖼️</span>
              SCREENSHOTS
            </span>
            {formData.screenshots.length > 0 && (
              <span className="text-xs px-2 py-1 bg-cyan-400/30 text-cyan-300 rounded-full font-medium">{formData.screenshots.length}</span>
            )}
          </div>
          <span className="text-white/80">{expandedSections.screenshots ? '▼' : '▶'}</span>
        </button>
        
        {expandedSections.screenshots && (
          <div className="space-y-3 pl-4">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenshotUpload}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className="block p-6 border-2 border-dashed border-cyan-500/30 rounded-lg text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-cyan-400" />
                <p className="text-sm text-white/80 font-medium">Click to upload screenshots</p>
                <p className="text-xs text-white/50 mt-1">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
            
            {screenshotPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {screenshotPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview.url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-cyan-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-card border-t border-white/10 mt-6">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-white text-black hover:bg-gray-200">
          {loading ? 'Saving...' : (trade ? 'Update Trade' : 'Add Trade')}
        </Button>
      </div>
    </form>
  );
};

export default function Journal() {
  const PAGE_SIZE = 10;
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [filters, setFilters] = useState({ status: '', instrument: '', search: '' });
  const [sortBy, setSortBy] = useState('entry_date');
  const [sortOrder, setSortOrder] = useState('desc'); // Always desc - newest first
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTradeData, setShareTradeData] = useState(null);
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT');
  const [chartMode, setChartMode] = useState('live');
  const [focusedInstrumentKey, setFocusedInstrumentKey] = useState('');
  const [chartInterval, setChartInterval] = useState('5m');
  const [candles, setCandles] = useState([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [candleSource, setCandleSource] = useState('trade');
  const [chartError, setChartError] = useState('');
  const [selectedReplayTradeId, setSelectedReplayTradeId] = useState('latest');
  const [replayCursor, setReplayCursor] = useState(null);
  const [replayIndex, setReplayIndex] = useState(null);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [liquidityInput, setLiquidityInput] = useState('');
  const [fvgLowInput, setFvgLowInput] = useState('');
  const [fvgHighInput, setFvgHighInput] = useState('');
  const [annotations, setAnnotations] = useState({ liquidity: [], fvgs: [] });
  const [userCurrency, setUserCurrency] = useState('USD');

  const chartContainerRef = useRef(null);
  const chartPanelRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const replayCursorSeriesRef = useRef(null);
  const positionSeriesRef = useRef(null);
  const positionBoxTopRef = useRef(null);
  const positionBoxBottomRef = useRef(null);
  const positionBoxLeftRef = useRef(null);
  const positionBoxRightRef = useRef(null);
  const priceLinesRef = useRef([]);
  const liveSocketRef = useRef(null);
  const livePollTimerRef = useRef(null);

  const normalizeSymbol = (value = '') => value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isValidNumber = (value) => Number.isFinite(Number(value));
  const annotationStorageKey = `journal_chart_annotations_${chartSymbol}`;
  const instrumentToChartSymbol = useCallback((instrument = '') => {
    const key = normalizeSymbol(instrument);
    if (!key) return null;
    if (key.includes('BTC')) return 'BTCUSDT';
    if (key.includes('ETH')) return 'ETHUSDT';
    if (key.includes('XAU') || key.includes('GOLD') || key.includes('PAXG')) return 'XAUUSD';
    if (key.includes('XAG') || key.includes('SILVER')) return 'XAGUSD';
    if (key.includes('EURUSD')) return 'EURUSD';
    if (key.includes('GBPUSD')) return 'GBPUSD';
    if (key.includes('USDJPY')) return 'USDJPY';
    if (key.includes('AUDUSD')) return 'AUDUSD';
    if (key.includes('NAS100') || key.includes('NASDAQ')) return 'NAS100';
    if (key.includes('US30') || key.includes('DOW')) return 'US30';
    if (key.includes('SPX500') || key.includes('SP500') || key.includes('SPX')) return 'SPX500';
    if (key.includes('BNB')) return 'BNBUSDT';
    if (key.includes('SOL')) return 'SOLUSDT';
    return null;
  }, []);

  const toUnixSeconds = useCallback((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }, []);

  const sanitizeCandles = useCallback((source = []) => {
    const normalized = source
      .map((item) => {
        const time = toUnixSeconds(item.time);
        const open = Number(item.open);
        const high = Number(item.high);
        const low = Number(item.low);
        const close = Number(item.close);
        if (!time || ![open, high, low, close].every(Number.isFinite)) {
          return null;
        }

        const normalizedHigh = Math.max(high, open, close, low);
        const normalizedLow = Math.min(low, open, close, high);
        if (normalizedHigh < normalizedLow) {
          return null;
        }

        return {
          time,
          open,
          high: normalizedHigh,
          low: normalizedLow,
          close,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    const deduped = [];
    const seen = new Set();
    normalized.forEach((candle) => {
      if (seen.has(candle.time)) {
        deduped[deduped.length - 1] = candle;
        return;
      }
      seen.add(candle.time);
      deduped.push(candle);
    });

    return deduped;
  }, [toUnixSeconds]);

  const buildFallbackCandlesFromTrades = useCallback(() => {
    const normalizedSymbol = normalizeSymbol(chartSymbol);
    const focusedKey = normalizeSymbol(focusedInstrumentKey);
    const matching = trades
      .filter((t) => {
        const instrumentKey = normalizeSymbol(t.instrument || '');
        if (focusedKey) {
          return instrumentKey === focusedKey;
        }
        const mapped = instrumentToChartSymbol(t.instrument || '');
        const direct = instrumentKey;
        return mapped === normalizedSymbol || direct === normalizedSymbol;
      })
      .filter((t) => isValidNumber(t.entry_price))
      .sort((a, b) => new Date(a.entry_date || 0) - new Date(b.entry_date || 0));

    const source = matching.length > 0 ? matching : trades.filter((t) => isValidNumber(t.entry_price));
    if (source.length === 0) return [];

    const intervalSeconds = INTERVAL_SECONDS[chartInterval] || 300;
    const smoothed = [];
    let prevClose = null;
    let prevTime = null;

    source.slice(-180).forEach((t, idx) => {
      const entry = Number(t.entry_price);
      const exit = isValidNumber(t.exit_price) ? Number(t.exit_price) : entry;
      const ts = Date.parse(t.entry_date || '');
      const candleTime = Number.isNaN(ts)
        ? Math.floor(Date.now() / 1000) - (source.length - idx) * intervalSeconds
        : Math.floor(ts / 1000);

      if (prevTime && candleTime > prevTime + intervalSeconds && Number.isFinite(prevClose)) {
        const gapSteps = Math.min(12, Math.max(0, Math.floor((candleTime - prevTime) / intervalSeconds) - 1));
        for (let step = 1; step <= gapSteps; step += 1) {
          const ratio = step / (gapSteps + 1);
          const bridgeClose = prevClose + (entry - prevClose) * ratio;
          const bridgeOpen = prevClose + (entry - prevClose) * ((step - 1) / (gapSteps + 1));
          const wick = Math.max(Math.abs(bridgeClose - bridgeOpen) * 0.3, Math.abs(bridgeClose) * 0.0005);

          smoothed.push({
            time: prevTime + step * intervalSeconds,
            open: bridgeOpen,
            high: Math.max(bridgeOpen, bridgeClose) + wick,
            low: Math.max(0, Math.min(bridgeOpen, bridgeClose) - wick),
            close: bridgeClose,
          });
        }
      }

      const open = Number.isFinite(prevClose) ? prevClose : entry;
      const close = exit;
      const wick = Math.max(Math.abs(close - open) * 0.35, Math.abs(close) * 0.0008);

      smoothed.push({
        time: candleTime,
        open,
        high: Math.max(open, close) + wick,
        low: Math.max(0, Math.min(open, close) - wick),
        close,
      });

      prevClose = close;
      prevTime = candleTime;
    });

    return smoothed.slice(-500);
  }, [chartSymbol, focusedInstrumentKey, trades, instrumentToChartSymbol, chartInterval]);

  // Filter trades by search
  const filteredTrades = trades.filter((trade) => {
    if (filters.status && trade.status !== filters.status) return false;

    if (filters.instrument) {
      const selected = normalizeSymbol(filters.instrument);
      const instrument = normalizeSymbol(trade.instrument || '');
      if (selected !== instrument) return false;
    }

    if (!filters.search) return true;

    const rawSearch = filters.search.toLowerCase().trim();
    const normalizedSearch = normalizeSymbol(filters.search);
    const tradeInstrument = (trade.instrument || '').toLowerCase();
    const normalizedInstrument = normalizeSymbol(trade.instrument || '');
    const notes = (trade.notes || '').toLowerCase();
    const position = (trade.position || '').toLowerCase();
    const status = (trade.status || '').toLowerCase();

    return (
      tradeInstrument.includes(rawSearch) ||
      normalizedInstrument.includes(normalizedSearch) ||
      notes.includes(rawSearch) ||
      position.includes(rawSearch) ||
      status.includes(rawSearch)
    );
  });

  const chartTrades = useMemo(() => {
    const focusedKey = normalizeSymbol(focusedInstrumentKey);
    return trades
      .filter((t) => {
        const instrumentKey = normalizeSymbol(t.instrument || '');
        if (focusedKey) return instrumentKey === focusedKey;
        return instrumentToChartSymbol(t.instrument || '') === chartSymbol;
      })
      .filter((t) => t.status === 'closed' || t.status === 'open')
      .sort((a, b) => {
        const byEntry = new Date(b.entry_date || 0) - new Date(a.entry_date || 0);
        if (byEntry !== 0) return byEntry;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [trades, chartSymbol, instrumentToChartSymbol, focusedInstrumentKey]);

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'pnl') {
      comparison = (a.pnl || 0) - (b.pnl || 0);
    } else if (sortBy === 'entry_date') {
      comparison = new Date(a.entry_date || 0) - new Date(b.entry_date || 0);

      // For imported rows with same trade date, keep newer imports first.
      if (comparison === 0) {
        comparison = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
    } else {
      comparison = new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedTrades = sortedTrades.slice(pageStart, pageStart + PAGE_SIZE);
  const pageChunkSize = 10;
  const pageChunkStart = Math.floor((currentPage - 1) / pageChunkSize) * pageChunkSize + 1;
  const pageChunkEnd = Math.min(totalPages, pageChunkStart + pageChunkSize - 1);
  const visiblePages = Array.from(
    { length: Math.max(0, pageChunkEnd - pageChunkStart + 1) },
    (_, idx) => pageChunkStart + idx
  );

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const response = await axios.get(`${API_URL}/mt5/accounts`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('MT5 Accounts Response (Journal):', response.data);
        if (response.data && response.data.length > 0) {
          const currency = response.data[0].currency || 'USD';
          console.log('Setting user currency to (Journal):', currency);
          setUserCurrency(currency);
        }
      } catch (error) {
        console.error('Failed to fetch user currency:', error);
      }
    };
    fetchUserCurrency();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await axios.get(`${API_URL}/trades`);
      setTrades(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trades:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCandles = async () => {
    setCandlesLoading(true);
    try {
      const requestParams = {
        symbol: chartSymbol,
        interval: chartInterval,
        limit: 500,
      };

      // In replay mode, fetch a wider historical window around the selected trade.
      if (chartMode === 'replay' && selectedReplayTradeId !== 'latest') {
        const selectedTrade = chartTrades.find((t) => String(t.id) === String(selectedReplayTradeId));
        const entryMs = Date.parse(selectedTrade?.entry_date || '');
        if (Number.isFinite(entryMs)) {
          const step = INTERVAL_SECONDS[chartInterval] || 300;
          const beforeBars = 320;
          const afterBars = 220;
          requestParams.limit = 900;
          requestParams.from = Math.floor(entryMs / 1000) - beforeBars * step;
          requestParams.to = Math.floor(entryMs / 1000) + afterBars * step;
        }
      }

      const response = await axios.get(`${API_URL}/market/candles`, { params: requestParams });
      let series = response.data.map((c) => ({
        time: c.time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }));

      series = sanitizeCandles(series);
      if (!Array.isArray(series) || series.length === 0) {
        series = sanitizeCandles(buildFallbackCandlesFromTrades());
        setCandleSource('trade');
      } else {
        setCandleSource('live');
      }

      setCandles(series);
    } catch (error) {
      const fallbackSeries = sanitizeCandles(buildFallbackCandlesFromTrades());
      const backendDetail = error?.response?.data?.detail;
      if (fallbackSeries.length > 0) {
        setCandles(fallbackSeries);
        setCandleSource('trade');
        toast.warning(backendDetail ? `Live market candles unavailable (${backendDetail}). Showing chart from journal trade history.` : 'Live market candles unavailable. Showing chart from journal trade history.');
      } else {
        toast.error(backendDetail || 'Failed to load chart data for selected symbol/timeframe');
        setCandles([]);
        setCandleSource('none');
      }
    } finally {
      setCandlesLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartMode, chartSymbol, chartInterval, focusedInstrumentKey, selectedReplayTradeId, chartTrades]);

  const upsertLiveCandle = useCallback((incoming, sourceLabel = 'live') => {
    if (chartMode !== 'live') return;

    const intervalSeconds = INTERVAL_SECONDS[chartInterval] || 300;
    const timeSecRaw = toUnixSeconds(incoming?.time);
    const open = Number(incoming?.open);
    const high = Number(incoming?.high);
    const low = Number(incoming?.low);
    const close = Number(incoming?.close);

    if (!timeSecRaw || ![open, high, low, close].every(Number.isFinite)) return;

    const bucketTime = Math.floor(timeSecRaw / intervalSeconds) * intervalSeconds;

    setCandles((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return [{
          time: bucketTime,
          open,
          high: Math.max(high, open, close),
          low: Math.min(low, open, close),
          close,
        }];
      }

      const next = [...prev];
      const last = next[next.length - 1];
      if (!last) return prev;

      if (bucketTime === last.time) {
        next[next.length - 1] = {
          time: bucketTime,
          open: Number.isFinite(last.open) ? last.open : open,
          high: Math.max(last.high, high, close),
          low: Math.min(last.low, low, close),
          close,
        };
        return next;
      }

      if (bucketTime > last.time) {
        const nextOpen = Number.isFinite(open) ? open : last.close;
        next.push({
          time: bucketTime,
          open: nextOpen,
          high: Math.max(high, nextOpen, close),
          low: Math.min(low, nextOpen, close),
          close,
        });
        return next.slice(-1000);
      }

      return prev;
    });

    setCandleSource(sourceLabel);
  }, [chartInterval, chartMode, toUnixSeconds]);

  useEffect(() => {
    const stopPolling = () => {
      if (livePollTimerRef.current) {
        clearInterval(livePollTimerRef.current);
        livePollTimerRef.current = null;
      }
    };

    const stopSocket = () => {
      if (liveSocketRef.current) {
        try {
          liveSocketRef.current.close();
        } catch {
          // Ignore close errors for stale sockets.
        }
        liveSocketRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      livePollTimerRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/market/candles`, {
            params: {
              symbol: chartSymbol,
              interval: chartInterval,
              limit: 2,
            },
          });

          const rawLatest = Array.isArray(response.data) ? response.data[response.data.length - 1] : null;
          if (!rawLatest) return;

          upsertLiveCandle({
            time: rawLatest.time,
            open: rawLatest.open,
            high: rawLatest.high,
            low: rawLatest.low,
            close: rawLatest.close,
          }, 'live');
        } catch (error) {
          // Keep chart usable even if a polling tick fails.
          console.debug('Live candle poll failed:', error?.response?.data?.detail || error?.message || 'unknown');
        }
      }, 5000);
    };

    const canUseLiveFeed = chartMode === 'live' && !isReplayPlaying && !candlesLoading && candleSource !== 'none';

    stopPolling();
    stopSocket();

    if (!canUseLiveFeed) {
      return () => {
        stopPolling();
        stopSocket();
      };
    }

    if (LIVE_STREAM_WS_URL) {
      const ws = new WebSocket(
        `${LIVE_STREAM_WS_URL}/api/market/live-candles/ws?symbol=${encodeURIComponent(chartSymbol)}&interval=${encodeURIComponent(chartInterval)}`
      );
      liveSocketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const candle = payload?.type === 'candle' ? payload.data : payload;
          if (!candle) return;

          upsertLiveCandle(
            {
              time: candle.time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            },
            'stream'
          );
        } catch (error) {
          console.debug('Live stream parse failed:', error?.message || 'invalid payload');
        }
      };

      ws.onerror = () => {
        stopSocket();
        startPolling();
      };

      ws.onclose = () => {
        if (!livePollTimerRef.current) {
          startPolling();
        }
      };
    } else {
      startPolling();
    }

    return () => {
      stopPolling();
      stopSocket();
    };
  }, [
    chartMode,
    chartSymbol,
    chartInterval,
    isReplayPlaying,
    candlesLoading,
    candleSource,
    upsertLiveCandle,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(annotationStorageKey);
      if (!raw) {
        setAnnotations({ liquidity: [], fvgs: [] });
        return;
      }
      const parsed = JSON.parse(raw);
      setAnnotations({
        liquidity: Array.isArray(parsed.liquidity) ? parsed.liquidity : [],
        fvgs: Array.isArray(parsed.fvgs) ? parsed.fvgs : [],
      });
    } catch {
      setAnnotations({ liquidity: [], fvgs: [] });
    }
  }, [annotationStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(annotationStorageKey, JSON.stringify(annotations));
    } catch {
      // Ignore storage failures and keep chart usable.
    }
  }, [annotationStorageKey, annotations]);

  useEffect(() => {
    if (chartMode === 'live') {
      setSelectedReplayTradeId('latest');
      setIsReplayPlaying(false);
      setReplayIndex(null);
      return;
    }

    if (chartMode === 'replay' && selectedReplayTradeId === 'latest' && chartTrades.length > 0) {
      setSelectedReplayTradeId(String(chartTrades[0].id));
    }
  }, [chartMode, selectedReplayTradeId, chartTrades]);

  useEffect(() => {
    if (!chartContainerRef.current) return () => {};
    let chart;
    try {
      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#0f172a' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 550,
        rightPriceScale: {
          borderVisible: false,
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#27272A',
          timeVisible: true,
          rightBarStaysOnScroll: true,
          barSpacing: 8,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#10B981',
            style: LineStyle.Dashed,
          },
          horzLine: {
            color: '#10B981',
            style: LineStyle.Dashed,
          },
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      const positionSeries = chart.addLineSeries({
        color: '#22c55e',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const replayCursorSeries = chart.addLineSeries({
        color: 'rgba(250, 204, 21, 0.45)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const positionBoxTop = chart.addLineSeries({
        color: 'rgba(34, 197, 94, 0.65)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const positionBoxBottom = chart.addLineSeries({
        color: 'rgba(34, 197, 94, 0.65)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const positionBoxLeft = chart.addLineSeries({
        color: 'rgba(34, 197, 94, 0.65)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const positionBoxRight = chart.addLineSeries({
        color: 'rgba(34, 197, 94, 0.65)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      replayCursorSeriesRef.current = replayCursorSeries;
      positionSeriesRef.current = positionSeries;
      positionBoxTopRef.current = positionBoxTop;
      positionBoxBottomRef.current = positionBoxBottom;
      positionBoxLeftRef.current = positionBoxLeft;
      positionBoxRightRef.current = positionBoxRight;
      setChartError('');
    } catch (err) {
      console.error('Chart init failed:', err);
      setChartError('Chart failed to initialize. Please refresh the page.');
      return () => {};
    }

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: Math.max(500, Math.floor(window.innerHeight * 0.55)),
      });
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      replayCursorSeriesRef.current = null;
      positionSeriesRef.current = null;
      positionBoxTopRef.current = null;
      positionBoxBottomRef.current = null;
      positionBoxLeftRef.current = null;
      positionBoxRightRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  const replayTrade = useMemo(() => {
    if (chartTrades.length === 0) return null;
    if (selectedReplayTradeId === 'latest') return chartTrades[0];
    return chartTrades.find((t) => String(t.id) === String(selectedReplayTradeId)) || chartTrades[0];
  }, [chartTrades, selectedReplayTradeId]);

  const focusedCandles = useMemo(() => {
    if (!candles.length) return [];
    if (chartMode === 'live') return candles;
    if (!replayTrade?.entry_date) return candles;

    const entryTimeSec = Math.floor(new Date(replayTrade.entry_date).getTime() / 1000);
    if (!Number.isFinite(entryTimeSec)) return candles;

    const entryIndex = candles.findIndex((c) => c.time >= entryTimeSec);
    if (entryIndex < 0) {
      // Latest live candles may not include old trades at lower intervals (e.g., 5m, last 500 bars).
      // Fall back to trade-derived candles so replay stays anchored to the selected trade timeline.
      const tradeAligned = sanitizeCandles(buildFallbackCandlesFromTrades());
      if (!tradeAligned.length) return candles;

      const tradeEntryIndex = tradeAligned.findIndex((c) => c.time >= entryTimeSec);
      if (tradeEntryIndex < 0) return tradeAligned;

      const startIndex = Math.max(0, tradeEntryIndex - 150);
      const endIndex = Math.min(tradeAligned.length, tradeEntryIndex + 100);
      return tradeAligned.slice(startIndex, endIndex);
    }

    const startIndex = Math.max(0, entryIndex - 150);
    const endIndex = Math.min(candles.length, entryIndex + 100);
    return candles.slice(startIndex, endIndex);
  }, [candles, replayTrade, sanitizeCandles, buildFallbackCandlesFromTrades, chartMode]);

  const displayedCandles = useMemo(() => {
    if (!focusedCandles.length) return [];
    if (chartMode === 'live') return focusedCandles;
    if (replayIndex === null) return focusedCandles;
    return focusedCandles.slice(0, Math.max(1, Math.min(replayIndex, focusedCandles.length)));
  }, [focusedCandles, replayIndex, chartMode]);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;
    try {
      candleSeriesRef.current.setData(displayedCandles);
      if (displayedCandles.length > 0) {
        chartRef.current.timeScale().fitContent();
      }
      chartRef.current.applyOptions({ rightPriceScale: { autoScale: true } });
      setChartError('');
    } catch (err) {
      console.error('Chart data update failed:', err);
      setChartError('Failed to render candle data.');
    }
  }, [displayedCandles]);

  useEffect(() => {
    if (chartMode === 'live') {
      setReplayIndex(null);
      setIsReplayPlaying(false);
      if (candles.length > 0) {
        setReplayCursor(candles[candles.length - 1].time);
      }
      return;
    }

    if (focusedCandles.length === 0) {
      setReplayIndex(null);
      setReplayCursor(null);
      setIsReplayPlaying(false);
      return;
    }

    setReplayIndex(focusedCandles.length);
    setReplayCursor(focusedCandles[focusedCandles.length - 1].time);
    setIsReplayPlaying(false);
  }, [focusedCandles, chartMode, candles]);

  useEffect(() => {
    if (chartMode !== 'replay' || !isReplayPlaying || focusedCandles.length === 0) return undefined;
    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        const current = prev === null ? Math.min(50, focusedCandles.length) : prev;
        if (current >= focusedCandles.length) {
          setIsReplayPlaying(false);
          return focusedCandles.length;
        }
        return current + 1;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [isReplayPlaying, focusedCandles, chartMode]);

  useEffect(() => {
    const visibleLast = displayedCandles[displayedCandles.length - 1];
    if (!visibleLast) return;
    setReplayCursor(visibleLast.time);
  }, [displayedCandles]);

  useEffect(() => {
    if (!replayCursorSeriesRef.current) return;
    // Keep replay pointer subtle via marker only to avoid noisy full-height lines.
    replayCursorSeriesRef.current.setData([]);
  }, [replayCursor, displayedCandles]);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    try {
      // Clear previous trade overlays.
      priceLinesRef.current.forEach((line) => {
        try {
          candleSeriesRef.current.removePriceLine(line);
        } catch {
          // Ignore stale lines from previous rerenders.
        }
      });
      priceLinesRef.current = [];

      const toUnix = (value) => {
        const ts = Date.parse(value || '');
        if (Number.isNaN(ts)) return null;
        return Math.floor(ts / 1000);
      };

      const markers = [];
      if (positionSeriesRef.current) {
        positionSeriesRef.current.setData([]);
      }
      if (positionBoxTopRef.current) positionBoxTopRef.current.setData([]);
      if (positionBoxBottomRef.current) positionBoxBottomRef.current.setData([]);
      if (positionBoxLeftRef.current) positionBoxLeftRef.current.setData([]);
      if (positionBoxRightRef.current) positionBoxRightRef.current.setData([]);

      const trade = chartMode === 'replay' ? replayTrade : null;
      if (trade) {
        const entryTime = toUnix(trade.entry_date);
        const exitTime = toUnix(trade.exit_date);
        const entryPrice = Number(trade.entry_price);
        const exitPrice = Number(trade.exit_price);

        if (isValidNumber(entryPrice) && entryPrice > 0) {
          const entryLine = candleSeriesRef.current.createPriceLine({
            price: entryPrice,
            color: '#3B82F6',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Entry',
          });
          priceLinesRef.current.push(entryLine);
        }

        if (entryTime && isValidNumber(entryPrice) && entryPrice > 0) {
          markers.push({
            time: entryTime,
            position: 'belowBar',
            color: trade.position === 'sell' || trade.position === 'short' ? '#ef4444' : '#22c55e',
            shape: 'arrowUp',
            text: '',
          });
        }

        if (isValidNumber(exitPrice) && exitPrice > 0) {
          const exitLine = candleSeriesRef.current.createPriceLine({
            price: exitPrice,
            color: '#F59E0B',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'Exit',
          });
          priceLinesRef.current.push(exitLine);

          if (exitTime) {
            markers.push({
              time: exitTime,
              position: 'aboveBar',
              color: '#F59E0B',
              shape: 'arrowDown',
                text: '',
            });
          }
        }

        if (isValidNumber(trade.stop_loss) && Number(trade.stop_loss) > 0) {
          const slLine = candleSeriesRef.current.createPriceLine({
            price: Number(trade.stop_loss),
            color: '#EF4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'SL',
          });
          priceLinesRef.current.push(slLine);
        }

        if (isValidNumber(trade.take_profit) && Number(trade.take_profit) > 0) {
          const tpLine = candleSeriesRef.current.createPriceLine({
            price: Number(trade.take_profit),
            color: '#10B981',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'TP',
          });
          priceLinesRef.current.push(tpLine);
        }

        if (positionSeriesRef.current && entryTime && exitTime && isValidNumber(entryPrice) && isValidNumber(exitPrice)) {
          const pnlUp = (trade.pnl || 0) >= 0;
          const boxColor = pnlUp ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          const boxHigh = Math.max(entryPrice, exitPrice);
          const boxLow = Math.min(entryPrice, exitPrice);

          positionSeriesRef.current.applyOptions({
            color: pnlUp ? '#22c55e' : '#ef4444',
          });
          positionSeriesRef.current.setData([
            { time: entryTime, value: entryPrice },
            { time: exitTime, value: exitPrice },
          ]);

          positionBoxTopRef.current?.applyOptions({ color: boxColor });
          positionBoxBottomRef.current?.applyOptions({ color: boxColor });
          positionBoxLeftRef.current?.applyOptions({ color: boxColor });
          positionBoxRightRef.current?.applyOptions({ color: boxColor });

          positionBoxTopRef.current?.setData([
            { time: entryTime, value: boxHigh },
            { time: exitTime, value: boxHigh },
          ]);
          positionBoxBottomRef.current?.setData([
            { time: entryTime, value: boxLow },
            { time: exitTime, value: boxLow },
          ]);
          positionBoxLeftRef.current?.setData([
            { time: entryTime, value: boxLow },
            { time: entryTime, value: boxHigh },
          ]);
          positionBoxRightRef.current?.setData([
            { time: exitTime, value: boxLow },
            { time: exitTime, value: boxHigh },
          ]);
        }
      }

      annotations.liquidity.forEach((price, idx) => {
        if (!isValidNumber(price)) return;
        const line = candleSeriesRef.current.createPriceLine({
          price: Number(price),
          color: '#A855F7',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `LQ ${idx + 1}`,
        });
        priceLinesRef.current.push(line);
      });

      annotations.fvgs.forEach((zone, idx) => {
        if (!isValidNumber(zone.low) || !isValidNumber(zone.high)) return;
        const low = candleSeriesRef.current.createPriceLine({
          price: Number(zone.low),
          color: '#F97316',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `FVG${idx + 1} Low`,
        });
        const high = candleSeriesRef.current.createPriceLine({
          price: Number(zone.high),
          color: '#F97316',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `FVG${idx + 1} High`,
        });
        priceLinesRef.current.push(low, high);
      });

      if (typeof candleSeriesRef.current.setMarkers === 'function') {
        if (chartMode === 'replay' && replayCursor) {
          markers.push({
            time: replayCursor,
            position: 'inBar',
            color: '#facc15',
            shape: 'circle',
            text: '',
          });
        }
        candleSeriesRef.current.setMarkers(markers.sort((a, b) => a.time - b.time));
      }
      setChartError('');
    } catch (err) {
      console.error('Chart overlays failed:', err);
      setChartError('Chart overlays failed to render.');
    }
  }, [replayTrade, annotations, replayCursor, chartMode]);

  useEffect(() => {
    if (chartMode !== 'replay') return;
    if (!replayTrade) {
      setSelectedReplayTradeId(chartTrades[0]?.id ? String(chartTrades[0].id) : 'latest');
      return;
    }
    if (selectedReplayTradeId !== 'latest' && !chartTrades.some((t) => String(t.id) === String(selectedReplayTradeId))) {
      setSelectedReplayTradeId(chartTrades[0]?.id ? String(chartTrades[0].id) : 'latest');
    }
  }, [replayTrade, selectedReplayTradeId, chartTrades, chartMode]);

  const setReplayRange = useCallback((cursorTime, focusPrice = null) => {
    if (!chartRef.current || !cursorTime) return;
    const candleSeconds = INTERVAL_SECONDS[chartInterval] || 300;
    chartRef.current.timeScale().setVisibleRange({
      from: cursorTime - 150 * candleSeconds,
      to: cursorTime + 100 * candleSeconds,
    });

    chartRef.current.applyOptions({
      rightPriceScale: {
        autoScale: true,
        mode: 0,
      },
    });

    if (isValidNumber(focusPrice) && Number(focusPrice) > 0) {
      try {
        chartRef.current.priceScale('right').setVisibleRange({
          min: Number(focusPrice) * 0.98,
          max: Number(focusPrice) * 1.02,
        });
      } catch {
        // Keep autoscale when explicit range is unavailable.
      }
    }
  }, [chartInterval]);

  useEffect(() => {
    if (chartMode !== 'replay') return;
    if (!replayTrade || !focusedCandles.length) return;
    const entryTimeSec = Math.floor(new Date(replayTrade.entry_date || '').getTime() / 1000);
    const cursor = Number.isFinite(entryTimeSec)
      ? (focusedCandles.find((c) => c.time >= entryTimeSec)?.time || focusedCandles[0].time)
      : focusedCandles[0].time;

    setReplayCursor(cursor);
    setReplayRange(cursor, replayTrade.entry_price || null);
    setIsReplayPlaying(false);
  }, [replayTrade, focusedCandles, setReplayRange, chartMode]);

  const replayLatestTrade = () => {
    if (!focusedCandles.length) return;

    let replayStart = Math.min(50, focusedCandles.length);
    if (replayTrade?.entry_date) {
      const entryTimeSec = Math.floor(new Date(replayTrade.entry_date).getTime() / 1000);
      if (Number.isFinite(entryTimeSec)) {
        const nearestIndex = focusedCandles.findIndex((c) => c.time >= entryTimeSec);
        if (nearestIndex >= 0) {
          replayStart = Math.max(1, nearestIndex + 1);
        }
      }
    }

    setReplayIndex(replayStart);
    const replayTime = focusedCandles[Math.max(0, replayStart - 1)]?.time || null;
    setReplayCursor(replayTime);
    setReplayRange(replayTime, replayTrade?.entry_price || null);
    setIsReplayPlaying(true);
  };

  const replayFromStart = () => {
    if (!focusedCandles.length) return;
    const startIndex = Math.min(50, focusedCandles.length);
    const startTime = focusedCandles[Math.max(0, startIndex - 1)]?.time || null;
    setIsReplayPlaying(false);
    setReplayIndex(startIndex);
    setReplayCursor(startTime);
    setReplayRange(startTime, replayTrade?.entry_price || null);
  };

  const stepReplay = (direction, stepSize = 1) => {
    if (!focusedCandles.length) return;
    setIsReplayPlaying(false);
    setReplayIndex((prev) => {
      const current = prev === null ? focusedCandles.length : prev;
      const next = Math.max(1, Math.min(focusedCandles.length, current + direction * stepSize));
      const nextTime = focusedCandles[next - 1]?.time || null;
      setReplayCursor(nextTime);
      setReplayRange(nextTime, replayTrade?.entry_price || null);
      return next;
    });
  };

  const toggleReplay = () => {
    if (!focusedCandles.length) return;
    if (replayIndex === null || replayIndex >= focusedCandles.length) {
      replayFromStart();
    }
    setIsReplayPlaying((prev) => !prev);
  };

  const addLiquidityLevel = () => {
    const price = Number(liquidityInput);
    if (!price || Number.isNaN(price)) {
      toast.error('Enter a valid liquidity price');
      return;
    }
    setAnnotations((prev) => ({ ...prev, liquidity: [...prev.liquidity, price] }));
    setLiquidityInput('');
  };

  const addFvgZone = () => {
    const low = Number(fvgLowInput);
    const high = Number(fvgHighInput);
    if (!low || !high || Number.isNaN(low) || Number.isNaN(high) || low >= high) {
      toast.error('Enter valid FVG low/high with low < high');
      return;
    }
    setAnnotations((prev) => ({ ...prev, fvgs: [...prev.fvgs, { low, high }] }));
    setFvgLowInput('');
    setFvgHighInput('');
  };

  const clearAnnotations = () => {
    setAnnotations({ liquidity: [], fvgs: [] });
  };

  const loadTradeToChart = (trade, scrollToChart = true) => {
    if (!trade) return;

    const mappedSymbol = instrumentToChartSymbol(trade.instrument || '') || normalizeSymbol(trade.instrument || '');
    setFocusedInstrumentKey(normalizeSymbol(trade.instrument || ''));
    if (mappedSymbol) {
      setChartSymbol(mappedSymbol);
    }
    setSelectedReplayTradeId(String(trade.id));

    if (scrollToChart && chartPanelRef.current) {
      chartPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const tradeSummary = useMemo(() => {
    if (!replayTrade) return null;

    const entry = Number(replayTrade.entry_price);
    const exit = Number(replayTrade.exit_price);
    const sl = Number(replayTrade.stop_loss);
    const tp = Number(replayTrade.take_profit);
    const isShort = replayTrade.position === 'sell' || replayTrade.position === 'short';
    const risk = isValidNumber(sl) && isValidNumber(entry) ? Math.abs(entry - sl) : null;
    const reward = isValidNumber(tp) && isValidNumber(entry) ? Math.abs(tp - entry) : null;

    const entryTs = Date.parse(replayTrade.entry_date || '');
    const exitTs = Date.parse(replayTrade.exit_date || '');
    let durationText = '-';
    if (Number.isFinite(entryTs) && Number.isFinite(exitTs) && exitTs > entryTs) {
      const mins = Math.floor((exitTs - entryTs) / 60000);
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      durationText = `${hrs}h ${rem}m`;
    }

    return {
      symbol: replayTrade.instrument || chartSymbol,
      direction: isShort ? 'SELL' : 'BUY',
      entry: isValidNumber(entry) ? entry : null,
      exit: isValidNumber(exit) ? exit : null,
      pnl: isValidNumber(replayTrade.pnl) ? Number(replayTrade.pnl) : null,
      rr: risk && reward && risk > 0 ? `1:${(reward / risk).toFixed(2)}` : '-',
      duration: durationText,
      trend: replayTrade.pnl >= 0 ? 'Execution aligned with bias' : 'Bias/execution mismatch',
      liquidity: annotations.liquidity.length > 0 ? 'Tagged' : 'Not tagged',
      model: annotations.fvgs.length > 0 ? 'FVG Context' : 'No model tag',
      notes: replayTrade.notes || 'No notes added yet.',
    };
  }, [replayTrade, annotations, chartSymbol]);

  const handleAddTrade = async (data) => {
    await axios.post(`${API_URL}/trades`, data);
    toast.success('Trade added successfully');
    fetchTrades();
  };

  const handleUpdateTrade = async (data) => {
    const response = await axios.put(`${API_URL}/trades/${editingTrade.id}`, data);
    toast.success('Trade updated successfully');
    
    // Update trade in-place to maintain position
    setTrades(prevTrades => 
      prevTrades.map(t => t.id === editingTrade.id ? response.data : t)
    );
  };

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    
    try {
      await axios.delete(`${API_URL}/trades/${tradeId}`);
      toast.success('Trade deleted successfully');
      fetchTrades();
    } catch (error) {
      toast.error('Failed to delete trade');
    }
  };

  const openEditDialog = (trade) => {
    setEditingTrade(trade);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTrade(null);
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/trades/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let finalResult = response.data;
      let latestTrades = await fetchTrades();

      if (
        finalResult?.imported_count === 0 &&
        finalResult?.skipped_count > 0 &&
        latestTrades.length === 0
      ) {
        const retryForm = new FormData();
        retryForm.append('file', file);
        const retryResponse = await axios.post(`${API_URL}/trades/import-csv?force=true`, retryForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalResult = retryResponse.data;
        latestTrades = await fetchTrades();
      }

      setImportResult(finalResult);
      const hasActiveFilters = Boolean(filters.status || filters.instrument || filters.search);
      if (latestTrades.length > 0 && hasActiveFilters) {
        setFilters({ status: '', instrument: '', search: '' });
        toast.info('Filters were cleared so all imported trades are visible.');
      }
      
      if (finalResult.imported_count > 0) {
        toast.success(`Successfully imported ${finalResult.imported_count} trades!`);
      } else if (finalResult.skipped_count > 0) {
        if (Array.isArray(finalResult.errors) && finalResult.errors.length > 0) {
          toast.warning('No new trades imported due to row errors. Check the import details.');
        } else {
          toast.info(latestTrades.length > 0
            ? 'No new trades imported because this file already exists in your journal.'
            : 'No new trades imported. This file was already imported (duplicates skipped).');
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to import CSV';
      setImportResult({ success: false, message: errorMsg, errors: [errorMsg] });
      toast.error(errorMsg);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteAllTrades = async () => {
    setDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/trades`);
      toast.success(response.data.message);
      setDeleteAllDialogOpen(false);
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete trades');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportTrades = async (format) => {
    try {
      const endpoint = format === 'xlsx' ? 'xlsx' : 'csv';
      const response = await axios.get(`${API_URL}/export/trades/${endpoint}`, {
        responseType: 'blob'
      });

      const contentDisposition = response.headers?.['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
      const fallback = `trades_export.${endpoint === 'xlsx' ? 'xlsx' : 'csv'}`;
      const filename = filenameMatch
        ? filenameMatch[1].replace(/['\"]/g, '').trim()
        : fallback;

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported ${endpoint.toUpperCase()} successfully`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to export trades');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.instrument, filters.search, sortBy, sortOrder]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Calculate summary
  const tradeCurrency = filteredTrades.find(t => t.currency)?.currency || 'USD';
  const summary = {
    totalPnl: filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    winCount: filteredTrades.filter(t => (t.pnl || 0) > 0).length,
    lossCount: filteredTrades.filter(t => (t.pnl || 0) < 0).length,
    openCount: filteredTrades.filter(t => t.status === 'open').length
  };

  return (
    <div className="space-y-6" data-testid="journal-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Trade Journal</h1>
          <p className="text-muted-foreground">Track and manage all your trades</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 w-40 md:w-56 bg-secondary border-white/10"
            />
          </div>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="filter-btn">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
                {(filters.status || filters.instrument) && (
                  <span className="w-2 h-2 bg-accent rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instrument</Label>
                  <Select value={filters.instrument || "all"} onValueChange={(v) => setFilters({ ...filters, instrument: v === "all" ? "" : v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {INSTRUMENTS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(filters.status || filters.instrument) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ status: '', instrument: '', search: filters.search })}
                    className="w-full text-xs"
                  >
                    <X className="w-3 h-3 mr-1" /> Clear filters
                  </Button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Trade Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingTrade(null)}
                className="bg-white text-black hover:bg-gray-200 gap-2"
                data-testid="add-trade-btn"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Trade</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 w-[95vw] max-w-7xl h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">{editingTrade ? 'Edit Trade' : 'Add New Trade'}</DialogTitle>
              </DialogHeader>
              <TradeForm
                trade={editingTrade}
                onSubmit={editingTrade ? handleUpdateTrade : handleAddTrade}
                onClose={closeDialog}
                currency={userCurrency}
              />
            </DialogContent>
          </Dialog>

          {/* Import Button */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2"
                data-testid="import-btn"
                onClick={() => setImportResult(null)}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  Import Trades from CSV
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Upload a CSV file from your broker to bulk import your trading history.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-white/10">
                  <h4 className="text-sm font-medium mb-2">Supported columns:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <code>symbol</code> - Trading instrument (e.g., XAUUSDm)</li>
                    <li>• <code>type</code> - buy/sell</li>
                    <li>• <code>lots</code> - Position size</li>
                    <li>• <code>opening_price</code>, <code>closing_price</code></li>
                    <li>• <code>opening_time_utc</code>, <code>closing_time_utc</code></li>
                    <li>• <code>profit_usd</code> - P&L (optional)</li>
                    <li>• <code>ticket</code> - Trade ID (prevents duplicates)</li>
                  </ul>
                </div>

                {/* File upload area */}
                <label 
                  htmlFor="csv-upload"
                  className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer
                    ${importing 
                      ? 'border-accent/50 bg-accent/10' 
                      : 'border-white/10 hover:border-accent/50 hover:bg-secondary/30'}`}
                >
                  {importing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <span className="text-sm">Importing...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">Click to select CSV file</span>
                      <span className="text-xs text-muted-foreground">or drag and drop</span>
                    </>
                  )}
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVImport}
                    disabled={importing}
                    data-testid="csv-file-input"
                  />
                </label>

                {/* Import result */}
                {importResult && (
                  <div className={`p-4 rounded-lg ${importResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <div className="flex items-start gap-2">
                      {importResult.success ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{importResult.message}</p>
                        {importResult.imported_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {importResult.imported_count} imported, {importResult.skipped_count} skipped
                          </p>
                        )}
                        {importResult.errors?.length > 0 && (
                          <div className="mt-2 text-xs text-red-400 max-h-24 overflow-y-auto">
                            {importResult.errors.slice(0, 5).map((err, i) => (
                              <div key={i}>{err}</div>
                            ))}
                            {importResult.errors.length > 5 && (
                              <div>...and {importResult.errors.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setImportDialogOpen(false)} 
                    className="flex-1"
                    data-testid="import-dialog-close"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="export-btn">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportTrades('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTrades('xlsx')}>
                Export as Excel (XLSX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete All Button */}
          {trades.length > 0 && (
            <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 border-red-500/30"
                  data-testid="delete-all-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:inline">Delete All</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    Delete All Trades
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm">
                      You are about to delete <strong className="text-red-500">{trades.length} trades</strong> from your journal.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This will permanently remove all your trading history. Make sure to export your data first if you need a backup.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setDeleteAllDialogOpen(false)} 
                      className="flex-1"
                      disabled={deleting}
                      data-testid="delete-all-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDeleteAllTrades}
                      disabled={deleting}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      data-testid="delete-all-confirm"
                    >
                      {deleting ? 'Deleting...' : 'Delete All Trades'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 p-4 glass-card">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Total P&L:</span>
          <span className={`font-mono font-bold ${summary.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(summary.totalPnl, tradeCurrency)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Wins:</span>
          <span className="font-mono font-bold text-emerald-500">{summary.winCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Losses:</span>
          <span className="font-mono font-bold text-red-500">{summary.lossCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Open:</span>
          <span className="font-mono font-bold text-blue-400">{summary.openCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Total:</span>
          <span className="font-mono font-bold">{filteredTrades.length}</span>
        </div>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : sortedTrades.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-heading font-bold mb-2">No trades yet</h3>
          <p className="text-muted-foreground mb-4">Start tracking your trades by adding your first entry</p>
          <Button
            onClick={() => { setEditingTrade(null); setDialogOpen(true); }}
            className="bg-white text-black hover:bg-gray-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Your First Trade
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {paginatedTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="glass-card-hover p-4"
                data-testid={`trade-item-${trade.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Instrument & Position */}
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getInstrumentColor(trade.instrument)}20` }}
                    >
                      {trade.position === 'buy' || trade.position === 'long' ? (
                        <TrendingUp className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{trade.instrument}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.position === 'buy' || trade.position === 'long' 
                            ? 'bg-emerald-500/20 text-emerald-500' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.position.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-muted-foreground'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(trade.entry_date)}
                        {trade.exit_date && ` → ${formatDate(trade.exit_date)}`}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-4 md:gap-6 font-mono text-sm flex-wrap">
                    <div>
                      <span className="text-muted-foreground text-xs block">Entry</span>
                      <span>{formatCurrency(trade.entry_price, trade.currency || tradeCurrency)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Exit</span>
                      <span>{trade.exit_price ? formatCurrency(trade.exit_price, trade.currency || tradeCurrency) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Lots</span>
                      <span>{trade.quantity}</span>
                    </div>
                    {trade.pnl !== null && (
                      <div>
                        <span className="text-muted-foreground text-xs block">P&L</span>
                        <span className={`font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(trade.pnl, trade.currency || tradeCurrency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareTradeData(trade);
                        setShareDialogOpen(true);
                      }}
                      className="h-8 w-8"
                      data-testid={`share-trade-${trade.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(trade);
                      }}
                      className="h-8 w-8"
                      data-testid={`edit-trade-${trade.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrade(trade.id);
                      }}
                      className="h-8 w-8 text-red-500 hover:text-red-400"
                      data-testid={`delete-trade-${trade.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {trade.notes && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-sm text-muted-foreground">{trade.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {sortedTrades.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, sortedTrades.length)} of {sortedTrades.length} trades
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, pageChunkStart - pageChunkSize))}
                disabled={pageChunkStart === 1}
              >
                Prev
              </Button>

              {visiblePages.map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'bg-white text-black hover:bg-gray-200' : ''}
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, pageChunkStart + pageChunkSize))}
                disabled={pageChunkEnd === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-24 right-4 md:hidden z-40">
        <Button
          onClick={() => { setEditingTrade(null); setDialogOpen(true); }}
          className="w-14 h-14 rounded-full bg-accent text-black shadow-lg shadow-accent/30"
          data-testid="mobile-add-trade-btn"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Share Trade Dialog */}
      <ShareTradeDialog
        trade={shareTradeData}
        isOpen={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setShareTradeData(null);
        }}
        currency={userCurrency}
      />
    </div>
  );
}
