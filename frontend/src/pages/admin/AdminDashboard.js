import React, { useState, useEffect } from 'react';
import adminApi from '../../lib/adminApi';
import { 
  Users, TrendingUp, Server, AlertTriangle, 
  Activity, DollarSign, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ icon: Icon, label, value, change, changeType, trend, color = "violet" }) => {
  const colorClasses = {
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  };

  return (
    <div className={`glass-card p-5 border bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            changeType === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {changeType === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-3xl font-black font-mono text-white mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {trend && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-muted-foreground">{trend}</p>
        </div>
      )}
    </div>
  );
};

const ActivityFeed = ({ activities }) => {
  return (
    <div className="glass-card p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-lg">Recent Activity</h3>
        <Activity className="w-5 h-5 text-violet-400" />
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                activity.type === 'success' ? 'bg-emerald-400' :
                activity.type === 'warning' ? 'bg-amber-400' :
                activity.type === 'error' ? 'bg-red-400' : 'bg-cyan-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.user} • {activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AlertCard = ({ alerts }) => {
  return (
    <div className="glass-card p-5 border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="font-heading font-bold text-lg">Critical Alerts</h3>
        </div>
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No active alerts</p>
        ) : (
          alerts.slice(0, 5).map((alert, i) => (
            <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-semibold text-red-400">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get('/stats');
      setStats(response.data);
      
      // Fetch activity (recent user actions)
      const activityRes = await adminApi.get('/activity?limit=20');
      setActivities(activityRes.data.activity || []);

      // Generate alerts based on stats
      const generatedAlerts = [];
      if (response.data.mt5_accounts_expired > 0) {
        generatedAlerts.push({
          title: `${response.data.mt5_accounts_expired} Expired MT5 Accounts`,
          description: 'Review and extend expired accounts'
        });
      }
      if (response.data.mt5_accounts_expiring_soon > 0) {
        generatedAlerts.push({
          title: `${response.data.mt5_accounts_expiring_soon} Accounts Expiring Soon`,
          description: 'Send renewal notifications'
        });
      }
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Sample chart data
  const userGrowthData = [
    { month: 'Jan', users: 120 },
    { month: 'Feb', users: 145 },
    { month: 'Mar', users: stats?.total_users || 180 },
  ];

  const tradeVolumeData = [
    { month: 'Jan', trades: 5200 },
    { month: 'Feb', trades: 6800 },
    { month: 'Mar', trades: stats?.total_trades || 8265 },
  ];

  const statusData = [
    { name: 'Active MT5', value: stats?.mt5_accounts_active || 0, color: '#10b981' },
    { name: 'Expiring Soon', value: stats?.mt5_accounts_expiring_soon || 0, color: '#f59e0b' },
    { name: 'Expired', value: stats?.mt5_accounts_expired || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Dashboard</h1>
          <p className="text-muted-foreground mt-1">System overview and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total_users?.toLocaleString() || '0'}
          change="+12%"
          changeType="up"
          trend="vs last month"
          color="violet"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Trades"
          value={stats?.total_trades?.toLocaleString() || '0'}
          change="+8%"
          changeType="up"
          trend="vs last month"
          color="emerald"
        />
        <StatCard
          icon={Server}
          label="MT5 Accounts"
          value={stats?.total_mt5_accounts?.toLocaleString() || '0'}
          change={stats?.mt5_accounts_expired > 0 ? `-${stats.mt5_accounts_expired}` : '0'}
          changeType={stats?.mt5_accounts_expired > 0 ? 'down' : 'up'}
          trend={`${stats?.mt5_accounts_active || 0} active`}
          color="cyan"
        />
        <StatCard
          icon={DollarSign}
          label="Total P&L"
          value={`$${(stats?.total_pnl || 0).toLocaleString()}`}
          change="+24%"
          changeType="up"
          trend="Across all users"
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="glass-card p-5 border border-white/5">
          <h3 className="font-heading font-bold text-lg mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userGrowthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trade Volume Chart */}
        <div className="glass-card p-5 border border-white/5">
          <h3 className="font-heading font-bold text-lg mb-4">Trade Volume</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tradeVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
              <Bar dataKey="trades" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>
        <div>
          <AlertCard alerts={alerts} />
        </div>
      </div>

      {/* MT5 Account Status */}
      <div className="glass-card p-5 border border-white/5">
        <h3 className="font-heading font-bold text-lg mb-4">MT5 Account Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center space-y-3">
            {statusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
