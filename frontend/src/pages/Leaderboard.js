import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Trophy, TrendingUp, Award, Medal, Crown, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7Days');
  const { user } = useAuth();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/leaderboard?limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setLeaders(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);
    
    return () => clearInterval(interval);
  }, [timeFilter]);

  const isCurrentUser = (leaderId) => leaderId === user?.id;

  const getPodiumHeight = (rank) => {
    switch (rank) {
      case 1: return 'h-64';
      case 2: return 'h-48';
      case 3: return 'h-48';
      default: return 'h-0';
    }
  };

  const getPodiumOrder = () => {
    if (leaders.length < 3) return leaders;
    return [leaders[1], leaders[0], leaders[2]]; // 2nd, 1st, 3rd for visual order
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            🏆 Leaderboard
          </h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const topThree = getPodiumOrder();
  const restOfLeaders = leaders.slice(3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          🏆 Leaderboard
        </h1>
        
        {/* Time Filter */}
        <div className="flex gap-2 bg-card/50 p-1 rounded-lg border border-white/10">
          {['24 Hours', '7 Days', '30 Days', 'All'].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter.replace(' ', ''))}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeFilter === filter.replace(' ', '')
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 3 && (
        <div className="relative">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-pink-500/10 to-transparent rounded-3xl blur-3xl" />
          
          <div className="relative glass-card p-8 rounded-3xl">
            <div className="flex items-end justify-center gap-4 mb-8">
              {topThree.map((leader, index) => {
                const actualRank = leader.rank;
                const visualIndex = index; // 0=2nd, 1=1st, 2=3rd
                
                return (
                  <motion.div
                    key={leader.user_id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: visualIndex * 0.2 }}
                    className={`flex flex-col items-center ${
                      actualRank === 1 ? 'order-2' : actualRank === 2 ? 'order-1' : 'order-3'
                    }`}
                  >
                    {/* Crown for 1st place */}
                    {actualRank === 1 && (
                      <motion.div
                        initial={{ rotate: -20, y: -10 }}
                        animate={{ rotate: 0, y: 0 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="mb-2"
                      >
                        <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                      </motion.div>
                    )}
                    
                    {/* Astronaut Avatar */}
                    <div className={`relative mb-4 ${actualRank === 1 ? 'w-32 h-32' : 'w-24 h-24'}`}>
                      <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${
                        actualRank === 1 
                          ? 'from-yellow-500 to-amber-600 shadow-2xl shadow-yellow-500/50' 
                          : actualRank === 2 
                          ? 'from-gray-300 to-gray-500 shadow-xl shadow-gray-400/50'
                          : 'from-orange-600 to-orange-800 shadow-xl shadow-orange-600/50'
                      } flex items-center justify-center overflow-hidden`}>
                        {/* Astronaut placeholder - you can replace with actual images */}
                        <div className="text-6xl">🧑‍🚀</div>
                      </div>
                      
                      {/* Rank badge */}
                      <div className={`absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                        actualRank === 1 
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg'
                          : actualRank === 2
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 shadow-lg'
                          : 'bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg'
                      }`}>
                        {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                      </div>
                    </div>
                    
                    {/* User info */}
                    <div className="text-center mb-4">
                      <p className={`font-bold ${actualRank === 1 ? 'text-xl' : 'text-lg'} ${
                        isCurrentUser(leader.user_id) ? 'text-accent' : 'text-white'
                      }`}>
                        {leader.name}
                        {isCurrentUser(leader.user_id) && (
                          <span className="block text-xs text-accent mt-1">(You)</span>
                        )}
                      </p>
                      <p className={`text-sm font-mono mt-1 ${
                        leader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toFixed(0)} {leader.total_pnl >= 0 ? '🪙' : ''}
                      </p>
                    </div>
                    
                    {/* Podium */}
                    <div className={`w-32 ${
                      actualRank === 1 ? 'h-64' : 'h-48'
                    } bg-gradient-to-b ${
                      actualRank === 1 
                        ? 'from-yellow-500/30 to-amber-600/30 border-yellow-500/50'
                        : actualRank === 2
                        ? 'from-gray-300/30 to-gray-500/30 border-gray-400/50'
                        : 'from-orange-600/30 to-orange-800/30 border-orange-600/50'
                    } border-2 rounded-t-2xl flex flex-col items-center justify-center relative overflow-hidden`}>
                      {/* Rank number */}
                      <div className="absolute top-4 text-6xl font-black opacity-10">
                        {actualRank}
                      </div>
                      
                      {/* Stats */}
                      <div className="relative z-10 text-center space-y-2">
                        <div className="text-3xl font-black text-white">
                          {leader.score.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">SCORE</div>
                        <div className="text-sm text-blue-400 font-semibold">
                          {leader.win_rate.toFixed(0)}% WR
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rest of the leaderboard - Table format */}
      {restOfLeaders.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">RANK</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">TRADER</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">REALIZED P&L</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">TRADING VOLUME</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">XP</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {restOfLeaders.map((leader, index) => (
                  <motion.tr
                    key={leader.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      isCurrentUser(leader.user_id) ? 'bg-accent/10 ring-1 ring-accent/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                          {leader.rank}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <p className={`font-semibold ${
                            isCurrentUser(leader.user_id) ? 'text-accent' : 'text-white'
                          }`}>
                            {leader.name}
                            {isCurrentUser(leader.user_id) && (
                              <span className="ml-2 text-xs text-accent">(You)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-semibold ${
                        leader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-white/80">
                        {(leader.total_trades * 1000).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-yellow-400">{leader.score.toFixed(0)}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {leaders.length === 0 && !loading && (
        <div className="glass-card p-16 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-bold mb-2">No Traders Yet</h3>
          <p className="text-white/60">Start trading to join the leaderboard!</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
