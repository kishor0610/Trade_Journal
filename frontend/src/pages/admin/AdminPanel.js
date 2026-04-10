import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Server, Database, LifeBuoy, 
  Activity, DollarSign, Settings, LogOut, Menu, X,
  Bell, Search, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    // Verify admin token
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    // Get admin info from token (basic decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setAdminInfo(payload);
    } catch (e) {
      console.error('Invalid token');
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/mt5-accounts', icon: Server, label: 'MT5 Accounts' },
    { path: '/admin/database', icon: Database, label: 'Database Explorer' },
    { path: '/admin/tickets', icon: LifeBuoy, label: 'Support Tickets', badge: 0 },
    { path: '/admin/logs', icon: Activity, label: 'Logs & Monitoring' },
    { path: '/admin/payments', icon: DollarSign, label: 'Payments' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border transition-all duration-300 z-50 ${
        sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 border-b border-border flex items-center justify-between px-4">
            {sidebarOpen && (
              <Link to="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center">
                  <span className="text-white font-black text-lg">T</span>
                </div>
                <span className="font-heading font-black text-xl">Admin</span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-accent/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Admin Profile */}
          <div className="border-t border-border p-3">
            <div className={`flex items-center gap-3 p-2 rounded-lg ${sidebarOpen ? '' : 'justify-center'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">
                  {adminInfo?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{adminInfo?.email || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="w-full mt-2 justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card sticky top-0 z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent/10 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users, trades, logs..."
                className="w-80 pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-accent/10 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Admin Menu */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/10 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {adminInfo?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
