import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Award, TrendingUp, Gift } from 'lucide-react';
import Layout from '../components/Layout';

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
      
      // Fetch referral code and stats
      const [codeRes, statsRes, balanceRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/referral/code`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/referral/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/referral/wallet/balance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const codeData = await codeRes.json();
      const statsData = await statsRes.json();
      const balanceData = await balanceRes.json();

      setReferralData({
        code: codeData.referral_code,
        stats: statsData,
        referrals: statsData.referrals || []
      });
      setXpBalance(balanceData.xp_balance);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Refer & Earn
          </h1>
          <p className="text-gray-600">
            Share your referral link and earn 100 XP for every successful subscription!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{xpBalance}</h3>
            <p className="text-sm text-gray-500">XP Balance</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {referralData?.stats?.total_signups || 0}
            </h3>
            <p className="text-sm text-gray-500">Total Sign-ups</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {referralData?.stats?.successful_referrals || 0}
            </h3>
            <p className="text-sm text-gray-500">Paid Subscribers</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <Gift className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {referralData?.stats?.total_xp_earned || 0}
            </h3>
            <p className="text-sm text-gray-500">Total XP Earned</p>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Your Referral Link</h2>
            <p className="text-purple-100 mb-6">
              Share this link with your friends. When they sign up and purchase a subscription, you'll earn 100 XP!
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <code className="text-white font-mono text-sm break-all">
                  {window.location.origin}/register?ref={referralData?.code || 'LOADING'}
                </code>
              </div>
              <button
                onClick={copyReferralLink}
                className="bg-white text-purple-600 px-6 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Share Your Link</h3>
                <p className="text-sm text-gray-600">
                  Copy and share your unique referral link with friends
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">They Subscribe</h3>
                <p className="text-sm text-gray-600">
                  When they purchase a premium subscription, they get +15 days bonus
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Earn Rewards</h3>
                <p className="text-sm text-gray-600">
                  You earn 100 XP (₹100 value) instantly after their payment
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">Your Referrals</h2>
              <p className="text-sm text-gray-500 mt-1">
                Track all users who signed up using your referral link
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sign-up Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      XP Earned
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {referralData?.referrals?.length > 0 ? (
                    referralData.referrals.map((referral, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {referral.referred_user_email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {referral.referred_user_email || 'Anonymous'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {referral.status === 'paid' ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Subscribed ✓
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Signed Up
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(referral.referred_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {referral.status === 'paid' ? (
                            <span className="text-sm font-semibold text-green-600">
                              +100 XP
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-gray-500 font-medium">No referrals yet</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Start sharing your link to see referrals here
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Referral;
