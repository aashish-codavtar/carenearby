import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiMyBookings, Booking } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Colors, ServiceAccentColors, ServiceIcons } from '../../utils/colors';
import { BookingCard } from '../../components/BookingCard';
import { BookingCardSkeleton } from '../../components/SkeletonLoader';
import { StatusBadge } from '../../components/StatusBadge';
import { Storage } from '../../utils/storage';

// ── Bilingual strings ──────────────────────────────────────────────────────────
const T = {
  en: {
    greeting:       (h: number) => h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening',
    bookNow:        'Book Care Now',
    bookSub:        'Available today · Starting at $25/hr',
    nearbyTitle:    'PSWs Near You',
    nearbySub:      '15 verified PSWs ready in Greater Sudbury',
    viewMap:        '🗺 View on map',
    quickLabel:     'Quick',
    quickTitle:     'How would you like care?',
    onDemandTitle:  'On Demand',
    onDemandSub:    'PSW in 2–4 hours',
    scheduledTitle: 'Scheduled',
    scheduledSub:   'Plan ahead',
    homeCareTitle:  'Home Care',
    homeCareSub:    'Regular visits',
    servicesLabel:  'Services',
    servicesTitle:  'What do you need?',
    recentLabel:    'Recent',
    recentTitle:    'Your Bookings',
    seeAll:         'See all →',
    emptyTitle:     'No bookings yet',
    emptySub:       'Your booking history will appear here',
    bookFirst:      'Book your first PSW →',
    statPSW:        'Verified PSWs',
    statRating:     'Avg Rating',
    statRate:       'Per Hour',
    activeBooking:  'Active Booking',
    trustTitle:     'Why CareNearby?',
  },
  fr: {
    greeting:       (h: number) => h < 12 ? 'Bonjour' : h < 17 ? 'Bon après-midi' : 'Bonsoir',
    bookNow:        'Réserver maintenant',
    bookSub:        "Disponible aujourd'hui · À partir de 25 $/h",
    nearbyTitle:    'PAP à proximité',
    nearbySub:      '15 PAP vérifiés disponibles',
    viewMap:        '🗺 Voir la carte',
    quickLabel:     'Rapide',
    quickTitle:     'Comment souhaitez-vous des soins ?',
    onDemandTitle:  'À la demande',
    onDemandSub:    'PAP en 2–4 heures',
    scheduledTitle: 'Planifié',
    scheduledSub:   "Planifier à l'avance",
    homeCareTitle:  'Soins à domicile',
    homeCareSub:    'Visites régulières',
    servicesLabel:  'Services',
    servicesTitle:  'De quoi avez-vous besoin ?',
    recentLabel:    'Récent',
    recentTitle:    'Vos réservations',
    seeAll:         'Voir tout →',
    emptyTitle:     'Aucune réservation',
    emptySub:       'Votre historique apparaîtra ici',
    bookFirst:      'Réserver votre premier PAP →',
    statPSW:        'PAP vérifiés',
    statRating:     'Note moy.',
    statRate:       'Par heure',
    activeBooking:  'Réservation active',
    trustTitle:     'Pourquoi CareNearby ?',
  },
};

const SERVICES = [
  { id: '1', en: 'Personal Care',        fr: 'Soins personnels',        icon: ServiceIcons['Personal Care'],        accent: ServiceAccentColors['Personal Care'],        bg: '#E3F2FD' },
  { id: '2', en: 'Companionship',        fr: 'Compagnie',               icon: ServiceIcons['Companionship'],        accent: ServiceAccentColors['Companionship'],        bg: '#F3E5F5' },
  { id: '3', en: 'Meal Preparation',     fr: 'Préparation de repas',    icon: ServiceIcons['Meal Preparation'],     accent: ServiceAccentColors['Meal Preparation'],     bg: '#FFF3E0' },
  { id: '4', en: 'Medication Reminders', fr: 'Rappels médicaments',     icon: ServiceIcons['Medication Reminders'], accent: ServiceAccentColors['Medication Reminders'], bg: '#E8F5E9' },
  { id: '5', en: 'Light Housekeeping',   fr: 'Ménage léger',            icon: ServiceIcons['Light Housekeeping'],   accent: ServiceAccentColors['Light Housekeeping'],   bg: '#FCE4EC' },
  { id: '6', en: 'Mobility Assistance',  fr: 'Aide à la mobilité',      icon: ServiceIcons['Mobility Assistance'],  accent: ServiceAccentColors['Mobility Assistance'],  bg: '#E0F7FA' },
  { id: '7', en: 'Post-Surgery Support', fr: 'Soutien post-opératoire', icon: ServiceIcons['Post-Surgery Support'], accent: ServiceAccentColors['Post-Surgery Support'], bg: '#F1F8E9' },
];

const ACTIVE_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'STARTED']);

const TRUST_ITEMS = [
  { icon: '🛡️', label: 'Police Checked',  sub: 'Criminal record verified' },
  { icon: '✅', label: 'ID Verified',      sub: 'Government ID confirmed' },
  { icon: '⭐', label: '4.8 Rating',       sub: 'Avg across all PSWs' },
  { icon: '🏥', label: 'Certified PSWs',   sub: 'College-trained professionals' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── react-native-maps (native only) ────────────────────────────────────────────
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;

// ── Leaflet loader ─────────────────────────────────────────────────────────────
declare global { interface Window { L: any } }

function loadLeaflet(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (window.L) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// ── Web-only Leaflet map preview (no interaction, shows PSW dots) ──────────────
function WebMapPreview() {
  const containerRef = useRef<any>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, {
        zoomControl: false, scrollWheelZoom: false,
        dragging: false, doubleClickZoom: false,
        attributionControl: false, keyboard: false, tap: false,
      }).setView([46.4917, -80.9924], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const style = document.createElement('style');
      style.textContent = `.cn-psw-dot{background:#007AFF;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,122,255,.45)}`;
      document.head.appendChild(style);
      [
        [46.492, -80.992], [46.506, -80.971], [46.479, -81.012],
        [46.514, -80.954], [46.476, -80.984], [46.501, -81.001],
      ].forEach(([lat, lng]) => {
        const icon = L.divIcon({ html: '<div class="cn-psw-dot" style="width:14px;height:14px;"></div>', className: '', iconAnchor: [7, 7] });
        L.marker([lat, lng], { icon }).addTo(map);
      });
      mapRef.current = map;
      // Force Leaflet to recalculate dimensions after layout settles
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 250);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // @ts-ignore
  return <div ref={containerRef} style={{ height: 160, width: '100%', backgroundColor: '#d4e8c2', position: 'relative', zIndex: 0 }} />;
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function HomeScreen() {
  const { user } = useAuth();
  const nav       = useNavigation<any>();
  const insets    = useSafeAreaInsets();
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lang,       setLang]       = useState<'en' | 'fr'>('en');
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const t              = T[lang];
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

  // Reload bookings every time the Home tab comes into focus
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    Storage.getPhotoUri().then(uri => { if (uri) setPhotoUri(uri); });
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? (lang === 'fr' ? 'là' : 'there');
  const hour      = new Date().getHours();
  const greeting  = t.greeting(hour);
  const today     = new Date().toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  const serviceRows: typeof SERVICES[] = [];
  for (let i = 0; i < SERVICES.length; i += 2) serviceRows.push(SERVICES.slice(i, i + 2));

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.systemBlue}
          />
        }
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={['#0A1628', '#0D2042', '#1565C0', '#1976D2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.locationBadge}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>Greater Sudbury, ON 🇨🇦</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                style={({ pressed }) => [styles.langToggle, pressed && { opacity: 0.75 }]}
                onPress={() => setLang(l => l === 'en' ? 'fr' : 'en')}
              >
                <Text style={styles.langToggleText}>{lang === 'en' ? 'FR' : 'EN'}</Text>
              </Pressable>
              <Pressable style={styles.avatarBtn} onPress={() => nav.navigate('ProfileTab')}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarBtnImg} />
                ) : (
                  <Text style={styles.avatarBtnText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={styles.greetingSub}>{today}</Text>
          <Text style={styles.greetingMain}>{greeting},</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>

          <Pressable style={styles.bookingCard} onPress={() => nav.navigate('NewBooking')}>
            <View style={styles.bookingCardLeft}>
              <Text style={styles.bookingCardEyebrow}>AVAILABLE TODAY</Text>
              <Text style={styles.bookingCardTitle}>{t.bookNow}</Text>
              <Text style={styles.bookingCardSub}>{t.bookSub}</Text>
            </View>
            <View style={styles.bookingCardArrow}>
              <Text style={styles.bookingCardArrowText}>→</Text>
            </View>
          </Pressable>
        </LinearGradient>

        {/* ── Active booking banner ── */}
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

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {([
            ['15+', t.statPSW],
            ['4.8⭐', t.statRating],
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

        {/* ── Nearby PSWs map ── */}
        <View style={styles.nearbyCard}>
          {Platform.OS === 'web' ? (
            <WebMapPreview />
          ) : MapView ? (
            <View style={styles.nearbyMapPreview} pointerEvents="none">
              <MapView
                style={{ flex: 1 }}
                initialRegion={{ latitude: 46.4917, longitude: -80.9924, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                mapType="standard"
              >
                {[
                  [46.492, -80.992], [46.506, -80.971], [46.479, -81.012],
                  [46.514, -80.954], [46.476, -80.984], [46.501, -81.001],
                ].map(([lat, lng], i) => (
                  <Marker
                    key={i}
                    coordinate={{ latitude: lat, longitude: lng }}
                    pinColor="#007AFF"
                  />
                ))}
              </MapView>
              <View style={[styles.nearbyMapPill, { position: 'absolute', bottom: 14, alignSelf: 'center' }]}>
                <Text style={styles.nearbyMapPillText}>{t.viewMap}</Text>
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={['#c8e6c9', '#a5d6a7', '#81c784']}
              style={styles.nearbyMapPreview}
            >
              <View style={styles.nearbyMapPill}>
                <Text style={styles.nearbyMapPillText}>{t.viewMap}</Text>
              </View>
            </LinearGradient>
          )}
          <Pressable style={styles.nearbyInfo} onPress={() => nav.navigate('NewBooking')}>
            <View style={styles.nearbyInfoLeft}>
              <Text style={styles.nearbyTitle}>{t.nearbyTitle}</Text>
              <Text style={styles.nearbySub}>{t.nearbySub}</Text>
            </View>
            <View style={styles.nearbyArrow}>
              <Text style={styles.nearbyArrowText}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Quick Book ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t.quickLabel}</Text>
          <Text style={styles.sectionTitle}>{t.quickTitle}</Text>
        </View>
        <View style={styles.quickRow}>
          {([
            { icon: '⚡', title: t.onDemandTitle,  sub: t.onDemandSub,  color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
            { icon: '📅', title: t.scheduledTitle, sub: t.scheduledSub, color: '#007AFF', bg: '#EFF6FF', border: '#BFDBFE' },
            { icon: '🏡', title: t.homeCareTitle,  sub: t.homeCareSub,  color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          ] as const).map(item => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.quickCard,
                { backgroundColor: item.bg, borderColor: item.border },
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => nav.navigate('NewBooking')}
            >
              <Text style={styles.quickCardIcon}>{item.icon}</Text>
              <Text style={[styles.quickCardTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.quickCardSub}>{item.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Services ── */}
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

        {/* ── Trust & Safety ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>TRUST</Text>
          <Text style={styles.sectionTitle}>{t.trustTitle}</Text>
        </View>
        <View style={styles.trustGrid}>
          {TRUST_ITEMS.map(item => (
            <View key={item.label} style={styles.trustCard}>
              <Text style={styles.trustCardIcon}>{item.icon}</Text>
              <Text style={styles.trustCardLabel}>{item.label}</Text>
              <Text style={styles.trustCardSub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Recent Bookings ── */}
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
            <Pressable
              style={({ pressed }) => [styles.emptyBookBtn, pressed && { opacity: 0.85 }]}
              onPress={() => nav.navigate('NewBooking')}
            >
              <Text style={styles.emptyBookBtnText}>{t.bookFirst}</Text>
            </Pressable>
          </View>
        ) : (
          recentBookings.map(b => (
            <BookingCard key={b._id} booking={b} onPress={() => nav.navigate('BookingDetail', { booking: b })} />
          ))
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>CareNearby</Text>
          <Text style={styles.footerSub}>Professional PSW Care · Greater Sudbury, ON 🇨🇦</Text>
          <Text style={styles.footerNote}>© {new Date().getFullYear()} CareNearby · Not covered by OHIP · Private pay</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  scrollView:    { flex: 1 },
  scrollContent: { paddingBottom: 32, backgroundColor: Colors.systemGroupedBackground },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  locationIcon: { fontSize: 13 },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  langToggle: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  langToggleText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarBtnImg:  { width: 42, height: 42, borderRadius: 21 },
  avatarBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  greetingSub:  { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 6, fontWeight: '500' },
  greetingMain: { color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: '500' },
  greetingName: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 24, letterSpacing: -1 },

  bookingCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  bookingCardLeft:      { flex: 1 },
  bookingCardEyebrow:   { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  bookingCardTitle:     { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  bookingCardSub:       { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  bookingCardArrow:     { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bookingCardArrowText: { color: '#0D2042', fontSize: 22, fontWeight: '800' },

  // Active banner
  activeBanner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  activeBannerGrad:    { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeBannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  activeBannerTitle:   { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  activeBannerSub:     { fontSize: 12, color: '#666', marginTop: 1 },
  activeBannerRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeBannerChevron: { fontSize: 22, color: '#2E7D32', fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statItem:   { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 18, fontWeight: '800', color: '#000' },
  statLabel:  { fontSize: 10, color: '#666', marginTop: 2, textAlign: 'center', fontWeight: '500' },
  statDivider:{ width: 1, backgroundColor: '#eee', marginHorizontal: 8 },

  // Nearby card
  nearbyCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: Colors.separator,
  },
  nearbyMapPreview: { height: 160, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 14 },
  nearbyMapDotsRow: { flexDirection: 'row', gap: 20, paddingBottom: 8 },
  nearbyMapDot: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  nearbyMapPill: { backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  nearbyMapPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  nearbyInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  nearbyInfoLeft: { flex: 1 },
  nearbyTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  nearbySub:   { fontSize: 13, color: '#666', marginTop: 2 },
  nearbyArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.systemBlue + '15', alignItems: 'center', justifyContent: 'center' },
  nearbyArrowText: { fontSize: 17, color: Colors.systemBlue, fontWeight: '700' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 12, marginTop: 28,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.tertiaryLabel, letterSpacing: 0.8, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#000', letterSpacing: -0.3 },
  seeAllBtn:    { paddingBottom: 2 },
  seeAll:       { fontSize: 14, fontWeight: '600', color: Colors.systemBlue },

  // Quick
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickCardIcon:  { fontSize: 22, marginBottom: 2 },
  quickCardTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  quickCardSub:   { fontSize: 10, color: '#888', textAlign: 'center' },

  // Services
  servicesGrid:      { paddingHorizontal: 16, gap: 10 },
  serviceGridRow:    { flexDirection: 'row', gap: 10 },
  serviceGridCard: {
    flex: 1, minHeight: 96, borderRadius: 16, padding: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  serviceGridCardEmpty: { flex: 1 },
  serviceGridIcon:  { fontSize: 26, marginBottom: 8 },
  serviceGridName:  { fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },

  // Trust
  trustGrid: {
    paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  trustCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: Colors.separator,
  },
  trustCardIcon:  { fontSize: 26, marginBottom: 4 },
  trustCardLabel: { fontSize: 13, fontWeight: '700', color: Colors.label, textAlign: 'center' },
  trustCardSub:   { fontSize: 11, color: Colors.secondaryLabel, textAlign: 'center' },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIcon:    { fontSize: 32 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#000', marginBottom: 6 },
  emptySub:     { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  emptyBookBtn: {
    backgroundColor: Colors.systemBlue, borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 24,
  },
  emptyBookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Footer
  footer: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24,
    marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.separator,
  },
  footerLogo: { fontSize: 18, fontWeight: '900', color: Colors.label, letterSpacing: -0.3, marginBottom: 4 },
  footerSub:  { fontSize: 13, color: Colors.secondaryLabel, textAlign: 'center', marginBottom: 6 },
  footerNote: { fontSize: 11, color: Colors.tertiaryLabel, textAlign: 'center', lineHeight: 16 },
});
