import React from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';

const AdminTickets = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage user support requests</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <div className="glass-card p-12 text-center border border-white/5">
        <LifeBuoy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">No tickets yet</h3>
        <p className="text-muted-foreground">Support ticket system will be implemented here</p>
      </div>
    </div>
  );
};

export default AdminTickets;
