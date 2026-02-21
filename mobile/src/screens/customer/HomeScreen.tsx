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

// ── Bilingual strings ──────────────────────────────────────────────────────────
const T = {
  en: {
    greeting: (h: number) => h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening',
    bookNow: 'Book Care Now',
    bookSub: 'Available today · Starting at $25/hr',
    nearbyTitle: 'Nearby PSWs',
    nearbySub: '15 PSWs available in your area',
    viewMap: '🗺 View map',
    servicesLabel: 'Services',
    servicesTitle: 'What do you need?',
    recentLabel: 'Recent',
    recentTitle: 'Your Bookings',
    seeAll: 'See all →',
    emptyTitle: 'No bookings yet',
    emptySub: 'Your booking history will appear here',
    statPSW: 'Verified PSWs',
    statRating: 'Avg Rating',
    statRate: 'Per Hour',
    activeBooking: 'Active Booking',
  },
  fr: {
    greeting: (h: number) => h < 12 ? 'Bonjour' : h < 17 ? 'Bon après-midi' : 'Bonsoir',
    bookNow: 'Réserver maintenant',
    bookSub: 'Disponible aujourd\'hui · À partir de 25 $/h',
    nearbyTitle: 'PAP à proximité',
    nearbySub: '15 PAP disponibles dans votre région',
    viewMap: '🗺 Voir la carte',
    servicesLabel: 'Services',
    servicesTitle: 'De quoi avez-vous besoin ?',
    recentLabel: 'Récent',
    recentTitle: 'Vos réservations',
    seeAll: 'Voir tout →',
    emptyTitle: 'Aucune réservation',
    emptySub: 'Votre historique apparaîtra ici',
    statPSW: 'PAP vérifiés',
    statRating: 'Note moy.',
    statRate: 'Par heure',
    activeBooking: 'Réservation active',
  },
};

// ── Services (bilingual names) ─────────────────────────────────────────────────
const SERVICES = [
  { id: '1', en: 'Personal Care',        fr: 'Soins personnels',       icon: ServiceIcons['Personal Care'],        accent: ServiceAccentColors['Personal Care'],        bg: '#E3F2FD' },
  { id: '2', en: 'Companionship',        fr: 'Compagnie',              icon: ServiceIcons['Companionship'],        accent: ServiceAccentColors['Companionship'],        bg: '#F3E5F5' },
  { id: '3', en: 'Meal Preparation',     fr: 'Préparation de repas',   icon: ServiceIcons['Meal Preparation'],     accent: ServiceAccentColors['Meal Preparation'],     bg: '#FFF3E0' },
  { id: '4', en: 'Medication Reminders', fr: 'Rappels médicaments',    icon: ServiceIcons['Medication Reminders'], accent: ServiceAccentColors['Medication Reminders'], bg: '#E8F5E9' },
  { id: '5', en: 'Light Housekeeping',   fr: 'Ménage léger',           icon: ServiceIcons['Light Housekeeping'],   accent: ServiceAccentColors['Light Housekeeping'],   bg: '#FCE4EC' },
  { id: '6', en: 'Mobility Assistance',  fr: 'Aide à la mobilité',     icon: ServiceIcons['Mobility Assistance'],  accent: ServiceAccentColors['Mobility Assistance'],  bg: '#E0F7FA' },
  { id: '7', en: 'Post-Surgery Support', fr: 'Soutien post-opératoire',icon: ServiceIcons['Post-Surgery Support'], accent: ServiceAccentColors['Post-Surgery Support'], bg: '#F1F8E9' },
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
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const t = T[lang];
  const activeBooking  = bookings.find(b => ACTIVE_STATUSES.has(b.status));
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
    load();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [load]);

  const firstName = user?.name?.split(' ')[0] ?? (lang === 'fr' ? 'là' : 'there');
  const hour      = new Date().getHours();
  const greeting  = t.greeting(hour);
  const today     = new Date().toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  const serviceRows = [];
  for (let i = 0; i < SERVICES.length; i += 2) serviceRows.push(SERVICES.slice(i, i + 2));

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#fff"
            progressBackgroundColor="#000"
          />
        }
      >
        <LinearGradient
          colors={['#000000', '#1a1a1a', '#2d2d2d']}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.locationBadge}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>Greater Sudbury, ON</Text>
            </View>
            <View style={styles.heroActions}>
              {/* Language toggle */}
              <Pressable
                style={({ pressed }) => [styles.langToggle, pressed && { opacity: 0.75 }]}
                onPress={() => setLang(l => l === 'en' ? 'fr' : 'en')}
              >
                <Text style={styles.langToggleText}>{lang === 'en' ? 'FR' : 'EN'}</Text>
              </Pressable>
              <Pressable style={styles.avatarBtn} onPress={() => nav.navigate('ProfileTab')}>
                <Text style={styles.avatarBtnText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.greetingSub}>{today}</Text>
          <Text style={styles.greetingMain}>{greeting},</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>

          <Pressable style={styles.bookingCard} onPress={() => nav.navigate('NewBooking')}>
            <View style={styles.bookingCardLeft}>
              <Text style={styles.bookingCardTitle}>{t.bookNow}</Text>
              <Text style={styles.bookingCardSub}>{t.bookSub}</Text>
            </View>
            <View style={styles.bookingCardArrow}>
              <Text style={styles.bookingCardArrowText}>→</Text>
            </View>
          </Pressable>
        </LinearGradient>

        {activeBooking && (
          <Pressable
            style={styles.activeBanner}
            onPress={() => nav.navigate('BookingDetail', { booking: activeBooking })}
          >
            <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.activeBannerGrad}>
              <View style={styles.activeBannerLeft}>
                <Animated.View style={[styles.activeDot, { transform: [{ scale: pulseAnim }] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeBannerTitle}>{t.activeBooking}</Text>
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

        <View style={styles.statsRow}>
          {([
            ['15+', t.statPSW],
            ['4.8', t.statRating],
            ['$25', t.statRate],
          ] as [string, string][]).map(([num, label], i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Nearby PSWs */}
        <Pressable style={styles.nearbyCard} onPress={() => nav.navigate('NewBooking')}>
          <View style={styles.nearbyMapPreview}>
            <View style={styles.nearbyMapOverlay}>
              <Text style={styles.nearbyMapText}>{t.viewMap}</Text>
            </View>
          </View>
          <View style={styles.nearbyInfo}>
            <View style={styles.nearbyInfoLeft}>
              <Text style={styles.nearbyTitle}>{t.nearbyTitle}</Text>
              <Text style={styles.nearbySub}>{t.nearbySub}</Text>
            </View>
            <View style={styles.nearbyArrow}>
              <Text style={styles.nearbyArrowText}>→</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t.servicesLabel}</Text>
          <Text style={styles.sectionTitle}>{t.servicesTitle}</Text>
        </View>

        <View style={styles.servicesGrid}>
          {serviceRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.serviceGridRow}>
              {row.map(item => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.serviceGridCard,
                    { backgroundColor: item.bg },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => nav.navigate('NewBooking')}
                >
                  <Text style={styles.serviceGridIcon}>{item.icon}</Text>
                  <Text style={styles.serviceGridName} numberOfLines={2}>
                    {lang === 'fr' ? item.fr : item.en}
                  </Text>
                </Pressable>
              ))}
              {row.length === 1 && <View style={styles.serviceGridCardEmpty} />}
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>{t.recentLabel}</Text>
            <Text style={styles.sectionTitle}>{t.recentTitle}</Text>
          </View>
          <Pressable onPress={() => nav.navigate('BookingsTab')} style={styles.seeAllBtn}>
            <Text style={styles.seeAll}>{t.seeAll}</Text>
          </Pressable>
        </View>

        {loading ? (
          <><BookingCardSkeleton /><BookingCardSkeleton /></>
        ) : recentBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.emptySub}</Text>
          </View>
        ) : (
          recentBookings.map(b => (
            <BookingCard key={b._id} booking={b} onPress={() => nav.navigate('BookingDetail', { booking: b })} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },

  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4,
  },
  locationIcon: { fontSize: 12 },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  langToggle: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  langToggleText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  greetingSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 },
  greetingMain: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '500' },
  greetingName: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },

  bookingCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  bookingCardLeft: { flex: 1 },
  bookingCardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  bookingCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  bookingCardArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  bookingCardArrowText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  activeBanner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  activeBannerGrad: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  activeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  activeBannerSub: { fontSize: 12, color: '#666', marginTop: 1 },
  activeBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeBannerChevron: { fontSize: 22, color: '#2E7D32', fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#000' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 8 },

  nearbyCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  nearbyMapPreview: { height: 80, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  nearbyMapOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  nearbyMapText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  nearbyInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  nearbyInfoLeft: { flex: 1 },
  nearbyTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  nearbySub: { fontSize: 13, color: '#666', marginTop: 2 },
  nearbyArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  nearbyArrowText: { fontSize: 16, color: '#666', fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 14, marginTop: 24,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#666', letterSpacing: 0.5, marginBottom: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000', letterSpacing: -0.3 },
  seeAllBtn: { paddingBottom: 2 },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#007AFF' },

  servicesGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  serviceGridRow: { flexDirection: 'row', gap: 10 },
  serviceGridCard: {
    flex: 1, minHeight: 100, borderRadius: 16, padding: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  serviceGridCardEmpty: { flex: 1 },
  serviceGridIcon: { fontSize: 28, marginBottom: 8 },
  serviceGridName: { fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#666', textAlign: 'center' },
});
