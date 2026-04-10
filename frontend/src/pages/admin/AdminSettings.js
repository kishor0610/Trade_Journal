import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure system settings</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="glass-card p-6 border border-white/5">
        <h3 className="font-heading font-bold text-lg mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Application Name</label>
            <input
              type="text"
              defaultValue="TradeLedger"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Support Email</label>
            <input
              type="email"
              defaultValue="support@tradeledger.com"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border border-white/5">
        <h3 className="font-heading font-bold text-lg mb-4">Feature Flags</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Enable AI Insights</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Enable MT5 Sync</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-sm">Maintenance Mode</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
