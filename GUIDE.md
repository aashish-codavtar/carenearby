# CareNearby — Complete Developer Guide

> PSW booking platform for Greater Sudbury, Ontario.
> Backend: Node.js/Express + MongoDB Atlas | Frontend: React Native (Expo SDK 52) PWA

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Where Your Files Are](#2-where-your-files-are)
3. [Environment Variables](#3-environment-variables)
4. [Running Locally](#4-running-locally)
5. [Deploying to Production](#5-deploying-to-production)
6. [Making Code Changes](#6-making-code-changes)
7. [Adding New Screens](#7-adding-new-screens)
8. [Adding New API Routes](#8-adding-new-api-routes)
9. [Design System](#9-design-system)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Structure

```
/home/aassh/project/          ← YOUR REAL PROJECT (use this)
├── src/                      ← Backend (Node.js/Express)
│   ├── index.js              ← Express app entry point
│   ├── routes/               ← API route handlers
│   │   ├── auth.js           ← OTP login/verify
│   │   ├── bookings.js       ← Customer booking CRUD
│   │   ├── jobs.js           ← PSW job actions
│   │   ├── profile.js        ← Profile get/update
│   │   ├── ratings.js        ← Rate a PSW
│   │   └── admin.js          ← Admin PSW management
│   ├── models/               ← Mongoose schemas
│   │   ├── User.js
│   │   ├── Booking.js
│   │   ├── OTP.js
│   │   └── PSWProfile.js
│   └── middleware/
│       └── auth.js           ← JWT verification middleware
│
├── mobile/                   ← Frontend (Expo React Native)
│   ├── App.tsx               ← Root component
│   ├── app.json              ← Expo config (permissions, icons, name)
│   ├── FEATURES.md           ← All new features documented
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts     ← All API functions (apiLogin, apiVerify, etc.)
│   │   ├── context/
│   │   │   └── AuthContext.tsx ← JWT + user state (signIn, signOut)
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx     ← Auth gate (shows auth or app)
│   │   │   ├── CustomerNavigator.tsx ← 4-tab customer app
│   │   │   └── PSWNavigator.tsx      ← 5-tab PSW app
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── PhoneScreen.tsx   ← Phone + role selection
│   │   │   │   └── OTPScreen.tsx     ← 6-digit OTP entry
│   │   │   ├── customer/
│   │   │   │   ├── HomeScreen.tsx        ← Dashboard with service carousel
│   │   │   │   ├── CreateBookingScreen.tsx ← 3-step booking wizard
│   │   │   │   ├── BookingsScreen.tsx     ← My bookings list
│   │   │   │   └── BookingDetailScreen.tsx ← Detail + timeline + rating
│   │   │   ├── psw/
│   │   │   │   ├── PSWDashboardScreen.tsx ← Go Online toggle
│   │   │   │   ├── NearbyJobsScreen.tsx   ← GPS-based job feed
│   │   │   │   ├── MyJobsScreen.tsx       ← Accepted/active jobs
│   │   │   │   ├── EarningsScreen.tsx     ← Earnings breakdown
│   │   │   │   └── JobDetailScreen.tsx    ← Accept/Start/Complete
│   │   │   └── shared/
│   │   │       └── ProfileScreen.tsx  ← Photo upload, account info
│   │   ├── components/
│   │   │   ├── IOSButton.tsx       ← Primary button (filled/outline/destructive)
│   │   │   ├── BookingCard.tsx     ← Booking list item
│   │   │   ├── JobCard.tsx         ← Job list item
│   │   │   ├── StatusBadge.tsx     ← Colored status pill
│   │   │   ├── SkeletonLoader.tsx  ← Shimmer loading placeholders
│   │   │   └── StatusTimeline.tsx  ← 4-step progress tracker
│   │   └── utils/
│   │       └── colors.ts       ← All colors + ServiceColors/ServiceIcons maps
│   ├── scripts/
│   │   └── post-web-build.js   ← Auto-injects PWA tags after expo export
│   ├── web/                    ← PWA assets (manifest.json, icons)
│   └── dist/                   ← Built output (deployed to Vercel)
│
├── GUIDE.md                    ← This file
├── package.json                ← Backend dependencies
├── Dockerfile                  ← Docker config (optional)
└── docker-compose.yml
```

> ⚠️ **IMPORTANT**: `/mnt/c/Users/aassh/Desktop/code/project` is an **OLD STALE COPY** on your Windows Desktop.
> Always work from `/home/aassh/project/` in your WSL terminal.

---

## 2. Where Your Files Are

| What | Path |
|------|------|
| Backend code | `/home/aassh/project/src/` |
| Mobile/frontend | `/home/aassh/project/mobile/src/` |
| Feature docs | `/home/aassh/project/mobile/FEATURES.md` |
| This guide | `/home/aassh/project/GUIDE.md` |
| Built PWA | `/home/aassh/project/mobile/dist/` |

**To open in VS Code from Windows:**
```bash
# In WSL terminal:
code /home/aassh/project
```
This opens the Linux project in VS Code. You'll see all files correctly.

---

## 3. Environment Variables

### Backend (set in Railway dashboard)

| Variable | Value | Required |
|----------|-------|----------|
| `MONGODB_URI` | `mongodb+srv://carenearby:CareNearby2026@carenearby.dejttj7.mongodb.net/carenearby` | ✅ Yes |
| `JWT_SECRET` | any long random string | ✅ Yes |
| `PORT` | set by Railway automatically | auto |
| `TWILIO_ACCOUNT_SID` | from twilio.com | SMS only |
| `TWILIO_AUTH_TOKEN` | from twilio.com | SMS only |
| `TWILIO_PHONE_NUMBER` | e.g. `+12505550100` | SMS only |

> Without Twilio vars, OTP is printed to Railway logs (dev mode). For production SMS, add the Twilio vars.

### Mobile (.env file at `/home/aassh/project/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=https://carenearby-api-production.up.railway.app
```

---

## 4. Running Locally

### Backend

```bash
cd /home/aassh/project

# Install dependencies (first time only)
npm install

# Create .env file with your local vars
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://carenearby:CareNearby2026@carenearby.dejttj7.mongodb.net/carenearby
JWT_SECRET=local-dev-secret-change-in-prod
PORT=3000
EOF

# Start dev server (auto-restarts on changes)
npm run dev
# or
node src/index.js
```

Backend runs at: `http://localhost:3000`

### Mobile (Expo Dev Server)

```bash
cd /home/aassh/project/mobile

# Install dependencies (first time only)
npm install

# Create .env file
echo "EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000" > .env
# Note: Use your machine's LAN IP (not localhost) so phone can connect

# Start Expo
npx expo start

# Options after starting:
# Press 'w' → Open in web browser
# Press 'a' → Open Android emulator
# Press 'i' → Open iOS simulator (Mac only)
# Scan QR code → Open on physical phone via Expo Go app
```

---

## 5. Deploying to Production

### Deploy Backend (Railway)

```bash
cd /home/aassh/project

# Link to Railway service (first time only)
railway service carenearby-api

# Deploy (uploads code, Railway builds + restarts)
railway up --detach
```

- Build logs: https://railway.com → your project → carenearby-api service → Deployments
- Live URL: `https://carenearby-api-production.up.railway.app`

### Deploy PWA (Vercel)

```bash
cd /home/aassh/project/mobile

# Step 1: Build for web (creates dist/ folder)
npm run build:web

# Step 2: Deploy to Vercel
cd dist
vercel deploy --prod --yes
```

- Live URL: `https://dist-psi-eight-79.vercel.app`
- First deploy will ask to link — choose project `dist` (NOT `project`)

### Deploy Both at Once

```bash
# One-liner to build + deploy everything
cd /home/aassh/project && railway service carenearby-api && railway up --detach && \
cd mobile && npm run build:web && cd dist && vercel deploy --prod --yes
```

---

## 6. Making Code Changes

### Change backend logic

1. Edit files in `/home/aassh/project/src/`
2. Test locally: `npm run dev`
3. Deploy: `cd /home/aassh/project && railway up --detach`

### Change mobile/frontend

1. Edit files in `/home/aassh/project/mobile/src/`
2. Test locally: `cd mobile && npx expo start`, press `w` for web
3. Deploy: `npm run build:web` then `cd dist && vercel deploy --prod --yes`

### Common changes checklist

| Change | Files to edit |
|--------|--------------|
| Add new screen | Create `src/screens/.../NewScreen.tsx` + add to navigator |
| Change colors | `src/utils/colors.ts` |
| Add API call | `src/api/client.ts` (frontend) + `src/routes/` (backend) |
| Change tab bar | `src/navigation/CustomerNavigator.tsx` or `PSWNavigator.tsx` |
| Add service type | `colors.ts` ServiceColors/ServiceIcons + backend validation |
| Change app name/icon | `app.json` |
| Change backend URL | `mobile/.env` → `EXPO_PUBLIC_API_URL` |

---

## 7. Adding New Screens

**Step 1 — Create the screen file:**
```bash
touch /home/aassh/project/mobile/src/screens/customer/NewScreen.tsx
```

**Step 2 — Basic screen template:**
```tsx
import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';

export function NewScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.title}>Screen Title</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text>Content here</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  hero: { padding: 20, paddingBottom: 32, alignItems: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  body: { padding: 16 },
});
```

**Step 3 — Add to navigator:**

In `CustomerNavigator.tsx`, add a new `Tab.Screen` or add to the `Stack.Navigator` for detail screens:
```tsx
// Tab screen (shows in bottom bar)
<Tab.Screen
  name="NewTab"
  component={NewScreen}
  options={{
    tabBarLabel: 'New',
    tabBarIcon: ({ focused }) => <TabIcon emoji="🆕" focused={focused} />,
  }}
/>

// Or stack screen (pushed on top, has back button)
<Stack.Screen name="NewDetail" component={NewScreen} options={{ title: 'Details' }} />
```

---

## 8. Adding New API Routes

**Backend — add route handler:**
```js
// /home/aassh/project/src/routes/example.js
const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');

// GET /example — requires login
router.get('/', protect, async (req, res) => {
  try {
    res.json({ message: 'Hello', userId: req.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Backend — register in index.js:**
```js
const exampleRouter = require('./routes/example');
app.use('/example', exampleRouter);
```

**Mobile — add API function in client.ts:**
```ts
export async function apiGetExample(): Promise<{ message: string }> {
  return request('/example', 'GET');
}
```

---

## 9. Design System

### Colors (from `colors.ts`)

| Name | Hex | Used for |
|------|-----|----------|
| `heroNavy` | `#0A2540` | Hero gradient start (all screens) |
| `heroNavyLight` | `#0D3460` | Hero gradient end |
| `systemBlue` | `#007AFF` | Buttons, links, customer accent |
| `onlineGreen` | `#00B140` | PSW online state, success |
| `trustGreen` | `#059669` | Trust badge text |
| `earningsGold` | `#D97706` | Earnings screen accent |
| `urgentOrange` | `#F59E0B` | Warnings, pending state |
| `systemRed` | `#FF3B30` | Errors, destructive actions |
| `systemGray` | `#8E8E93` | Inactive, secondary text |

### Components quick reference

```tsx
// Button variants
<IOSButton title="Primary" onPress={fn} />                   // filled blue
<IOSButton title="Secondary" variant="outline" onPress={fn} /> // outlined
<IOSButton title="Success" variant="success" onPress={fn} />   // green
<IOSButton title="Delete" variant="destructive" onPress={fn} /> // red
<IOSButton title="Loading" loading={true} onPress={fn} />      // spinner

// Status badge
<StatusBadge status="REQUESTED" />   // yellow
<StatusBadge status="ACCEPTED" />    // blue
<StatusBadge status="STARTED" />     // green
<StatusBadge status="COMPLETED" />   // teal
<StatusBadge status="CANCELLED" />   // red
<StatusBadge status="REQUESTED" size="md" />  // larger

// Timeline (in booking detail)
<StatusTimeline status="STARTED" />

// Skeleton loaders
<BookingCardSkeleton />
<JobCardSkeleton />
<ProfileSkeleton />
```

---

## 10. Performance Optimizations

### Already implemented
- ✅ `useFocusEffect` — screens only re-fetch when tab is focused (not on every render)
- ✅ `useNativeDriver: true` — animations run on native thread (smooth 60fps)
- ✅ Skeleton loaders — perceived performance while data loads
- ✅ `Platform.OS !== 'web'` guards on haptics — avoids web errors
- ✅ OTP TTL index on MongoDB — auto-expires OTP documents

### Recommended next optimizations

**1. React.memo on list items** — prevents re-renders when parent state changes:
```tsx
export const BookingCard = React.memo(function BookingCard({ booking, onPress }) {
  // ...
});
```

**2. FlatList instead of ScrollView + map** — for long lists (10+ items), use FlatList for virtualization:
```tsx
<FlatList
  data={bookings}
  keyExtractor={item => item._id}
  renderItem={({ item }) => <BookingCard booking={item} onPress={() => {}} />}
  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
/>
```

**3. Load PSW availability from backend** — currently PSWDashboard resets to offline on app restart:
```ts
// In PSWDashboardScreen.tsx, add on mount:
useEffect(() => {
  apiGetProfile().then(p => setIsOnline(p.pswProfile?.available ?? false));
}, []);
```

**4. Image caching for profile photos** — install `expo-image` for better caching:
```bash
npx expo install expo-image
```
```tsx
import { Image } from 'expo-image';
<Image source={{ uri: photoUri }} style={styles.avatar} contentFit="cover" />
```

**5. Add MongoDB indexes** — add these to your Mongoose models for faster queries:
```js
// In Booking.js
BookingSchema.index({ customer: 1, status: 1 });
BookingSchema.index({ psw: 1, status: 1 });
BookingSchema.index({ status: 1, location: '2dsphere' }); // for geo queries
```

**6. Enable React Native Hermes** — already enabled by default in Expo SDK 52, gives ~30% faster JS startup.

**7. Bundle analysis** — check what's making the bundle large:
```bash
cd /home/aassh/project/mobile
npx expo export --dump-sourcemap -p web
# Then use source-map-explorer on the output
```

---

## 11. Troubleshooting

### "Module not found" after adding new screen
Make sure the import path is correct and the file exists. Run:
```bash
ls /home/aassh/project/mobile/src/screens/
```

### Railway deployment shows old code
Check that you're deploying from the right directory:
```bash
cd /home/aassh/project   # must be here, not in mobile/
railway up --detach
```

### Vercel shows old code
The dist/ folder might be stale. Always rebuild first:
```bash
cd /home/aassh/project/mobile
npm run build:web         # regenerates dist/
cd dist
vercel deploy --prod --yes
```

### OTP not arriving (SMS not working)
Without Twilio keys, the OTP is printed to Railway logs. To see it:
```bash
railway logs --tail
# Look for: "OTP for +1XXXXXXXXXX: 123456"
```

### "Invalid token" after backend redeploy
The JWT_SECRET may have changed. Users need to log in again. On Railway, make sure `JWT_SECRET` is set to the same value each time.

### Expo build error: "Cannot find module 'expo-linear-gradient'"
```bash
cd /home/aassh/project/mobile
npx expo install expo-linear-gradient expo-image-picker expo-constants expo-haptics expo-location
```

### Can't see FEATURES.md or GUIDE.md in Windows Explorer
These files are in the **WSL Linux filesystem** at `/home/aassh/project/`, not your Windows Desktop.
Access them via:
- VS Code: `code /home/aassh/project` in WSL terminal
- Windows Explorer: Navigate to `\\wsl$\Ubuntu\home\aassh\project\`
- WSL terminal: `cat /home/aassh/project/GUIDE.md`

---

## Quick Reference Commands

```bash
# Run backend locally
cd /home/aassh/project && npm run dev

# Run mobile locally (web)
cd /home/aassh/project/mobile && npx expo start --web

# Deploy backend
cd /home/aassh/project && railway service carenearby-api && railway up --detach

# Deploy PWA
cd /home/aassh/project/mobile && npm run build:web && cd dist && vercel deploy --prod --yes

# View backend logs
railway logs --tail

# View all features
cat /home/aassh/project/mobile/FEATURES.md

# Open project in VS Code
code /home/aassh/project
```

---

*CareNearby · Greater Sudbury, Ontario · Private Pay PSW Platform*
