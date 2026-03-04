import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, BarChart3 } from 'lucide-react';
import { formatCurrency, getInstrumentColor, INSTRUMENTS } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [byInstrument, setByInstrument] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [summaryRes, instrumentRes, monthlyRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/by-instrument`),
        axios.get(`${API_URL}/analytics/monthly`)
      ]);
      
      setSummary(summaryRes.data);
      setByInstrument(instrumentRes.data);
      setMonthlyData(monthlyRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate cumulative P&L for the line chart
  const cumulativeData = monthlyData.reduce((acc, item) => {
    const lastTotal = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    acc.push({
      ...item,
      cumulative: lastTotal + item.pnl
    });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-black">Analytics</h1>
        <p className="text-muted-foreground">Detailed breakdown of your trading performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary?.total_pnl >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {summary?.total_pnl >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <span className="text-muted-foreground text-sm">Total P&L</span>
          </div>
          <p className={`text-2xl md:text-3xl font-mono font-bold ${summary?.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(summary?.total_pnl || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <span className="text-muted-foreground text-sm">Win Rate</span>
          </div>
          <p className="text-2xl md:text-3xl font-mono font-bold">{summary?.win_rate || 0}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-muted-foreground text-sm">Winning</span>
          </div>
          <p className="text-2xl md:text-3xl font-mono font-bold text-emerald-500">{summary?.winning_trades || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-muted-foreground text-sm">Losing</span>
          </div>
          <p className="text-2xl md:text-3xl font-mono font-bold text-red-500">{summary?.losing_trades || 0}</p>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative P&L */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">Cumulative P&L</h3>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  stroke="#A1A1AA" 
                  fontSize={12}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis 
                  stroke="#A1A1AA" 
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Cumulative P&L']}
                />
                <Area 
                  type="monotone"
                  dataKey="cumulative" 
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorPnl)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </motion.div>

        {/* Monthly Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">Monthly Performance</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  stroke="#A1A1AA" 
                  fontSize={12}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis 
                  stroke="#A1A1AA" 
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono'
                  }}
                  formatter={(value) => [formatCurrency(value), 'P&L']}
                />
                <Bar 
                  dataKey="pnl" 
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </motion.div>

        {/* P&L by Instrument */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">P&L by Instrument</h3>
          {byInstrument.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byInstrument} layout="vertical">
                <XAxis 
                  type="number"
                  stroke="#A1A1AA" 
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  type="category"
                  dataKey="instrument"
                  stroke="#A1A1AA" 
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono'
                  }}
                  formatter={(value) => [formatCurrency(value), 'P&L']}
                />
                <Bar 
                  dataKey="total_pnl" 
                  radius={[0, 4, 4, 0]}
                >
                  {byInstrument.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getInstrumentColor(entry.instrument)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </motion.div>

        {/* Instrument Breakdown Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">Instrument Breakdown</h3>
          {byInstrument.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground text-sm border-b border-white/10">
                    <th className="pb-3 pr-4">Instrument</th>
                    <th className="pb-3 pr-4 text-center">Trades</th>
                    <th className="pb-3 pr-4 text-center">Win Rate</th>
                    <th className="pb-3 text-right font-mono">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byInstrument.map((item) => (
                    <tr key={item.instrument} className="border-b border-white/5 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getInstrumentColor(item.instrument) }}
                          />
                          <span>{item.instrument}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center font-mono">{item.total_trades}</td>
                      <td className="py-3 pr-4 text-center">
                        <span className={`text-sm px-2 py-1 rounded ${
                          item.win_rate >= 50 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {item.win_rate}%
                        </span>
                      </td>
                      <td className={`py-3 text-right font-mono font-bold ${
                        item.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {formatCurrency(item.total_pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
