# CareNearby — Feature Documentation

> Uber-like PSW (Personal Support Worker) booking app for Greater Sudbury, Ontario.
> Built with Expo SDK 52 · React Native · Node.js/Express · MongoDB Atlas

---

## Table of Contents

1. [New Packages Added](#new-packages-added)
2. [Customer App Features](#customer-app-features)
3. [PSW (Worker) App Features](#psw-worker-app-features)
4. [Admin App Features](#admin-app-features)
5. [Shared / Infrastructure Features](#shared--infrastructure-features)
6. [Component Library](#component-library)
7. [API Client](#api-client)
8. [Design System](#design-system)
9. [Navigation Structure](#navigation-structure)
10. [Expo Features Used](#expo-features-used)

---

## New Packages Added

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-maps` | SDK 52 compat | Native maps (Apple Maps on iOS, Google Maps on Android) |
| `expo-linear-gradient` | SDK 52 compat | Gradient backgrounds on hero sections |
| `expo-blur` | SDK 52 compat | Blur effects for UI overlays |
| `expo-image-picker` | SDK 52 compat | Camera / photo library access for profile photos |
| `expo-linking` | SDK 52 compat | Deep links, tel: links for calling PSW/client |
| `expo-font` | SDK 52 compat | Custom font loading |
| `expo-constants` | SDK 52 compat | App version, device info |

---

## Customer App Features

### 1. Home Screen (`HomeScreen.tsx`)

**Uber-like dashboard for care seekers.**

#### Hero Section
- **LinearGradient** background (navy → navy-light → deep blue)
- Dynamic time-of-day greeting: "Good morning/afternoon/evening, [Name] 👋"
- Live date display
- Location pill: "📍 Greater Sudbury, ON"
- Avatar button (tap to go to Profile)
- Stats row with frosted glass effect:
  - `15+ Local PSWs`
  - `4.8 ⭐ Avg rating`
  - `$25/hr Starting rate`

#### Active Booking Banner
- Appears when there is a REQUESTED/ACCEPTED/STARTED booking
- Animated pulsing green dot (using `Animated.loop`)
- Shows service type + date + time
- Tappable → opens Booking Detail
- Color: mint green with border

#### Service Carousel
- Horizontal scrollable row of 7 service cards
- Each card has pastel background + accent color + icon
- All 7 services: Personal Care, Companionship, Meal Prep, Medication, Housekeeping, Mobility, Post-Surgery
- Each card navigates to CreateBooking

#### Trust Badges Row
- Horizontal scrollable: "✓ Police Checked", "✓ ID Verified", "✓ Admin Approved", "✓ Insured"
- Green badges with border

#### Book CTA Banner
- Full-width LinearGradient button (blue gradient)
- "➕ Book a PSW Now" with subtitle
- Navigates to CreateBooking

#### Recent Bookings
- Shows last 3 non-active bookings
- Skeleton loaders while loading
- Empty state with icon

#### Pull-to-Refresh
- Works on full ScrollView
- White tint on dark hero background

---

### 2. Create Booking Screen (`CreateBookingScreen.tsx`)

**3-step Uber-like booking wizard.**

#### Step 1 — Service Selection
- Grid of 7 service cards (2 per row)
- Each card shows icon + name in pastel background
- Selected card gets blue border + checkmark badge
- Haptic feedback on selection (iOS/Android)

#### Step 2 — Schedule
- **Date**: Tap to advance date (+1 day)
- **Time Chips**: 6 preset times (7am, 9am, 11am, 1pm, 3pm, 5pm) as pill buttons
- **Duration**: −/+ buttons, 3–12 hour range, shows large number
- **Notes**: Multi-line text input, 500 char limit with counter

#### Step 3 — Review & Confirm
- Summary card: service icon + name
- Detail rows: Date, Time, Duration, Location, Payment
- Notes section (if provided)
- Price breakdown card: hourly rate × hours = total
- "Not covered by OHIP · Private pay" disclaimer

#### Success Screen
- Full-screen celebration with 🎉 emoji
- LinearGradient green background
- Shows confirmed booking details
- "Book Another" button

---

### 3. My Bookings Screen (`BookingsScreen.tsx`)

- LinearGradient header (navy)
- Count summary: "X total · Y active"
- **Filter pills**: All 📋 / Active 🟢 / Done ✅
  - Active = REQUESTED, ACCEPTED, STARTED
  - Done = COMPLETED, CANCELLED
- FlatList with BookingCard components
- Skeleton loaders during first load
- Pull-to-refresh
- Empty states per filter

---

### 4. Booking Detail Screen (`BookingDetailScreen.tsx`)

**Rich detail view with Uber-like status tracking.**

#### Hero Section
- Status-colored LinearGradient (e.g., orange for REQUESTED, blue for ACCEPTED)
- Service icon + StatusBadge + service name + price

#### Status Timeline
- 4-step visual progress: Requested → PSW Accepted → Care Started → Completed
- Green checkmarks for completed steps
- Blue pulsing dot for current step
- Vertical connector lines (green = done, gray = pending)
- Cancelled state shows red box

#### Details Card
- Date, Start Time, Duration, Location, Payment

#### PSW Card (when assigned)
- Avatar with initial
- Name + rating
- "✓ Admin Verified" + "✓ Sudbury PSW" badges
- **Call PSW button** (📞) — opens phone dialer via `expo-linking`
  - Visible only when status is ACCEPTED or STARTED

#### Finding PSW Banner
- Shown while status = REQUESTED and no PSW assigned
- Orange background, hourglass icon

#### Star Rating (COMPLETED only)
- 5-star tap interface
- Rating label: Poor / Fair / Good / Great / Excellent!
- Submit button activates after star selection
- Confirmation banner shown after submission

---

## PSW (Worker) App Features

### 5. PSW Dashboard (`PSWDashboardScreen.tsx`)

**Uber Driver-style main screen.**

#### Go Online Toggle — The Core Feature
- Large circular button (120×120px) prominently centered
- **OFFLINE state**: dark navy button, "GO ONLINE" text
- **ONLINE state**: white button, "ONLINE" text, green glow ring
- Animated: pulsing scale + opacity glow loop when online
- Heavy haptic feedback on toggle
- Calls `PATCH /jobs/availability` API

#### Hero section
- LinearGradient changes color: **navy when offline → green when online**
- Greeting + status message ("You're online · Accepting job requests")

#### Live Earnings Widget
- Today's earnings
- This week's earnings
- Total completed jobs count
- All calculated from job data (no extra API call needed)

#### Active Job Banner
- Shows if current ACCEPTED or STARTED job
- Service icon + client name + StatusBadge
- Tappable → opens JobDetail

#### Quick Actions Grid
- 2×2 card grid: Find Jobs, My Jobs, Earnings, Profile
- Each with pastel background + accent color

#### Recent Jobs
- Shows last 3 jobs with status badge
- "See all →" link

---

### 6. Find Jobs (Nearby) Screen (`NearbyJobsScreen.tsx`)

**PSW finds available jobs near their location.**

#### Header
- Job count subtitle
- Location badge: "📍 Live Location" or "📍 Sudbury Area"
- Earnings preview banner (when jobs exist):
  - Available job count
  - Total potential earnings
  - $25/hr base rate

#### Location Integration (`expo-location`)
- Requests foreground location permission on mount
- Uses `Location.Accuracy.Balanced`
- Sends GPS coords to backend `GET /jobs/nearby?lat=X&lng=Y`
- Falls back to Sudbury center coords if permission denied
- Shows warning banner if denied

#### Job Cards
- Distance pill (📍 X.X km) on each card
- Service icon with pastel background
- Customer name + rating
- Total pay + hourly rate
- Pull-to-refresh

---

### 7. My Jobs Screen (`MyJobsScreen.tsx`)

**PSW tracks their accepted/active/completed jobs.**

- Header with total jobs + total earned
- Filter pills: All / Active / Done
- JobCard with status badge shown on each card
- Pull-to-refresh via `useFocusEffect`
- Skeleton loaders

---

### 8. Earnings Screen (`EarningsScreen.tsx`)

**Comprehensive earnings dashboard — Uber driver earnings view.**

#### Hero
- Warm amber/gold LinearGradient
- Large total earnings number ($XXX)
- 3 stats: Completed Jobs, Total Hours, Avg per Job

#### Breakdown Cards Row
- 3 horizontal cards: Today / This Week / All Time
- Each with colored top border

#### Earnings History
- Grouped by period: Today / This Week / Earlier
- Each job row: icon + service name + date + customer + earnings amount
- Subtotal per group
- Pull-to-refresh

---

### 9. Job Detail Screen (`JobDetailScreen.tsx`)

**PSW accepts, starts, and completes jobs.**

#### Hero
- Status-colored gradient
- Service icon + service name + total earnings + hourly rate

#### Schedule Card
- Date, Start Time, Duration, Location, Pay breakdown

#### Client Card
- Client avatar initial (purple)
- Name + rating
- **Call Client button** (📞) — opens phone dialer via `expo-linking`
  - Visible when ACCEPTED or STARTED

#### Action Buttons (status-driven)
- `REQUESTED` → **"✅ Accept Job"** (green)
- `ACCEPTED` → **"▶️ Start Job"** (blue)
- `STARTED` → **"✅ Mark as Complete"** (green)
- `COMPLETED` → Celebration banner "🎉 Job Completed! You earned $X"
- `CANCELLED` → Cancellation notice

#### Confirmation Alerts
- Every action shows Alert.alert with confirm/cancel
- Haptic feedback on action

---

## Admin App Features

### Admin PSW List + Bookings
- Unchanged from before but benefits from updated:
  - StatusBadge with border style
  - BookingCard with new design
  - JobCard with new design
  - LinearGradient can be added to admin screens in future

---

## Shared / Infrastructure Features

### Auth Screens

#### Phone Screen (`PhoneScreen.tsx`) — Complete Rewrite
- LinearGradient hero with logo, app name, tagline
- "New User / Returning" toggle (pill switcher)
- Name field (new users only)
- Phone number with +1 🇨🇦 country prefix
- Auto-formatting: `416-555-0100`
- Role selection cards (new users):
  - "I need care" (CUSTOMER — blue)
  - "I'm a PSW" (PSW — green)
  - Each with icon, description, checkmark when selected
- CTA button disables until valid input
- SMS disclaimer

#### OTP Screen (`OTPScreen.tsx`) — Complete Rewrite
- LinearGradient header
- Masked phone number display
- **6 individual digit boxes** — auto-advance focus, backspace support
- **Auto-submit** when all 6 digits entered
- Haptic success/error feedback
- 30-second resend countdown timer
- "← Back" button
- Dev hint: "check server console for OTP"

#### Profile Screen (`ProfileScreen.tsx`) — Complete Rewrite
- LinearGradient hero
- **Photo Upload** via `expo-image-picker`:
  - Camera option (takes photo)
  - Photo Library option
  - Photo displayed as circular avatar
  - Camera icon badge overlay on avatar
- Role badge with color (blue=Customer, green=PSW, purple=Admin)
- Account section: Phone, Account ID, Role
- App Info section: Version (from `expo-constants`), Region, Coverage, Rate
- **Contact Support** → opens `mailto:` via `expo-linking`
- Trust Standards section (Customer only): 4 items with green check circles
- Sign Out button (destructive red)
- Footer with copyright

---

## Component Library

### `SkeletonLoader.tsx`
- `SkeletonBox` — animated shimmer box (pulse 0.35→0.75 opacity loop)
- `BookingCardSkeleton` — full booking card skeleton
- `JobCardSkeleton` — job card skeleton
- `ProfileSkeleton` — profile page skeleton
- All use `Animated.loop` with `useNativeDriver: true`

### `StatusTimeline.tsx`
- 4-step vertical timeline: Requested → PSW Accepted → Care Started → Completed
- Completed steps: green circle with ✓
- Current step: blue circle with inner white dot + shadow glow
- Pending steps: gray circle with border
- Connector lines: green (completed) or gray (pending)
- Special cancelled state: red box

### `IOSButton.tsx` — Updated
- Now uses `Pressable` instead of `TouchableOpacity`
- 5 variants: `filled`, `outline`, `ghost`, `destructive`, `success`
- Press animation: scale 0.98 + opacity 0.75
- Optional `icon` prop (emoji before text)
- Web-safe: haptics skipped on web
- Medium haptic feedback (was Light before)

### `BookingCard.tsx` — Updated
- New `compact` prop
- `Pressable` with press animation
- Service icon in pastel background (from `ServiceColors` map)
- Formatted date + time + duration
- PSW row: avatar + name + rating + "✓ Verified" badge
- Footer: price + chevron
- Horizontal margin + shadow

### `JobCard.tsx` — Updated
- `Pressable` with press animation
- Optional `showStatus` prop — shows status pill
- Pastel icon background per service
- Customer rating display
- Earnings: total + hourly rate
- Distance pill (📍)

### `StatusBadge.tsx` — Updated
- New `size` prop: `sm` (default) or `md`
- Added border color (40% opacity)
- `alignSelf: 'flex-start'` for correct sizing

---

## API Client

### New Endpoints Added (`client.ts`)

| Function | Method | Path | Description |
|----------|--------|------|-------------|
| `apiCancelBooking(id)` | PATCH | `/bookings/:id/cancel` | Customer cancels booking |
| `apiMyJobs()` | GET | `/jobs/my` | PSW fetches their jobs |
| `apiToggleAvailability(bool)` | PATCH | `/jobs/availability` | PSW goes online/offline |
| `apiGetProfile()` | GET | `/profile` | Get own user profile |
| `apiUpdateProfile(data)` | PATCH | `/profile` | Update name/bio/photo/etc |
| `apiRejectPSW(id)` | POST | `/admin/psws/:id/reject` | Admin rejects PSW |

### New Types Added

- `UserProfile` — full user + pswProfile nested object
- `PSWEntry.profile.bio`, `languages`, `photoUrl`, `specialties`, `policeCheckCleared`

---

## Design System

### New Colors (`colors.ts`)

| Name | Hex | Usage |
|------|-----|-------|
| `onlineGreen` | `#00B140` | PSW online state, active indicator |
| `offlineGray` | `#6B7280` | PSW offline state |
| `urgentOrange` | `#EA580C` | Urgent alerts |
| `earningsGold` | `#D97706` | Earnings screen, money amounts |
| `heroNavyMid` | `#0D2E4E` | Mid-tone navy for gradients |
| `accentGold` | `#F59E0B` | Gold accents |
| `systemIndigo` | `#5856D6` | Indigo UI elements |

### New Exported Maps

```typescript
ServiceColors   // service name → pastel background color
ServiceIcons    // service name → emoji icon
StatusColors    // booking status → color (existing, now exported)
```

### Color Usage Patterns
- Hero backgrounds: `LinearGradient` with `[heroNavy, heroNavyLight, '#1E4976']`
- PSW Online: `LinearGradient` with `[onlineGreen, '#007A2E', '#005C22']`
- Earnings: `LinearGradient` with `['#92400E', '#B45309', earningsGold]`
- Status gradient: `statusColor + 'CC'` → `statusColor + '44'` → `systemGroupedBackground`

---

## Navigation Structure

```
RootNavigator
├── AuthNavigator (unauthenticated)
│   ├── Phone (PhoneScreen) — new user / returning, role selection
│   └── OTP (OTPScreen) — 6-box OTP entry with auto-submit
│
├── CustomerNavigator (role: CUSTOMER)
│   ├── HomeTabs (BottomTab, 4 tabs)
│   │   ├── HomeTab → HomeScreen (🏠)
│   │   ├── NewBooking → CreateBookingScreen (➕) [3-step wizard]
│   │   ├── BookingsTab → BookingsScreen (📋) [filter: All/Active/Done]
│   │   └── ProfileTab → ProfileScreen (👤) [photo upload]
│   └── BookingDetail → BookingDetailScreen [status timeline + rating]
│
├── PSWNavigator (role: PSW)
│   ├── PSWTabs (BottomTab, 5 tabs)
│   │   ├── Dashboard → PSWDashboardScreen (🏠) [Go Online toggle]
│   │   ├── NearbyJobs → NearbyJobsScreen (📍) [GPS + job list]
│   │   ├── MyJobs → MyJobsScreen (📋) [filter: All/Active/Done]
│   │   ├── Earnings → EarningsScreen (💰) [earnings history]
│   │   └── PSWProfile → ProfileScreen (👤)
│   └── JobDetail → JobDetailScreen [accept/start/complete]
│
└── AdminNavigator (role: ADMIN)
    ├── PSWList → PSWListScreen (🧑‍⚕️) [approve/reject PSWs]
    ├── AllBookings → BookingsListScreen (📋) [all bookings]
    └── AdminProfile → ProfileScreen (👤)
```

---

## Expo Features Used

| Feature | Package | Where Used |
|---------|---------|-----------|
| **Linear Gradient** | `expo-linear-gradient` | Hero sections on all screens |
| **Location** | `expo-location` | NearbyJobsScreen — GPS for nearby jobs |
| **Haptics** | `expo-haptics` | Buttons, selections, success/error feedback |
| **Image Picker** | `expo-image-picker` | ProfileScreen — camera + gallery photo |
| **Linking** | `expo-linking` | BookingDetail + JobDetail — call PSW/client |
| **Constants** | `expo-constants` | ProfileScreen — app version display |
| **Async Storage** | `@react-native-async-storage` | AuthContext — persist JWT token |
| **Safe Area** | `react-native-safe-area-context` | All screens — notch/home bar padding |
| **Animations** | `Animated` (RN core) | Pulse dot, glow ring, skeleton loaders |

---

## Running the App

```bash
# Development
cd /home/aassh/project/mobile
npm start                    # Expo Go
npm run android              # Android emulator
npm run ios                  # iOS simulator

# Build web/PWA
npm run build:web            # exports + runs post-build script
cd dist
vercel deploy --prod --yes   # deploy to Vercel
```

## Environment

Create `/home/aassh/project/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://carenearby-api-production.up.railway.app
```

---

## Service Types (must match backend)

1. Personal Care
2. Companionship
3. Meal Preparation
4. Medication Reminders
5. Light Housekeeping
6. Mobility Assistance
7. Post-Surgery Support

---

*CareNearby v1.0.0 · Greater Sudbury, Ontario 🇨🇦*
