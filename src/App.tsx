import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { UIMediaProvider } from '@/contexts/UIMediaContext';
import { MusicProvider } from '@/contexts/MusicContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import DiscordButton from '@/components/DiscordButton';
import FloatingMusicPlayer from '@/components/FloatingMusicPlayer';
import ScrollToTop from '@/components/ScrollToTop';
import AnimatedBackground from '@/components/AnimatedBackground';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Shop = lazy(() => import('@/pages/Shop'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const Contact = lazy(() => import('@/pages/Contact'));
const TrackOrder = lazy(() => import('@/pages/TrackOrder'));
const Compare = lazy(() => import('@/pages/Compare'));

const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));

const Account = lazy(() => import('@/pages/account/Account'));
const AccountProfile = lazy(() => import('@/pages/account/AccountProfile'));
const AccountOrders = lazy(() => import('@/pages/account/AccountOrders'));
const AccountWishlist = lazy(() => import('@/pages/account/AccountWishlist'));
const AccountAddresses = lazy(() => import('@/pages/account/AccountAddresses'));
const OrderDetail = lazy(() => import('@/pages/account/OrderDetail'));

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers'));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews'));
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminInventory = lazy(() => import('@/pages/admin/AdminInventory'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminNewsletter = lazy(() => import('@/pages/admin/AdminNewsletter'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminWhatsappTemplates = lazy(() => import('@/pages/admin/AdminWhatsappTemplates'));
const AdminLocalSales = lazy(() => import('@/pages/admin/AdminLocalSales'));
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminActivityLog = lazy(() => import('@/pages/admin/AdminActivityLog'));
const AdminProductionQueue = lazy(() => import('@/pages/admin/AdminProductionQueue'));
const AdminDamageClaims = lazy(() => import('@/pages/admin/AdminDamageClaims'));
const AdminUIMedia = lazy(() => import('@/pages/admin/AdminUIMedia'));
const AdminUISounds = lazy(() => import('@/pages/admin/AdminUISounds'));
const AdminPlaylistManager = lazy(() => import('@/pages/admin/AdminPlaylistManager'));

const StaticPage = lazy(() => import('@/pages/StaticPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/shop" element={<PageWrapper><Shop /></PageWrapper>} />
            <Route path="/product/:slug" element={<PageWrapper><ProductDetail /></PageWrapper>} />
            <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
            <Route path="/checkout" element={<ProtectedRoute><PageWrapper><Checkout /></PageWrapper></ProtectedRoute>} />
            <Route path="/order-confirmation/:orderNumber" element={<PageWrapper><OrderConfirmation /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
            <Route path="/track-order" element={<PageWrapper><TrackOrder /></PageWrapper>} />
            <Route path="/compare" element={<PageWrapper><Compare /></PageWrapper>} />

            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
            <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
            <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
            <Route path="/verify-email" element={<PageWrapper><VerifyEmail /></PageWrapper>} />

            <Route path="/account" element={<ProtectedRoute><PageWrapper><Account /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/profile" element={<ProtectedRoute><PageWrapper><AccountProfile /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/orders" element={<ProtectedRoute><PageWrapper><AccountOrders /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/wishlist" element={<ProtectedRoute><PageWrapper><AccountWishlist /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/addresses" element={<ProtectedRoute><PageWrapper><AccountAddresses /></PageWrapper></ProtectedRoute>} />
            <Route path="/account/orders/:orderNumber" element={<ProtectedRoute><PageWrapper><OrderDetail /></PageWrapper></ProtectedRoute>} />

            <Route path="/admin/login" element={<PageWrapper><AdminLogin /></PageWrapper>} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="newsletter" element={<AdminNewsletter />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="whatsapp-templates" element={<AdminWhatsappTemplates />} />
              <Route path="local-sales" element={<AdminLocalSales />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="activity-log" element={<AdminActivityLog />} />
              <Route path="production-queue" element={<AdminProductionQueue />} />
              <Route path="damage-claims" element={<AdminDamageClaims />} />
              <Route path="ui-media" element={<AdminUIMedia />} />
              <Route path="ui-sounds" element={<AdminUISounds />} />
              <Route path="playlist" element={<AdminPlaylistManager />} />
            </Route>

            <Route path="/page/:slug" element={<PageWrapper><StaticPage /></PageWrapper>} />
            <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <DiscordButton />}
      {!isAdmin && <FloatingMusicPlayer />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <UIMediaProvider>
                <MusicProvider>
                <BrowserRouter>
                  <AnimatedBackground />
                  <ScrollToTop />
                  <Navbar />
                  <AnimatedRoutes />
                </BrowserRouter>
                </MusicProvider>
              </UIMediaProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
