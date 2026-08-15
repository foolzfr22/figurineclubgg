import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, User, Heart, Menu, X, Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.579.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4612-.6304.8731-1.2952 1.2269-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0784.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276c-.598.3505-1.22.6523-1.873.8947a.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.2256 1.9932a.076.076 0 00.0842.0287c1.9625-.6067 3.9518-1.5222 6.0045-3.0294a.0779.0779 0 00.0313-.0555c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*), product_images(*)')
        .ilike('name', `%${searchQuery}%`)
        .eq('is_hidden', false)
        .limit(5);
      setSearchResults((data as Product[]) ?? []);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'New Arrivals', path: '/shop?filter=new' },
    { label: 'Best Sellers', path: '/shop?filter=bestseller' },
    { label: 'Limited Editions', path: '/shop?filter=limited' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path.split('?')[0];
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-2 left-0 right-0 z-50 mx-auto w-full max-w-6xl transition-all duration-300 ${
          scrolled ? 'glass-strong shadow-2xl shadow-black/5' : 'glass shadow-lg'
        } rounded-2xl mx-3 sm:mx-4`}
        style={{ width: 'calc(100% - 1.5rem)' }}
      >
        <nav className="h-14 flex items-center justify-between gap-2 px-3 sm:px-5">
          {/* Logo - always left, never shrinks */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30 flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight hidden xs:block sm:block truncate">
              {settings?.business_name || 'Figure Club'}
            </span>
          </Link>

          {/* Center navigation - hidden on mobile/tablet */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center min-w-0">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-2.5 xl:px-3 py-2 rounded-lg text-sm font-medium transition-colors group whitespace-nowrap"
              >
                <span className={`relative z-10 transition-colors ${isActive(link.path) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                  {link.label}
                </span>
                {isActive(link.path) && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right side actions - always visible, never overflow */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 max-w-sm glass-strong rounded-xl shadow-2xl p-3"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search figures..."
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-80 overflow-y-auto">
                        {searchResults.map((product) => (
                          <Link
                            key={product.id}
                            to={`/product/${product.slug}`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <img
                              src={product.product_images?.[0]?.image_url}
                              alt={product.name}
                              loading="lazy"
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-slate-500">
                                Rs. {product.discount_price ?? product.price}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No results found</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Discord - hidden on mobile to save space */}
            {settings?.discord_url && (
              <a
                href={settings.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors hidden md:block"
                aria-label="Discord"
              >
                <DiscordIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#5865F2]" />
              </a>
            )}

            {/* Wishlist - only for logged in users, hidden on very small screens */}
            {user && (
              <Link
                to="/account/wishlist"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
                aria-label="Wishlist"
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            )}

            {/* Cart - always visible */}
            <Link
              to="/cart"
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold"
                >
                  {totalItems}
                </motion.span>
              )}
            </Link>

            {/* User menu / Login - always visible */}
            <div ref={userMenuRef} className="relative">
              {user ? (
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                  aria-label="Account"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                      {(user.email ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Login"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              )}
              <AnimatePresence>
                {userMenuOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-12 w-56 glass-strong rounded-xl shadow-2xl py-2"
                  >
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <Link to="/account" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      My Account
                    </Link>
                    <Link to="/account/orders" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      Order History
                    </Link>
                    <Link to="/account/wishlist" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      Wishlist
                    </Link>
                    <Link to="/account/addresses" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      Addresses
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        navigate('/');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hamburger - only on mobile/tablet */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-slate-200 dark:border-slate-800"
            >
              <div className="px-3 py-3 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(link.path) ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {link.label}
                  </Link>
                ))}
                {settings?.discord_url && (
                  <a href={settings.discord_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2">
                    <DiscordIcon className="w-4 h-4 text-[#5865F2]" /> Discord Community
                  </a>
                )}
                {!user && (
                  <Link to="/login" className="px-4 py-2.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Login / Register
                  </Link>
                )}
                {user && (
                  <Link to="/account/wishlist" className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 sm:hidden">
                    <Heart className="w-4 h-4" /> Wishlist
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
      <div className="h-16" />
    </>
  );
}
