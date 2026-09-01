export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  category_id: string | null;
  material: string | null;
  weight: string | null;
  height: string | null;
  edition: string | null;
  sku: string | null;
  stock: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_best_seller: boolean;
  is_limited_edition: boolean;
  is_new_arrival: boolean;
  is_trending: boolean;
  is_hidden: boolean;
  is_preorder: boolean;
  production_time: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  category?: Category | null;
  product_images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  state: string;
  city: string;
  pin_code: string;
  landmark: string | null;
  notes: string | null;
  gift_wrap: boolean;
  custom_paint_request: string | null;
  save_address: boolean;
  create_account: boolean;
  subtotal: number;
  shipping: number;
  discount: number;
  grand_total: number;
  coupon_code: string | null;
  status: OrderStatus;
  estimated_delivery: string | null;
  cancellation_requested: boolean;
  cancellation_reason: string | null;
  is_archived: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_timeline?: OrderTimelineEntry[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'payment_verified'
  | 'printing'
  | 'painting'
  | 'quality_check'
  | 'packaging'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'damage_pending'
  | 'replacement_approved'
  | 'replacement_shipped'
  | 'replacement_delivered';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'payment_verified',
  'printing',
  'painting',
  'quality_check',
  'packaging',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'damage_pending',
  'replacement_approved',
  'replacement_shipped',
  'replacement_delivered',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'WhatsApp Confirmed',
  payment_verified: 'Payment Verified',
  printing: 'Production Started',
  painting: 'Painting',
  quality_check: 'Quality Check',
  packaging: 'Packed',
  ready_to_ship: 'Ready To Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  damage_pending: 'Damage Verification',
  replacement_approved: 'Replacement Approved',
  replacement_shipped: 'Replacement Shipped',
  replacement_delivered: 'Replacement Delivered',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  payment_verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  printing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  painting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  quality_check: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  packaging: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ready_to_ship: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  shipped: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  damage_pending: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  replacement_approved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  replacement_shipped: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  replacement_delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  created_at: string;
}

export interface OrderTimelineEntry {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  admin_email: string | null;
  created_at: string;
}

export interface WhatsappTemplate {
  id: number;
  business_name: string;
  greeting: string;
  order_confirmation: string;
  closing_message: string;
  support_message: string;
  template_body: string;
  updated_at: string;
}

export interface LocalSale {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  selling_price: number;
  customer_name: string | null;
  notes: string | null;
  total: number;
  created_at: string;
}

export interface InventoryHistory {
  id: string;
  product_id: string;
  product_name: string;
  old_stock: number;
  new_stock: number;
  change_amount: number;
  reason: string;
  admin_email: string | null;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UIMedia {
  id: string;
  key: string;
  label: string;
  media_url: string | null;
  media_type: string;
  updated_at: string;
}

export interface UISoundEntry {
  url: string | null;
  enabled: boolean;
  volume: number;
}

export interface UISounds {
  id: number;
  master_enabled: boolean;
  master_volume: number;
  sounds: Record<string, UISoundEntry>;
  updated_at: string;
}

export type SoundKey =
  | 'order_success'
  | 'cancellation'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'notification'
  | 'error'
  | 'payment_verified'
  | 'package_shipped'
  | 'package_delivered';

export type UIMediaKey =
  | 'success'
  | 'cancellation'
  | 'damage'
  | 'empty_cart'
  | 'empty_wishlist'
  | 'no_results'
  | 'offline_error'
  | 'not_found';

export interface DamageClaim {
  id: string;
  order_id: string;
  user_id: string;
  video_url: string | null;
  photo_urls: string[];
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  image_urls: string[];
  video_url: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_pinned: boolean;
  admin_reply: string | null;
  helpful_count: number;
  created_at: string;
  profiles?: Profile | null;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  gift_wrap: boolean;
  custom_paint_request: string | null;
  created_at: string;
  product?: Product;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  pin_code: string;
  landmark: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  admin_reply: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  business_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  shipping_flat: number;
  shipping_free_over: number;
  support_email: string | null;
  support_phone: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  discord_url: string | null;
  privacy_policy: string | null;
  terms: string | null;
  refund_policy: string | null;
  production_time: string | null;
  delivery_time: string | null;
  dispatch_time: string | null;
  business_address: string | null;
  footer_text: string | null;
  copyright_text: string | null;
  payment_instructions: string | null;
  qr_payment_description: string | null;
  music_enabled: boolean;
  updated_at: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  file_url: string;
  file_path: string | null;
  sort_order: number;
  is_default: boolean;
  duration: string | null;
  created_at: string;
}

export interface Analytics {
  id: string;
  date: string;
  visitors: number;
  page_views: number;
  orders: number;
  revenue: number;
}

export interface AdminUser {
  user_id: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}
