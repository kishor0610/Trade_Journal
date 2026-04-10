import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, Info, CheckCircle, XCircle,
  Search, RefreshCw, Download, Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Mock logs data - in production, fetch from backend
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User kishorshivaji.ks@gmail.com logged in successfully',
        source: 'auth',
        details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'error',
        message: 'Failed to sync MT5 account: Connection timeout',
        source: 'mt5_sync',
        details: { accountId: '12345', error: 'ETIMEDOUT' }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'warning',
        message: 'MT5 account expiring in 3 days',
        source: 'expiry_check',
        details: { accountId: '12345', expiryDate: '2026-04-13' }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 900000).toISOString(),
        level: 'success',
        message: 'Trade imported successfully',
        source: 'csv_import',
        details: { tradeCount: 50, userId: 'abc-123' }
      },
    ];
    
    setLogs(mockLogs);
  }, []);

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getLevelStyles = (level) => {
    switch (level) {
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10';
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10';
      default:
        return 'border-cyan-500/30 bg-cyan-500/10';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Logs & Monitoring</h1>
          <p className="text-muted-foreground mt-1">System logs and error tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90">
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-white/5 cursor-pointer hover:border-white/10"
          onClick={() => setFilterLevel('all')}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-violet-400" />
            {filterLevel === 'all' && <div className="w-2 h-2 bg-accent rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Logs</p>
        </div>
        
        <div className="glass-card p-4 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 cursor-pointer hover:border-red-500/50"
          onClick={() => setFilterLevel('error')}>
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            {filterLevel === 'error' && <div className="w-2 h-2 bg-red-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-red-400">{stats.errors}</p>
          <p className="text-sm text-muted-foreground">Errors</p>
        </div>
        
        <div className="glass-card p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 cursor-pointer hover:border-amber-500/50"
          onClick={() => setFilterLevel('warning')}>
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {filterLevel === 'warning' && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">{stats.warnings}</p>
          <p className="text-sm text-muted-foreground">Warnings</p>
        </div>
        
        <div className="glass-card p-4 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 cursor-pointer hover:border-cyan-500/50"
          onClick={() => setFilterLevel('info')}>
          <div className="flex items-center justify-between mb-2">
            <Info className="w-5 h-5 text-cyan-400" />
            {filterLevel === 'info' && <div className="w-2 h-2 bg-cyan-400 rounded-full" />}
          </div>
          <p className="text-2xl font-black font-mono text-cyan-400">{stats.info}</p>
          <p className="text-sm text-muted-foreground">Info</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border border-white/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterLevel === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('all')}
            >
              All
            </Button>
            <Button
              variant={filterLevel === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('error')}
            >
              Errors
            </Button>
            <Button
              variant={filterLevel === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('warning')}
            >
              Warnings
            </Button>
            <Button
              variant={filterLevel === 'info' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('info')}
            >
              Info
            </Button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="glass-card p-8 text-center border border-white/5">
            <p className="text-muted-foreground">No logs found</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`glass-card p-4 border ${getLevelStyles(log.level)}`}>
              <div className="flex items-start gap-4">
                <div className="mt-1">{getLevelIcon(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="text-sm font-medium">{log.message}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 bg-white/10 rounded font-mono">
                      {log.source}
                    </span>
                    <span>ID: {log.id}</span>
                  </div>
                  {log.details && (
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Show details
                      </summary>
                      <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs font-mono overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
