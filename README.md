# LendPro Cart

An open-source e-commerce platform with waterfall financing, intelligent upselling, and warranty integrations.

## Features

- **Waterfall Financing** - Integrates with LendPro financing platform that handles multi-lender waterfalls
- **Intelligent Upselling** - Three-layer recommendation engine (manual rules, category-based, ML-powered)
- **Warranty Integrations** - Third-party warranty provider support (Extend, Mulberry mocks)
- **Full Merchant Services** - Online payment processing with Stripe
- **Modern Stack** - React + TypeScript frontend, Node.js + Express backend

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Redis (caching)
- JWT Authentication
- Stripe Payment Processing

### Frontend
- React + TypeScript + Vite
- TanStack Query (server state)
- Zustand (client state)
- Tailwind CSS + Radix UI
- React Router

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/lendpro-cart.git
cd lendpro-cart
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the database services**
```bash
docker-compose up -d
```

4. **Set up environment variables**
```bash
# Copy the example env file
cp backend/env.example backend/.env

# Edit the .env file with your settings
```

5. **Run database migrations**
```bash
npm run db:migrate -w backend
```

6. **Seed the database** (optional, recommended for development)
```bash
npm run db:seed -w backend
```

7. **Start the development servers**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:3001`.

### Demo Credentials

After seeding the database:
- **Admin**: `admin@lendpro.com` / `admin123`
- **Customer**: `customer@example.com` / `customer123`

## Project Structure

```
lendpro-cart/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── lib/
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/                # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── lib/
│   └── index.html
├── shared/                  # Shared TypeScript types
│   └── src/types/
├── docker-compose.yml
└── package.json
```

## Key Features Explained

### Waterfall Financing

Unlike building individual lender integrations, this platform integrates with waterfall financing platforms that handle the multi-lender cascade internally:

- **LendPro** - 35+ lending partners with fast approval, supports BNPL, lease-to-own, and installments

The mock APIs simulate realistic financing decisions based on cart value and applicant information.

### Upsell System

Three-layer recommendation engine for maximizing order value:

1. **Manual Rules** - Merchant-configured product bundles (e.g., mattress → sheets, pillows)
2. **Category Matching** - Automatic suggestions based on category relationships
3. **ML Recommendations** - Collaborative filtering based on purchase patterns

### Warranty Integration

Support for third-party warranty providers:

- Product-specific warranty plans
- Automatic warranty contract creation on purchase
- Claims management (mock implementation)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with filtering)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:id` - Get product by ID or slug

### Cart
- `GET /api/cart` - Get current cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove item
- `POST /api/cart/merge` - Merge guest cart on login

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details

### Financing
- `GET /api/financing/platforms` - List financing platforms
- `POST /api/financing/applications` - Submit financing application

### Warranty
- `GET /api/warranty/product/:id/plans` - Get warranty plans for product

### Upsell
- `GET /api/upsell/product/:id` - Get upsells for product
- `POST /api/upsell/track` - Track upsell interaction

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://lendpro:password@localhost:5432/lendpro_cart
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

## Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Docker
npm run docker:up        # Start PostgreSQL and Redis
npm run docker:down      # Stop containers

# Build
npm run build            # Build all packages
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with modern open-source tools: React, Express, Prisma, Tailwind CSS

