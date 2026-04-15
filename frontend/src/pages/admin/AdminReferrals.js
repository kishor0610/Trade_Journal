import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, TrendingUp, Award, DollarSign, Search, Filter, Download, Activity, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminReferrals = () => {
  const [overview, setOverview] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, referralsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/referrals/overview`, { headers }),
        axios.get(`${API_URL}/admin/referrals/list`, { headers })
      ]);

      setOverview(overviewRes.data);
      setReferrals(referralsRes.data.referrals);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
      setLoading(false);
    }
  };

  const handleCreditXP = async (userId, amount) => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(
        `${API_URL}/admin/referrals/wallet/credit`,
        {
          user_id: userId,
          amount: parseInt(amount),
          reason: 'Admin credit'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('XP credited successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to credit XP');
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch = searchQuery === '' || 
      ref.referrer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && ref.successful_referrals > 0) ||
      (statusFilter === 'inactive' && ref.successful_referrals === 0);
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Referrer Email', 'Referral Code', 'Total Signups', 'Paid Subscribers', 'XP Earned', 'XP Balance'];
    const rows = filteredReferrals.map(ref => [
      ref.referrer_email,
      ref.referral_code,
      ref.total_signups,
      ref.successful_referrals,
      ref.total_xp_earned,
      ref.xp_balance
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getAverageConversionRate = () => {
    if (!referrals.length) return 0;
    const totalSignups = referrals.reduce((sum, r) => sum + (r.total_signups || 0), 0);
    const totalPaid = referrals.reduce((sum, r) => sum + (r.successful_referrals || 0), 0);
    return totalSignups > 0 ? Math.round((totalPaid / totalSignups) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  const avgConversionRate = getAverageConversionRate();

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Referral System
            </h1>
            <p className="text-muted-foreground mt-1">Manage referrals and XP wallet</p>
          </div>
          <Button
            onClick={exportToCSV}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                      {overview.total_referrers}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Active users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Signups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{overview.total_signups}</div>
                    <p className="text-xs text-blue-400 mt-1">Referred registrations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Paid Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{overview.successful_conversions}</div>
                    <p className="text-xs text-green-400 mt-1">{avgConversionRate}% conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total XP Distributed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Award className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{overview.total_xp_distributed}</div>
                    <p className="text-xs text-orange-400 mt-1">≈ ₹{overview.total_xp_distributed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Conversion Rate</p>
                  <p className="text-2xl font-bold text-white mt-1">{avgConversionRate}%</p>
                </div>
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg XP per Referrer</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {overview && overview.total_referrers > 0 
                      ? Math.round(overview.total_xp_distributed / overview.total_referrers)
                      : 0
                    }
                  </p>
                </div>
                <Target className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Referrers</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {referrals.filter(r => r.successful_referrals > 0).length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by email or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Referrers</option>
                  <option value="active">Active (Has Conversions)</option>
                  <option value="inactive">Inactive (No Conversions)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card className="bg-[#111] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">All Referrers</CardTitle>
            <CardDescription className="text-gray-400">
              {filteredReferrals.length} referrers found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Referrer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Signups</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">XP Earned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">XP Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredReferrals.length > 0 ? (
                    filteredReferrals.map((ref, index) => (
                      <tr key={index} className="hover:bg-[#0a0a0a] transition-colors">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-white">{ref.referrer_email || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{ref.referrer_id}</div>
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-xs bg-[#0a0a0a] px-2 py-1 rounded text-purple-400">
                            {ref.referral_code}
                          </code>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">{ref.total_signups}</td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={ref.successful_referrals > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-700/20 text-gray-400 border-gray-700/30'}
                          >
                            {ref.successful_referrals}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-purple-400">
                            {ref.total_xp_earned} XP
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-green-400">
                            {ref.xp_balance} XP
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const amount = prompt('Enter XP amount to credit:');
                              if (amount) handleCreditXP(ref.referrer_id, amount);
                            }}
                            className="text-xs border-purple-500/30 hover:bg-purple-500/20"
                          >
                            Credit XP
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-700 mb-3" />
                          <p className="text-gray-500 font-medium">No referrers found</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Referrers will appear here when users start sharing their links
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

export default AdminReferrals;
