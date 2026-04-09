import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Trophy, TrendingUp, Award, Medal, Crown, Star, Flame, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Floating animation keyframes
const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Glow pulse animation
const glowPulse = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Crown bounce animation
const crownBounce = {
  initial: { y: 0, rotate: -10 },
  animate: {
    y: [-5, 0, -5],
    rotate: [-10, 0, 10, 0, -10],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

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

  const getPodiumStyles = (rank) => {
    switch (rank) {
      case 1:
        return {
          height: 'h-80',
          bgGradient: 'from-yellow-600/40 via-yellow-500/30 to-amber-600/40',
          glowColor: 'rgba(251, 191, 36, 0.6)',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-400',
          medalSize: 'w-36 h-36',
          avatarBg: 'from-yellow-500 to-amber-600',
          avatarShadow: 'shadow-2xl shadow-yellow-500/60'
        };
      case 2:
        return {
          height: 'h-64',
          bgGradient: 'from-gray-400/40 via-gray-300/30 to-gray-500/40',
          glowColor: 'rgba(156, 163, 175, 0.5)',
          borderColor: 'border-gray-400/50',
          textColor: 'text-gray-300',
          medalSize: 'w-28 h-28',
          avatarBg: 'from-gray-300 to-gray-500',
          avatarShadow: 'shadow-xl shadow-gray-400/50'
        };
      case 3:
        return {
          height: 'h-64',
          bgGradient: 'from-orange-700/40 via-orange-600/30 to-orange-800/40',
          glowColor: 'rgba(234, 88, 12, 0.5)',
          borderColor: 'border-orange-600/50',
          textColor: 'text-orange-400',
          medalSize: 'w-28 h-28',
          avatarBg: 'from-orange-600 to-orange-800',
          avatarShadow: 'shadow-xl shadow-orange-600/50'
        };
      default:
        return {};
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
        <div className="relative min-h-[600px]">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          {/* Spotlight for rank 1 */}
          <motion.div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-radial from-yellow-500/30 via-yellow-500/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <div className="relative glass-card p-12 rounded-3xl backdrop-blur-xl">
            <div className="flex items-end justify-center gap-8">
              {topThree.map((leader, index) => {
                const actualRank = leader.rank;
                const styles = getPodiumStyles(actualRank);
                const isUser = isCurrentUser(leader.user_id);
                
                return (
                  <motion.div
                    key={leader.user_id}
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: isUser ? 1.05 : 1 }}
                    transition={{ delay: index * 0.3, type: 'spring', bounce: 0.4 }}
                    className={`flex flex-col items-center relative ${
                      actualRank === 1 ? 'order-2 z-20' : actualRank === 2 ? 'order-1 z-10' : 'order-3 z-10'
                    }`}
                  >
                    {/* Floating animation wrapper */}
                    <motion.div
                      variants={floatingAnimation}
                      initial="initial"
                      animate="animate"
                      className="flex flex-col items-center"
                    >
                      {/* Crown for 1st place */}
                      {actualRank === 1 && (
                        <motion.div
                          variants={crownBounce}
                          initial="initial"
                          animate="animate"
                          className="mb-4"
                        >
                          <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                        </motion.div>
                      )}
                      
                      {/* Stars decoration */}
                      {actualRank <= 3 && (
                        <div className="absolute -top-2 -left-4 animate-pulse">
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                      {actualRank <= 2 && (
                        <div className="absolute -top-2 -right-4 animate-pulse" style={{ animationDelay: '0.5s' }}>
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                      
                      {/* Astronaut Avatar with glow */}
                      <div className="relative mb-6">
                        {/* Outer glow */}
                        <motion.div
                          className={`absolute inset-0 rounded-3xl blur-xl`}
                          style={{ backgroundColor: styles.glowColor }}
                          variants={glowPulse}
                          initial="initial"
                          animate="animate"
                        />
                        
                        <div className={`relative ${styles.medalSize} rounded-3xl bg-gradient-to-br ${styles.avatarBg} ${styles.avatarShadow} flex items-center justify-center overflow-hidden border-4 ${styles.borderColor}`}>
                          {/* Inner shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                          
                          {/* Astronaut emoji */}
                          <div className={`${actualRank === 1 ? 'text-7xl' : 'text-6xl'} relative z-10`}>
                            🧑‍🚀
                          </div>
                          
                          {/* Rank badge with better styling */}
                          <motion.div
                            className={`absolute -top-3 -right-3 ${actualRank === 1 ? 'w-14 h-14' : 'w-12 h-12'} rounded-full flex items-center justify-center ${actualRank === 1 ? 'text-3xl' : 'text-2xl'} font-bold bg-gradient-to-br ${
                              actualRank === 1 
                                ? 'from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/60'
                                : actualRank === 2
                                ? 'from-gray-300 via-gray-400 to-gray-500 shadow-lg shadow-gray-400/50'
                                : 'from-orange-500 via-orange-600 to-orange-700 shadow-lg shadow-orange-600/50'
                            } border-4 border-card`}
                            whileHover={{ scale: 1.2, rotate: 360 }}
                            transition={{ type: 'spring' }}
                          >
                            {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* User info */}
                      <div className="text-center mb-4">
                        <p className={`font-black ${actualRank === 1 ? 'text-2xl' : 'text-xl'} ${
                          isUser ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : styles.textColor
                        }`}>
                          {leader.name}
                        </p>
                        {isUser && (
                          <motion.span
                            className="inline-block text-sm text-emerald-400 mt-1 px-3 py-1 bg-emerald-500/20 rounded-full"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            (You) ⭐
                          </motion.span>
                        )}
                        <p className={`text-lg font-mono mt-2 font-bold ${
                          leader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toFixed(0)} {leader.total_pnl >= 0 ? '🪙' : ''}
                        </p>
                        
                        {/* Gamification elements */}
                        <div className="flex items-center justify-center gap-3 mt-3">
                          {/* XP Points */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-purple-400">
                              {(leader.score * 100).toFixed(0)} XP
                            </span>
                          </div>
                          
                          {/* Win Streak */}
                          {leader.wins >= 3 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                              <Flame className="w-4 h-4 text-orange-400" />
                              <span className="text-xs font-bold text-orange-400">
                                {leader.wins}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Badge */}
                        {actualRank === 1 && (
                          <div className="mt-2 px-3 py-1 bg-yellow-500/20 rounded-full">
                            <span className="text-xs font-bold text-yellow-400">👑 Top Performer</span>
                          </div>
                        )}
                        {actualRank === 2 && (
                          <div className="mt-2 px-3 py-1 bg-blue-500/20 rounded-full">
                            <span className="text-xs font-bold text-blue-400">💎 Consistent Trader</span>
                          </div>
                        )}
                        {actualRank === 3 && (
                          <div className="mt-2 px-3 py-1 bg-orange-500/20 rounded-full">
                            <span className="text-xs font-bold text-orange-400">🔥 Rising Star</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                    
                    {/* Podium with 3D effect */}
                    <motion.div
                      className={`w-40 ${styles.height} bg-gradient-to-b ${styles.bgGradient} border-2 ${styles.borderColor} rounded-t-3xl flex flex-col items-center justify-center relative overflow-hidden`}
                      style={{
                        boxShadow: `0 0 40px ${styles.glowColor}, inset 0 -20px 40px rgba(0,0,0,0.3)`
                      }}
                      whileHover={{ scale: 1.05, y: -10 }}
                      transition={{ type: 'spring' }}
                    >
                      {/* 3D depth lines */}
                      <div className="absolute inset-0">
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
                        <div className="absolute bottom-4 left-0 right-0 h-px bg-white/10" />
                        <div className="absolute bottom-8 left-0 right-0 h-px bg-white/10" />
                      </div>
                      
                      {/* Rank number watermark */}
                      <div className={`absolute inset-0 flex items-center justify-center opacity-5`}>
                        <div className="text-9xl font-black">{actualRank}</div>
                      </div>
                      
                      {/* Stats */}
                      <div className="relative z-10 text-center space-y-3">
                        <div className={`${actualRank === 1 ? 'text-5xl' : 'text-4xl'} font-black text-white drop-shadow-lg`}>
                          {leader.score.toFixed(0)}
                        </div>
                        <div className="text-xs tracking-wider text-white/70 font-bold">SCORE</div>
                        <div className={`${actualRank === 1 ? 'text-lg' : 'text-base'} text-cyan-400 font-bold`}>
                          {leader.win_rate.toFixed(0)}% WR
                        </div>
                      </div>
                      
                      {/* Bottom shine */}
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/5 to-transparent" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rest of the leaderboard - Enhanced Table */}
      {restOfLeaders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-white/90 tracking-wider">RANK</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white/90 tracking-wider">TRADER</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-white/90 tracking-wider">REALIZED P&L</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-white/90 tracking-wider">WIN RATE</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-white/90 tracking-wider">XP</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {restOfLeaders.map((leader, index) => {
                  const isUser = isCurrentUser(leader.user_id);
                  const winRatePercent = leader.win_rate;
                  
                  return (
                    <motion.tr
                      key={leader.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-white/5 transition-all cursor-pointer group ${
                        isUser 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30' 
                          : 'hover:bg-white/5'
                      }`}
                      whileHover={{ scale: 1.01, x: 5 }}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className={`w-10 h-10 rounded-xl ${
                              isUser ? 'bg-emerald-500/20' : 'bg-white/10'
                            } flex items-center justify-center text-sm font-black`}
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            {leader.rank === 4 ? '🏅' : leader.rank === 5 ? '⭐' : leader.rank}
                          </motion.div>
                          
                          {/* Rank change indicator (mock - you can make this dynamic) */}
                          {leader.rank <= 5 && (
                            <motion.div
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="flex items-center"
                            >
                              <ArrowUp className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs text-emerald-400 font-bold">+2</span>
                            </motion.div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-white/10 overflow-hidden"
                            whileHover={{ scale: 1.2 }}
                            transition={{ type: 'spring' }}
                          >
                            <span className="text-xl">👤</span>
                          </motion.div>
                          <div>
                            <p className={`font-bold text-base ${
                              isUser ? 'text-emerald-400' : 'text-white'
                            }`}>
                              {leader.name}
                              {isUser && (
                                <span className="ml-2 text-xs text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded-full">
                                  You ⭐
                                </span>
                              )}
                            </p>
                            {/* Gamification elements */}
                            <div className="flex items-center gap-2 mt-1">
                              {leader.wins >= 3 && (
                                <div className="flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-400" />
                                  <span className="text-xs text-orange-400 font-bold">{leader.wins}</span>
                                </div>
                              )}
                              <span className="text-xs text-white/50">
                                {leader.total_trades} trades
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono font-bold text-lg ${
                            leader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {leader.total_pnl >= 0 ? '+' : ''}{leader.total_pnl.toFixed(2)}
                          </span>
                          {/* Mini progress bar */}
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${
                                leader.total_pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(Math.abs(leader.total_pnl) / 100, 100)}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono font-bold text-base ${
                            winRatePercent >= 60 ? 'text-emerald-400' : 
                            winRatePercent >= 50 ? 'text-blue-400' : 
                            'text-orange-400'
                          }`}>
                            {winRatePercent.toFixed(0)}%
                          </span>
                          {/* Mini progress bar */}
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${
                                winRatePercent >= 60 ? 'bg-emerald-500' : 
                                winRatePercent >= 50 ? 'bg-blue-500' : 
                                'bg-orange-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${winRatePercent}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="font-black text-lg text-yellow-400">
                            {leader.score.toFixed(0)}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
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
