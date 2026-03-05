import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Target, DollarSign, 
  Percent, RefreshCw, Calendar, Award, Flame, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  formatCurrency, formatNumber, formatPercentage, getInstrumentColor,
  getDaysInMonth, getFirstDayOfMonth, getMonthName, calculateWeeklyTotals,
  TIME_PERIODS
} from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Semi-circular gauge chart component
const GaugeChart = ({ value, maxValue = 100, label, color = '#3B82F6', size = 120 }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center -mt-4">
        <p className="text-2xl font-mono font-bold">{formatNumber(value, 2)}%</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

// Horizontal ratio bar component
const RatioBar = ({ value, label, winColor = '#3B82F6', lossColor = '#EF4444' }) => {
  const winPercent = Math.min(Math.max((value / (value + 1)) * 100, 5), 95);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-mono font-bold">{formatNumber(value, 2)}</span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-white/5">
        <div 
          className="h-full rounded-l-full transition-all duration-500"
          style={{ width: `${winPercent}%`, backgroundColor: winColor }}
        />
        <div 
          className="h-full rounded-r-full transition-all duration-500"
          style={{ width: `${100 - winPercent}%`, backgroundColor: lossColor }}
        />
      </div>
    </div>
  );
};

// Sparkline component
const Sparkline = ({ data, height = 60, color = '#3B82F6' }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="count" 
          stroke={color} 
          strokeWidth={2}
          fill="url(#sparklineGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Stat card component
const StatCard = ({ title, value, subtitle, icon: Icon, trend, delay = 0, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-4"
  >
    {children || (
      <>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-3xl font-mono font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          {Icon && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trend >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <Icon className={`w-5 h-5 ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </>
    )}
  </motion.div>
);

// Winstreak component
const WinstreakCard = ({ daysStreak, tradesStreak, currentDaysStreak, currentTradesStreak }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
    className="glass-card p-4"
  >
    <h3 className="text-lg font-heading font-bold mb-4">Winstreak</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-mono font-bold text-amber-500">{daysStreak}</span>
          <Flame className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500">{currentDaysStreak}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Days</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-mono font-bold text-blue-500">{tradesStreak}</span>
          <Award className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500">{currentTradesStreak}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Trades</p>
      </div>
    </div>
  </motion.div>
);

// Calendar component
const TradingCalendar = ({ year, month, dailyData, summary, onMonthChange }) => {
  const weeks = calculateWeeklyTotals(dailyData, year, month);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(-1)} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-heading font-bold">
            {getMonthName(month)} {year}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(1)} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Summary stats */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="px-2 py-1 rounded bg-secondary">
            <span className="text-muted-foreground">Trades</span>
            <span className="ml-2 font-mono font-bold">{summary?.total_trades || 0}</span>
          </div>
          <div className="px-2 py-1 rounded bg-secondary">
            <span className="text-muted-foreground">Wins</span>
            <span className="ml-2 font-mono font-bold text-emerald-500">{summary?.total_wins || 0}</span>
          </div>
          <div className="px-2 py-1 rounded bg-secondary">
            <span className="text-muted-foreground">Profits</span>
            <span className={`ml-2 font-mono font-bold ${(summary?.total_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(summary?.total_pnl || 0)}
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-secondary">
            <span className="text-muted-foreground">Percent</span>
            <span className="ml-2 font-mono font-bold">{summary?.win_rate || 0}%</span>
          </div>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              {daysOfWeek.map(day => (
                <th key={day} className="text-center text-xs text-muted-foreground py-2 font-normal">{day}</th>
              ))}
              <th className="text-center text-xs text-muted-foreground py-2 font-normal w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.days.map((dayData, dayIndex) => (
                  <td key={dayIndex} className="p-1">
                    {dayData ? (
                      <div className={`p-2 rounded-lg border min-h-[60px] transition-colors ${
                        dayData.pnl > 0 ? 'border-emerald-500/30 bg-emerald-500/5' :
                        dayData.pnl < 0 ? 'border-red-500/30 bg-red-500/5' :
                        'border-white/5 bg-white/5'
                      }`}>
                        <div className="text-xs text-muted-foreground">{dayData.day}</div>
                        {dayData.pnl !== 0 && (
                          <>
                            <div className={`text-sm font-mono font-bold ${dayData.pnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatCurrency(dayData.pnl)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {((dayData.pnl / 10000) * 100).toFixed(2)}%
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 min-h-[60px]" />
                    )}
                  </td>
                ))}
                <td className="p-1">
                  <div className={`p-2 rounded-lg border min-h-[60px] flex items-center justify-center ${
                    week.total > 0 ? 'border-emerald-500/50 bg-emerald-500/10' :
                    week.total < 0 ? 'border-red-500/50 bg-red-500/10' :
                    'border-white/10 bg-white/5'
                  }`}>
                    {week.total !== 0 && (
                      <span className={`font-mono font-bold ${week.total > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(week.total)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tradeCount, setTradeCount] = useState({ total: 0, data: [] });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [dailyData, setDailyData] = useState({ days: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [calendarDate, setCalendarDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  useEffect(() => {
    fetchCalendarData();
  }, [calendarDate]);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, tradeCountRes, balanceRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary`),
        axios.get(`${API_URL}/analytics/trade-count?period=${selectedPeriod}`),
        axios.get(`${API_URL}/analytics/balance-history?period=${selectedPeriod}`)
      ]);
      
      setSummary(summaryRes.data);
      setTradeCount(tradeCountRes.data);
      setBalanceHistory(balanceRes.data);
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/daily?year=${calendarDate.year}&month=${calendarDate.month + 1}`);
      setDailyData(res.data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  const handleMonthChange = (delta) => {
    setCalendarDate(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
    fetchCalendarData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header with sync status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Last Sync: {lastSync || 'Never'} 
            <button onClick={handleRefresh} className="hover:text-accent transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </p>
        </div>
        
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {TIME_PERIODS.map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedPeriod === period.value 
                  ? 'bg-accent text-black font-medium' 
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Winrate gauge */}
        <StatCard delay={0}>
          <GaugeChart 
            value={summary?.win_rate || 0} 
            label="Winrate" 
            color="#3B82F6"
          />
        </StatCard>
        
        {/* Avg Win/Loss ratio */}
        <StatCard delay={0.1}>
          <RatioBar 
            value={summary?.avg_win_loss_ratio || 0} 
            label="Avg Win / Avg Loss"
          />
        </StatCard>
        
        {/* Trade count with sparkline */}
        <StatCard delay={0.2}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-3xl font-mono font-bold">{summary?.total_trades || 0}</p>
              <p className="text-sm text-muted-foreground">Trade Count</p>
            </div>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <Sparkline data={tradeCount.data} color="#3B82F6" />
        </StatCard>
        
        {/* Winstreak */}
        <WinstreakCard 
          daysStreak={summary?.win_streak_days || 0}
          tradesStreak={summary?.win_streak_trades || 0}
          currentDaysStreak={summary?.current_win_streak_days || 0}
          currentTradesStreak={summary?.current_win_streak_trades || 0}
        />
      </div>

      {/* Second metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Daily Winrate gauge */}
        <StatCard delay={0.3}>
          <GaugeChart 
            value={summary?.daily_win_rate || 0} 
            label="Daily Winrate" 
            color="#10B981"
          />
        </StatCard>
        
        {/* Day Win/Loss ratio */}
        <StatCard delay={0.4}>
          <RatioBar 
            value={summary?.day_win_loss_ratio || 0} 
            label="Day Win / Day Loss"
            winColor="#10B981"
          />
        </StatCard>
        
        {/* Total P&L */}
        <StatCard 
          title="Total P&L"
          value={formatCurrency(summary?.total_pnl || 0)}
          icon={DollarSign}
          trend={summary?.total_pnl || 0}
          delay={0.5}
        />
        
        {/* Open Positions */}
        <StatCard 
          title="Open Positions"
          value={summary?.open_trades || 0}
          icon={Target}
          trend={1}
          delay={0.6}
        />
      </div>

      {/* Balance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-heading font-bold">Balance</h3>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {TIME_PERIODS.slice(0, 5).map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedPeriod === period.value 
                    ? 'bg-white/10 text-white' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        
        {balanceHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={balanceHistory}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke="#A1A1AA" 
                fontSize={11}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis 
                stroke="#A1A1AA" 
                fontSize={11}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono'
                }}
                formatter={(value) => [formatCurrency(value), 'Balance']}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No balance data yet. Start closing trades to see your equity curve!
          </div>
        )}
      </motion.div>

      {/* Calendar View */}
      <TradingCalendar 
        year={calendarDate.year}
        month={calendarDate.month}
        dailyData={dailyData.days}
        summary={dailyData.summary}
        onMonthChange={handleMonthChange}
      />
    </div>
  );
}
