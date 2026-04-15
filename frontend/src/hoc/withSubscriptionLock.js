import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from '../components/UpgradeModal';
import { Lock } from 'lucide-react';

const withSubscriptionLock = (WrappedComponent, featureName = 'this feature') => {
  return (props) => {
    const { isActive, isTrial, loading, subscription } = useSubscription();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const navigate = useNavigate();

    // A token exists but subscription hasn't loaded yet — treat as loading
    const hasToken = !!localStorage.getItem('token');
    const isResolvingSubscription = hasToken && subscription === null;

    useEffect(() => {
      // If not active and not on trial, show modal
      if (!loading && !isResolvingSubscription && !isActive && !isTrial) {
        setShowUpgradeModal(true);
      }
    }, [isActive, isTrial, loading, isResolvingSubscription]);

    if (loading || isResolvingSubscription) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      );
    }

    // Show locked overlay if subscription is truly expired (no token ambiguity)
    if (!isActive && !isTrial) {
      return (
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            {/* Blurred preview of the actual page */}
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none opacity-50">
<WrappedComponent {...props} />
              </div>
              
              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center space-y-6 max-w-md p-8">
                  <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Premium Feature Locked</h2>
                    <p className="text-muted-foreground">
                      <span className="font-semibold capitalize">{featureName}</span> requires an active subscription
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/subscription')}
                      className="w-full px-6 py-3 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
                    >
                      View Plans & Upgrade
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full px-6 py-3 border border-border hover:bg-white/5 rounded-lg transition-all"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <UpgradeModal 
            isOpen={showUpgradeModal}
            onClose={() => {
              setShowUpgradeModal(false);
              navigate('/dashboard');
            }}
            feature={featureName}
          />
        </div>
      );
    }

    // If active or trial, render the full component
    return <WrappedComponent {...props} />;
  };
};

export default withSubscriptionLock;
