import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Send, TrendingUp, Activity, Target, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Format AI text with highlighted values
const FormatInsightText = ({ text }) => {
  if (!text) return null;
  
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, pIdx) => {
    // Check if it's a heading-like line (starts with ** or ##)
    const trimmed = paragraph.trim();
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return (
        <h4 key={pIdx} className="text-white font-bold text-lg mt-4 mb-2">
          {trimmed.replace(/\*\*/g, '')}
        </h4>
      );
    }

    // Split paragraph into lines for bullet points
    const lines = paragraph.split('\n');
    
    return (
      <div key={pIdx} className="mb-4">
        {lines.map((line, lIdx) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+[\.\)]/.test(line.trim());
          
          // Highlight values in the line
          const highlighted = line
            // Bold text **...**
            .split(/(\*\*[^*]+\*\*)/)
            .map((segment, i) => {
              if (segment.startsWith('**') && segment.endsWith('**')) {
                return <span key={i} className="text-white font-semibold">{segment.replace(/\*\*/g, '')}</span>;
              }
              // Further split for values
              return segment
                .split(/(\$[\-]?[\d,]+\.?\d*|[\-]?\d+\.?\d*%|\d+\/\d+|\b(?:XAU\/USD|XAG\/USD|EUR\/USD|GBP\/USD|USD\/JPY|BTC\/USD|ETH\/USD|NAS100|US30)\b)/g)
                .map((part, j) => {
                  // Dollar amounts
                  if (/^\$[\-]?[\d,]+\.?\d*$/.test(part)) {
                    const isNegative = part.includes('-');
                    return <span key={`${i}-${j}`} className={`font-mono font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>{part}</span>;
                  }
                  // Percentages
                  if (/^[\-]?\d+\.?\d*%$/.test(part)) {
                    const val = parseFloat(part);
                    const color = val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400';
                    return <span key={`${i}-${j}`} className={`font-mono font-bold ${color}`}>{part}</span>;
                  }
                  // Win/Loss ratios like 5/10
                  if (/^\d+\/\d+$/.test(part)) {
                    return <span key={`${i}-${j}`} className="font-mono font-bold text-blue-400">{part}</span>;
                  }
                  // Instrument names
                  if (/^(XAU\/USD|XAG\/USD|EUR\/USD|GBP\/USD|USD\/JPY|BTC\/USD|ETH\/USD|NAS100|US30)$/.test(part)) {
                    return <span key={`${i}-${j}`} className="font-semibold text-accent">{part}</span>;
                  }
                  return part;
                });
            });
          
          if (isBullet) {
            return (
              <div key={lIdx} className="flex gap-2 ml-2 mb-1.5">
                <span className="text-accent mt-0.5">•</span>
                <span className="text-gray-300 leading-relaxed">{highlighted}</span>
              </div>
            );
          }
          
          return <p key={lIdx} className="text-gray-300 leading-relaxed">{highlighted}</p>;
        })}
      </div>
    );
  });
};

const SuggestedQuestion = ({ question, onClick }) => (
  <button
    onClick={() => onClick(question)}
    className="text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-white/5 hover:border-white/10 transition-all text-sm"
  >
    {question}
  </button>
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
          <Sparkles className="w-8 h-8 text-accent" />
          AI Insights
        </h1>
        <p className="text-muted-foreground">Get AI-powered analysis of your trading performance</p>
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
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Trades</p>
                <p className="text-xl font-mono font-bold">{insight?.summary?.total_trades || 0}</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                (insight?.summary?.total_pnl || 0) >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                <TrendingUp className={`w-6 h-6 ${(insight?.summary?.total_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total P&L</p>
                <p className={`text-xl font-mono font-bold ${(insight?.summary?.total_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(insight?.summary?.total_pnl || 0)}
                </p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Win Rate</p>
                <p className="text-xl font-mono font-bold">{insight?.summary?.win_rate || 0}%</p>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
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
