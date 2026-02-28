# Design: Session Expiry, Photo Sync, Address/Map, Black Bar Fix

Date: 2026-02-28

## Issues

1. **Admin session expiry** — admin panel silently redirects to login on 401; no message shown
2. **Photo not reflecting** — HomeScreen avatar doesn't update after user changes photo on ProfileScreen
3. **Address/map** — bookings show hardcoded "Greater Sudbury, ON"; PSW and client need to see actual address + map
4. **Black bar** — dark body background bleeds through at the bottom of the HomeScreen on web

---

## Fix 1 — Admin session expiry (`admin/app.js`)

- Modify `logout(message?)` to accept an optional string
- If message present, set `document.getElementById('login-error').textContent = message`
- In `apiCall` 401 handler: `logout('Session expired. Please sign in again.')`
- Suppress misleading error toasts in callers: rethrow a typed error that callers can check

## Fix 2 — Photo sync (`mobile/src/screens/customer/HomeScreen.tsx`)

- Replace `useEffect` (runs once) with `useFocusEffect` for reading `Storage.getPhotoUri()`
- Import `useFocusEffect` from `@react-navigation/native`

## Fix 3 — Address/map

### `mobile/src/api/client.ts`
- Add `address?: string` to `Booking` interface

### `mobile/src/screens/psw/JobDetailScreen.tsx`
- Replace `'Greater Sudbury, ON'` with `job.address || 'Greater Sudbury, ON'`
- Add address label above map section: "📍 Care Location: {address}"

### `mobile/src/screens/customer/BookingDetailScreen.tsx`
- Replace `'Greater Sudbury, ON'` with `booking.address || 'Greater Sudbury, ON'`
- Add embedded map section (OSM iframe on web, react-native-maps on native) with "Open in Google Maps" button

## Fix 4 — Black bar (`mobile/web/index.html`)

- Add `body { background-color: #F1F5F9; }` to the `<style id="expo-reset">` block

---

## Files Changed

- `admin/app.js`
- `mobile/src/screens/customer/HomeScreen.tsx`
- `mobile/src/api/client.ts`
- `mobile/src/screens/psw/JobDetailScreen.tsx`
- `mobile/src/screens/customer/BookingDetailScreen.tsx`
- `mobile/web/index.html`
