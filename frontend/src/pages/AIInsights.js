import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Send, TrendingUp, TrendingDown, Activity, Target, Loader2, BarChart3, ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle, Zap, PieChart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Horizontal bar chart for instruments
const InstrumentChart = ({ instruments }) => {
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
                    {isPositive ? '+' : ''}{formatCurrency(inst.pnl)}
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
const DirectionChart = ({ direction }) => {
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
            {(l?.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(l?.pnl || 0)}
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
            {(s?.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(s?.pnl || 0)}
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
const WinLossVisual = ({ summary, charts }) => {
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
            <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Win</p><p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(avg_win)}</p></div>
            <div><p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Loss</p><p className="font-mono text-sm font-bold text-red-400">{formatCurrency(avg_loss)}</p></div>
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
              <p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(charts.best_trade?.pnl || 0)}</p>
              <p className="text-xs text-gray-400">{charts.best_trade?.instrument}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Worst Trade</p>
              <p className="font-mono text-sm font-bold text-red-400">{formatCurrency(charts.worst_trade?.pnl || 0)}</p>
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
  
  // Gradient colors for section headings
  const gradients = [
    'from-violet-400 to-fuchsia-400',
    'from-cyan-400 to-blue-400',
    'from-emerald-400 to-teal-400',
    'from-amber-400 to-orange-400',
    'from-rose-400 to-pink-400',
    'from-indigo-400 to-violet-400',
  ];
  let headingIndex = 0;
  
  return paragraphs.map((paragraph, pIdx) => {
    const trimmed = paragraph.trim();
    
    // Section heading (bold text on its own line)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const gradient = gradients[headingIndex % gradients.length];
      headingIndex++;
      return (
        <motion.div key={pIdx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * pIdx }}
          className="mt-6 mb-3 flex items-center gap-2">
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${gradient}`} />
          <h4 className={`font-bold text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {trimmed.replace(/\*\*/g, '')}
          </h4>
        </motion.div>
      );
    }

    // Heading with # or ##
    if (/^#{1,3}\s/.test(trimmed)) {
      const gradient = gradients[headingIndex % gradients.length];
      headingIndex++;
      return (
        <motion.div key={pIdx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * pIdx }}
          className="mt-6 mb-3 flex items-center gap-2">
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${gradient}`} />
          <h4 className={`font-bold text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {trimmed.replace(/^#{1,3}\s*/, '')}
          </h4>
        </motion.div>
      );
    }

    const lines = paragraph.split('\n');
    
    return (
      <motion.div key={pIdx} className="mb-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * pIdx }}>
        {lines.map((line, lIdx) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+[\.\)]/.test(line.trim());
          
          const highlightLine = (text) => {
            return text
              .split(/(\*\*[^*]+\*\*)/)
              .map((segment, i) => {
                if (segment.startsWith('**') && segment.endsWith('**')) {
                  return <span key={i} className="text-white font-semibold">{segment.replace(/\*\*/g, '')}</span>;
                }
                return segment
                  .split(/(\$[\-]?[\d,]+\.?\d*|[\-+]?\d+\.?\d*%|\d+\/\d+|\b(?:XAU\/USD|XAG\/USD|EUR\/USD|GBP\/USD|USD\/JPY|BTC\/USD|ETH\/USD|NAS100|US30|XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|BTCUSD|ETHUSD|NIFTY|BANKNIFTY)\b)/gi)
                  .map((part, j) => {
                    if (/^\$[\-]?[\d,]+\.?\d*$/.test(part)) {
                      const isNeg = part.includes('-');
                      return <span key={`${i}-${j}`} className={`font-mono font-bold px-1 py-0.5 rounded ${isNeg ? 'text-red-300 bg-red-500/10' : 'text-emerald-300 bg-emerald-500/10'}`}>{part}</span>;
                    }
                    if (/^[\-+]?\d+\.?\d*%$/.test(part)) {
                      const val = parseFloat(part);
                      const color = val >= 70 ? 'text-emerald-300 bg-emerald-500/10' : val >= 50 ? 'text-amber-300 bg-amber-500/10' : 'text-red-300 bg-red-500/10';
                      return <span key={`${i}-${j}`} className={`font-mono font-bold px-1 py-0.5 rounded ${color}`}>{part}</span>;
                    }
                    if (/^\d+\/\d+$/.test(part)) {
                      return <span key={`${i}-${j}`} className="font-mono font-bold text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded">{part}</span>;
                    }
                    if (/^(XAU\/USD|XAG\/USD|EUR\/USD|GBP\/USD|USD\/JPY|BTC\/USD|ETH\/USD|NAS100|US30|XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|BTCUSD|ETHUSD|NIFTY|BANKNIFTY)$/i.test(part)) {
                      return <span key={`${i}-${j}`} className="font-semibold text-violet-300 bg-violet-500/10 px-1 py-0.5 rounded">{part}</span>;
                    }
                    return part;
                  });
              });
          };
          
          if (isBullet) {
            const bulletText = line.trim().replace(/^[-•]\s*/, '').replace(/^\d+[\.\)]\s*/, '');
            return (
              <div key={lIdx} className="flex gap-3 ml-1 mb-2 group">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-r from-accent to-emerald-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                <span className="text-gray-200 leading-relaxed">{highlightLine(bulletText)}</span>
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

export default function AIInsights() {
  const [question, setQuestion] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

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
                {formatCurrency(insight?.summary?.total_pnl || 0)}
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
                {formatCurrency(insight?.summary?.expectancy || 0)}
              </p>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InstrumentChart instruments={insight?.charts?.instruments} />
            <div className="space-y-6">
              <DirectionChart direction={insight?.charts?.direction} />
              <WinLossVisual summary={insight?.summary} charts={insight?.charts} />
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
