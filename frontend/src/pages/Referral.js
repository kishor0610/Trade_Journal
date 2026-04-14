import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Award, TrendingUp, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Referral = () => {
  const [referralData, setReferralData] = useState(null);
  const [xpBalance, setXpBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to view referral data');
        setLoading(false);
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch referral code and stats
      const [codeRes, statsRes, balanceRes] = await Promise.all([
        fetch(`${API_URL}/referral/code`, { headers }),
        fetch(`${API_URL}/referral/stats`, { headers }),
        fetch(`${API_URL}/referral/wallet/balance`, { headers })
      ]);

      if (!codeRes.ok || !statsRes.ok || !balanceRes.ok) {
        throw new Error('Failed to fetch referral data');
      }

      const codeData = await codeRes.json();
      const statsData = await statsRes.json();
      const balanceData = await balanceRes.json();

      setReferralData({
        code: codeData.referral_code,
        stats: statsData,
        referrals: statsData.referrals || []
      });
      setXpBalance(balanceData.xp_balance || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast.error('Failed to copy link');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Refer & Earn
          </h1>
          <p className="text-muted-foreground text-lg">
            Share your referral link and earn 100 XP for every successful subscription!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-accent/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/20 rounded-xl">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">XP Balance</p>
                  <p className="text-3xl font-bold">{xpBalance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sign-ups</p>
                  <p className="text-3xl font-bold">{referralData?.stats?.total_signups || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Subscribers</p>
                  <p className="text-3xl font-bold">{referralData?.stats?.successful_referrals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total XP Earned</p>
                  <p className="text-3xl font-bold">{referralData?.stats?.total_xp_earned || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-purple-500/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Your Referral Link</CardTitle>
            <p className="text-muted-foreground">
              Share this link with your friends. When they sign up and purchase a subscription, you'll earn 100 XP!
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <code className="block bg-background/50 border border-accent/30 rounded-lg px-4 py-3 text-sm font-mono break-all">
                  {window.location.origin}/register?ref={referralData?.code || 'LOADING...'}
                </code>
              </div>
              <Button
                onClick={copyReferralLink}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold whitespace-nowrap"
                disabled={!referralData?.code}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent">1</span>
                </div>
                <h3 className="font-semibold">Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Copy and share your unique referral link with friends
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-400">2</span>
                </div>
                <h3 className="font-semibold">They Subscribe</h3>
                <p className="text-sm text-muted-foreground">
                  When they purchase a premium subscription, they get +15 days bonus
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-400">3</span>
                </div>
                <h3 className="font-semibold">Earn Rewards</h3>
                <p className="text-sm text-muted-foreground">
                  You earn 100 XP (₹100 value) instantly after their payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track all users who signed up using your referral link
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sign-up Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      XP Earned
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {referralData?.referrals?.length > 0 ? (
                    referralData.referrals.map((referral, index) => (
                      <tr key={index} className="hover:bg-accent/5 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {referral.referred_user_email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="text-sm font-medium">
                              {referral.referred_user_email || 'Anonymous'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {referral.status === 'paid' ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                              Subscribed ✓
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              Signed Up
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(referral.referred_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {referral.status === 'paid' ? (
                            <span className="text-sm font-semibold text-green-400">
                              +100 XP
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-16 h-16 text-muted-foreground/50" />
                          <p className="text-muted-foreground font-medium">No referrals yet</p>
                          <p className="text-sm text-muted-foreground/70">
                            Start sharing your link to see referrals here
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Referral;
