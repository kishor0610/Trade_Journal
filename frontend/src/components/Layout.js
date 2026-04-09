import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  Sparkles,
  LogOut, 
  User,
  Wallet,
  Bot,
  Copy,
  Calculator,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Toaster } from '../components/ui/sonner';
import MarketTicker from './MarketTicker';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/insights', icon: Sparkles, label: 'AI Insights' },
  { path: '/risk-calculator', icon: Calculator, label: 'Risk Calculator' },
  { path: '/forex-calendar', icon: Calendar, label: 'Forex Calendar' },
];

const NavItem = ({ path, icon: Icon, label }) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-lg transition-all
      ${isActive 
        ? 'bg-accent/20 text-accent border border-accent/30' 
        : 'text-muted-foreground hover:text-white hover:bg-white/5'
      }
    `}
    data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
  >
    <Icon className="w-5 h-5" />
    <span className="hidden md:inline">{label}</span>
  </NavLink>
);

const MobileNavItem = ({ path, icon: Icon, label }) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all
      ${isActive 
        ? 'text-accent' 
        : 'text-muted-foreground'
      }
    `}
    data-testid={`mobile-nav-${label.toLowerCase().replace(' ', '-')}`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[10px]">{label}</span>
  </NavLink>
);

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Market Ticker - Top Strip (Always visible on all devices) */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <MarketTicker />
      </div>
      
      {/* Sidebar Toggle Button */}
      <button
        className="hidden md:flex fixed z-50 items-center justify-center w-6 h-12 bg-card/80 border-2 border-accent hover:bg-white/10 transition-all rounded-r-lg"
        style={{ 
          left: sidebarOpen ? '15.5rem' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 20px rgba(147, 51, 234, 0.6), 0 0 40px rgba(147, 51, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
        }}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="text-white text-sm">{sidebarOpen ? '‹' : '›'}</span>
      </button>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 bottom-0 flex-col bg-card/50 border-r-2 border-transparent z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}
        style={{
          backgroundImage: 'linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(180deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          backgroundSize: '100% 100%, 100% 400%',
          animation: 'rotate-sidebar-border 3s linear infinite',
        }}
      >
        <style>{`
          @keyframes rotate-sidebar-border {
            0% { background-position: 0% 50%, 0% 0%; }
            100% { background-position: 0% 50%, 0% 400%; }
          }
        `}</style>
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b-2 border-transparent relative"
          style={{
            backgroundImage: 'linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            backgroundSize: '100% 100%, 400% 100%',
            animation: 'rotate-logo-border 3s linear infinite',
          }}
        >
          <style>{`
            @keyframes rotate-logo-border {
              0% { background-position: 0% 50%, 0% 50%; }
              100% { background-position: 0% 50%, 400% 50%; }
            }
          `}</style>
          <img src="/app-icon.png" alt="TradeLedger" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-heading font-bold whitespace-nowrap">TradeLedger</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          {/* Coming Soon Items */}
          <div className="pt-4 mt-4 border-t-2 border-transparent relative -mx-4 px-4"
            style={{
              backgroundImage: 'linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              backgroundSize: '100% 100%, 400% 100%',
              animation: 'rotate-coming-soon-border 3s linear infinite',
            }}
          >
            <style>{`
              @keyframes rotate-coming-soon-border {
                0% { background-position: 0% 50%, 0% 50%; }
                100% { background-position: 0% 50%, 400% 50%; }
              }
            `}</style>
            <p className="text-xs text-muted-foreground mb-2 px-0">Coming Soon</p>
            <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground/50 cursor-not-allowed">
              <Bot className="w-5 h-5" />
              <span className="hidden md:inline">Algos</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground/50 cursor-not-allowed">
              <Copy className="w-5 h-5" />
              <span className="hidden md:inline">Trade Copier</span>
            </div>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t-2 border-transparent relative"
          style={{
            backgroundImage: 'linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            backgroundSize: '100% 100%, 400% 100%',
            animation: 'rotate-user-border 3s linear infinite',
          }}
        >
          <style>{`
            @keyframes rotate-user-border {
              0% { background-position: 0% 50%, 0% 50%; }
              100% { background-position: 0% 50%, 400% 50%; }
            }
          `}</style>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-blue-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user?.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout} className="text-red-500" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-4" style={{ top: '40px' }}>
        <div className="flex items-center gap-2">
          <img src="/app-icon.png" alt="TradeLedger" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-heading font-bold">TradeLedger</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-accent" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-3 py-2 border-b border-white/10">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'} pt-28 md:pt-16 pb-24 md:pb-8 px-4 md:px-8`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2 safe-area-inset-bottom">
        {navItems.map((item) => (
          <MobileNavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* Toast Container */}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
