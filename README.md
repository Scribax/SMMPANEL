# BoostIns — Social Media Growth Platform

A full-stack production-ready web application for selling social media promotion services (followers, likes, views) via an external provider API.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Payments | MercadoPago |
| Infra | Docker, Nginx |

---

## Project Structure

```
SMM PAGE/
├── backend/          # Express API (port 4000)
│   └── src/
│       ├── config/       # DB + env
│       ├── middleware/   # auth, admin, rate limit
│       ├── controllers/  # business logic
│       ├── routes/       # API routes
│       ├── services/     # provider, email, payment
│       └── workers/      # order status poller
├── frontend/         # Next.js app (port 3000)
│   └── src/
│       ├── app/          # Pages (App Router)
│       ├── components/   # Navbar, Footer
│       ├── lib/          # API client, auth, utils
│       └── types/        # TypeScript types
├── database/
│   └── schema.sql    # PostgreSQL schema + seed
├── nginx/
│   └── nginx.conf    # Reverse proxy config
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start (Docker)

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start all services

```bash
docker compose up -d --build
```

### 3. Run database migrations

```bash
docker compose exec postgres psql -U boostins -d boostins_db -f /docker-entrypoint-initdb.d/schema.sql
```

Or connect manually and run `database/schema.sql`.

The app will be available at **http://localhost** (Nginx proxy).

---

## Local Development (without Docker)

### Backend

```bash
cd backend
npm install
# Make sure PostgreSQL is running and .env is configured
npm run dev
# Runs on http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
# Set NEXT_PUBLIC_API_URL=http://localhost:4000 in frontend/.env.local
npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) |
| `ENCRYPTION_KEY` | AES key for encrypting provider API keys |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago access token |
| `MERCADOPAGO_WEBHOOK_SECRET` | Webhook signature secret |
| `SMTP_*` | Email server credentials (Gmail, SendGrid, etc.) |
| `PROVIDER_API_URL` | SMM provider panel API endpoint |
| `PROVIDER_API_KEY` | SMM provider API key |
| `FRONTEND_URL` | Public URL of the frontend |

---

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/api/services` | List active services |
| POST | `/api/coupons/validate` | Validate coupon code |
| POST | `/api/payments/checkout` | Create payment preference |
| POST | `/api/payments/webhook` | MercadoPago webhook |

### Auth Required
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get profile |
| GET | `/api/orders` | My order history |
| POST | `/api/orders/:id/refill` | Request refill |

### Admin Only
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats |
| GET/POST/PUT/DELETE | `/api/admin/services` | Manage services |
| GET/POST/PUT | `/api/admin/providers` | Manage providers |
| GET/PUT | `/api/admin/orders` | Manage orders |
| GET/POST | `/api/admin/users` | Manage users |
| GET/POST/PUT | `/api/admin/coupons` | Manage coupons |

---

## Default Admin Account

After running the schema seed:

- **Email:** `admin@boostins.com`
- **Password:** `Admin@123456`

> **Change this immediately in production!**

---

## Deployment (VPS)

```bash
# 1. Install Docker + Docker Compose on your VPS
# 2. Clone the repo
git clone https://github.com/youruser/boostins.git
cd boostins

# 3. Configure environment
cp .env.example .env
nano .env

# 4. Build and start
docker compose up -d --build

# 5. (Optional) Set up SSL with Certbot + Nginx
```

For HTTPS, point your domain to the VPS and configure Certbot to issue certificates, then update `nginx/nginx.conf` to handle port 443.

---

## Features

- ✅ Public pages: Home, Services catalog, Order form
- ✅ Secure checkout via MercadoPago (PIX, credit card, boleto)
- ✅ User accounts: register, login, order history, refill button
- ✅ Automated order processing after payment confirmation
- ✅ Real-time order status polling (background worker, every 60s)
- ✅ Admin dashboard: stats, services, providers, orders, users, coupons
- ✅ Coupon system (percentage & fixed discounts)
- ✅ Referral system
- ✅ Email notifications (order placed, status updates)
- ✅ Rate limiting, JWT auth, AES encryption for API keys
- ✅ Docker + VPS ready

---

## License

MIT
