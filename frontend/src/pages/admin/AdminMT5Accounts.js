import React, { useState, useEffect } from 'react';
import adminApi from '../../lib/adminApi';
import { adminActions } from '../../lib/adminActions';
import { 
  Server, Search, RefreshCw, Download, Eye, Trash2, MoreVertical, Plus, Minus,
  ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const StatusBadge = ({ status, expiryDays }) => {
  if (status === 'DEPLOYED') {
    if (expiryDays !== null && expiryDays <= 7) {
      return (
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Expiring ({expiryDays}d)
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  }
  
  if (status === 'UNDEPLOYED') {
    return (
      <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-500/20 text-gray-400 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  }
  
  return (
    <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
      <XCircle className="w-3 h-3" />
      {status || 'Unknown'}
    </span>
  );
};

const AdminMT5Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [extendDays, setExtendDays] = useState(30);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Fetch MT5 accounts
      const accountsRes = await adminApi.get('/database/overview');
      
      const mt5Data = accountsRes.data.collections?.mt5_accounts?.sample || [];
      setAccounts(mt5Data);
      
      // Fetch user data to map user_id to email
      const usersRes = await adminApi.get('/database/users/all?limit=1000');
      
      const usersMap = {};
      usersRes.data.users.forEach(user => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to load MT5 accounts');
    } finally {
      setLoading(false);
    }
  };

  const calculateExpiryDays = (expiryDate) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleExtendMT5 = (account) => {
    setSelectedAccount(account);
    setExtendDays(30);
    setExtendModalOpen(true);
  };

  const submitExtendMT5 = async () => {
    if (!selectedAccount || !extendDays || extendDays < 1) {
      toast.error('Please provide a valid number of days');
      return;
    }

    try {
      await adminActions.extendMT5Account(selectedAccount.id, extendDays);
      toast.success(`Extended MT5 account by ${extendDays} days`);
      setExtendModalOpen(false);
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend MT5 account');
    }
  };

  const handleActivateMT5 = async (accountId) => {
    try {
      await adminActions.activateMT5Account(accountId);
      toast.success('MT5 account activated');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate account');
    }
  };

  const handleDeactivateMT5 = async (accountId) => {
    try {
      await adminActions.deactivateMT5Account(accountId);
      toast.success('MT5 account deactivated');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate account');
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const user = users[account.user_id];
    const matchesSearch = 
      account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_id?.toString().includes(searchQuery) ||
      user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') {
      return account.deployment_state === 'DEPLOYED';
    }
    if (filterStatus === 'expiring') {
      const days = calculateExpiryDays(account.expiry_date);
      return days !== null && days <= 7 && days > 0;
    }
    if (filterStatus === 'expired') {
      const days = calculateExpiryDays(account.expiry_date);
      return days !== null && days <= 0;
    }
    if (filterStatus === 'inactive') {
      return account.deployment_state !== 'DEPLOYED';
    }
    
    return true;
  });

  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.deployment_state === 'DEPLOYED').length,
    expiring: accounts.filter(a => {
      const days = calculateExpiryDays(a.expiry_date);
      return days !== null && days <= 7 && days > 0;
    }).length,
    expired: accounts.filter(a => {
      const days = calculateExpiryDays(a.expiry_date);
      return days !== null && days <= 0;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">MT5 Account Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage MetaTrader 5 accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchAccounts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
          onClick={() => setFilterStatus('all')}>
          <div className="flex items-center justify-between mb-2">
            <Server className="w-5 h-5 text-violet-400" />
            {filterStatus === 'all' && <div className="w-2 h-2 bg-accent rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Accounts</p>
        </div>
        
        <div className="glass-card p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 cursor-pointer hover:border-emerald-500/50 transition-colors"
          onClick={() => setFilterStatus('active')}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            {filterStatus === 'active' && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-emerald-400">{stats.active}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        
        <div className="glass-card p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 cursor-pointer hover:border-amber-500/50 transition-colors"
          onClick={() => setFilterStatus('expiring')}>
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            {filterStatus === 'expiring' && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">{stats.expiring}</p>
          <p className="text-sm text-muted-foreground">Expiring Soon</p>
        </div>
        
        <div className="glass-card p-4 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 cursor-pointer hover:border-red-500/50 transition-colors"
          onClick={() => setFilterStatus('expired')}>
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            {filterStatus === 'expired' && <div className="w-2 h-2 bg-red-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-red-400">{stats.expired}</p>
          <p className="text-sm text-muted-foreground">Expired</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border border-white/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by account name, ID, or user email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('active')}
            >
              Active
            </Button>
            <Button
              variant={filterStatus === 'expiring' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('expiring')}
            >
              Expiring
            </Button>
            <Button
              variant={filterStatus === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive
            </Button>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="glass-card border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-semibold">Account Name</th>
                <th className="text-left p-4 text-sm font-semibold">User</th>
                <th className="text-left p-4 text-sm font-semibold">Server</th>
                <th className="text-left p-4 text-sm font-semibold">Account ID</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
                <th className="text-left p-4 text-sm font-semibold">Expiry</th>
                <th className="text-left p-4 text-sm font-semibold">Synced</th>
                <th className="text-right p-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent" />
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-muted-foreground">
                    No MT5 accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, index) => {
                  const user = users[account.user_id];
                  const expiryDays = calculateExpiryDays(account.expiry_date);
                  
                  return (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <Server className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{account.name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{account.platform || 'MT5'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm">{user?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-mono">{account.server || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-mono">{account.account_id || account.login || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={account.deployment_state} expiryDays={expiryDays} />
                      </td>
                      <td className="p-4">
                        {account.expiry_date ? (
                          <div>
                            <p className="text-sm">{new Date(account.expiry_date).toLocaleDateString()}</p>
                            {expiryDays !== null && (
                              <p className={`text-xs font-mono ${
                                expiryDays <= 0 ? 'text-red-400' :
                                expiryDays <= 7 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {expiryDays <= 0 ? 'Expired' : `${expiryDays} days left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No expiry</p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {account.last_sync ? new Date(account.last_sync).toLocaleString() : 'Never'}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleExtendMT5(account)}
                            className="text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Extend
                          </Button>
                          {account.deployment_state === 'DEPLOYED' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeactivateMT5(account.id)}
                              className="text-xs text-amber-400 hover:text-amber-300"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleActivateMT5(account.id)}
                              className="text-xs text-emerald-400 hover:text-emerald-300"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend MT5 Account Modal */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend MT5 Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Extend expiry date for <span className="font-semibold text-white">{selectedAccount?.name || 'MT5 Account'}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="extend-days">Extend by (days)</Label>
              <Input
                id="extend-days"
                type="number"
                min="1"
                max="3650"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                placeholder="Enter number of days"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Common values: 30 days (1 month), 90 days (3 months), 365 days (1 year)
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setExtendModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitExtendMT5} className="bg-accent hover:bg-accent/90">
                Extend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMT5Accounts;
