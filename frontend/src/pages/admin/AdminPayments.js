import React from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';

const AdminPayments = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Payments & Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage billing and subscriptions</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90">
          <CreditCard className="w-4 h-4 mr-2" />
          New Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-white/5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-black font-mono mt-2">$0</p>
        </div>
        <div className="glass-card p-5 border border-white/5">
          <p className="text-sm text-muted-foreground">Active Subscriptions</p>
          <p className="text-3xl font-black font-mono mt-2">0</p>
        </div>
        <div className="glass-card p-5 border border-white/5">
          <p className="text-sm text-muted-foreground">Failed Payments</p>
          <p className="text-3xl font-black font-mono mt-2 text-red-400">0</p>
        </div>
      </div>

      <div className="glass-card p-12 text-center border border-white/5">
        <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">Payment system coming soon</h3>
        <p className="text-muted-foreground">Subscription and billing management will be implemented here</p>
      </div>
    </div>
  );
};

export default AdminPayments;
