import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MarketTicker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/quotes`);
      console.log('Market ticker data:', response.data);
      if (response.data && response.data.length > 0) {
        setData(response.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Market ticker fetch error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchData();
    
    // Then refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Always show the ticker bar, even when loading or no data
  return (
    <div className="w-full bg-black border-b border-slate-800 overflow-hidden relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      
      <div 
        className="py-2.5"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {loading ? (
          <div className="text-sm text-gray-400 px-6">Loading market data...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-gray-400 px-6">Market data unavailable</div>
        ) : (
          <motion.div
            className="flex items-center gap-8 whitespace-nowrap px-6"
            animate={{
              x: isPaused ? 0 : [0, -2000]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 40,
                ease: "linear"
              }
            }}
          >
            {/* Duplicate data 3 times for seamless loop */}
            {[...data, ...data, ...data].map((item, index) => {
              const isPositive = item.percent >= 0;
              const textColor = isPositive ? 'text-green-500' : 'text-red-500';
              
              // Determine decimal places based on asset type
              let priceDecimals = 2;
              let changeDecimals = 2;
              
              if (item.symbol.includes('/')) {
                // Forex pairs
                priceDecimals = 4;
                changeDecimals = 4;
              } else if (item.symbol.includes('XAU') || item.symbol.includes('XAG')) {
                // Metals
                priceDecimals = 2;
                changeDecimals = 2;
              }
              
              return (
                <div
                  key={`${item.symbol}-${index}`}
                  className="flex items-center gap-3 flex-shrink-0"
                >
                  {/* Symbol */}
                  <span className="text-sm font-bold text-white whitespace-nowrap">
                    {item.symbol}
                  </span>
                  
                  {/* Price */}
                  <span className="text-sm font-semibold text-white">
                    {item.price.toFixed(priceDecimals)}
                  </span>
                  
                  {/* Change percent and value */}
                  <div className={`flex items-center gap-1.5 ${textColor}`}>
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span className="text-sm font-medium">
                      {isPositive ? '' : '-'}{Math.abs(item.percent).toFixed(2)}%
                    </span>
                    <span className="text-sm">
                      ({isPositive ? '+' : ''}{item.change.toFixed(changeDecimals)})
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>);
          })
        )}
      </div>
    </div>
  );
}
