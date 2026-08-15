import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Star,
  MessageSquare, BarChart3, Boxes, Tags, Mail, Settings, LogOut,
  Menu, X, Package as PackageIcon, Store, MessageCircle, Bell,
  ClipboardList, Activity, AlertTriangle, Film, Volume2, Music,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/admin/production-queue', label: 'Production', icon: PackageIcon },
    { to: '/admin/damage-claims', label: 'Damage Claims', icon: AlertTriangle },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/reviews', label: 'Reviews', icon: Star },
    { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/local-sales', label: 'Local Sales', icon: Store },
    { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/whatsapp-templates', label: 'WhatsApp Templates', icon: MessageCircle },
    { to: '/admin/ui-media', label: 'UI Media', icon: Film },
    { to: '/admin/ui-sounds', label: 'UI Sounds', icon: Volume2 },
    { to: '/admin/playlist', label: 'Playlist', icon: Music },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/activity-log', label: 'Activity Log', icon: Activity },
    { to: '/admin/newsletter', label: 'Newsletter', icon: Mail },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-white flex-shrink-0 z-40 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <PackageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold">{settings?.business_name || 'Figure Club'}</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {(user?.email ?? 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <span className="font-medium">Admin Panel</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
