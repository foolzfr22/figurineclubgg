import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Sparkles, TrendingUp, Shield, Truck, Award, Heart,
  Star, ChevronRight, Instagram, Gift, MessageCircle, Palette,
  Trophy, Megaphone, Vote, Image as ImageIcon, Rocket,
  ShoppingBag, Zap, ShieldCheck, Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Review } from '@/types';
import ProductCard from '@/components/ProductCard';
import { formatPrice, getEffectivePrice, getDiscountPercent } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useCart } from '@/contexts/CartContext';
import BuyNowModal from '@/components/BuyNowModal';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.579.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4612-.6304.8731-1.2952 1.2269-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0784.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276c-.598.3505-1.22.6523-1.873.8947a.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.2256 1.9932a.076.076 0 00.0842.0287c1.9625-.6067 3.9518-1.5222 6.0045-3.0294a.0779.0779 0 00.0313-.0555c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

const trustBadges = [
  { icon: Palette, text: 'Hand Painted' },
  { icon: Shield, text: 'Premium Resin' },
  { icon: Package, text: 'Secure Packaging' },
  { icon: Truck, text: 'Fast Shipping' },
];

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [limitedEditions, setLimitedEditions] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [heroProduct, setHeroProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<(Review & { profiles?: { full_name: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { toast } = useToast();
  const { settings } = useSettings();
  const { addItem } = useCart();
  const [buyNowOpen, setBuyNowOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [feat, best, limited, newArr, trend, rev] = await Promise.all([
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_featured', true).eq('is_hidden', false).limit(4),
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_best_seller', true).eq('is_hidden', false).limit(4),
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_limited_edition', true).eq('is_hidden', false).limit(4),
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_new_arrival', true).eq('is_hidden', false).limit(4),
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_trending', true).eq('is_hidden', false).limit(8),
        supabase.from('reviews').select('*, profiles(full_name)').eq('is_approved', true).order('helpful_count', { ascending: false }).limit(3),
      ]);

      let bestData = (best.data as Product[]) ?? [];
      if (bestData.length === 0) {
        bestData = (feat.data as Product[]) ?? [];
      }
      if (bestData.length === 0) {
        const { data: newest } = await supabase
          .from('products')
          .select('*, category:categories(*), product_images(*)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(4);
        bestData = (newest as Product[]) ?? [];
      }

      // Determine hero product: best seller > featured > newest
      let hero: Product | null = null;
      if (bestData.length > 0) hero = bestData[0];
      else if ((feat.data as Product[])?.length) hero = (feat.data as Product[])[0];
      else {
        const { data: newestSingle } = await supabase
          .from('products')
          .select('*, category:categories(*), product_images(*)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        hero = (newestSingle as Product) ?? null;
      }

      setHeroProduct(hero);
      setFeatured((feat.data as Product[]) ?? []);
      setBestSellers(bestData);
      setLimitedEditions((limited.data as Product[]) ?? []);
      setNewArrivals((newArr.data as Product[]) ?? []);
      setTrending((trend.data as Product[]) ?? []);
      setReviews((rev.data as (Review & { profiles?: { full_name: string | null } | null })[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    const { error } = await supabase.from('newsletter').insert({ email: newsletterEmail });
    if (error) {
      if (error.code === '23505') {
        toast('You are already subscribed!', 'info');
      } else {
        toast('Failed to subscribe. Try again.', 'error');
      }
    } else {
      toast('Successfully subscribed!', 'success');
      setNewsletterEmail('');
    }
  };

  const handleHeroAddToCart = async () => {
    if (!heroProduct) return;
    await addItem(heroProduct, 1);
    toast('Added to cart', 'success');
  };

  const handleHeroBuyNow = () => {
    if (!heroProduct) return;
    setBuyNowOpen(true);
  };

  const features = [
    { icon: Award, title: 'Premium Quality', desc: 'Hand-crafted resin figures with museum-grade paint finishes' },
    { icon: Shield, title: 'Secure Packaging', desc: 'Each figure ships in custom-fit protective packaging' },
    { icon: Truck, title: 'Worldwide Shipping', desc: 'Free shipping on orders over Rs. 5,000 across India' },
    { icon: Heart, title: 'Collector First', desc: 'Limited editions with numbered certificates of authenticity' },
  ];

  const communityBenefits = [
    { icon: Gift, text: 'Exclusive Giveaways' },
    { icon: Star, text: 'Early Releases' },
    { icon: MessageCircle, text: 'Community Chat' },
    { icon: ImageIcon, text: 'Showcase Your Collection' },
    { icon: Palette, text: 'Resin Printing Discussions' },
    { icon: Trophy, text: 'Community Events' },
    { icon: Megaphone, text: 'Announcements' },
    { icon: Vote, text: 'Vote on Future Products' },
  ];

  const heroProductPrice = useMemo(() => {
    if (!heroProduct) return 0;
    return getEffectivePrice(heroProduct.price, heroProduct.discount_price);
  }, [heroProduct]);

  const heroDiscount = useMemo(() => {
    if (!heroProduct) return 0;
    return getDiscountPercent(heroProduct.price, heroProduct.discount_price);
  }, [heroProduct]);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-white to-accent-50/50 dark:from-dark-300 dark:via-dark-200 dark:to-dark-400" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300/30 dark:bg-primary-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-accent-300/30 dark:bg-accent-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
          <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-cyan-200/20 dark:bg-cyan-600/8 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '8s' }} />
        </div>

        <div className="section-padding relative z-10 py-12 sm:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Premium Resin Collectibles
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] mb-6 text-balance">
                Collectibles that <span className="text-gradient">define</span> your passion
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl leading-relaxed">
                Hand-crafted resin anime and gaming figures. Limited editions, numbered certificates, and museum-grade finishes for true collectors.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
                  Shop Collection
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/shop?filter=limited" className="btn-secondary inline-flex items-center gap-2">
                  Limited Editions
                </Link>
              </div>
            </motion.div>

            {/* Right: Featured Best Seller Card */}
            {heroProduct && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative perspective-1000"
              >
                {/* Soft radial light behind figure */}
                <div className="absolute inset-0 bg-gradient-radial from-primary-400/20 via-transparent to-transparent rounded-full blur-3xl scale-110" />

                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative glass-strong rounded-3xl p-5 sm:p-6 shadow-2xl shadow-primary-500/10 overflow-hidden"
                >
                  {/* Glass reflection */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 translate-y-[-100%] hover:translate-y-[200%] transition-transform duration-1000" />
                  </div>

                  {/* Blue glow */}
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-primary-500/10 via-accent-500/5 to-primary-500/10 rounded-3xl blur-md -z-10" />

                  {/* Best Seller Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge bg-orange-500 text-white shadow-lg text-xs sm:text-sm">
                      🔥 Best Seller
                    </span>
                    <span className="text-xs text-slate-500">{heroProduct.review_count} reviews</span>
                  </div>

                  {/* Product Image */}
                  <Link to={`/product/${heroProduct.slug}`} className="block relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 group">
                    {heroProduct.product_images?.[0]?.image_url ? (
                      <img
                        src={heroProduct.product_images[0].image_url}
                        alt={heroProduct.name}
                        loading="eager"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-16 h-16" />
                      </div>
                    )}
                    {heroDiscount > 0 && (
                      <span className="absolute top-3 left-3 badge bg-red-500 text-white shadow-lg">
                        -{heroDiscount}%
                      </span>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">{heroProduct.rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">({heroProduct.review_count})</span>
                    </div>
                    <h3 className="font-bold text-lg sm:text-xl line-clamp-1">
                      {heroProduct.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {heroProduct.description}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-bold">{formatPrice(heroProductPrice)}</span>
                      {heroDiscount > 0 && (
                        <span className="text-sm text-slate-400 line-through">{formatPrice(heroProduct.price)}</span>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={handleHeroAddToCart}
                        disabled={heroProduct.stock === 0}
                        className="ripple-btn flex-1 py-2.5 sm:py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4" /> Add to Cart
                      </button>
                      <button
                        onClick={handleHeroBuyNow}
                        disabled={heroProduct.stock === 0}
                        className="ripple-btn px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-accent-500 to-primary-600 text-white text-sm font-medium hover:from-accent-600 hover:to-primary-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-4 h-4" /> Buy Now
                      </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {trustBadges.map((badge) => (
                        <div key={badge.text} className="flex items-center gap-1.5">
                          <badge.icon className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{badge.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <BuyNowModal
        product={buyNowOpen ? heroProduct : null}
        quantity={1}
        giftWrap={false}
        customPaint=""
        onClose={() => setBuyNowOpen(false)}
      />

      {/* Categories Strip */}
      <section className="section-padding py-8 sm:py-12">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
          {['Anime', 'Games', 'Movies', 'Manga', 'Premium Figures', 'Statues', 'Chibi Figures'].map((cat) => (
            <Link
              key={cat}
              to={`/shop?category=${cat.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl glass card-hover text-sm font-medium whitespace-nowrap"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* Best Sellers Showcase */}
      {bestSellers.length > 0 && (
        <section className="section-padding py-8 sm:py-12">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" /> Best Sellers
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">Loved by collectors worldwide</p>
            </div>
            <Link to="/shop?filter=bestseller" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 flex-shrink-0">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <Section title="Featured Products" subtitle="Hand-picked favorites from our collection" link="/shop">
          <ProductGrid products={featured} loading={loading} />
        </Section>
      )}

      {/* Limited Editions Banner */}
      {limitedEditions.length > 0 && (
        <section className="section-padding py-8 sm:py-12">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-primary-900 dark:from-dark-400 dark:to-dark-300 p-6 sm:p-8 lg:p-12">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full filter blur-3xl" />
            </div>
            <div className="relative z-10 mb-6 sm:mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                Limited Edition Series
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Exclusive Numbered Editions</h2>
              <p className="text-slate-400 max-w-lg text-sm sm:text-base">Each piece is individually numbered with a certificate of authenticity. Once they are gone, they are gone forever.</p>
            </div>
            <ProductGrid products={limitedEditions} loading={loading} dark />
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <Section title="New Arrivals" subtitle="The latest additions to our catalog" link="/shop?filter=new">
          <ProductGrid products={newArrivals} loading={loading} />
        </Section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <Section title="Trending Now" subtitle="What everyone is talking about" link="/shop?filter=trending">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {trending.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </Section>
      )}

      {/* Community Section */}
      <section className="section-padding py-12 sm:py-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-primary-700 to-accent-800 dark:from-indigo-900 dark:via-primary-900 dark:to-accent-950 p-6 sm:p-10 lg:p-16">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl animate-blob" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400 rounded-full filter blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
          </div>
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#5865F2] flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-xl shadow-indigo-500/30">
              <DiscordIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">Join the Figure Club Community</h2>
            <p className="text-base sm:text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              Figure Club is more than just a marketplace. Become part of our growing anime, gaming, manga, and collectible community.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 sm:mb-10 max-w-2xl mx-auto">
              {communityBenefits.map((benefit) => (
                <div key={benefit.text} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                  <benefit.icon className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-xs font-medium text-white">{benefit.text}</span>
                </div>
              ))}
            </div>
            <a
              href={settings?.discord_url ?? 'https://discord.gg/figureclub'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[#5865F2] text-white font-bold text-base sm:text-lg hover:bg-[#4752C4] active:scale-95 transition-all shadow-xl shadow-indigo-500/40"
            >
              <Rocket className="w-5 h-5" /> Join Our Discord Community
            </a>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Why Choose Us</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">The Figure Club difference</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-5 sm:p-6 text-center card-hover"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <section className="section-padding py-12 sm:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Customer Reviews</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">What collectors say about us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-5 sm:p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  ))}
                </div>
                {review.title && <h4 className="font-semibold mb-1 text-sm sm:text-base">{review.title}</h4>}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{review.body}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                    {(review.profiles?.full_name ?? 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.profiles?.full_name ?? 'Anonymous'}</p>
                    {review.is_verified_purchase && (
                      <span className="text-xs text-green-600 dark:text-green-400">Verified Purchase</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Instagram Feed */}
      <section className="section-padding py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Follow Us on Instagram</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2 text-sm sm:text-base">@figureclub</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {trending.slice(0, 6).map((product) => (
            <a
              key={product.id}
              href="https://instagram.com/figureclub"
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-xl overflow-hidden group relative"
            >
              <img
                src={product.product_images?.[0]?.image_url}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-padding py-12 sm:py-16">
        <div className="glass-card p-6 sm:p-8 lg:p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3">Join the Club</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm sm:text-base">
            Subscribe for early access to limited drops, restock alerts, and exclusive offers.
          </p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Section({ title, subtitle, link, children, icon }: { title: string; subtitle?: string; link?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="section-padding py-8 sm:py-12">
      <div className="flex items-end justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 flex-shrink-0">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ProductGrid({ products, loading, dark: _dark }: { products: Product[]; loading: boolean; dark?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[3/4] skeleton" />
            <div className="p-4 space-y-2">
              <div className="h-4 skeleton w-3/4" />
              <div className="h-4 skeleton w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </div>
  );
}
