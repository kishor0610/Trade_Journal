import React, { useState,useEffect } from 'react';
import adminApi from '../../lib/adminApi';
import * as adminActions from '../../lib/adminActions';
import { 
  Search, Filter, MoreVertical, UserCheck, UserX,
  Mail, RefreshCw, Download, Eye, Trash2, Key, CreditCard,
  ArrowUpDown, ChevronLeft, ChevronRight, Clock, Plus, Minus
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [reduceLoading, setReduceLoading] = useState(false);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const [pagination, setPagination] = useState({ skip: 0, limit: 50, total: 0 });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({ days: 30, reduceDays: 30, plan: 'monthly' });

  useEffect(() => {
    fetchUsers();
  }, [pagination.skip]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get(`/database/users/all?limit=${pagination.limit}&skip=${pagination.skip}`);
      setUsers(response.data.users || []);
      setPagination(prev => ({ ...prev, total: response.data.total_users || 0 }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (user) => {
    try {
      const response = await adminApi.get(`/users/${user.id}`);
      setSelectedUser(response.data);
      setShowUserModal(true);
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const handleActivateUser = async (userId, userName) => {
    setActivateLoading(true);
    try {
      await adminApi.post(`/users/${userId}/activate`);
      toast.success(`${userName} activated successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate user');
    } finally {
      setActivateLoading(false);
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to deactivate ${userName}?`)) {
      return;
    }
    setDeactivateLoading(true);
    try {
      await adminApi.post(`/users/${userId}/deactivate`);
      toast.success(`${userName} deactivated successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate user');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleResetPassword = async (userId, userName) => {
    if (!window.confirm(`Generate password reset link for ${userName}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await adminActions.resetUserPassword(userId);
      toast.success('Password reset link generated');
      
      // Show reset link in a prompt
      if (response.reset_link) {
        prompt('Copy this reset link and send to user:', response.reset_link);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate reset link');
    } finally {
      setActionLoading(false);
    }
  };

  const openEmailModal = (user) => {
    setSelectedUser(user);
    setEmailData({ subject: '', message: '' });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!emailData.subject || !emailData.message) {
      toast.error('Please fill in subject and message');
      return;
    }
    
    setActionLoading(true);
    try {
      await adminActions.sendUserEmail(selectedUser.id, emailData.subject, emailData.message);
      toast.success(`Email sent to ${selectedUser.email}`);
      setShowEmailModal(false);
      setEmailData({ subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure? This will delete ${userName} and all their data including trades and MT5 accounts.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await adminActions.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };
  const openSubscriptionModal = (user) => {
    setSelectedUser(user);
    setSubscriptionData({ days: 30, reduceDays: 30, plan: 'monthly' });
    setShowSubscriptionModal(true);
  };

  const handleExtendSubscription = async () => {
    if (!subscriptionData.days || subscriptionData.days < 1) {
      toast.error('Please provide valid number of days');
      return;
    }
    
    setExtendLoading(true);
    try {
      await adminApi.patch(`/subscriptions/${selectedUser.id}/extend`, {
        days: subscriptionData.days,
      });
      toast.success(`Extended subscription by ${subscriptionData.days} days`);
      setShowSubscriptionModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend subscription');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleReduceSubscription = async () => {
    if (!subscriptionData.reduceDays || subscriptionData.reduceDays < 1) {
      toast.error('Please provide valid number of days to reduce');
      return;
    }

    setReduceLoading(true);
    try {
      await adminApi.patch(`/subscriptions/${selectedUser.id}/reduce`, {
        days: subscriptionData.reduceDays,
      });
      toast.success(`Reduced subscription by ${subscriptionData.reduceDays} days`);
      setShowSubscriptionModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reduce subscription');
    } finally {
      setReduceLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!subscriptionData.plan) {
      toast.error('Please select a plan');
      return;
    }
    
    setChangePlanLoading(true);
    try {
      await adminApi.patch(`/subscriptions/${selectedUser.id}/change-plan`, {
        plan: subscriptionData.plan,
      });
      toast.success('Plan changed successfully');
      setShowSubscriptionModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change plan');
    } finally {
      setChangePlanLoading(false);
    }
  };
  const exportData = async () => {
    try {
      const response = await adminApi.get('/export/trades', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export completed');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nextPage = () => {
    if (pagination.skip + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
    }
  };

  const prevPage = () => {
    if (pagination.skip > 0) {
      setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} size="sm" className="bg-accent hover:bg-accent/90">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border border-white/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email, name, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-white/5">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-black font-mono mt-1">{pagination.total}</p>
        </div>
        <div className="glass-card p-4 border border-white/5">
          <p className="text-sm text-muted-foreground">Active Users</p>
          <p className="text-2xl font-black font-mono mt-1 text-emerald-400">
            {users.filter(u => u.statistics?.total_trades > 0).length}
          </p>
        </div>
        <div className="glass-card p-4 border border-white/5">
          <p className="text-sm text-muted-foreground">With MT5 Accounts</p>
          <p className="text-2xl font-black font-mono mt-1 text-cyan-400">
            {users.filter(u => u.mt5_accounts_count > 0).length}
          </p>
        </div>
        <div className="glass-card p-4 border border-white/5">
          <p className="text-sm text-muted-foreground">Total Trades</p>
          <p className="text-2xl font-black font-mono mt-1 text-violet-400">
            {users.reduce((sum, u) => sum + (u.statistics?.total_trades || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-semibold">User</th>
                <th className="text-left p-4 text-sm font-semibold">Email</th>
                <th className="text-left p-4 text-sm font-semibold">Trades</th>
                <th className="text-left p-4 text-sm font-semibold">P&L</th>
                <th className="text-left p-4 text-sm font-semibold">Win Rate</th>
                <th className="text-left p-4 text-sm font-semibold">MT5</th>
                <th className="text-left p-4 text-sm font-semibold">Joined</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-semibold">{user.statistics?.total_trades || 0}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.statistics?.closed_trades || 0} closed
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className={`text-sm font-mono font-bold ${
                        (user.statistics?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {(user.statistics?.total_pnl || 0) >= 0 ? '+' : ''}
                        ${(user.statistics?.total_pnl || 0).toFixed(2)}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-[60px]">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{ width: `${user.statistics?.win_rate || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{(user.statistics?.win_rate || 0).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        user.mt5_accounts_count > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.mt5_accounts_count || 0}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => viewUserDetails(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEmailModal(user)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.name)}>
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleActivateUser(user.id, user.name)}>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivateUser(user.id, user.name)}>
                            <UserX className="w-4 h-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openSubscriptionModal(user)}>
                            <CreditCard className="w-4 h-4 mr-2 text-violet-400" />
                            Manage Subscription
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-600"
                            onClick={() => deleteUser(user.id, user.name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-white/5">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.skip + 1} to {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={pagination.skip === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={pagination.skip + pagination.limit >= pagination.total}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete information about this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {selectedUser.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono mt-1">{selectedUser.id}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm mt-1">{new Date(selectedUser.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm font-mono mt-1">{selectedUser.currency || 'USD'}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="text-sm font-bold mt-1">{selectedUser.total_trades || 0}</p>
                </div>
              </div>

              {selectedUser.trades && selectedUser.trades.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recent Trades</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.trades.slice(0, 5).map((trade, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{trade.instrument}</p>
                          <p className="text-xs text-muted-foreground">{trade.position} • {trade.status}</p>
                        </div>
                        <p className={`text-sm font-mono font-bold ${
                          (trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email to User</DialogTitle>
            <DialogDescription>
              Send a custom email to {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Enter email subject..."
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email-message">Message (HTML supported)</Label>
              <Textarea
                id="email-message"
                placeholder="Enter email message..."
                rows={8}
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={actionLoading}
              className="bg-accent hover:bg-accent/90"
            >
              {actionLoading ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Management Modal */}
      <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Update subscription for {selectedUser?.name || 'user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Subscription Info */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Current Status</p>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  selectedUser?.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedUser?.subscription_status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {selectedUser?.subscription_status || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-sm font-semibold">{selectedUser?.subscription_plan || 'None'}</p>
              </div>
              {selectedUser?.subscription_end_date && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Expires On</p>
                  <p className="text-sm font-mono">{new Date(selectedUser.subscription_end_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Extend Subscription */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" />
                Extend Subscription
              </h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="Days"
                  value={subscriptionData.days}
                  onChange={(e) => setSubscriptionData({ ...subscriptionData, days: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <Button 
                  onClick={handleExtendSubscription}
                  disabled={extendLoading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {extendLoading ? 'Extending...' : 'Extend'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Common: 30 days (1mo), 90 days (3mo), 365 days (1yr)
              </p>
            </div>

            {/* Reduce Subscription */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Minus className="w-4 h-4 text-red-400" />
                Reduce Subscription
              </h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="Days"
                  value={subscriptionData.reduceDays}
                  onChange={(e) => setSubscriptionData({ ...subscriptionData, reduceDays: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <Button
                  onClick={handleReduceSubscription}
                  disabled={reduceLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {reduceLoading ? 'Reducing...' : 'Reduce'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Reducing may expire access immediately if end date goes below today.
              </p>
            </div>

            {/* Change Plan */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-400" />
                Change Plan
              </h4>
              <div className="flex gap-2">
                <Select value={subscriptionData.plan} onValueChange={(val) => setSubscriptionData({ ...subscriptionData, plan: val })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (₹499)</SelectItem>
                    <SelectItem value="quarterly">Quarterly (₹1399)</SelectItem>
                    <SelectItem value="yearly">Yearly (₹2999)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleChangePlan}
                  disabled={changePlanLoading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {changePlanLoading ? 'Changing...' : 'Change'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubscriptionModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
