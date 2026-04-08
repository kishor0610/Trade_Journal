import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Calendar, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewsTicker = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef(null);

  const fetchNews = async () => {
    try {
      const response = await axios.get(`${API_URL}/news`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNews(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      if (!news.length) {
        toast.error('Failed to load forex news');
      }
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Refresh news every 60 seconds
    const interval = setInterval(fetchNews, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleNewsClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-card/50 border-b border-white/5 py-3 px-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-accent animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading forex news...</span>
        </div>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="w-full bg-card/50 border-b border-white/5 py-3 px-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-muted-foreground">No forex news available at the moment</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-card/80 via-card/50 to-card/80 border-b border-white/5 overflow-hidden relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div 
        className="flex items-center py-3 px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center gap-2 mr-6 flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-accent" />
          <span className="text-sm font-semibold text-accent">FOREX NEWS</span>
        </div>
        
        <div className="overflow-hidden flex-1">
          <motion.div
            ref={tickerRef}
            className="flex items-center gap-8 whitespace-nowrap"
            animate={{
              x: isPaused ? 0 : [0, -2000]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 60,
                ease: "linear"
              }
            }}
          >
            {/* Duplicate news for seamless loop */}
            {[...news, ...news].map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                onClick={() => handleNewsClick(item.url)}
                className={`flex items-center gap-3 cursor-pointer hover:text-accent transition-colors group ${
                  isPaused ? '' : ''
                }`}
              >
                {item.highImpact && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                )}
                <span className="text-sm text-gray-200 group-hover:text-white">
                  {item.headline}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {item.source} • {item.time}
                </span>
                <span className="text-accent mx-4">•</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default function ForexCalendar() {
  return (
    <div className="space-y-6" data-testid="forex-calendar-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-black flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-accent to-emerald-500 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Forex Calendar
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time forex news and economic events
        </p>
      </div>

      {/* News Ticker */}
      <NewsTicker />

      {/* Coming Soon Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent/20 to-blue-600/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-accent" />
        </div>
        <h3 className="text-xl font-heading font-bold mb-2">Economic Calendar Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Stay tuned for an interactive economic calendar showing upcoming events, news releases, and market-moving announcements.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground mb-1">Planned Features</p>
            <ul className="text-sm text-left space-y-1">
              <li>• NFP, CPI, FOMC announcements</li>
              <li>• Central bank decisions</li>
              <li>• Real-time event notifications</li>
              <li>• Impact level indicators</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
