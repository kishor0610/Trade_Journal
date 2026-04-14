import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '../components/ui/switch';
// TTS audio playback hook
function useInsightTTS(insightText, enabled, playKey) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (!enabled || !insightText) return;
    let audio;
    let revoked = false;
    const fetchAudio = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/insights/tts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: insightText,
            voice_id: 'Eve',
            output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 128000 },
            language: 'en',
          })
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        audio = new Audio(url);
        audioRef.current = audio;
        audio.play();
        audio.onended = () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        // ignore
      }
    };
    fetchAudio();
    return () => {
      revoked = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [insightText, enabled, playKey]);
  return audioRef;
}
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { Sparkles, Send, TrendingUp, TrendingDown, Activity, Target, Loader2, BarChart3, ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle, Zap, PieChart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Horizontal bar chart for instruments
const InstrumentChart = ({ instruments, currency = 'USD' }) => {
  if (!instruments?.length) return null;
  const maxPnl = Math.max(...instruments.map(i => Math.abs(i.pnl)), 1);
  const top = instruments.slice(0, 8);
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="glass-card p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-violet-400" />
        <h3 className="font-heading font-bold text-white">Instrument Performance</h3>
      </div>
      <div className="space-y-3">
        {top.map((inst, i) => {
          const pct = (Math.abs(inst.pnl) / maxPnl) * 100;
          const isPositive = inst.pnl >= 0;
          return (
            <motion.div key={inst.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">{inst.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{inst.wins}/{inst.trades} wins · {inst.winRate}%</span>
                  <span className={`text-sm font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(inst.pnl, currency)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 3)}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                  className={`h-full rounded-full ${isPositive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Direction split (Long vs Short) donut-style visual
const DirectionChart = ({ direction, currency = 'USD' }) => {
  if (!direction) return null;
  const { long: l, short: s } = direction;
  const total = (l?.total || 0) + (s?.total || 0);
  if (total === 0) return null;
  const longPct = ((l?.total || 0) / total) * 100;
  const shortPct = ((s?.total || 0) / total) * 100;
  const longWinRate = l?.total > 0 ? ((l.wins / l.total) * 100).toFixed(1) : '0.0';
  const shortWinRate = s?.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '0.0';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="glass-card p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-cyan-400" />
        <h3 className="font-heading font-bold text-white">Long vs Short</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Long */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">LONG</span>
          </div>
          <p className="text-2xl font-mono font-black text-white">{l?.total || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Win Rate: <span className="text-emerald-400 font-bold">{longWinRate}%</span></p>
          <p className={`text-sm font-mono font-bold mt-1 ${(l?.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(l?.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(l?.pnl || 0, currency)}
          </p>
          {/* Bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${longPct}%` }} transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
          </div>
        </div>
        {/* Short */}
        <div className="relative p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">SHORT</span>
          </div>
          <p className="text-2xl font-mono font-black text-white">{s?.total || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Win Rate: <span className="text-red-400 font-bold">{shortWinRate}%</span></p>
          <p className={`text-sm font-mono font-bold mt-1 ${(s?.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(s?.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(s?.pnl || 0, currency)}
          </p>
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${shortPct}%` }} transition={{ duration: 0.8, delay: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Win/Loss pie visual + best/worst trade
const WinLossVisual = ({ summary, charts, currency = 'USD' }) => {
  if (!summary) return null;
  const { winning_trades = 0, losing_trades = 0, avg_win = 0, avg_loss = 0 } = summary;
  const total = winning_trades + losing_trades;
  const winDeg = total > 0 ? (winning_trades / total) * 360 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="glass-card p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-400" />
        <h3 className="font-heading font-bold text-white">Win / Loss Breakdown</h3>
      </div>
      <div className="flex items-center gap-6">
        {/* Mini donut */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5" stroke="rgba(239,68,68,0.3)" />
            <motion.circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5" stroke="url(#winGradient)"
              strokeDasharray={`${(winDeg / 360) * 100} ${100 - (winDeg / 360) * 100}`}
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 100' }}
              animate={{ strokeDasharray: `${(winDeg / 360) * 100} ${100 - (winDeg / 360) * 100}` }}
              transition={{ duration: 1, delay: 0.6 }}
            />
            <defs>
              <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-white">{total > 0 ? Math.round((winning_trades / total) * 100) : 0}%</span>
          </div>
        </div>
        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Wins</span>
            <span className="font-mono font-bold text-emerald-400">{winning_trades}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Losses</span>
            <span className="font-mono font-bold text-red-400">{losing_trades}</span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 grid grid-cols-2 gap-2">
            <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Win</p><p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(avg_win, currency)}</p></div>
            <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Loss</p><p className="font-mono text-sm font-bold text-red-400">{formatCurrency(avg_loss, currency)}</p></div>
          </div>
        </div>
      </div>
      {/* Best / Worst trade */}
      {charts && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Best Trade</p>
              <p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(charts.best_trade?.pnl || 0, currency)}</p>
              <p className="text-xs text-gray-400">{charts.best_trade?.instrument}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Worst Trade</p>
              <p className="font-mono text-sm font-bold text-red-400">{formatCurrency(charts.worst_trade?.pnl || 0, currency)}</p>
              <p className="text-xs text-gray-400">{charts.worst_trade?.instrument}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Enhanced formatted AI text with colorful sections
const FormatInsightText = ({ text }) => {
  if (!text) return null;
  
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  // Vibrant gradient colors for section headings
  const gradients = [
    { text: 'from-yellow-300 via-amber-400 to-orange-500', bar: 'from-yellow-400 to-orange-500', glow: 'rgba(251,191,36,0.3)' },
    { text: 'from-cyan-300 via-sky-400 to-blue-500', bar: 'from-cyan-400 to-blue-500', glow: 'rgba(34,211,238,0.3)' },
    { text: 'from-emerald-300 via-green-400 to-teal-500', bar: 'from-emerald-400 to-teal-500', glow: 'rgba(52,211,153,0.3)' },
    { text: 'from-fuchsia-300 via-pink-400 to-rose-500', bar: 'from-fuchsia-400 to-rose-500', glow: 'rgba(232,121,249,0.3)' },
    { text: 'from-violet-300 via-purple-400 to-indigo-500', bar: 'from-violet-400 to-indigo-500', glow: 'rgba(167,139,250,0.3)' },
    { text: 'from-rose-300 via-red-400 to-orange-500', bar: 'from-rose-400 to-orange-500', glow: 'rgba(251,113,133,0.3)' },
  ];
  let headingIndex = 0;
  
  const renderHeading = (title, pIdx) => {
    const g = gradients[headingIndex % gradients.length];
    headingIndex++;
    return (
      <motion.div key={pIdx} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * pIdx, type: 'spring', stiffness: 120 }}
        className="mt-8 mb-4 flex items-center gap-3">
        <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${g.bar}`} style={{ boxShadow: `0 0 12px ${g.glow}` }} />
        <h4 className={`font-extrabold text-xl tracking-tight bg-gradient-to-r ${g.text} bg-clip-text text-transparent drop-shadow-sm`}
          style={{ textShadow: `0 0 20px ${g.glow}`, filter: 'brightness(1.15)' }}>
          {title}
        </h4>
      </motion.div>
    );
  };

  return paragraphs.map((paragraph, pIdx) => {
    const trimmed = paragraph.trim();
    
    // Section heading (bold text on its own line)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return renderHeading(trimmed.replace(/\*\*/g, ''), pIdx);
    }

    // Heading with # or ##
    if (/^#{1,3}\s/.test(trimmed)) {
      return renderHeading(trimmed.replace(/^#{1,3}\s*/, ''), pIdx);
    }

    // Heuristic: detect plain-text headings — single line, short, no period at end, mostly capitalized words
    const isSingleLine = !trimmed.includes('\n');
    const isShort = trimmed.length <= 80;
    const noPeriod = !trimmed.endsWith('.');
    const noBullet = !/^[-•*\d]/.test(trimmed);
    const hasTitleWords = trimmed.split(/\s+/).filter(w => /^[A-Z]/.test(w)).length >= Math.ceil(trimmed.split(/\s+/).length * 0.5);
    if (isSingleLine && isShort && noPeriod && noBullet && hasTitleWords && trimmed.split(/\s+/).length >= 2 && trimmed.split(/\s+/).length <= 10) {
      return renderHeading(trimmed, pIdx);
    }

    const lines = paragraph.split('\n');
    
    return (
      <motion.div key={pIdx} className="mb-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * pIdx }}>
        {lines.map((line, lIdx) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+[\.\)]/.test(line.trim());
          
          const highlightLine = (text) => {
            // First handle bold markers
            return text
              .split(/(\*\*[^*]+\*\*)/)
              .map((segment, i) => {
                if (segment.startsWith('**') && segment.endsWith('**')) {
                  return <span key={i} className="text-white font-bold">{segment.replace(/\*\*/g, '')}</span>;
                }
                // Split on: -$123 / $123 / ₹123 / -₹123 / percentages / fractions / instruments / standalone numbers with context
                return segment
                  .split(/([\-+]?\$[\d,]+\.?\d*|\$[\-+]?[\d,]+\.?\d*|[\-+]?₹[\d,]+\.?\d*|₹[\-+]?[\d,]+\.?\d*|[\-+]?\d+\.?\d*%|\d+\s*(?:wins?|losses?|trades?|out of \d+)|\d+\/\d+|\b(?:XAU[\/]?USD|XAG[\/]?USD|EUR[\/]?USD|GBP[\/]?USD|USD[\/]?JPY|BTC[\/]?USD|ETH[\/]?USD|NAS100|US30|US500|XAUUSD\+?|XAGUSD\+?|EURUSD|GBPUSD|USDJPY|BTCUSD|ETHUSD|NIFTY|BANKNIFTY|CRUDE|SILVER|GOLD|NASDAQ|SPX|S&P)\b|\b(?:win rate|stop[- ]loss|take[- ]profit|risk[- ]reward|risk management|position siz(?:e|ing)|profit factor|drawdown|expectancy|lot size|leverage)\b)/gi)
                  .map((part, j) => {
                    // Dollar/Rupee amounts
                    if (/^[\-+]?\$[\d,]+\.?\d*$|^\$[\-+]?[\d,]+\.?\d*$|^[\-+]?₹[\d,]+\.?\d*$|^₹[\-+]?[\d,]+\.?\d*$/.test(part)) {
                      const isNeg = part.includes('-');
                      return <span key={`${i}-${j}`} className={`font-mono font-extrabold px-1.5 py-0.5 rounded-md ${isNeg ? 'text-red-300 bg-red-500/15 shadow-[0_0_8px_rgba(239,68,68,0.15)]' : 'text-emerald-300 bg-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.15)]'}`}>{part}</span>;
                    }
                    // Percentages
                    if (/^[\-+]?\d+\.?\d*%$/.test(part)) {
                      const val = parseFloat(part);
                      const isNeg = part.startsWith('-');
                      const color = isNeg ? 'text-red-300 bg-red-500/15' : val >= 70 ? 'text-emerald-300 bg-emerald-500/15' : val >= 50 ? 'text-amber-300 bg-amber-500/15' : 'text-orange-300 bg-orange-500/15';
                      return <span key={`${i}-${j}`} className={`font-mono font-extrabold px-1.5 py-0.5 rounded-md ${color}`}>{part}</span>;
                    }
                    // Trade counts (e.g. "26 wins out of 30")
                    if (/^\d+\s*(?:wins?|losses?|trades?|out of \d+)$/i.test(part)) {
                      return <span key={`${i}-${j}`} className="font-mono font-bold text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded-md">{part}</span>;
                    }
                    // Fractions (e.g. 26/30)
                    if (/^\d+\/\d+$/.test(part)) {
                      return <span key={`${i}-${j}`} className="font-mono font-bold text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded-md">{part}</span>;
                    }
                    // Instrument symbols
                    if (/^(?:XAU[\/]?USD|XAG[\/]?USD|EUR[\/]?USD|GBP[\/]?USD|USD[\/]?JPY|BTC[\/]?USD|ETH[\/]?USD|NAS100|US30|US500|XAUUSD\+?|XAGUSD\+?|EURUSD|GBPUSD|USDJPY|BTCUSD|ETHUSD|NIFTY|BANKNIFTY|CRUDE|SILVER|GOLD|NASDAQ|SPX|S&P)$/i.test(part)) {
                      return <span key={`${i}-${j}`} className="font-bold text-fuchsia-300 bg-fuchsia-500/15 px-1.5 py-0.5 rounded-md shadow-[0_0_8px_rgba(217,70,239,0.12)]">{part}</span>;
                    }
                    // Trading keywords
                    if (/^(?:win rate|stop[- ]loss|take[- ]profit|risk[- ]reward|risk management|position siz(?:e|ing)|profit factor|drawdown|expectancy|lot size|leverage)$/i.test(part)) {
                      return <span key={`${i}-${j}`} className="font-semibold text-cyan-300">{part}</span>;
                    }
                    return part;
                  });
              });
          };
          
          if (isBullet) {
            const bulletText = line.trim().replace(/^[-•]\s*/, '').replace(/^\d+[\.)\:]\s*/, '');
            // Check if bullet starts with a bold label like "Risk Management:"
            const labelMatch = bulletText.match(/^([^:]+:)\s*(.*)$/);
            return (
              <div key={lIdx} className="flex gap-3 ml-1 mb-3 group">
                <span className="mt-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-400 flex-shrink-0 group-hover:scale-150 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-300" />
                <span className="text-gray-200 leading-relaxed">
                  {labelMatch ? (
                    <><span className="font-bold text-amber-300">{labelMatch[1]}</span> {highlightLine(labelMatch[2])}</>
                  ) : highlightLine(bulletText)}
                </span>
              </div>
            );
          }
          
          return <p key={lIdx} className="text-gray-200 leading-relaxed mb-1">{highlightLine(line)}</p>;
        })}
      </motion.div>
    );
  });
};

const SuggestedQuestion = ({ question, onClick, index }) => (
  <motion.button
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.05 * index }}
    onClick={() => onClick(question)}
    className="text-left p-3 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] border border-white/5 hover:border-accent/30 transition-all text-sm text-gray-300 hover:text-white group"
  >
    <span className="text-accent mr-2 group-hover:mr-3 transition-all">→</span>
    {question}
  </motion.button>
);

function AIInsights() {
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [question, setQuestion] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userCurrency, setUserCurrency] = useState('USD');
  const [playKey, setPlayKey] = useState(0);
  // Play TTS when enabled and new insight arrives
  useInsightTTS(insight?.insight, speechEnabled && !!insight?.insight, playKey);

  // Debug: Play Hinglish sample via TTS
  const playHinglishDebug = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/insights/hinglish-debug`);
      setInsight(res.data);
      setPlayKey(k => k + 1);
      toast.success('Hinglish debug sample loaded and played!');
    } catch (e) {
      toast.error('Failed to load Hinglish debug sample');
    }
  };

  // Fetch user's currency from their MT5 account
  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const response = await axios.get(`${API_URL}/mt5/accounts`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('MT5 Accounts Response:', response.data);
        if (response.data && response.data.length > 0) {
          const currency = response.data[0].currency || 'USD';
          console.log('Setting user currency to:', currency);
          setUserCurrency(currency);
        }
      } catch (error) {
        console.error('Failed to fetch user currency:', error);
      }
    };
    fetchUserCurrency();
  }, []);

  const suggestedQuestions = [
    "What are my biggest trading mistakes?",
    "Which instruments should I focus on?",
    "How can I improve my win rate?",
    "Analyze my risk management",
    "What patterns do you see in my losses?",
    "Give me actionable tips to improve"
  ];

  const handleGetInsights = async (q = question) => {
    if (!q.trim()) {
      toast.error('Please enter a question or select a suggestion');
      return;
    }

    setLoading(true);
    setQuestion(q);
    
    try {
      const response = await axios.post(`${API_URL}/ai/insights`, { question: q }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setInsight(response.data);
      setPlayKey(k => k + 1); // force TTS to play every time
      toast.success('Insights generated successfully');
    } catch (error) {
      if (error.response?.status === 503) {
        toast.error('AI service is not configured');
      } else if (error.response?.status === 500) {
        toast.error('Failed to generate insights. Please try again.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to get insights');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-insights-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-black flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-accent to-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">AI Insights</span>
        </h1>
        <p className="text-muted-foreground mt-1">Get AI-powered analysis of your trading performance</p>
      </div>

      {/* Speech Toggle - Modern Switch + Debug Button */}
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-gray-300 mr-2">Speak Insights</span>
          <Switch checked={speechEnabled} onCheckedChange={setSpeechEnabled} />
        </label>
        <Button size="sm" variant="outline" onClick={playHinglishDebug} className="ml-3">Debug Hinglish TTS</Button>
      </div>
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleGetInsights()}
            placeholder="Ask about your trading performance..."
            disabled={loading}
            className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />
          <Button
            onClick={() => handleGetInsights()}
            disabled={loading}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Ask'}
          </Button>
        </div>

        {/* Suggested Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestedQuestions.map((q, i) => (
            <SuggestedQuestion
              key={i}
              question={q}
              onClick={handleGetInsights}
              index={i}
            />
          ))}
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
          <p className="text-muted-foreground">Analyzing your trading data...</p>
        </motion.div>
      )}

      {/* Results */}
      {insight && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="glass-card p-4 border border-white/5">
              <Activity className="w-5 h-5 text-violet-400 mb-2" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Trades</p>
              <p className="text-2xl font-mono font-black text-white">{insight?.summary?.total_trades || 0}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
              className="glass-card p-4 border border-white/5">
              {(insight?.summary?.total_pnl || 0) >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
                : <TrendingDown className="w-5 h-5 text-red-400 mb-2" />
              }
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total P&L</p>
              <p className={`text-2xl font-mono font-black ${(insight?.summary?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(insight?.summary?.total_pnl || 0, userCurrency)}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="glass-card p-4 border border-white/5">
              <Target className="w-5 h-5 text-cyan-400 mb-2" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</p>
              <p className="text-2xl font-mono font-black text-white">{insight?.summary?.win_rate || 0}%</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
              className="glass-card p-4 border border-white/5">
              <BarChart3 className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Profit Factor</p>
              <p className="text-2xl font-mono font-black text-white">{insight?.summary?.profit_factor || 0}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              className="glass-card p-4 border border-white/5 col-span-2 sm:col-span-1">
              <Zap className="w-5 h-5 text-rose-400 mb-2" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Expectancy</p>
              <p className={`text-2xl font-mono font-black ${(insight?.summary?.expectancy || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(insight?.summary?.expectancy || 0, userCurrency)}
              </p>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InstrumentChart instruments={insight?.charts?.instruments} currency={insight?.summary?.currency || userCurrency} />
            <div className="space-y-6">
              <DirectionChart direction={insight?.charts?.direction} currency={insight?.summary?.currency || userCurrency} />
              <WinLossVisual summary={insight?.summary} charts={insight?.charts} currency={insight?.summary?.currency || userCurrency} />
            </div>
          </div>

          {/* AI Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-accent to-emerald-500 flex items-center justify-center shadow-lg shadow-accent/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-white">AI Analysis</h3>
                <p className="text-xs text-gray-500">Powered by Groq · llama-3.3</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <FormatInsightText text={insight?.insight} />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Empty State */}
      {!insight && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent/20 to-emerald-600/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-accent" />
          </div>
          <h3 className="text-xl font-heading font-bold mb-2">Get Trading Insights</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Ask questions about your trading performance and get AI-powered analysis to help improve your strategy.
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default withSubscriptionLock(AIInsights, 'ai-insights');
