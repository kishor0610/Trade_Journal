import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Calendar, ExternalLink, TrendingUp, AlertCircle, Bell } from 'lucide-react';
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

const CalendarTicker = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef(null);

  const fetchEvents = async () => {
    try {
      console.log('🔥 STEP 5: Fetching calendar from:', `${API_URL}/calendar`);
      
      const response = await axios.get(`${API_URL}/calendar`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('✅ Calendar response status:', response.status);
      console.log('📊 Calendar data:', response.data);
      console.log('📈 Number of events:', response.data?.length || 0);
      
      // Always set events, even if empty (empty is NOT an error)
      const eventData = Array.isArray(response.data) ? response.data : [];
      setEvents(eventData);
      setLoading(false);
      
      // Log if it's a fallback message
      if (eventData.length === 1 && eventData[0].currency === 'SYSTEM') {
        console.log('⚠️ Received fallback/error message from API');
      } else if (eventData.length === 1 && eventData[0].currency === 'GLOBAL') {
        console.log('ℹ️ No events scheduled today (this is normal)');
      }
      
    } catch (error) {
      console.error('❌ Calendar fetch error');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      // Set loading to false even on error
      setLoading(false);
      
      // Only show toast on actual network errors (not 404, 503, etc.)
      if (!error.response) {
        toast.error('Network error - check your connection');
      } else {
        console.log('ℹ️ API returned an error response, but not showing toast');
      }
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Refresh calendar every 60 seconds
    const interval = setInterval(fetchEvents, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-card/50 border-b border-white/5 py-3 px-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-red-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading economic events...</span>
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="w-full bg-card/50 border-b border-white/5 py-3 px-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-muted-foreground">No high-impact events scheduled for today</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-red-950/30 via-red-900/20 to-red-950/30 border-b border-red-500/20 overflow-hidden relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div 
        className="flex items-center py-3 px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center gap-2 mr-6 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-red-400">ECONOMIC CALENDAR</span>
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
                duration: 45,
                ease: "linear"
              }
            }}
          >
            {/* Duplicate events for seamless loop */}
            {[...events, ...events].map((item, index) => {
              // Color code impact levels
              const impactColor = 
                item.impact === 'high' || item.impact === '3' ? 'bg-red-500' :
                item.impact === 'medium' || item.impact === '2' ? 'bg-yellow-500' :
                item.impact === 'low' || item.impact === '1' ? 'bg-green-500' :
                'bg-gray-500';
              
              return (
                <div
                  key={`${item.event}-${index}`}
                  className="flex items-center gap-3 group"
                >
                  <span className={`w-2 h-2 rounded-full ${impactColor} flex-shrink-0`} />
                  <span className="text-sm text-gray-300">
                    {item.time}
                  </span>
                  <span className="text-sm font-semibold text-red-400">
                    {item.currency}
                  </span>
                  <span className="text-sm text-gray-200">
                    {item.event}
                  </span>
                  <span className="text-red-500 mx-4">•</span>
                </div>
              );
            })}
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

      {/* Economic Calendar Ticker */}
      <CalendarTicker />

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg bg-gradient-to-br from-accent/10 to-blue-600/10 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-heading font-bold">Forex News</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Real-time forex market news filtered by relevant keywords (USD, EUR, GBP, JPY, Gold, Fed, ECB, etc.)
            </p>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Auto-refresh every 60 seconds</li>
              <li>• Click headlines to read full articles</li>
              <li>• Pause on hover for easier reading</li>
              <li>• High-impact news marked with red dot</li>
            </ul>
          </div>
          
          <div className="p-6 rounded-lg bg-gradient-to-br from-red-600/10 to-orange-600/10 border border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-heading font-bold text-red-400">High-Impact Events</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Today's high-impact economic events that could move the forex market
            </p>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• NFP, CPI, FOMC announcements</li>
              <li>• Central bank interest rate decisions</li>
              <li>• Major economic releases</li>
              <li>• Live updates throughout the day</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
