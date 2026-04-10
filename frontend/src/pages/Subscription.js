import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Check, Crown, Zap, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Subscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const [subResponse, plansResponse] = await Promise.all([
        axios.get(`${API_URL}/subscriptions/my-subscription`),
        axios.get(`${API_URL}/subscriptions/plans`)
      ]);

      setSubscription(subResponse.data);
      setPlans(plansResponse.data.plans);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (planId) => {
    if (processing) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Step 1: Create Razorpay order
      const orderResponse = await axios.post(`${API_URL}/subscriptions/create-order`, {
        plan: planId
      });

      const { order_id, amount, currency, key_id } = orderResponse.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: key_id,
        amount: amount * 100, // Amount in paise
        currency: currency,
        name: 'TradeLedger',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // Step 3: Verify payment on backend
            const verifyResponse = await axios.post(`${API_URL}/subscriptions/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId
            });

            toast.success('Payment successful! Subscription activated.');
            
            // Refresh subscription data
            await fetchData();
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: subscription?.user_id || '',
          email: '',
        },
        theme: {
          color: '#9333ea'
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
      razorpay.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
        setProcessing(false);
      });
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/10 text-green-600 border-green-500/20',
      trial: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      expired: 'bg-red-500/10 text-red-600 border-red-500/20'
    };
    
    const labels = {
      active: 'Active',
      trial: 'Free Trial',
      expired: 'Expired'
    };

    return (
      <Badge variant="outline" className={styles[status] || styles.expired}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planId) => {
    const icons = {
      monthly: <Calendar className="w-8 h-8" />,
      quarterly: <Zap className="w-8 h-8" />,
      yearly: <Crown className="w-8 h-8" />
    };
    return icons[planId] || <CreditCard className="w-8 h-8" />;
  };

  const getPlanColor = (planId) => {
    const colors = {
      monthly: 'from-blue-500 to-cyan-500',
      quarterly: 'from-purple-500 to-pink-500',
      yearly: 'from-orange-500 to-red-500'
    };
    return colors[planId] || 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock premium features and take your trading to the next level
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="border-accent/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Current Subscription</CardTitle>
                  <CardDescription>Your subscription status and details</CardDescription>
                </div>
                {getStatusBadge(subscription.subscription_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-semibold capitalize">
                    {subscription.subscription_plan || 'Free Trial'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(subscription.subscription_start_date)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(subscription.subscription_end_date)}
                  </p>
                </div>
              </div>
              
              {subscription.subscription_status === 'trial' && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    🎉 You're on a <strong>7-day free trial</strong>! Upgrade to a paid plan to continue accessing premium features after your trial ends.
                  </p>
                </div>
              )}

              {subscription.subscription_status === 'expired' && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ Your subscription has expired. Please choose a plan below to continue using premium features.
                  </p>
                </div>
              )}

              {subscription.is_active && subscription.subscription_status === 'active' && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ Your subscription is active! You have full access to all premium features.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.plan_id}
              className={`relative overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-2xl ${
                plan.plan_id === 'yearly' 
                  ? 'border-accent shadow-lg shadow-accent/20' 
                  : 'border-border/50'
              }`}
            >
              {plan.discount && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-accent text-white font-bold">
                    {plan.discount} OFF
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center space-y-4 pb-8">
                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${getPlanColor(plan.plan_id)} flex items-center justify-center text-white`}>
                  {getPlanIcon(plan.plan_id)}
                </div>
                
                <div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-accent">₹{plan.price}</span>
                    <span className="text-muted-foreground">/ {plan.duration_days} days</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">Unlimited Trade Logging</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">Advanced Analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">AI Insights</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">MT5 Integration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">Priority Support</span>
                  </div>
                  {plan.plan_id === 'yearly' && (
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm font-semibold">Best Value - Save 50%!</span>
                    </div>
                  )}
                </div>

                {/* Razorpay Payment Button */}
                <div className="pt-4">
                  {subscription?.is_active && subscription?.subscription_plan === plan.plan_id ? (
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-700 text-white font-semibold"
                      onClick={() => handlePayment(plan.plan_id)}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        'Subscribe Now'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card className="border-accent/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Can I change my plan later?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Contact support for assistance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What happens after my trial ends?</h4>
              <p className="text-sm text-muted-foreground">
                Your access to premium features will be restricted. Subscribe to any plan to continue.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is my payment secure?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! All payments are processed securely through Razorpay with industry-standard encryption.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Can I get a refund?</h4>
              <p className="text-sm text-muted-foreground">
                Refunds are processed on a case-by-case basis. Contact our support team within 7 days of purchase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Need help choosing a plan or have questions?
          </p>
          <Button variant="link" className="text-accent">
            Contact Support →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
