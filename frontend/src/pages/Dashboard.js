import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Percent } from 'lucide-react';
import { formatCurrency, formatPercentage, getInstrumentColor } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm mb-1">{title}</p>
        <p className="text-2xl md:text-3xl font-mono font-bold">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trend >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
        <Icon className={`w-6 h-6 ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [byInstrument, setByInstrument] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, instrumentRes, monthlyRes, tradesRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/by-instrument`),
        axios.get(`${API_URL}/analytics/monthly`),
        axios.get(`${API_URL}/trades?status=closed`)
      ]);
      
      setSummary(summaryRes.data);
      setByInstrument(instrumentRes.data);
      setMonthlyData(monthlyRes.data);
      setRecentTrades(tradesRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieColors = ['#10B981', '#F59E0B', '#F7931A', '#627EEA', '#3B82F6', '#8B5CF6', '#C0C0C0'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={formatCurrency(summary?.total_pnl || 0)}
          icon={DollarSign}
          trend={summary?.total_pnl || 0}
          delay={0}
        />
        <StatCard
          title="Win Rate"
          value={`${summary?.win_rate || 0}%`}
          icon={Percent}
          trend={summary?.win_rate > 50 ? 1 : -1}
          delay={0.1}
        />
        <StatCard
          title="Total Trades"
          value={summary?.total_trades || 0}
          icon={Activity}
          trend={1}
          delay={0.2}
        />
        <StatCard
          title="Open Positions"
          value={summary?.open_trades || 0}
          icon={Target}
          trend={1}
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly P&L Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">Monthly P&L</h3>
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
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar 
                  dataKey="pnl" 
                  radius={[4, 4, 0, 0]}
                  fill="#10B981"
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
              No trading data yet. Start adding trades!
            </div>
          )}
        </motion.div>

        {/* P&L by Instrument Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-heading font-bold mb-4">P&L by Instrument</h3>
          {byInstrument.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byInstrument}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="total_trades"
                    nameKey="instrument"
                  >
                    {byInstrument.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getInstrumentColor(entry.instrument)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name, props) => [
                      `${value} trades, ${formatCurrency(props.payload.total_pnl)}`,
                      props.payload.instrument
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {byInstrument.slice(0, 4).map((item, index) => (
                  <div key={item.instrument} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getInstrumentColor(item.instrument) }}
                      />
                      <span>{item.instrument}</span>
                    </div>
                    <span className={`font-mono ${item.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(item.total_pnl)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No instrument data yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Trades */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-heading font-bold mb-4">Recent Closed Trades</h3>
        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-muted-foreground text-sm border-b border-white/10">
                  <th className="pb-3 pr-4">Instrument</th>
                  <th className="pb-3 pr-4">Position</th>
                  <th className="pb-3 pr-4 font-mono">Entry</th>
                  <th className="pb-3 pr-4 font-mono">Exit</th>
                  <th className="pb-3 font-mono">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getInstrumentColor(trade.instrument) }}
                        />
                        <span>{trade.instrument}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        trade.position === 'long' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {trade.position === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trade.position.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm">{formatCurrency(trade.entry_price)}</td>
                    <td className="py-3 pr-4 font-mono text-sm">{formatCurrency(trade.exit_price)}</td>
                    <td className={`py-3 font-mono text-sm font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(trade.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No closed trades yet. Close some positions to see your performance!
          </div>
        )}
      </motion.div>
    </div>
  );
}
