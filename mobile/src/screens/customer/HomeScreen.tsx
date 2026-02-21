import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiMyBookings, Booking } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Colors, ServiceAccentColors, ServiceIcons } from '../../utils/colors';
import { BookingCard } from '../../components/BookingCard';
import { BookingCardSkeleton } from '../../components/SkeletonLoader';
import { StatusBadge } from '../../components/StatusBadge';

const SERVICES = [
  { id: '1', name: 'Personal Care',        icon: ServiceIcons['Personal Care'],        accent: ServiceAccentColors['Personal Care'],        bg: Colors.servicePersonal },
  { id: '2', name: 'Companionship',         icon: ServiceIcons['Companionship'],         accent: ServiceAccentColors['Companionship'],         bg: Colors.serviceCompanion },
  { id: '3', name: 'Meal Preparation',      icon: ServiceIcons['Meal Preparation'],      accent: ServiceAccentColors['Meal Preparation'],      bg: Colors.serviceMeal },
  { id: '4', name: 'Medication Reminders',  icon: ServiceIcons['Medication Reminders'],  accent: ServiceAccentColors['Medication Reminders'],  bg: Colors.serviceMedication },
  { id: '5', name: 'Light Housekeeping',    icon: ServiceIcons['Light Housekeeping'],    accent: ServiceAccentColors['Light Housekeeping'],    bg: Colors.serviceHousing },
  { id: '6', name: 'Mobility Assistance',   icon: ServiceIcons['Mobility Assistance'],   accent: ServiceAccentColors['Mobility Assistance'],   bg: Colors.serviceMobility },
  { id: '7', name: 'Post-Surgery Support',  icon: ServiceIcons['Post-Surgery Support'],  accent: ServiceAccentColors['Post-Surgery Support'],  bg: Colors.serviceSurgery },
];

const ACTIVE_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'STARTED']);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function HomeScreen() {
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  const activeBooking = bookings.find(b => ACTIVE_STATUSES.has(b.status));
  const recentBookings = bookings.filter(b => !ACTIVE_STATUSES.has(b.status)).slice(0, 3);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { bookings: data } = await apiMyBookings();
      setBookings(data.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => { setInstallPrompt(null); setShowInstall(false); });
  }

  useEffect(() => {
    load();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [load]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  // Split services into rows of 2 for the grid
  const serviceRows: typeof SERVICES[] = [];
  for (let i = 0; i < SERVICES.length; i += 2) {
    serviceRows.push(SERVICES.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor="#fff"
          progressBackgroundColor={Colors.heroNavy}
        />
      }
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight, '#1E4976']}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.locationPill}>
            <Text style={styles.locationText}>📍 Greater Sudbury, ON</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => nav.navigate('ProfileTab')}>
            <Text style={styles.avatarBtnText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </Pressable>
        </View>

        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSub}>{today}</Text>
            <Text style={styles.greetingMain}>{greeting},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            ['15+', 'Local PSWs'],
            ['4.8 ⭐', 'Avg rating'],
            ['$25/hr', 'Starting rate'],
          ].map(([num, label], i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* ── PWA Install Banner (web only) ────────────────────────── */}
      {showInstall && (
        <View style={styles.installBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.installTitle}>📲 Add CareNearby to Home Screen</Text>
            <Text style={styles.installSub}>Install the app for faster access, offline use, and notifications</Text>
          </View>
          <View style={styles.installActions}>
            <Pressable style={styles.installBtn} onPress={installApp}>
              <Text style={styles.installBtnText}>Install</Text>
            </Pressable>
            <Pressable onPress={() => setShowInstall(false)} style={styles.installDismiss}>
              <Text style={styles.installDismissText}>✕</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Active Booking Banner ─────────────────────────────────── */}
      {activeBooking && (
        <Pressable
          style={styles.activeBanner}
          onPress={() => nav.navigate('BookingDetail', { booking: activeBooking })}
        >
          <LinearGradient
            colors={['#ECFDF5', '#D1FAE5']}
            style={styles.activeBannerGrad}
          >
            <View style={styles.activeBannerLeft}>
              <Animated.View style={[styles.activeDot, { transform: [{ scale: pulseAnim }] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>Active Booking</Text>
                <Text style={styles.activeBannerSub}>
                  {activeBooking.serviceType} · {formatDate(activeBooking.scheduledAt)} {formatTime(activeBooking.scheduledAt)}
                </Text>
              </View>
            </View>
            <View style={styles.activeBannerRight}>
              <StatusBadge status={activeBooking.status} />
              <Text style={styles.activeBannerChevron}>›</Text>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* ── Trust Badges ─────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trustRow}>
        {[
          { icon: '🛡', label: 'Police Checked' },
          { icon: '✅', label: 'ID Verified' },
          { icon: '👮', label: 'Admin Approved' },
          { icon: '🔒', label: 'Insured' },
        ].map(b => (
          <View key={b.label} style={styles.trustBadge}>
            <Text style={styles.trustIcon}>{b.icon}</Text>
            <Text style={styles.trustText}>{b.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Book CTA ─────────────────────────────────────────────── */}
      <Pressable style={styles.bookCTA} onPress={() => nav.navigate('NewBooking')}>
        <LinearGradient
          colors={[Colors.systemBlue, Colors.systemBlueDark]}
          style={styles.bookCTAGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.bookCTAContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookCTAText}>Book Care Now →</Text>
              <Text style={styles.bookCTASub}>Available today · 15 km radius · 15 PSWs nearby</Text>
            </View>
            <View style={styles.bookCTABadge}>
              <Text style={styles.bookCTABadgeText}>$25/hr</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* ── Services Grid ─────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>SERVICES</Text>
        <Text style={styles.sectionTitle}>What do you need?</Text>
      </View>

      <View style={styles.servicesGrid}>
        {serviceRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.serviceGridRow}>
            {row.map(item => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.serviceGridCard,
                  { backgroundColor: item.bg, borderColor: item.accent + '20' },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => nav.navigate('NewBooking')}
              >
                <View style={[styles.serviceGridIconWrap, { backgroundColor: item.accent + '18' }]}>
                  <Text style={styles.serviceGridIcon}>{item.icon}</Text>
                </View>
                <Text style={[styles.serviceGridName, { color: Colors.label }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.serviceGridArrow, { color: item.accent }]}>→</Text>
              </Pressable>
            ))}
            {/* If odd row, fill with empty space */}
            {row.length === 1 && <View style={styles.serviceGridCardEmpty} />}
          </View>
        ))}
      </View>

      {/* ── Recent Bookings ───────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>HISTORY</Text>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
        </View>
        <Pressable onPress={() => nav.navigate('BookingsTab')} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      </View>

      {loading ? (
        <><BookingCardSkeleton /><BookingCardSkeleton /></>
      ) : recentBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySub}>Your booking history will appear here.</Text>
        </View>
      ) : (
        recentBookings.map(b => (
          <BookingCard key={b._id} booking={b} onPress={() => nav.navigate('BookingDetail', { booking: b })} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  greetRow: { marginBottom: 20 },
  greetingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 },
  greetingMain: { color: 'rgba(255,255,255,0.85)', fontSize: 22, fontWeight: '500' },
  greetingName: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },

  // Active banner
  activeBanner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.trustGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBannerGrad: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.onlineGreen,
    shadowColor: Colors.onlineGreen, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  activeBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.trustGreen },
  activeBannerSub: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 1 },
  activeBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeBannerChevron: { fontSize: 22, color: Colors.trustGreen, fontWeight: '700' },

  // Trust badges
  trustRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.systemBackground,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.separator,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trustIcon: { fontSize: 13 },
  trustText: { fontSize: 12, fontWeight: '600', color: Colors.secondaryLabel },

  // Book CTA
  bookCTA: { marginHorizontal: 16, marginTop: 4, marginBottom: 8, borderRadius: 20, overflow: 'hidden', shadowColor: Colors.systemBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bookCTAGrad: { padding: 22 },
  bookCTAContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookCTAText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  bookCTASub: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 },
  bookCTABadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bookCTABadgeText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 14, marginTop: 24,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.tertiaryLabel, letterSpacing: 1.2, marginBottom: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.label, letterSpacing: -0.4 },
  seeAllBtn: { paddingBottom: 2 },
  seeAll: { fontSize: 14, fontWeight: '600', color: Colors.systemBlue },

  // Service grid
  servicesGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  serviceGridRow: { flexDirection: 'row', gap: 10 },
  serviceGridCard: {
    flex: 1, minHeight: 152, borderRadius: 18, padding: 16,
    borderWidth: 1,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  serviceGridCardEmpty: { flex: 1 },
  serviceGridIconWrap: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  serviceGridIcon: { fontSize: 26 },
  serviceGridName: { fontSize: 14, fontWeight: '700', lineHeight: 19, flex: 1 },
  serviceGridArrow: { fontSize: 18, fontWeight: '800', marginTop: 8 },

  // Empty / loading states
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.label, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 20 },

  // PWA install banner
  installBanner: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: Colors.heroNavy, borderRadius: 18, padding: 16,
    flexDirection: 'column', gap: 12,
    shadowColor: Colors.heroNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  installTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 },
  installSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 16 },
  installActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  installBtn: { backgroundColor: Colors.systemBlue, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  installBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  installDismiss: { padding: 8 },
  installDismissText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
});
