# Figure Club - Premium Resin Anime & Gaming Figures

A complete production-ready e-commerce platform built with React 19, TypeScript, Vite, TailwindCSS, Framer Motion, and Supabase.

## Features

### Storefront
- **Home Page**: Hero banner, featured products, best sellers, limited editions, new arrivals, trending, Instagram feed, why-choose-us, customer reviews, newsletter
- **Shop**: Category filtering, live search, price slider, sorting (newest, best selling, highest rated, price)
- **Product Detail**: Large gallery with zoom, multiple images, 360 viewer placeholder, price/discount, description, material/weight/height specs, edition, stock, rating, reviews, related products, gift wrapping, custom paint request, pre-order support, back-in-stock notification, estimated production/shipping time
- **Shopping Cart**: Persistent cart, coupon support, shipping calculator, quantity selector, price summary
- **Checkout**: Full name, phone (required), WhatsApp number (required), email, address, state, city, PIN, landmark, notes, gift wrap, custom paint, save address, terms acceptance, order summary with shipping and grand total
- **Order Confirmation**: Unique order ID, estimated delivery date, thank you message

### Customer Account
- Register, Login, Google Login, Forgot Password, Email Verification
- Remember Me (persistent sessions)
- Profile with picture upload
- Multiple saved addresses (add/edit/delete/set default)
- Wishlist
- Shopping cart (persistent)
- Order history with tracking timeline
- Order tracking with status timeline and estimated delivery
- Reviews
- Logout

### Admin Dashboard
- **Dashboard**: Revenue, orders today, pending/completed orders, customers, visitors, products, reviews, best selling product, low stock alerts, monthly revenue graph, weekly orders graph
- **Products**: Add/edit/delete/duplicate, hide/feature/best-seller/limited-edition flags, unlimited image upload with drag & drop, inventory, SKU, price, discount, material, weight, height, description, category, tags, stock, instant updates
- **Orders**: Full order details (customer name, phone, WhatsApp, email, address, products, quantities, prices, shipping, grand total, notes, custom paint, gift wrap, order date, estimated delivery, timeline), status management (pending → confirmed → printing → painting → quality check → packaging → ready to ship → shipped → delivered → cancelled → refunded), search, filter, export CSV
- **Customers**: List with order count and total spent, search, detail view, CSV export
- **Reviews**: Approve, delete, admin reply, filter by status
- **Messages**: Contact form inbox, read/unread, reply
- **Analytics**: Visitor/page view/order/revenue charts
- **Inventory**: Low stock alerts, inline stock editing, CSV export
- **Categories**: Full CRUD with sort order
- **Newsletter**: Subscriber list, CSV export
- **Settings**: Business name, logo, favicon, banner, shipping charges, support email/phone, WhatsApp number, social links, privacy policy, terms, refund policy

### Extra Features
- Floating WhatsApp button (configurable from admin)
- Recently viewed products
- Compare products
- Share product
- Low stock alerts
- Newsletter system
- Coupon system
- Inventory alerts
- CSV export/import
- Dark mode / Light mode
- Glassmorphism design
- Responsive
- SEO optimized (meta tags, Open Graph, Twitter Cards, Schema.org, sitemap, robots.txt)
- Code splitting for performance

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

The dev server runs automatically in the Bolt environment. For local development:

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

## Database Setup

The Supabase database is pre-configured with all tables, RLS policies, triggers, and seed data. See the migration files applied via the Supabase MCP tools.

### Creating the First Admin

1. Register a customer account at `/register`
2. Go to your Supabase Dashboard → SQL Editor
3. Run the following SQL (replace with your user ID):
```sql
INSERT INTO admin_users (user_id) VALUES ('YOUR-USER-ID');
```
4. Sign in at `/admin/login` with that account

To find your user ID:
```sql
SELECT id, email FROM auth.users;
```

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel will auto-detect Vite settings
4. Add environment variables (already configured in Bolt):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/             # React contexts (Auth, Cart, Theme, Toast, Settings)
├── lib/                  # Utilities and Supabase client
├── types/                # TypeScript type definitions
├── pages/
│   ├── auth/             # Login, Register, Forgot/Reset Password
│   ├── account/          # Customer account pages
│   ├── admin/            # Admin dashboard pages
│   ├── Home.tsx
│   ├── Shop.tsx
│   ├── ProductDetail.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── OrderConfirmation.tsx
│   ├── Contact.tsx
│   ├── TrackOrder.tsx
│   ├── Compare.tsx
│   ├── StaticPage.tsx
│   └── NotFound.tsx
└── App.tsx               # Main app with routing
```

## Security

- Row Level Security (RLS) enabled on all tables
- Customer data is owner-scoped (users can only access their own data)
- Admin access controlled via `admin_users` table with `is_admin()` SQL function
- Public read access for catalog (products, categories, approved reviews)
- Public insert for contact messages and newsletter
- Storage buckets with appropriate access policies

## License

This is a proprietary project for Figure Club.
