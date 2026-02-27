# CareNearby — Claude Code Guide

## Project Overview
CareNearby is a Canadian PSW (Personal Support Worker) booking platform with:
- **Backend**: Node.js + Express + MongoDB (Mongoose) — `src/`
- **Mobile/PWA**: React Native (Expo) — `mobile/`
- **Admin Panel**: Vanilla HTML/CSS/JS — `admin/`
- **Deployment**: Railway (backend) + Vercel (PWA)

---

## Architecture

```
/
├── src/                    # Backend (Express API)
│   ├── app.js              # Server entry, middleware, route mounting
│   ├── routes/
│   │   ├── auth.js         # /auth — OTP login for customers & PSWs
│   │   ├── admin.js        # /admin — admin CRUD (PSW approve, docs, bookings)
│   │   ├── adminAuth.js    # /admin/login, /admin/me, /admin/logout
│   │   ├── customer.js     # /bookings — customer booking flow
│   │   ├── psw.js          # /jobs — PSW nearby jobs, accept/start/complete
│   │   └── documents.js    # /documents — PSW document upload
│   ├── models/
│   │   ├── User.js         # Customers & PSWs (role field)
│   │   ├── PSWProfile.js   # PSW credentials, approval, submittedDocuments[]
│   │   ├── Booking.js      # Bookings (toJSON renames customerId→customer, pswId→psw, price→totalPrice)
│   │   ├── Document.js     # Uploaded credential docs (separate from PSWProfile)
│   │   ├── Admin.js        # Admin users (separate model from User)
│   │   ├── Rating.js       # PSW ratings
│   │   └── AuditLog.js     # Admin action audit trail
│   └── middleware/
│       ├── auth.js         # authenticate() + requireRole() for User tokens
│       └── adminAuth.js    # authenticateAdmin() + authenticateAdminOrUser() + logAudit()
├── admin/                  # Web admin panel (served at /admin by Express)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── mobile/                 # React Native (Expo) app
│   └── src/
│       ├── api/client.ts   # All API calls (apiCall wrapper)
│       ├── context/AuthContext.tsx
│       ├── navigation/     # Stack + tab navigators per role
│       └── screens/
│           ├── auth/
│           ├── customer/
│           ├── psw/
│           ├── admin/      # AdminPSWDetailScreen, etc.
│           └── shared/
└── seed-admin.js           # Seeds admin user to local MongoDB
```

---

## Key Conventions

### Backend
- **JWT auth**: Two token types — `{ adminId }` for Admin model, `{ userId }` for User model
- **JWT_SECRET**: Always use the module-level const `JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'` — never `process.env.JWT_SECRET` directly (missing env vars will throw)
- **Booking toJSON**: `customerId` → `customer`, `pswId` → `psw`, `price` → `totalPrice` in all JSON responses
- **Document storage**: Two systems exist — `PSWProfile.submittedDocuments[]` (base64 dataUrl) and `Document` model (Vercel Blob url or base64 fallback). Admin panel uses both.
- **Route ordering matters**: Specific routes (`/documents/pending`, `/documents/psw/:id`) must be defined BEFORE the generic `/:id` param route
- **authenticateAdminOrUser**: Used on most admin routes — accepts both Admin tokens and User tokens with `role=ADMIN`

### Mobile (React Native / Expo)
- **API client**: All requests go through `apiCall()` in `mobile/src/api/client.ts`
- **Auth**: Token stored via `Storage` util, injected via `AuthContext`
- **Navigation**: Role-based navigators — `CustomerNavigator`, `PSWNavigator`, `AdminNavigator`
- **Styling**: `StyleSheet.create()` always; `Colors` util for theme tokens; `useSafeAreaInsets()` for safe areas
- **Platform splits**: Use `Platform.OS === 'web'` guards for web-specific behaviour (alert vs Alert.alert)

### Admin Panel
- **API base**: `window.location.origin` — admin panel is served from the same Express server at `/admin`
- **Token**: Stored in `localStorage` as `adminToken`
- **Toasts**: Use `showToast(message, type)` — types: `'success'`, `'error'`, `'info'`
- **currentPSW / currentDoc**: Module-level state for the currently-open modal

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | 64-char random string — used for all token signing |
| `PORT` | No | Default 3000 |
| `CORS_ORIGIN` | No | Default `*` |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob (for document storage) |
| `STRIPE_SECRET_KEY` | No | Stripe payments |

---

## Running Locally

```bash
# Backend
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm install
node seed-admin.js     # creates admin/admin123 in local DB
npm start              # starts on port 3000

# Admin panel — open http://localhost:3000/admin

# Mobile
cd mobile
npm install
npx expo start
```

---

## Common Tasks

### Add a new API route
1. Add handler to the correct file in `src/routes/`
2. Use `authenticateAdminOrUser` for admin-only endpoints, `authenticate` for user endpoints
3. If the route uses a URL param like `/:id`, ensure more-specific paths (e.g., `/pending`, `/psw/:pswId`) are defined **before** the param route

### Add a new mobile screen
1. Create screen in `mobile/src/screens/<role>/`
2. Register in the role's navigator (`PSWNavigator.tsx`, `CustomerNavigator.tsx`, etc.)
3. Add screen name to the stack params type

### Approve a PSW (admin panel flow)
1. Admin logs in at `/admin`
2. PSW Workers → View → review docs → Approve PSW button
3. Backend: `POST /admin/psws/:id/approve` sets `approvedByAdmin: true` and `isVerified: true`

### Document upload flow
1. PSW opens My Documents screen in app
2. Picks image → `apiUploadDocument()` → `POST /documents/upload`
3. Backend saves to Vercel Blob (or base64 fallback) + creates `Document` record
4. Admin views in PSW detail modal → approve/reject individual docs

---

## Deployment

- **Backend**: Railway — auto-deploys from `main` branch; set env vars in Railway dashboard
- **Mobile PWA**: Vercel — `cd mobile && npx expo export --platform web`, then deploy `dist/`
- **MongoDB**: Atlas cluster `carenearby.dejttj7.mongodb.net`
- **Seed admin on Railway**: `node seed-admin-remote.js` (run once; connects to Atlas)

---

## Known Gotchas

1. **Helmet CSP**: Default helmet config may block external fonts/images. If adding CDN resources, configure `helmet({ contentSecurityPolicy: false })` or whitelist the domains.
2. **Booking field names**: Always use `customer`, `psw`, `totalPrice` in frontend code — the `toJSON` transform renames them.
3. **Document dual-storage**: PSWProfile stores base64 in `submittedDocuments[].dataUrl`; the `Document` model stores blobs at `url`. Both are checked in the admin panel image display.
4. **Rate limiter**: Auth routes are limited to 20 req/15min. Don't hammer `/admin/login` during testing.
5. **Mobile image picker**: Requires `expo-image-picker` media library permission on iOS/Android. Web skips the permission request.
