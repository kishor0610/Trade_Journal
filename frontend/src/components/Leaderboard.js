import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Trophy, TrendingUp, Award, Medal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLeaderboard = async () => {
    try {
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
  }, []);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-sm font-bold text-white/60">{rank}</span>;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40 shadow-lg shadow-yellow-500/20';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-400/40 shadow-lg shadow-gray-400/20';
      case 3:
        return 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-600/40 shadow-lg shadow-orange-600/20';
      default:
        return 'bg-white/5 border-white/10 hover:bg-white/10';
    }
  };

  const isCurrentUser = (leaderId) => leaderId === user?.id;

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold text-white">🏆 Leaderboard</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold text-white">🏆 Leaderboard</h3>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-400" />
      </div>

      {/* Leaders List */}
      <div className="space-y-2">
        <AnimatePresence>
          {leaders.map((leader, index) => (
            <motion.div
              key={leader.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border transition-all ${getRankStyle(leader.rank)} ${
                isCurrentUser(leader.user_id) ? 'ring-2 ring-accent ring-offset-2 ring-offset-card' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Icon */}
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(leader.rank)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${
                      isCurrentUser(leader.user_id) ? 'text-accent' : 'text-white'
                    }`}>
                      {leader.name}
                      {isCurrentUser(leader.user_id) && (
                        <span className="ml-1 text-xs text-accent">(You)</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className={`font-mono ${
                      leader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toFixed(0)}
                    </span>
                    <span className="text-white/60">•</span>
                    <span className="text-blue-400">{leader.win_rate.toFixed(0)}% WR</span>
                  </div>
                </div>

                {/* Score Badge */}
                <div className="flex flex-col items-end">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    leader.rank <= 3 
                      ? 'bg-gradient-to-r from-yellow-400/20 to-amber-400/20 text-yellow-400'
                      : 'bg-white/10 text-white/80'
                  }`}>
                    {leader.score.toFixed(0)}
                  </div>
                  <span className="text-[10px] text-white/40 mt-0.5">score</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaders.length === 0 && (
          <div className="text-center py-8 text-white/60 text-sm">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No traders yet</p>
            <p className="text-xs mt-1">Start trading to join!</p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-[10px] text-white/40 text-center">
          Score based on win rate, risk/reward & P&L
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
