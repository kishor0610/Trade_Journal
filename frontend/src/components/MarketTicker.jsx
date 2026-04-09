import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MarketTicker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="w-full bg-black border-b border-slate-800">
      <div className="flex items-center justify-start gap-8 px-6 py-2.5 overflow-x-auto scrollbar-hide">
        {loading ? (
          <div className="text-sm text-gray-400">Loading market data...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-gray-400">Market data unavailable</div>
        ) : (
          data.map((item, index) => {
            const isPositive = item.percent >= 0;
            const textColor = isPositive ? 'text-green-500' : 'text-red-500';
            
            // Determine decimal places based on asset type
            let priceDecimals = 2;
            let changeDecimals = 2;
            
            if (item.symbol.includes('USD') && item.symbol !== 'BTC-USD' && item.symbol !== 'ETH-USD') {
              // Forex pairs
              priceDecimals = 4;
              changeDecimals = 4;
            } else if (item.symbol === 'BTC-USD' || item.symbol === 'ETH-USD') {
              // Crypto
              priceDecimals = 2;
              changeDecimals = 2;
            }
            
            return (
              <div
                key={index}
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
          })
        )}
      </div>
    </div>
  );
}
