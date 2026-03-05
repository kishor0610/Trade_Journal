import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Target, DollarSign, 
  Percent, RefreshCw, Calendar, Award, Flame, ChevronLeft, ChevronRight,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  formatCurrency, formatNumber, 
  getDaysInMonth, getFirstDayOfMonth, getMonthName,
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
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
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

// New Calendar component matching reference image
const TradingCalendar = ({ year, month, dailyData, summary, onMonthChange }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dailyData.find(d => d.date === dateStr);
    calendarDays.push({
      day,
      date: dateStr,
      pnl: dayData?.pnl || 0,
      trades: dayData?.trades || 0
    });
  }
  
  // Calculate weekly summaries
  const weeks = [];
  let currentWeek = [];
  let weekPnl = 0;
  let weekDays = 0;
  let weekNum = 1;
  
  calendarDays.forEach((dayData, index) => {
    currentWeek.push(dayData);
    if (dayData && dayData.pnl !== 0) {
      weekPnl += dayData.pnl;
      weekDays++;
    }
    
    if (currentWeek.length === 7 || index === calendarDays.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      
      const weekStart = currentWeek.find(d => d !== null)?.day || 1;
      const weekEnd = [...currentWeek].reverse().find(d => d !== null)?.day || weekStart;
      
      weeks.push({
        days: currentWeek,
        pnl: weekPnl,
        tradingDays: weekDays,
        weekNum,
        dateRange: `${getMonthName(month).slice(0, 3)} ${weekStart} - ${getMonthName(month).slice(0, 3)} ${weekEnd}`
      });
      
      currentWeek = [];
      weekPnl = 0;
      weekDays = 0;
      weekNum++;
    }
  });
  
  const totalPnl = dailyData.reduce((sum, d) => sum + (d.pnl || 0), 0);
  const totalDays = dailyData.filter(d => d.trades > 0).length;
  
  const goToToday = () => {
    const now = new Date();
    if (now.getFullYear() !== year || now.getMonth() !== month) {
      const diff = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
      onMonthChange(diff);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(-1)} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-heading font-bold min-w-[140px] text-center">
            {getMonthName(month)} {year}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(1)} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 gap-2">
            <Calendar className="w-4 h-4" />
            Today
          </Button>
        </div>
        
        {/* Summary badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/50">
          <span className={`font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            PnL: {formatCurrency(totalPnl)}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Days: <span className="font-mono font-bold text-white">{totalDays}</span></span>
        </div>
      </div>
      
      {/* Calendar with weekly summary */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                {daysOfWeek.map(day => (
                  <th key={day} className="text-center text-sm text-muted-foreground py-3 font-normal">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.days.map((dayData, dayIndex) => (
                    <td key={dayIndex} className="p-1">
                      {dayData ? (
                        <div className={`p-2 rounded-lg min-h-[80px] transition-colors cursor-pointer hover:opacity-80 ${
                          dayData.pnl > 0 ? 'bg-emerald-900/40 border border-emerald-500/30' :
                          dayData.pnl < 0 ? 'bg-red-900/40 border border-red-500/30' :
                          'bg-secondary/30 border border-white/5'
                        }`}>
                          <div className="text-sm font-medium text-muted-foreground">{dayData.day}</div>
                          {dayData.trades > 0 && (
                            <>
                              <div className="text-xs text-muted-foreground mt-1">
                                {dayData.trades} <span className="text-[10px]">trades</span>
                              </div>
                              <div className={`text-sm font-mono font-bold mt-1 ${
                                dayData.pnl > 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {formatCurrency(dayData.pnl)}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 min-h-[80px] bg-black/20 rounded-lg" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Weekly Summary Sidebar */}
        <div className="lg:w-64 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Weekly Summary</h4>
          {weeks.map((week, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                week.pnl > 0 ? 'border-emerald-500/30 bg-emerald-900/20' :
                week.pnl < 0 ? 'border-red-500/30 bg-red-900/20' :
                'border-white/10 bg-secondary/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium">Week {week.weekNum}</span>
                  <span className="text-xs text-muted-foreground block">{week.dateRange}</span>
                </div>
              </div>
              {week.tradingDays > 0 ? (
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${
                    week.pnl > 0 ? 'text-emerald-400' : week.pnl < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    PnL: {formatCurrency(week.pnl)}
                  </span>
                  <span className="text-xs text-muted-foreground">Days: {week.tradingDays}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No trades</span>
              )}
            </div>
          ))}
        </div>
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

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API_URL}/export/trades/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trades_export_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Trades exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export trades');
    }
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
        
        <div className="flex items-center gap-3">
          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="export-btn">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export as Excel (XLSX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard delay={0}>
          <GaugeChart 
            value={summary?.win_rate || 0} 
            label="Winrate" 
            color="#3B82F6"
          />
        </StatCard>
        
        <StatCard delay={0.1}>
          <RatioBar 
            value={summary?.avg_win_loss_ratio || 0} 
            label="Avg Win / Avg Loss"
          />
        </StatCard>
        
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
        
        <WinstreakCard 
          daysStreak={summary?.win_streak_days || 0}
          tradesStreak={summary?.win_streak_trades || 0}
          currentDaysStreak={summary?.current_win_streak_days || 0}
          currentTradesStreak={summary?.current_win_streak_trades || 0}
        />
      </div>

      {/* Second metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard delay={0.3}>
          <GaugeChart 
            value={summary?.daily_win_rate || 0} 
            label="Daily Winrate" 
            color="#10B981"
          />
        </StatCard>
        
        <StatCard delay={0.4}>
          <RatioBar 
            value={summary?.day_win_loss_ratio || 0} 
            label="Day Win / Day Loss"
            winColor="#10B981"
          />
        </StatCard>
        
        <StatCard 
          title="Total P&L"
          value={formatCurrency(summary?.total_pnl || 0)}
          icon={DollarSign}
          trend={summary?.total_pnl || 0}
          delay={0.5}
        />
        
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
                  fontFamily: 'JetBrains Mono',
                  color: '#fff'
                }}
                labelStyle={{ color: '#A1A1AA' }}
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
