import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatDate, INSTRUMENTS, POSITIONS, STATUSES, getInstrumentColor } from '../lib/utils';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TradeForm = ({ trade, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    instrument: trade?.instrument || 'BTC',
    position: trade?.position || 'long',
    entry_price: trade?.entry_price || '',
    exit_price: trade?.exit_price || '',
    quantity: trade?.quantity || '',
    entry_date: trade?.entry_date || new Date().toISOString().split('T')[0],
    exit_date: trade?.exit_date || '',
    notes: trade?.notes || '',
    status: trade?.status || 'open'
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Instrument</Label>
          <Select value={formData.instrument} onValueChange={(v) => setFormData({ ...formData, instrument: v })}>
            <SelectTrigger className="bg-secondary border-white/10" data-testid="trade-instrument-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENTS.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
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
            step="0.01"
            value={formData.entry_price}
            onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
            required
            data-testid="trade-entry-price-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Exit Price (optional)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.exit_price}
            onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
            data-testid="trade-exit-price-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="bg-secondary border-white/10 font-mono"
            placeholder="0.00"
            required
            data-testid="trade-quantity-input"
          />
        </div>
        
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
          <Label>Exit Date (optional)</Label>
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
          className="w-full h-24 px-3 py-2 bg-secondary border border-white/10 rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Trade notes..."
          data-testid="trade-notes-input"
        />
      </div>

      <div className="flex gap-3 pt-4">
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
  const [filters, setFilters] = useState({ status: '', instrument: '' });

  useEffect(() => {
    fetchTrades();
  }, [filters]);

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

  return (
    <div className="space-y-6" data-testid="journal-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black">Trade Journal</h1>
          <p className="text-muted-foreground">Track and manage all your trades</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="filter-btn">
                <Filter className="w-4 h-4" />
                Filters
                {(filters.status || filters.instrument) && (
                  <span className="w-2 h-2 bg-accent rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instrument</Label>
                  <Select value={filters.instrument} onValueChange={(v) => setFilters({ ...filters, instrument: v })}>
                    <SelectTrigger className="bg-secondary border-white/10 h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
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
                    onClick={() => setFilters({ status: '', instrument: '' })}
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
            <DialogContent className="bg-card border-white/10 max-w-lg">
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
        </div>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : trades.length === 0 ? (
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
        <div className="space-y-3">
          <AnimatePresence>
            {trades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card-hover p-4"
                data-testid={`trade-item-${trade.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Instrument & Position */}
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getInstrumentColor(trade.instrument)}20` }}
                    >
                      {trade.position === 'long' ? (
                        <TrendingUp className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: getInstrumentColor(trade.instrument) }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trade.instrument}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.position === 'long' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
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
                        {trade.exit_date && ` - ${formatDate(trade.exit_date)}`}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-6 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">Entry</span>
                      <span>{formatCurrency(trade.entry_price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Exit</span>
                      <span>{trade.exit_price ? formatCurrency(trade.exit_price) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Qty</span>
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
