# CareNearby

> **Connect families in Greater Sudbury with verified Personal Support Workers (PSWs).**
> MVP built with React Native (Expo SDK 52) + Node.js + MongoDB.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Quick Start – Local Development](#quick-start--local-development)
4. [Running on Your Phone (Expo Go)](#running-on-your-phone-expo-go)
5. [Backend API Reference](#backend-api-reference)
6. [Deployment Guide](#deployment-guide)
   - [Option A – Docker on a VPS (Recommended)](#option-a--docker-on-a-vps-recommended)
   - [Option B – Railway / Render (Easy, No DevOps)](#option-b--railway--render-easy-no-devops)
7. [Install MongoDB Compass (GUI)](#install-mongodb-compass-gui)
8. [Stripe Payment Integration](#stripe-payment-integration)
9. [SMS OTP in Production (Twilio)](#sms-otp-in-production-twilio)
10. [Creating an Admin Account](#creating-an-admin-account)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Project Structure](#project-structure)

---

## What it does

| User Role | Key Features |
|-----------|-------------|
| **Customer** (family) | Register, book a PSW, track booking status, rate the worker |
| **PSW** (worker) | See nearby REQUESTED bookings, accept → start → complete jobs |
| **Admin** | Approve PSW accounts, view all bookings |

Phone-number OTP login — no passwords needed.

---

## Architecture

```
mobile/          ← React Native (Expo SDK 52) – iOS & Android
src/             ← Node.js + Express REST API
nginx/           ← Production reverse proxy
docker-compose   ← Runs API + MongoDB + Nginx together
```

---

## Quick Start – Local Development

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| MongoDB | 7 | https://www.mongodb.com/try/download/community |
| Expo Go app | SDK 52 | iOS App Store / Google Play (update to latest) |

### 1 — Start the backend

```bash
# From project root:
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET

# Start MongoDB (local install, not Docker):
# Windows:  net start MongoDB
# Mac:      brew services start mongodb-community
# Linux:    sudo systemctl start mongod

npm run dev
# → API running at http://localhost:3000
# → GET http://localhost:3000/health  returns {"status":"ok"}
```

### 2 — Start the mobile app

```bash
cd mobile
npm install       # REQUIRED after SDK 52 upgrade
npx expo start
```

---

## Running on Your Phone (Expo Go)

> Your phone and computer must be on the **same Wi-Fi network**.

### Step 1 – Find your computer's IP

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" → e.g. 192.168.1.105
```

**Mac / Linux:**
```bash
ifconfig | grep "inet "
# Look under en0 / wlan0 → e.g. 192.168.1.105
```

### Step 2 – Set the API URL

Edit `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.105:3000
```

### Step 3 – Start and scan

```bash
cd mobile
npx expo start --clear
```

Open **Expo Go** → Scan QR code shown in terminal.

### Step 4 – Login

- Enter a Canadian phone number: `+17055550100`
- The OTP code is **printed in the backend terminal** (dev mode)
- Enter the 6-digit code

---

## Backend API Reference

Base URL: `http://localhost:3000` (dev) | `https://api.yourdomain.ca` (prod)

### Auth

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/auth/login` | `{ phone, name?, role? }` | `{ message, phone }` |
| POST | `/auth/verify` | `{ phone, otp }` | `{ token, user }` |

### Customer (Bearer JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings` | Create booking |
| GET | `/bookings/my` | List my bookings |
| POST | `/ratings` | Rate PSW on completed booking |

### PSW (Bearer JWT + approved account)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs/nearby?lat=X&lng=Y` | Nearby REQUESTED jobs (updates PSW location) |
| POST | `/jobs/:id/accept` | Accept a job |
| POST | `/jobs/:id/start` | Mark started |
| POST | `/jobs/:id/complete` | Mark complete + release payment |

### Admin (Bearer JWT + ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/psws` | List all PSWs (`?approved=true/false`) |
| POST | `/admin/psws/:id/approve` | Approve a PSW |
| GET | `/admin/bookings` | All bookings (paginated, filterable by status) |

---

## Deployment Guide

### Option A – Docker on a VPS (Recommended)

**~$6–12/month.** Providers: DigitalOcean, Hetzner, Vultr, AWS Lightsail.

#### 1 — Get a server (Ubuntu 24.04)

DigitalOcean: $6/month Droplet | AWS EC2: t3.micro (free tier)

#### 2 — Install Docker

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y
```

#### 3 — Upload the project

```bash
# From your local machine:
scp -r /path/to/project root@YOUR_SERVER_IP:/opt/carenearby
# OR clone from GitHub if you push it there
```

#### 4 — Configure environment

```bash
cd /opt/carenearby
cp .env.example .env
nano .env
# Set JWT_SECRET to a long random string:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 5 — Launch

```bash
docker compose up -d
docker compose logs -f api      # Watch for errors
curl http://localhost:80/health  # Should return {"status":"ok"}
```

#### 6 — Point a domain (optional but recommended)

1. Buy a domain (Namecheap ~$10/yr, or use your own)
2. Add DNS A record: `api.carenearby.ca → YOUR_SERVER_IP`
3. Wait 5 minutes

#### 7 — Enable HTTPS (free SSL with Let's Encrypt)

```bash
apt install certbot -y
certbot certonly --standalone -d api.carenearby.ca \
  --email your@email.com --agree-tos -n

# Copy certs for nginx:
cp /etc/letsencrypt/live/api.carenearby.ca/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/api.carenearby.ca/privkey.pem   nginx/certs/

# In nginx/nginx.conf: uncomment the HTTPS server block and the redirect
docker compose restart nginx
```

#### 8 — Update mobile app

```
# mobile/.env
EXPO_PUBLIC_API_URL=https://api.carenearby.ca
```

#### Auto-renew SSL

```bash
# Add to crontab (runs daily at 2am):
crontab -e
0 2 * * * certbot renew --quiet && cp /etc/letsencrypt/live/api.carenearby.ca/*.pem /opt/carenearby/nginx/certs/ && docker compose -f /opt/carenearby/docker-compose.yml restart nginx
```

---

### Option B – Railway / Render (Easy, No DevOps)

No server management needed. Perfect for getting started fast.

#### Railway (https://railway.app) – Recommended easy option

1. Push code to GitHub
2. Go to railway.app → **New Project → Deploy from GitHub**
3. Add a **MongoDB** database (free included)
4. Set environment variables in the Railway dashboard
5. Get your URL: `https://carenearby-production.up.railway.app`
6. Update `mobile/.env`: `EXPO_PUBLIC_API_URL=https://carenearby-production.up.railway.app`

#### Render (https://render.com)

1. New Web Service → Connect GitHub repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Set env vars in dashboard
5. Use **MongoDB Atlas** (free M0 cluster at mongodb.com/cloud/atlas)

---

## Install MongoDB Compass (GUI)

MongoDB Compass is a free visual tool to view/edit your database.

1. Download: https://www.mongodb.com/try/download/compass
2. Install and open
3. Connect:
   - **Local dev:** `mongodb://localhost:27017`
   - **Docker:** `mongodb://localhost:27017` (MongoDB is port-forwarded)
   - **Atlas:** Copy connection string from Atlas dashboard

---

## Stripe Payment Integration

Payments are tracked but not charged in the MVP. To go live:

### 1 — Get keys

- Sign up at https://stripe.com
- Dashboard → Developers → API Keys → copy Secret key

### 2 — Add to .env

```
STRIPE_SECRET_KEY=sk_live_xxxxx
```

### 3 — Create payment intent on booking (src/routes/customer.js)

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// In POST /bookings, after computing price:
const intent = await stripe.paymentIntents.create({
  amount: Math.round(price * 100),  // cents
  currency: 'cad',
  capture_method: 'manual',         // authorize now, capture on completion
  metadata: { bookingId: booking._id.toString() },
});
// booking.stripePaymentIntentId = intent.id;
```

### 4 — Capture on completion (src/routes/psw.js)

```js
// In POST /jobs/:id/complete:
if (booking.stripePaymentIntentId) {
  await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
}
```

---

## SMS OTP in Production (Twilio)

Currently OTPs print to the server console. To send real SMS to Sudbury users:

### 1 — Get Twilio credentials

- Sign up at https://www.twilio.com (free trial includes $15 credit)
- Buy a Canadian phone number with SMS capability (~$1.50/month)
- Note: Account SID, Auth Token, Phone Number

### 2 — Install SDK

```bash
npm install twilio
```

### 3 — Update src/utils/otp.js

```js
const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function generateOTP(phone) {
  const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
  otpStore.set(phone, { otp, expiresAt: Date.now() + getTTLMs() });

  await twilio.messages.create({
    body: `Your CareNearby code is: ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
  return otp;
}
```

### 4 — Add to .env

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+17055550000
```

---

## Creating an Admin Account

Admin accounts can't be created via the app — create one directly in MongoDB:

### Via MongoDB shell (Docker)

```bash
docker exec -it carenearby-mongo mongosh carenearby

db.users.insertOne({
  role: "ADMIN",
  name: "Admin",
  phone: "+17055550001",
  isVerified: true,
  rating: 0,
  ratingCount: 0,
  location: { type: "Point", coordinates: [0, 0] },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Via MongoDB Compass

1. Open `carenearby` database → `users` collection
2. Click "Add Document" and paste the JSON above

Then log in with that phone number via the app. You'll be routed to the Admin dashboard.

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API port |
| `MONGODB_URI` | `mongodb://mongo:27017/carenearby` | MongoDB connection |
| `JWT_SECRET` | **required** | 64-char random string — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `OTP_TTL_MINUTES` | `5` | OTP expiry |
| `HOURLY_RATE` | `25` | CAD/hr PSW rate |
| `NEARBY_RADIUS_KM` | `15` | Job matching radius |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `TWILIO_ACCOUNT_SID` | — | Twilio SID (production OTP) |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | — | Twilio number (e.g. `+17055550000`) |

---

## Project Structure

```
project/
├── src/                        # Node.js backend
│   ├── app.js                  # Express app + CORS + Helmet + rate limiting
│   ├── middleware/
│   │   ├── auth.js             # JWT middleware
│   │   └── validate.js         # express-validator helper
│   ├── models/
│   │   ├── User.js             # Customer / PSW / Admin schema
│   │   ├── Booking.js          # Booking schema (toJSON transform: price→totalPrice etc.)
│   │   └── PSWProfile.js       # PSW certifications + approval
│   ├── routes/
│   │   ├── auth.js             # OTP login
│   │   ├── customer.js         # Booking + ratings
│   │   ├── psw.js              # Nearby jobs + accept/start/complete
│   │   └── admin.js            # PSW approval + all bookings
│   └── utils/
│       └── otp.js              # OTP store (swap for Twilio in prod)
│
├── mobile/                     # Expo SDK 52 React Native app
│   ├── App.tsx
│   ├── app.json                # expo-location plugin, iOS/Android permissions
│   ├── .env                    # EXPO_PUBLIC_API_URL (git-ignored)
│   ├── .env.example
│   └── src/
│       ├── api/client.ts       # Typed API client
│       ├── context/AuthContext.tsx
│       ├── navigation/         # AuthNavigator, CustomerNavigator, PSWNavigator, AdminNavigator
│       ├── screens/
│       │   ├── auth/           # PhoneScreen, OTPScreen
│       │   ├── customer/       # HomeScreen, BookingsScreen, CreateBookingScreen, BookingDetailScreen
│       │   ├── psw/            # NearbyJobsScreen (with GPS), JobDetailScreen
│       │   ├── admin/          # PSWListScreen, BookingsListScreen
│       │   └── shared/         # ProfileScreen
│       ├── components/         # BookingCard, JobCard, IOSButton, StatusBadge
│       └── utils/              # colors.ts, storage.ts
│
├── nginx/
│   ├── nginx.conf              # Reverse proxy + rate limiting + SSL config
│   └── certs/                  # SSL certs (git-ignored)
│
├── Dockerfile                  # Production Node.js image (non-root user)
├── docker-compose.yml          # API + MongoDB + Nginx
├── .env.example
└── README.md
```

---

## Sudbury Deployment Notes

- **Area code:** 705 (Greater Sudbury)
- **Default coordinates:** `-80.9924, 46.4917` (downtown Sudbury)
- **Job radius:** 15 km covers Greater Sudbury. Set `NEARBY_RADIUS_KM=25` for outlying areas
- **Timezone:** Server runs UTC. Dates displayed correctly via `toLocaleDateString('en-CA')`
- **Minimum booking:** 3 hours (configurable in `Booking.js`)

---

*CareNearby · Greater Sudbury, Ontario, Canada* 🇨🇦
