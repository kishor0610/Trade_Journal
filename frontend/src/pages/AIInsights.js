import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Send, TrendingUp, Activity, Target, Loader2 } from 'lucide-react';
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </div>

          {/* AI Response */}
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
