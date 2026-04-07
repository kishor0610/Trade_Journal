import React from 'react';
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
  Copy
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Toaster } from '../components/ui/sonner';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/insights', icon: Sparkles, label: 'AI Insights' },
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

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-card/50 border-r border-white/5 z-50">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="TradeLedger" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-heading font-bold">TradeLedger</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          
          {/* Coming Soon Items */}
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="text-xs text-muted-foreground mb-2 px-4">Coming Soon</p>
            <NavLink to="/risk-calculator" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-base ${isActive ? 'bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 text-fuchsia-300 border border-fuchsia-400/40 shadow-lg' : 'text-fuchsia-300 hover:text-white hover:bg-fuchsia-500/10'}`} data-testid="nav-risk-calculator">
              <Calculator className="w-5 h-5 text-fuchsia-400 drop-shadow-glow" />
              <span className="hidden md:inline">Risk Calculator</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 text-black/80 shadow">New</span>
            </NavLink>
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
        <div className="p-4 border-t border-white/5">
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
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-4">
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
      <main className="md:ml-64 pt-20 md:pt-8 pb-24 md:pb-8 px-4 md:px-8">
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
}
