import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Send, TrendingUp, Activity, Target, Loader2, Gauge, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SuggestedQuestion = ({ question, onClick }) => (
  <button
    onClick={() => onClick(question)}
    className="text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-white/5 hover:border-white/10 transition-all text-sm"
  >
    {question}
  </button>
);

const SECTION_PATTERNS = [
  { key: 'snapshot', title: 'Snapshot', regex: /(?:^|\n)\s*(?:1\)\s*)?Snapshot\s*:?/i },
  { key: 'working', title: 'What Is Working', regex: /(?:^|\n)\s*(?:2\)\s*)?What\s+is\s+working\s*:?/i },
  { key: 'hurting', title: 'What Is Hurting Performance', regex: /(?:^|\n)\s*(?:3\)\s*)?What\s+is\s+hurting\s+performance\s*:?/i },
  { key: 'plan', title: 'Next 5 Trades Plan', regex: /(?:^|\n)\s*(?:4\)\s*)?Next\s+5\s+trades\s+plan\s*:?/i },
];

const parseInsightSections = (text = '') => {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return [];

  const positions = SECTION_PATTERNS.map((pattern) => {
    const match = pattern.regex.exec(normalized);
    return match ? { ...pattern, index: match.index, marker: match[0] } : null;
  }).filter(Boolean).sort((a, b) => a.index - b.index);

  if (positions.length < 2) {
    return [];
  }

  const sections = [];
  for (let i = 0; i < positions.length; i += 1) {
    const current = positions[i];
    const start = current.index + current.marker.length;
    const end = i + 1 < positions.length ? positions[i + 1].index : normalized.length;
    const content = normalized.slice(start, end).trim();
    if (!content) continue;

    const lines = content
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

    sections.push({
      key: current.key,
      title: current.title,
      lines,
    });
  }

  return sections;
};

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
    setLoading(true);
    setQuestion(q);
    
    try {
      const response = await axios.post(`${API_URL}/ai/insights`, { question: q });
      setInsight(response.data);
    } catch (error) {
      if (error.response?.status === 500) {
        toast.error('AI service unavailable. Please try again later.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to get insights');
      }
    } finally {
      setLoading(false);
    }
  };

  const sections = parseInsightSections(insight?.insight);
  const freshness = insight?.summary?.freshness;
  const freshnessStyles = {
    high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    low: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <div className="space-y-6" data-testid="ai-insights-page">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-heading font-black flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-accent" />
            AI Insights
          </h1>
          {freshness && (
            <span
              className={`px-3 py-1 rounded-full text-xs border ${freshnessStyles[freshness.level] || freshnessStyles.medium}`}
              data-testid="ai-freshness-badge"
            >
              {freshness.label}
            </span>
          )}
        </div>
        <p className="text-muted-foreground">Get AI-powered analysis of your trading performance</p>
        {freshness?.message && (
          <p className="text-xs text-muted-foreground mt-1" data-testid="ai-freshness-message">
            {freshness.message}
          </p>
        )}
      </div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleGetInsights()}
            placeholder="Ask about your trading performance..."
            className="flex-1 h-12 px-4 bg-secondary border border-white/10 rounded-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            data-testid="ai-question-input"
          />
          <Button
            onClick={() => handleGetInsights()}
            disabled={loading}
            className="h-12 px-6 bg-accent text-black hover:bg-accent/90"
            data-testid="ai-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Suggested Questions */}
        <div className="mt-4">
          <p className="text-muted-foreground text-sm mb-3">Suggested questions:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestedQuestions.map((q, i) => (
              <SuggestedQuestion key={i} question={q} onClick={handleGetInsights} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Results Section */}
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

      {insight && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Trades</p>
                <p className="text-xl font-mono font-bold">{insight.summary?.total_trades || 0}</p>
              </div>
            </div>
            
            <div className="glass-card p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                insight.summary?.total_pnl >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                <TrendingUp className={`w-6 h-6 ${
                  insight.summary?.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total P&L</p>
                <p className={`text-xl font-mono font-bold ${
                  insight.summary?.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {formatCurrency(insight.summary?.total_pnl || 0)}
                </p>
              </div>
            </div>
            
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Win Rate</p>
                <p className="text-xl font-mono font-bold">{insight.summary?.win_rate || 0}%</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Profit Factor</p>
                <p className="text-xl font-mono font-bold">{insight.summary?.profit_factor ?? '-'}</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Expectancy</p>
                <p className={`text-xl font-mono font-bold ${(insight.summary?.expectancy || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(insight.summary?.expectancy || 0)}
                </p>
              </div>
            </div>
          </div>

          {freshness?.level === 'low' && (
            <div className="glass-card p-4 border border-red-500/20 flex items-start gap-3" data-testid="ai-low-confidence-warning">
              <AlertTriangle className="w-5 h-5 text-red-300 mt-0.5" />
              <p className="text-sm text-red-200">
                Insight quality is limited with small samples. Add more closed trades for stronger and more stable guidance.
              </p>
            </div>
          )}

          {sections.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="ai-insight-sections">
              {sections.map((section, index) => (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.06 }}
                  className="glass-card p-5"
                >
                  <h3 className="text-base font-heading font-bold mb-3">{section.title}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.lines.map((line, i) => (
                      <li key={`${section.key}-${i}`} className="leading-relaxed">• {line}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-lg font-heading font-bold">AI Analysis</h3>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {insight.insight}
                </div>
              </div>
            </motion.div>
          )}
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
