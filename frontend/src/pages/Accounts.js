import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import withSubscriptionLock from '../hoc/withSubscriptionLock';
import { Plus, Trash2, RefreshCw, Link2, Unlink, Server, Key, Check, Eye, EyeOff, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { formatDateTime, formatCurrency } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AccountForm = ({ account, onSubmit, onClose }) => {
  const isEditMode = !!account;
  
  const [formData, setFormData] = useState({
    name: account?.name || '',
    login: account?.login || '',
    password: '',
    server: account?.server || '',
    platform: account?.platform || 'mt5',
    metaapi_account_id: account?.metaapi_account_id || '',
    currency: account?.currency || 'USD'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEditMode) {
        // Only send editable fields for update
        await onSubmit({
          currency: formData.currency,
          metaapi_account_id: formData.metaapi_account_id
        });
      } else {
        // Send all fields for create
        await onSubmit(formData);
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'add'} account`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Account Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-secondary border-white/10"
          placeholder="My MT5 Account"
          required={!isEditMode}
          disabled={isEditMode}
          data-testid="account-name-input"
        />
        {isEditMode && (
          <p className="text-xs text-muted-foreground">Account name cannot be changed after creation</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Login / Account Number</Label>
          <Input
            value={formData.login}
            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="12345678"
            required={!isEditMode}
            disabled={isEditMode}
            data-testid="account-login-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select 
            value={formData.platform} 
            onValueChange={(v) => setFormData({ ...formData, platform: v })}
            disabled={isEditMode}
          >
            <SelectTrigger className="bg-secondary border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mt5">MetaTrader 5</SelectItem>
              <SelectItem value="mt4">MetaTrader 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Broker Server</Label>
          <Input
            value={formData.server}
            onChange={(e) => setFormData({ ...formData, server: e.target.value })}
            className="bg-secondary border-white/10"
            placeholder="e.g., ICMarkets-Demo, Exness-Real"
            required={!isEditMode}
            disabled={isEditMode}
            data-testid="account-server-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Account Currency</Label>
          <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
            <SelectTrigger className="bg-secondary border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="INR">INR (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          MetaApi Account ID
          <span className="text-emerald-400 text-xs font-normal">(Required for sync)</span>
        </Label>
        <Input
          value={formData.metaapi_account_id}
          onChange={(e) => setFormData({ ...formData, metaapi_account_id: e.target.value })}
          className="bg-secondary border-white/10 font-mono text-sm"
          placeholder="e.g., 037d3f7c-7c77-425d-bdcf-6f87292325b7"
          data-testid="metaapi-account-id-input"
        />
        <p className="text-xs text-muted-foreground">
          Find this in your <a href="https://app.metaapi.cloud/accounts" target="_blank" rel="noreferrer" className="text-accent hover:underline">MetaApi dashboard</a> → Account → Copy the Account ID
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-white text-black hover:bg-gray-200">
          {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Account' : 'Add Account')}
        </Button>
      </div>
    </form>
  );
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [hasToken, setHasToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchAccounts();
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const res = await axios.get(`${API_URL}/mt5/metaapi-token`);
      setHasToken(res.data.has_token);
    } catch { }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('Please enter your MetaApi API token');
      return;
    }
    setSavingToken(true);
    try {
      await axios.post(`${API_URL}/mt5/metaapi-token`, { token: tokenInput.trim() });
      toast.success('MetaApi token saved!');
      setHasToken(true);
      setTokenInput('');
      setShowToken(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save token');
    } finally {
      setSavingToken(false);
    }
  };

  const handleRemoveToken = async () => {
    if (!window.confirm('Remove your MetaApi token? Sync will stop working.')) return;
    try {
      await axios.delete(`${API_URL}/mt5/metaapi-token`);
      toast.success('Token removed');
      setHasToken(false);
    } catch {
      toast.error('Failed to remove token');
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/mt5/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (data) => {
    await axios.post(`${API_URL}/mt5/accounts`, data);
    toast.success('Account added successfully');
    fetchAccounts();
  };

  const handleUpdateAccount = async (accountId, data) => {
    await axios.put(`${API_URL}/mt5/accounts/${accountId}`, data);
    toast.success('Account updated successfully');
    fetchAccounts();
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    
    try {
      await axios.delete(`${API_URL}/mt5/accounts/${accountId}`);
      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleSyncAccount = async (accountId) => {
    setSyncing(prev => ({ ...prev, [accountId]: true }));
    
    try {
      const response = await axios.post(`${API_URL}/mt5/accounts/${accountId}/sync`);
      const data = response.data;
      
      if (data.new_trades > 0) {
        toast.success(`${data.new_trades} new trades imported!`);
      } else if (data.total_deals > 0) {
        toast.info('All trades already synced. No new trades found.');
      } else {
        toast.info(data.message || 'Sync completed');
      }
      
      if (data.skipped_duplicates > 0) {
        toast.info(`${data.skipped_duplicates} duplicate trades skipped`);
      }
      
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync account');
    } finally {
      setSyncing(prev => ({ ...prev, [accountId]: false }));
    }
  };

  return (
    <div className="space-y-6" data-testid="accounts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Accounts</h1>
          <p className="text-muted-foreground">Connect and manage your MT5/MT4 trading accounts</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAccount(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-white text-black hover:bg-gray-200 gap-2" 
              data-testid="add-account-btn"
              onClick={() => setEditingAccount(null)}
            >
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingAccount ? 'Edit MT5 Account' : 'Connect MT5 Account'}
              </DialogTitle>
            </DialogHeader>
            <AccountForm
              account={editingAccount}
              onSubmit={(data) => editingAccount ? handleUpdateAccount(editingAccount.id, data) : handleAddAccount(data)}
              onClose={() => {
                setDialogOpen(false);
                setEditingAccount(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 border-l-4 border-l-accent"
      >
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">MetaApi Integration</h4>
            <p className="text-sm text-muted-foreground">
              Connect your MT5 accounts to automatically sync trades. First add your MetaApi API token below, 
              then add your account with the MetaApi Account ID. Click sync to import all your trades.
            </p>
          </div>
        </div>
      </motion.div>

      {/* MetaApi Token Setup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`glass-card p-5 border ${hasToken ? 'border-emerald-500/30' : 'border-amber-500/30'}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${hasToken ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
            <Key className={`w-5 h-5 ${hasToken ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">MetaApi API Token</h4>
              {hasToken && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Configured</span>}
            </div>
            {hasToken ? (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground">Your MetaApi token is saved and active.</p>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs" onClick={handleRemoveToken}>
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter your MetaApi API token to enable MT5 trade syncing. Get it from{' '}
                  <a href="https://app.metaapi.cloud/api-access/generate-token" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    MetaApi Dashboard → API Access
                  </a>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="bg-secondary border-white/10 font-mono text-xs pr-10"
                      placeholder="Paste your MetaApi API token (eyJhbGci...)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSaveToken} disabled={savingToken} className="bg-accent text-black hover:bg-accent/80">
                    {savingToken ? 'Saving...' : 'Save Token'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Link2 className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-heading font-bold mb-2">No accounts connected</h3>
          <p className="text-muted-foreground mb-4">
            Connect your MT5 or MT4 account to automatically import trades
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-white text-black hover:bg-gray-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Connect Your First Account
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="glass-card p-6"
              data-testid={`account-item-${account.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    account.is_connected ? 'bg-emerald-500/20' : 'bg-white/10'
                  }`}>
                    {account.is_connected ? (
                      <Link2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Unlink className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{account.platform.toUpperCase()} - {account.server}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSyncAccount(account.id)}
                    disabled={syncing[account.id]}
                    className="h-8 w-8"
                    data-testid={`sync-account-${account.id}`}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing[account.id] ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingAccount(account);
                      setDialogOpen(true);
                    }}
                    className="h-8 w-8 text-blue-500 hover:text-blue-400"
                    title="Edit Account"
                    data-testid={`edit-account-${account.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-400"
                    data-testid={`delete-account-${account.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Login</p>
                  <p className="font-mono font-bold">{account.login}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className={`font-medium ${account.is_connected ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {account.is_connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>

              {account.metaapi_account_id && (
                <div className="mb-4 p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">MetaApi Account</p>
                  <p className="font-mono text-xs text-accent truncate">{account.metaapi_account_id}</p>
                </div>
              )}

              {(account.balance !== null || account.equity !== null) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                    <p className="font-mono font-bold">{formatCurrency(account.balance, account.currency || 'USD')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Equity</p>
                    <p className="font-mono font-bold">{formatCurrency(account.equity, account.currency || 'USD')}</p>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Last sync: {account.last_sync ? formatDateTime(account.last_sync) : 'Never'}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default withSubscriptionLock(Accounts, 'accounts');
