import React, { useState, useEffect } from 'react';
import adminApi from '../../lib/adminApi';
import { 
  Database, Search, RefreshCw, Download, ChevronDown,
  Users, TrendingUp, Server, Key, FileText
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';

const AdminDatabase = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [collectionData, setCollectionData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionData(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get('/database/overview');
      setOverview(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load database overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionData = async (collection) => {
    try {
      if (collection === 'users') {
        const response = await adminApi.get('/database/users/all?limit=100');
        setCollectionData(response.data.users || []);
      } else if (collection === 'trades') {
        const response = await adminApi.get('/database/trades/all?limit=100');
        setCollectionData(response.data.trades || []);
      } else {
        setCollectionData(overview?.collections?.[collection]?.sample || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Failed to load ${collection} data`);
    }
  };

  const exportCollection = async (collection) => {
    try {
      const response = await adminApi.get('/export/trades', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${collection}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export completed');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const collections = [
    { id: 'users', label: 'Users', icon: Users, color: 'violet' },
    { id: 'trades', label: 'Trades', icon: TrendingUp, color: 'emerald' },
    { id: 'mt5_accounts', label: 'MT5 Accounts', icon: Server, color: 'cyan' },
    { id: 'password_resets', label: 'Password Resets', icon: Key, color: 'amber' },
  ];

  const renderField = (key, value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value.toString();
    if (key.toLowerCase().includes('password')) return '••••••••';
    return value.toString();
  };

  const filteredData = collectionData.filter(item => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Database Explorer</h1>
          <p className="text-muted-foreground mt-1">Browse and manage database collections</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchOverview} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => exportCollection(selectedCollection)} 
            size="sm" 
            className="bg-accent hover:bg-accent/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Export {selectedCollection}
          </Button>
        </div>
      </div>

      {/* Database Summary */}
      <div className="glass-card p-5 border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-violet-400" />
          <div>
            <h2 className="font-heading font-bold text-lg">
              {overview?.database_name || 'Database'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Last updated: {overview?.timestamp ? new Date(overview.timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-black font-mono mt-1">{overview?.summary?.total_users || 0}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-black font-mono mt-1">{overview?.summary?.total_trades || 0}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">MT5 Accounts</p>
            <p className="text-2xl font-black font-mono mt-1">{overview?.summary?.total_mt5_accounts || 0}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Global P&L</p>
            <p className={`text-2xl font-black font-mono mt-1 ${
              (overview?.summary?.global_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              ${(overview?.summary?.global_pnl || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {collections.map((collection) => {
          const Icon = collection.icon;
          const count = overview?.collections?.[collection.id]?.count || 0;
          const isSelected = selectedCollection === collection.id;
          
          return (
            <button
              key={collection.id}
              onClick={() => setSelectedCollection(collection.id)}
              className={`glass-card p-4 border transition-all text-left ${
                isSelected 
                  ? `border-${collection.color}-500/50 bg-${collection.color}-500/10` 
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${collection.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${collection.color}-400`} />
                </div>
                {isSelected && <div className={`w-2 h-2 rounded-full bg-${collection.color}-400`} />}
              </div>
              <p className="text-2xl font-black font-mono mb-1">{count}</p>
              <p className="text-sm text-muted-foreground">{collection.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="glass-card p-4 border border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search in collection data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Collection Data */}
      <div className="glass-card border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="font-heading font-bold">
              {collections.find(c => c.id === selectedCollection)?.label} Data
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-accent/20 text-accent">
              {filteredData.length} records
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchCollectionData(selectedCollection)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
        </div>

        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data found</p>
          ) : (
            filteredData.map((item, index) => (
              <Collapsible key={index} className="glass-card border border-white/5">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold">
                        {item.name || item.email || item.instrument || item.id || 'Record'}
                      </p>
                      {item.email && item.email !== item.name && (
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 pt-0">
                  <div className="bg-black/30 rounded-lg p-4 space-y-2 max-h-80 overflow-auto">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="flex gap-3">
                        <span className="text-xs text-muted-foreground font-mono min-w-[120px]">
                          {key}:
                        </span>
                        <span className="text-xs font-mono text-white flex-1 break-all">
                          {renderField(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDatabase;
