import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Award, TrendingUp, Gift, Target, Share2, MessageCircle, Mail, Zap } from 'lucide-react';
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

  const shareViaWhatsApp = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      const text = `Join me on Trade Ledger and start tracking your trades professionally! Use my referral link and get 15 extra days free: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const shareViaEmail = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      const subject = 'Join Trade Ledger with my referral!';
      const body = `Hi!\n\nI've been using Trade Ledger to track my trades and it's been amazing. You should check it out!\n\nUse my referral link to get 15 extra days free:\n${link}\n\nHappy Trading!`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const getMilestones = () => {
    const paid = referralData?.stats?.successful_referrals || 0;
    return [
      { count: 1, reward: '100 XP', achieved: paid >= 1 },
      { count: 5, reward: '500 XP + Badge', achieved: paid >= 5 },
      { count: 10, reward: '1,200 XP + Special Badge', achieved: paid >= 10 },
      { count: 25, reward: '3,500 XP + Elite Badge', achieved: paid >= 25 }
    ];
  };

  const getNextMilestone = () => {
    const paid = referralData?.stats?.successful_referrals || 0;
    const milestones = getMilestones();
    return milestones.find(m => !m.achieved) || milestones[milestones.length - 1];
  };

  const getConversionRate = () => {
    const signups = referralData?.stats?.total_signups || 0;
    const paid = referralData?.stats?.successful_referrals || 0;
    if (signups === 0) return 0;
    return Math.round((paid / signups) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const nextMilestone = getNextMilestone();
  const conversionRate = getConversionRate();
  const paidReferrals = referralData?.stats?.successful_referrals || 0;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/20 rounded-xl">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">XP Balance</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">{xpBalance}</p>
                  <p className="text-xs text-muted-foreground mt-1">≈ ₹{xpBalance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sign-ups</p>
                  <p className="text-3xl font-bold text-white">{referralData?.stats?.total_signups || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Friends joined</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Subscribers</p>
                  <p className="text-3xl font-bold text-white">{paidReferrals}</p>
                  <p className="text-xs text-green-400 mt-1">
                    {conversionRate}% conversion rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total XP Earned</p>
                  <p className="text-3xl font-bold text-white">{referralData?.stats?.total_xp_earned || 0}</p>
                  <p className="text-xs text-purple-400 mt-1">Lifetime earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestone Progress */}
        {paidReferrals < 25 && (
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 backdrop-blur overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-400" />
                    Next Milestone
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {nextMilestone.count - paidReferrals} more subscriber{nextMilestone.count - paidReferrals !== 1 ? 's' : ''} to unlock {nextMilestone.reward}!
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-400">{paidReferrals} / {nextMilestone.count}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-3 bg-background/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                  style={{ width: `${Math.min((paidReferrals / nextMilestone.count) * 100, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {getMilestones().map((milestone, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1 ${
                      milestone.achieved 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' 
                        : 'bg-background/50 text-muted-foreground'
                    }`}>
                      {milestone.achieved ? <Zap className="w-5 h-5" /> : milestone.count}
                    </div>
                    <p className="text-xs text-muted-foreground">{milestone.count} subs</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Link Card */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-purple-500/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Your Referral Link</CardTitle>
            <p className="text-muted-foreground">
              Share this link with your friends. When they sign up and purchase a subscription, you'll earn 100 XP!
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
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
            
            {/* Quick Share Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400"
                disabled={!referralData?.code}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Share via WhatsApp
              </Button>
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
                disabled={!referralData?.code}
              >
                <Mail className="w-4 h-4 mr-2" />
                Share via Email
              </Button>
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-400"
                disabled={!referralData?.code}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
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
