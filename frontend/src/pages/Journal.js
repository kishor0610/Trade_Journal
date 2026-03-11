import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Filter, X, Search, SlidersHorizontal, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatDate, INSTRUMENTS, POSITIONS, STATUSES, getInstrumentColor } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TradeForm = ({ trade, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    instrument: trade?.instrument || 'XAU/USD',
    position: trade?.position || 'buy',
    entry_price: trade?.entry_price || '',
    exit_price: trade?.exit_price || '',
    quantity: trade?.quantity || '',
    entry_date: trade?.entry_date?.slice(0, 10) || new Date().toISOString().split('T')[0],
    exit_date: trade?.exit_date?.slice(0, 10) || '',
    notes: trade?.notes || '',
    status: trade?.status || 'open',
    stop_loss: trade?.stop_loss || '',
    take_profit: trade?.take_profit || '',
    commission: trade?.commission || '',
    swap: trade?.swap || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        entry_price: parseFloat(formData.entry_price),
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        quantity: parseFloat(formData.quantity),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        commission: formData.commission ? parseFloat(formData.commission) : 0,
        swap: formData.swap ? parseFloat(formData.swap) : 0,
        exit_date: formData.exit_date || null
      };
      
      await onSubmit(payload);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Instrument</Label>
          <Select value={formData.instrument} onValueChange={(v) => setFormData({ ...formData, instrument: v })}>
            <SelectTrigger className="bg-secondary border-white/10" data-testid="trade-instrument-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENTS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                    {i.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Position</Label>
          <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
            <SelectTrigger className="bg-secondary border-white/10" data-testid="trade-position-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entry Price</Label>
          <Input
            type="number"
            step="0.00001"
            value={formData.entry_price}
            onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
            required
            data-testid="trade-entry-price-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Exit Price</Label>
          <Input
            type="number"
            step="0.00001"
            value={formData.exit_price}
            onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
            data-testid="trade-exit-price-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Lot Size</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.01"
            required
            data-testid="trade-quantity-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Stop Loss</Label>
          <Input
            type="number"
            step="0.00001"
            value={formData.stop_loss}
            onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Take Profit</Label>
          <Input
            type="number"
            step="0.00001"
            value={formData.take_profit}
            onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger className="bg-secondary border-white/10" data-testid="trade-status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Commission</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.commission}
            onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Swap</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.swap}
            onChange={(e) => setFormData({ ...formData, swap: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entry Date</Label>
          <Input
            type="date"
            value={formData.entry_date}
            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
            className="bg-secondary border-white/10"
            required
            data-testid="trade-entry-date-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Exit Date</Label>
          <Input
            type="date"
            value={formData.exit_date}
            onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
            className="bg-secondary border-white/10"
            data-testid="trade-exit-date-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full h-20 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
          placeholder="Trade notes, strategy, observations..."
          data-testid="trade-notes-input"
        />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-card">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" data-testid="trade-form-cancel-btn">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-white text-black hover:bg-gray-200" data-testid="trade-form-submit-btn">
          {loading ? 'Saving...' : (trade ? 'Update Trade' : 'Add Trade')}
        </Button>
      </div>
    </form>
  );
};

export default function Journal() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [filters, setFilters] = useState({ status: '', instrument: '', search: '' });
  const [sortBy, setSortBy] = useState('entry_date');
  const [sortOrder, setSortOrder] = useState('desc'); // Always desc - newest first
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.instrument]);

  const fetchTrades = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.instrument) params.append('instrument', filters.instrument);
      
      const response = await axios.get(`${API_URL}/trades?${params}`);
      setTrades(response.data);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrade = async (data) => {
    await axios.post(`${API_URL}/trades`, data);
    toast.success('Trade added successfully');
    fetchTrades();
  };

  const handleUpdateTrade = async (data) => {
    await axios.put(`${API_URL}/trades/${editingTrade.id}`, data);
    toast.success('Trade updated successfully');
    fetchTrades();
  };

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    
    try {
      await axios.delete(`${API_URL}/trades/${tradeId}`);
      toast.success('Trade deleted successfully');
      fetchTrades();
    } catch (error) {
      toast.error('Failed to delete trade');
    }
  };

  const openEditDialog = (trade) => {
    setEditingTrade(trade);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTrade(null);
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/trades/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportResult(response.data);
      
      if (response.data.imported_count > 0) {
        toast.success(`Successfully imported ${response.data.imported_count} trades!`);
        fetchTrades();
      } else if (response.data.skipped_count > 0) {
        toast.warning('No new trades imported. All entries were duplicates or had errors.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to import CSV';
      setImportResult({ success: false, message: errorMsg, errors: [errorMsg] });
      toast.error(errorMsg);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteAllTrades = async () => {
    setDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/trades`);
      toast.success(response.data.message);
      setDeleteAllDialogOpen(false);
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete trades');
    } finally {
      setDeleting(false);
    }
  };

  // Filter trades by search
  const filteredTrades = trades.filter(trade => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return trade.instrument.toLowerCase().includes(search) ||
           trade.notes?.toLowerCase().includes(search);
  });

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'pnl') {
      comparison = (a.pnl || 0) - (b.pnl || 0);
    } else if (sortBy === 'entry_date') {
      comparison = new Date(a.entry_date || 0) - new Date(b.entry_date || 0);

      // For imported rows with same trade date, keep newer imports first.
      if (comparison === 0) {
        comparison = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
    } else {
      comparison = new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Calculate summary
  const summary = {
    totalPnl: filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    winCount: filteredTrades.filter(t => (t.pnl || 0) > 0).length,
    lossCount: filteredTrades.filter(t => (t.pnl || 0) < 0).length,
    openCount: filteredTrades.filter(t => t.status === 'open').length
  };

  return (
    <div className="space-y-6" data-testid="journal-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Trade Journal</h1>
          <p className="text-muted-foreground">Track and manage all your trades</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 w-40 md:w-56 bg-secondary border-white/10"
            />
          </div>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="filter-btn">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
                {(filters.status || filters.instrument) && (
                  <span className="w-2 h-2 bg-accent rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instrument</Label>
                  <Select value={filters.instrument || "all"} onValueChange={(v) => setFilters({ ...filters, instrument: v === "all" ? "" : v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {INSTRUMENTS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(filters.status || filters.instrument) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ status: '', instrument: '', search: filters.search })}
                    className="w-full text-xs"
                  >
                    <X className="w-3 h-3 mr-1" /> Clear filters
                  </Button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Trade Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingTrade(null)}
                className="bg-white text-black hover:bg-gray-200 gap-2"
                data-testid="add-trade-btn"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Trade</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-lg max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="font-heading">{editingTrade ? 'Edit Trade' : 'Add New Trade'}</DialogTitle>
              </DialogHeader>
              <TradeForm
                trade={editingTrade}
                onSubmit={editingTrade ? handleUpdateTrade : handleAddTrade}
                onClose={closeDialog}
              />
            </DialogContent>
          </Dialog>

          {/* Import Button */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2"
                data-testid="import-btn"
                onClick={() => setImportResult(null)}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  Import Trades from CSV
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Upload a CSV file from your broker to bulk import your trading history.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-white/10">
                  <h4 className="text-sm font-medium mb-2">Supported columns:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <code>symbol</code> - Trading instrument (e.g., XAUUSDm)</li>
                    <li>• <code>type</code> - buy/sell</li>
                    <li>• <code>lots</code> - Position size</li>
                    <li>• <code>opening_price</code>, <code>closing_price</code></li>
                    <li>• <code>opening_time_utc</code>, <code>closing_time_utc</code></li>
                    <li>• <code>profit_usd</code> - P&L (optional)</li>
                    <li>• <code>ticket</code> - Trade ID (prevents duplicates)</li>
                  </ul>
                </div>

                {/* File upload area */}
                <label 
                  htmlFor="csv-upload"
                  className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer
                    ${importing 
                      ? 'border-accent/50 bg-accent/10' 
                      : 'border-white/10 hover:border-accent/50 hover:bg-secondary/30'}`}
                >
                  {importing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <span className="text-sm">Importing...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">Click to select CSV file</span>
                      <span className="text-xs text-muted-foreground">or drag and drop</span>
                    </>
                  )}
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVImport}
                    disabled={importing}
                    data-testid="csv-file-input"
                  />
                </label>

                {/* Import result */}
                {importResult && (
                  <div className={`p-4 rounded-lg ${importResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <div className="flex items-start gap-2">
                      {importResult.success ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{importResult.message}</p>
                        {importResult.imported_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {importResult.imported_count} imported, {importResult.skipped_count} skipped
                          </p>
                        )}
                        {importResult.errors?.length > 0 && (
                          <div className="mt-2 text-xs text-red-400 max-h-24 overflow-y-auto">
                            {importResult.errors.slice(0, 5).map((err, i) => (
                              <div key={i}>{err}</div>
                            ))}
                            {importResult.errors.length > 5 && (
                              <div>...and {importResult.errors.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setImportDialogOpen(false)} 
                    className="flex-1"
                    data-testid="import-dialog-close"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="export-btn">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const url = `${API_URL}/export/trades/csv`;
                window.open(url, '_blank');
              }}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const url = `${API_URL}/export/trades/xlsx`;
                window.open(url, '_blank');
              }}>
                Export as Excel (XLSX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete All Button */}
          {trades.length > 0 && (
            <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 border-red-500/30"
                  data-testid="delete-all-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:inline">Delete All</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    Delete All Trades
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm">
                      You are about to delete <strong className="text-red-500">{trades.length} trades</strong> from your journal.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This will permanently remove all your trading history. Make sure to export your data first if you need a backup.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setDeleteAllDialogOpen(false)} 
                      className="flex-1"
                      disabled={deleting}
                      data-testid="delete-all-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDeleteAllTrades}
                      disabled={deleting}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      data-testid="delete-all-confirm"
                    >
                      {deleting ? 'Deleting...' : 'Delete All Trades'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 p-4 glass-card">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Total P&L:</span>
          <span className={`font-mono font-bold ${summary.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(summary.totalPnl)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Wins:</span>
          <span className="font-mono font-bold text-emerald-500">{summary.winCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Losses:</span>
          <span className="font-mono font-bold text-red-500">{summary.lossCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Open:</span>
          <span className="font-mono font-bold text-blue-400">{summary.openCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Total:</span>
          <span className="font-mono font-bold">{filteredTrades.length}</span>
        </div>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : sortedTrades.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-heading font-bold mb-2">No trades yet</h3>
          <p className="text-muted-foreground mb-4">Start tracking your trades by adding your first entry</p>
          <Button
            onClick={() => { setEditingTrade(null); setDialogOpen(true); }}
            className="bg-white text-black hover:bg-gray-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Your First Trade
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="glass-card-hover p-4"
                data-testid={`trade-item-${trade.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Instrument & Position */}
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getInstrumentColor(trade.instrument)}20` }}
                    >
                      {trade.position === 'buy' || trade.position === 'long' ? (
                        <TrendingUp className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{trade.instrument}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.position === 'buy' || trade.position === 'long' 
                            ? 'bg-emerald-500/20 text-emerald-500' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.position.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-muted-foreground'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(trade.entry_date)}
                        {trade.exit_date && ` → ${formatDate(trade.exit_date)}`}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-4 md:gap-6 font-mono text-sm flex-wrap">
                    <div>
                      <span className="text-muted-foreground text-xs block">Entry</span>
                      <span>{formatCurrency(trade.entry_price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Exit</span>
                      <span>{trade.exit_price ? formatCurrency(trade.exit_price) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Lots</span>
                      <span>{trade.quantity}</span>
                    </div>
                    {trade.pnl !== null && (
                      <div>
                        <span className="text-muted-foreground text-xs block">P&L</span>
                        <span className={`font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(trade.pnl)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(trade)}
                      className="h-8 w-8"
                      data-testid={`edit-trade-${trade.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTrade(trade.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-400"
                      data-testid={`delete-trade-${trade.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {trade.notes && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-sm text-muted-foreground">{trade.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-24 right-4 md:hidden z-40">
        <Button
          onClick={() => { setEditingTrade(null); setDialogOpen(true); }}
          className="w-14 h-14 rounded-full bg-accent text-black shadow-lg shadow-accent/30"
          data-testid="mobile-add-trade-btn"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
