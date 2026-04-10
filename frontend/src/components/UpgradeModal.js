import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Lock, Sparkles } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, feature = 'this feature' }) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20">
            <Lock className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Premium Feature Locked
          </DialogTitle>
          <DialogDescription className="text-center pt-4">
            <span className="font-semibold capitalize">{feature}</span> is a premium feature.
            <br />
            Upgrade your subscription to unlock unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
            <span>Unlimited trade logging & analytics</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
            <span>AI-powered insights & recommendations</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
            <span>MT5 integration & auto-sync</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
            <span>Advanced risk calculator</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-700"
          >
            View Plans & Upgrade
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
