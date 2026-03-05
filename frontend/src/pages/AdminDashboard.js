import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Shield, Users, Activity, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, LogOut, ChevronRight, Search, Calendar, Wallet
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Stat card component
const StatCard = ({ title, value, icon: Icon, color = 'accent', trend, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm mb-1">{title}</p>
        <p className="text-3xl font-mono font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-500`} />
      </div>
    </div>
  </motion.div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`),
        axios.get(`${API_URL}/admin/users?limit=100`),
        axios.get(`${API_URL}/admin/activity`)
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setRecentActivity(activityRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Admin session expired');
        localStorage.removeItem('admin_token');
        navigate('/admin');
      } else {
        toast.error('Failed to fetch admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/admin/users/${userId}`);
      setUserDetails(response.data);
      setSelectedUser(userId);
    } catch (error) {
      toast.error('Failed to fetch user details');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/admin');
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">TradeLedger Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2 text-red-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={Users}
            color="blue"
            subtitle={`+${stats?.recent_users_7d || 0} this week`}
          />
          <StatCard
            title="Total Trades"
            value={stats?.total_trades || 0}
            icon={Activity}
            color="emerald"
            subtitle={`+${stats?.recent_trades_7d || 0} this week`}
          />
          <StatCard
            title="Platform P&L"
            value={formatCurrency(stats?.total_pnl || 0)}
            icon={DollarSign}
            color={stats?.total_pnl >= 0 ? "emerald" : "red"}
          />
          <StatCard
            title="MT5 Accounts"
            value={stats?.total_mt5_accounts || 0}
            icon={Wallet}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-bold">All Users</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48 bg-secondary border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => fetchUserDetails(user.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedUser === user.id 
                        ? 'border-red-500/50 bg-red-500/10' 
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${user.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(user.total_pnl)}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.trade_count} trades</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* User Details / Recent Activity */}
          <div className="space-y-6">
            {userDetails ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-heading font-bold">User Details</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setUserDetails(null); setSelectedUser(null); }}>
                    Clear
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{userDetails.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userDetails.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(userDetails.user.created_at)}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <h3 className="text-sm font-medium mb-3">Trading Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Total Trades</p>
                        <p className="font-mono font-bold">{userDetails.stats.total_trades}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="font-mono font-bold">{userDetails.stats.win_rate}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Winning</p>
                        <p className="font-mono font-bold text-emerald-500">{userDetails.stats.winning_trades}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Losing</p>
                        <p className="font-mono font-bold text-red-500">{userDetails.stats.losing_trades}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Total P&L</p>
                      <p className={`text-xl font-mono font-bold ${userDetails.stats.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(userDetails.stats.total_pnl)}
                      </p>
                    </div>
                  </div>

                  {userDetails.mt5_accounts.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-medium mb-3">MT5 Accounts</h3>
                      {userDetails.mt5_accounts.map((acc) => (
                        <div key={acc.id} className="p-3 rounded-lg bg-secondary/50 mb-2">
                          <p className="font-medium">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.login} @ {acc.server}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-heading font-bold mb-4">Recent Activity</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-2">New Users</h3>
                    {recentActivity?.recent_users?.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/5">
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm text-muted-foreground mb-2">Recent Trades</h3>
                    {recentActivity?.recent_trades?.slice(0, 5).map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/5">
                        <div>
                          <p className="text-sm font-medium">{trade.instrument}</p>
                          <p className="text-xs text-muted-foreground">{trade.user_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-mono ${
                            trade.position === 'buy' || trade.position === 'long' ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {trade.position.toUpperCase()}
                          </span>
                          {trade.pnl && (
                            <p className={`text-xs font-mono ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatCurrency(trade.pnl)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
