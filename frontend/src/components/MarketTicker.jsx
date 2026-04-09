import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MarketTicker() {
  const [data, setData] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/quotes`);
      if (response.data && response.data.length > 0) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Market ticker fetch error:', err);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchData();
    
    // Then refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!data.length) {
    return null; // Don't show ticker if no data
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/5 overflow-hidden relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
      
      <div 
        className="flex items-center py-2 px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Live Markets
          </span>
        </div>
        
        <div className="overflow-hidden flex-1">
          <motion.div
            className="flex items-center gap-6 whitespace-nowrap"
            animate={{
              x: isPaused ? 0 : [0, -1500]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear"
              }
            }}
          >
            {/* Duplicate data for seamless loop */}
            {[...data, ...data, ...data].map((item, index) => {
              const isPositive = item.percent >= 0;
              const textColor = isPositive ? 'text-green-400' : 'text-red-400';
              const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
              
              return (
                <div
                  key={`${item.symbol}-${index}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor} border border-white/5`}
                >
                  <span className="text-sm font-bold text-white">
                    {item.symbol}
                  </span>
                  
                  <span className="text-sm font-mono text-gray-300">
                    {item.price.toFixed(item.symbol.includes('BTC') ? 0 : 5)}
                  </span>
                  
                  <div className={`flex items-center gap-1 ${textColor}`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="text-xs font-semibold">
                      {isPositive ? '+' : ''}{item.percent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
