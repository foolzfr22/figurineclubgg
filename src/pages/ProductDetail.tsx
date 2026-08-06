import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Heart, ShoppingBag, Share2, ZoomIn, Truck, Package,
  Gift, Palette, Bell, ChevronRight, Check, Minus, Plus, ArrowLeft,
  X, ChevronLeft, Camera, Send, Loader,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Review } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPrice, getEffectivePrice, getDiscountPercent, formatDate, estimatedDeliveryDate } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';
import BuyNowModal from '@/components/BuyNowModal';

type ReviewSort = 'newest' | 'highest' | 'lowest' | 'helpful';

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewProfiles, setReviewProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [giftWrap, setGiftWrap] = useState(false);
  const [customPaint, setCustomPaint] = useState('');
  const [showCustomPaint, setShowCustomPaint] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>('newest');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prod } = await supabase
        .from('products')
        .select('*, category:categories(*), product_images(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!prod) {
        setLoading(false);
        return;
      }

      const p = prod as Product;
      setProduct(p);
      setActiveImage(0);

      if (p.category_id) {
        const { data: rel } = await supabase
          .from('products')
          .select('*, category:categories(*), product_images(*)')
          .eq('category_id', p.category_id)
          .neq('id', p.id)
          .eq('is_hidden', false)
          .limit(4);
        setRelated((rel as Product[]) ?? []);
      }

      const { data: rev } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', p.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      const revData = (rev as Review[]) ?? [];
      setReviews(revData);

      // Fetch profile names for reviews
      if (revData.length > 0) {
        const userIds = [...new Set(revData.map((r) => r.user_id).filter(Boolean))] as string[];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const profileMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
          profileMap[p.id] = p.full_name ?? 'Anonymous';
        });
        setReviewProfiles(profileMap);
      }

      // Check wishlist
      if (user) {
        const { data: wl } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', p.id)
          .maybeSingle();
        setIsWishlisted(!!wl);

        await supabase.from('recently_viewed').upsert({
          user_id: user.id,
          product_id: p.id,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,product_id' });
      }

      setLoading(false);
    })();
  }, [slug, user]);

  const handleAddToCart = async () => {
    if (!product) return;
    await addItem(product, quantity, giftWrap, customPaint);
    toast('Added to cart', 'success');
  };

  const handleBuyNow = () => {
    if (!product) return;
    setBuyNowOpen(true);
  };

  const handleWishlist = async () => {
    if (!user || !product) {
      toast('Please login to save to wishlist', 'info');
      return;
    }
    if (isWishlisted) {
      const { data: existing } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('wishlist').delete().eq('id', (existing as { id: string }).id);
      }
      setIsWishlisted(false);
      toast('Removed from wishlist', 'info');
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
      setIsWishlisted(true);
      toast('Added to wishlist', 'success');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product?.name, url: window.location.href });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard', 'success');
    }
  };

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    toast('We will notify you when this product is back in stock', 'success');
    setNotifyEmail('');
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - reviewImages.length);
    if (!files.length) return;
    if (!user) {
      toast('Please login to upload photos', 'info');
      return;
    }
    const uploaded: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error } = await supabase.storage.from('review-images').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
    }
    setReviewImages([...reviewImages, ...uploaded]);
    toast(`${uploaded.length} photo(s) uploaded`, 'success');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Please login to write a review', 'info');
      return;
    }
    if (!product) return;
    if (!reviewBody.trim()) {
      toast('Please write your review', 'error');
      return;
    }
    setReviewSubmitting(true);
    // Check if user has purchased this product (verified buyer)
    const { data: userOrders } = await supabase
      .from('orders')
      .select('id, order_items!inner(product_id)')
      .eq('user_id', user.id)
      .eq('order_items.product_id', product.id)
      .maybeSingle();
    const isVerified = !!userOrders;

    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle || null,
      body: reviewBody,
      image_urls: reviewImages,
      is_verified_purchase: isVerified,
      is_approved: false,
    });
    if (error) {
      toast('Failed to submit review', 'error');
    } else {
      toast('Review submitted! It will appear after admin approval.', 'success');
      setReviewRating(5);
      setReviewTitle('');
      setReviewBody('');
      setReviewImages([]);
      setShowReviewForm(false);
    }
    setReviewSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      toast('Failed to delete review', 'error');
    } else {
      toast('Review deleted', 'info');
      setReviews(reviews.filter((r) => r.id !== reviewId));
    }
  };

  const handleEditReview = async (review: Review) => {
    setReviewRating(review.rating);
    setReviewTitle(review.title ?? '');
    setReviewBody(review.body ?? '');
    setReviewImages((review.image_urls ?? []) as string[]);
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    if (!error) {
      setReviews(reviews.filter((r) => r.id !== review.id));
      toast('Edit your review and resubmit', 'info');
    }
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating;
    if (reviewSort === 'lowest') return a.rating - b.rating;
    if (reviewSort === 'helpful') return b.helpful_count - a.helpful_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Mobile swipe for gallery
  const handleSwipe = (direction: 'left' | 'right') => {
    if (!product) return;
    const images = product.product_images ?? [];
    if (direction === 'left' && activeImage < images.length - 1) setActiveImage(activeImage + 1);
    if (direction === 'right' && activeImage > 0) setActiveImage(activeImage - 1);
  };

  if (loading) {
    return (
      <div className="section-padding py-12 min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square skeleton rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 skeleton w-3/4" />
            <div className="h-6 skeleton w-1/4" />
            <div className="h-32 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="section-padding py-20 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product.price, product.discount_price);
  const discount = getDiscountPercent(product.price, product.discount_price);
  const images = product.product_images ?? [];
  const estDelivery = estimatedDeliveryDate(product.production_time);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : product.rating;

  return (
    <div className="section-padding py-8 min-h-screen">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 overflow-hidden">
        <Link to="/" className="hover:text-primary-600 flex-shrink-0">Home</Link>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
        <Link to="/shop" className="hover:text-primary-600 flex-shrink-0">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary-600 flex-shrink-0">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
        <span className="text-slate-900 dark:text-slate-100 truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="lg:sticky lg:top-20 self-start">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 group cursor-zoom-in"
            onClick={() => setFullscreenOpen(true)}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              (e.currentTarget as HTMLElement).dataset.touchStartX = touch.clientX.toString();
            }}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];
              const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX ?? '0');
              const diff = touch.clientX - startX;
              if (Math.abs(diff) > 50) handleSwipe(diff > 0 ? 'right' : 'left');
            }}
          >
            {images[activeImage] ? (
              <img
                src={images[activeImage].image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Package className="w-20 h-20" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount > 0 && <span className="badge bg-red-500 text-white">-{discount}%</span>}
              {product.is_limited_edition && <span className="badge bg-amber-500 text-white">Limited Edition</span>}
              {product.is_preorder && <span className="badge bg-purple-500 text-white">Pre-order</span>}
            </div>
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-5 h-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeImage > 0) setActiveImage(activeImage - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeImage < images.length - 1) setActiveImage(activeImage + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === i ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={avgRating} size="sm" />
            <span className="text-sm text-slate-500">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-6 flex-wrap">
            <span className="text-3xl font-bold">{formatPrice(effectivePrice)}</span>
            {discount > 0 && <span className="text-lg text-slate-400 line-through">{formatPrice(product.price)}</span>}
            {discount > 0 && <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Save {formatPrice(product.price - effectivePrice)}</span>}
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{product.description}</p>

          <div className="mb-6">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" /> In Stock ({product.stock} available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <Package className="w-4 h-4" /> Out of Stock
              </span>
            )}
          </div>

          {product.stock > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-xl transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-3 font-medium min-w-[3rem] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-xl transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={handleAddToCart} className="btn-primary flex-1 sm:flex-none inline-flex items-center justify-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Add to Cart
                </button>
                <button onClick={handleBuyNow} className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-primary-600 text-white font-medium hover:from-accent-600 hover:to-primary-700 active:scale-95 transition-all shadow-lg shadow-accent-500/20 inline-flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" /> Buy Now
                </button>
                <button onClick={handleWishlist} className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${isWishlisted ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <button onClick={handleShare} className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {product.stock === 0 && (
            <form onSubmit={handleNotifyMe} className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5 text-amber-600" />
                <p className="font-medium text-sm">Notify me when back in stock</p>
              </div>
              <div className="flex gap-2">
                <input type="email" required value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} placeholder="Your email" className="input-field flex-1" />
                <button type="submit" className="btn-primary">Notify Me</button>
              </div>
            </form>
          )}

          {/* Options */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setGiftWrap(!giftWrap)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${giftWrap ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <p className="font-medium text-sm">Gift Wrapping</p>
                  <p className="text-xs text-slate-500">Premium wrapping with personalized note</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${giftWrap ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                {giftWrap && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>

            <button
              onClick={() => setShowCustomPaint(!showCustomPaint)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${showCustomPaint ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <p className="font-medium text-sm">Custom Paint Request</p>
                  <p className="text-xs text-slate-500">Request a custom paint job</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${showCustomPaint ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                {showCustomPaint && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
            {showCustomPaint && (
              <textarea value={customPaint} onChange={(e) => setCustomPaint(e.target.value)} placeholder="Describe your custom paint request..." className="input-field min-h-[80px] resize-y" />
            )}
          </div>

          {/* Shipping info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl surface-inset">
              <Truck className="w-5 h-5 text-primary-500 mb-2" />
              <p className="text-sm font-medium">Estimated Production</p>
              <p className="text-xs text-slate-500">{settings?.production_time || product.production_time || '7-10 Days'}</p>
            </div>
            <div className="p-4 rounded-xl surface-inset">
              <Package className="w-5 h-5 text-primary-500 mb-2" />
              <p className="text-sm font-medium">Expected Shipping</p>
              <p className="text-xs text-slate-500">{settings?.delivery_time || '2-5 Days'} after production</p>
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <Spec label="Material" value={product.material} />
            <Spec label="Weight" value={product.weight} />
            <Spec label="Height" value={product.height} />
            <Spec label="Edition" value={product.edition} />
            <Spec label="SKU" value={product.sku} />
            <Spec label="Category" value={product.category?.name} />
          </div>

          {/* Tabs */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
              {(['description', 'reviews', 'shipping'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                  {tab === 'reviews' ? `Reviews (${reviews.length})` : tab}
                </button>
              ))}
            </div>

            {activeTab === 'description' && (
              <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>{product.description}</p>
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.tags.map((tag) => <span key={tag} className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">#{tag}</span>)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating summary */}
                <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl surface-inset">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
                    <StarRating rating={avgRating} size="sm" />
                    <p className="text-xs text-slate-500 mt-1">{reviews.length} reviews</p>
                  </div>
                  <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn-primary text-sm ml-auto">
                    Write a Review
                  </button>
                </div>

                {/* Review form */}
                <AnimatePresence>
                  {showReviewForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleSubmitReview}
                      className="card p-4 space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="text-sm font-medium mb-2 block">Your Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setReviewRating(star)}>
                              <Star className={`w-7 h-7 transition-colors ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Title (optional)</label>
                        <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Sum up your review" className="input-field text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Your Review</label>
                        <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} required placeholder="What did you like or dislike?" className="input-field min-h-[100px] resize-y text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Add Photos (up to 3)</label>
                        <div className="flex gap-3 flex-wrap">
                          {reviewImages.map((url, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setReviewImages(reviewImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {reviewImages.length < 3 && (
                            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                              <Camera className="w-5 h-5 text-slate-400" />
                              <input type="file" accept="image/*" multiple className="hidden" onChange={handleReviewImageUpload} />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button type="submit" disabled={reviewSubmitting} className="btn-primary inline-flex items-center gap-2">
                          {reviewSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit Review
                        </button>
                        <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary">Cancel</button>
                      </div>
                      {!user && <p className="text-xs text-slate-500">Please login to write a review.</p>}
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Sort */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Sort by:</span>
                    <select value={reviewSort} onChange={(e) => setReviewSort(e.target.value as ReviewSort)} className="input-field py-2 px-3 text-sm w-auto">
                      <option value="newest">Newest</option>
                      <option value="highest">Highest Rated</option>
                      <option value="lowest">Lowest Rated</option>
                      <option value="helpful">Most Helpful</option>
                    </select>
                  </div>
                )}

                {/* Reviews list */}
                <div className="space-y-4">
                  {sortedReviews.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No reviews yet. Be the first to review!</p>
                  ) : (
                    sortedReviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} size="sm" />
                            {review.is_verified_purchase && <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Verified Purchase</span>}
                          </div>
                          <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
                        </div>
                        {review.title && <h4 className="font-medium text-sm mb-1">{review.title}</h4>}
                        <p className="text-sm text-slate-600 dark:text-slate-400">{review.body}</p>
                        {review.image_urls.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {review.image_urls.map((url, i) => <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {(reviewProfiles[review.user_id ?? ''] ?? 'A')[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-500">{reviewProfiles[review.user_id ?? ''] ?? 'Anonymous'}</span>
                          {review.is_pinned && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs">Pinned</span>}
                          {user && review.user_id === user.id && (
                            <div className="flex gap-1 ml-auto">
                              <button
                                onClick={() => handleEditReview(review)}
                                className="text-xs text-primary-600 hover:underline"
                              >Edit</button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-xs text-red-500 hover:underline"
                              >Delete</button>
                            </div>
                          )}
                        </div>
                        {review.admin_reply && (
                          <div className="mt-3 p-3 rounded-lg surface-inset">
                            <p className="text-xs font-medium mb-1">Figure Club:</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{review.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <p><strong className="text-slate-900 dark:text-slate-100">Production Time:</strong> {settings?.production_time || product.production_time || '7-10 Days'}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Delivery Time:</strong> {settings?.delivery_time || '2-5 Days'}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Dispatch Time:</strong> {settings?.dispatch_time || '1-2 Days'} after production</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Estimated Delivery:</strong> By {formatDate(estDelivery)}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Shipping:</strong> Free shipping on orders over Rs. 5,000. Standard shipping Rs. 199.</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Packaging:</strong> Each figure ships in custom-fit protective packaging with foam inserts.</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Pre-order:</strong> {product.is_preorder ? 'This is a pre-order item. Production begins after order confirmation.' : 'This item is in production and ready to ship.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Fullscreen Gallery */}
      <AnimatePresence>
        {fullscreenOpen && images[activeImage] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenOpen(false)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full glass-strong flex items-center justify-center text-white z-10">
              <X className="w-5 h-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeImage > 0) setActiveImage(activeImage - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-strong flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeImage < images.length - 1) setActiveImage(activeImage + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-strong flex items-center justify-center text-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            <motion.img
              key={activeImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={images[activeImage].image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                  className={`w-2 h-2 rounded-full transition-colors ${activeImage === i ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Now Modal */}
      <BuyNowModal
        product={buyNowOpen ? product : null}
        quantity={quantity}
        giftWrap={giftWrap}
        customPaint={customPaint}
        onClose={() => setBuyNowOpen(false)}
      />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
