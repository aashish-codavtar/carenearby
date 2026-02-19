# CareNearby – Mobile App (React Native / Expo)

iOS-first React Native app connecting families with verified PSWs in Sudbury, Ontario.

---

## Tech Stack

| Layer       | Choice                                  |
|-------------|------------------------------------------|
| Framework   | React Native 0.74 via Expo SDK 51        |
| Navigation  | React Navigation 6 (Native Stack + Tabs)|
| Auth State  | React Context + AsyncStorage (JWT)       |
| Styling     | iOS System Design (SF Pro, iOS colors)  |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- iOS Simulator (Xcode) **or** [Expo Go](https://expo.dev/go) on your iPhone

### 2. Install dependencies

```bash
cd mobile
npm install
```

### 3. Point to your backend

Edit `src/api/client.ts`:

```ts
// For iOS Simulator
export const API_BASE = 'http://localhost:3000';

// For real device on the same Wi-Fi (use your machine's local IP)
export const API_BASE = 'http://192.168.1.XXX:3000';
```

Make sure the backend is running:

```bash
# From project root
docker compose up -d
```

### 4. Start Expo

```bash
npm run ios      # Open in iOS Simulator (macOS only)
npm start        # Scan QR with Expo Go on your iPhone
```

---

## Project Structure

```
mobile/
├── App.tsx                          # Root component (providers + navigation)
├── src/
│   ├── api/
│   │   └── client.ts               # All API calls + TypeScript types
│   ├── context/
│   │   └── AuthContext.tsx         # JWT auth state + AsyncStorage persistence
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Role-based navigator switcher
│   │   ├── AuthNavigator.tsx       # Phone → OTP stack
│   │   ├── CustomerNavigator.tsx   # Bottom tabs (Home, Book, Bookings, Profile)
│   │   ├── PSWNavigator.tsx        # Bottom tabs (Nearby Jobs, Profile)
│   │   └── AdminNavigator.tsx      # Bottom tabs (PSWs, Bookings, Profile)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── PhoneScreen.tsx     # Phone + name + role entry
│   │   │   └── OTPScreen.tsx       # 6-digit OTP verification
│   │   ├── customer/
│   │   │   ├── HomeScreen.tsx      # Dashboard with quick actions
│   │   │   ├── CreateBookingScreen.tsx  # Booking form (service, date, hours)
│   │   │   ├── BookingsScreen.tsx  # My bookings list with filters
│   │   │   └── BookingDetailScreen.tsx  # Detail + PSW rating
│   │   ├── psw/
│   │   │   ├── NearbyJobsScreen.tsx  # Nearby job listings
│   │   │   └── JobDetailScreen.tsx   # Job detail + Accept/Start/Complete
│   │   ├── admin/
│   │   │   ├── PSWListScreen.tsx   # PSW management + approve
│   │   │   └── BookingsListScreen.tsx  # All bookings with status filter
│   │   └── shared/
│   │       └── ProfileScreen.tsx   # User info + sign out
│   ├── components/
│   │   ├── IOSButton.tsx           # iOS-styled button with haptics
│   │   ├── StatusBadge.tsx         # Colored booking status badge
│   │   ├── BookingCard.tsx         # Customer-facing booking card
│   │   └── JobCard.tsx             # PSW-facing job card
│   └── utils/
│       ├── colors.ts               # iOS system colors
│       └── storage.ts              # AsyncStorage wrapper
```

---

## App Flows

### Auth Flow (all roles)
1. Enter phone number + name (new users) + select role (CUSTOMER or PSW)
2. Receive OTP → enter 6-digit code in animated input
3. Redirected to role-appropriate home screen

### Customer Flow
- **Home** — Greeting, service grid, quick book CTA, recent booking
- **Book** — Select service type, set date/time, choose hours (min 3), see price preview
- **My Bookings** — Filter by All / Active / Completed; pull-to-refresh
- **Booking Detail** — Full info, PSW details, star rating for completed bookings
- **Profile** — Account info, sign out

### PSW Flow
- **Nearby Jobs** — Jobs within 15 km, sorted by distance; pull-to-refresh
- **Job Detail** — Accept → Start → Complete lifecycle with confirmation alerts
- **Profile** — Account info, sign out

### Admin Flow
- **Workers** — List all PSWs, filter Pending/Approved, one-tap approve
- **Bookings** — All bookings with scrollable status filter chips
- **Profile** — Account info, sign out

---

## iOS Design

All screens follow Apple Human Interface Guidelines:

- **Colors** — iOS system colors (`#007AFF` blue, `#34C759` green, `#F2F2F7` grouped background)
- **Typography** — System default font (SF Pro on iOS)
- **Navigation** — Native Stack (swipe-to-go-back) + Bottom Tab Bar
- **Touch feedback** — Haptic feedback on buttons via `expo-haptics`
- **Safe Areas** — All screens use `SafeAreaView` from `react-native-safe-area-context`
- **Pull to Refresh** — All list screens support `RefreshControl`

---

## OTP in Dev Mode

The backend prints the OTP to its logs — no SMS is sent. Check with:

```bash
docker compose logs -f api
```
