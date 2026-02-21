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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiGetProfile, apiMyJobs, apiToggleAvailability, Booking, UserProfile } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Colors, ServiceIcons } from '../../utils/colors';
import { JobCard } from '../../components/JobCard';
import { StatusBadge } from '../../components/StatusBadge';

export function PSWDashboardScreen() {
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const activeJob = jobs.find(j => j.status === 'ACCEPTED' || j.status === 'STARTED');
  const todayEarnings = jobs
    .filter(j => j.status === 'COMPLETED' && new Date(j.scheduledAt).toDateString() === new Date().toDateString())
    .reduce((sum, j) => sum + j.totalPrice, 0);
  const weekEarnings = jobs
    .filter(j => {
      if (j.status !== 'COMPLETED') return false;
      const d = new Date(j.scheduledAt);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    })
    .reduce((sum, j) => sum + j.totalPrice, 0);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [{ bookings }, profileRes] = await Promise.all([
        apiMyJobs(),
        apiGetProfile().catch(() => ({ user: null })),
      ]);
      setJobs(bookings);
      if (profileRes.user) setProfile(profileRes.user as UserProfile);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
      );
      pulse.start(); glow.start();
      return () => { pulse.stop(); glow.stop(); };
    }
  }, [isOnline]);

  async function toggleOnline() {
    if (toggling) return;
    setToggling(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await apiToggleAvailability(!isOnline);
      setIsOnline(v => !v);
    } catch {}
    setToggling(false);
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  const QUICK_ACTIONS = [
    { icon: '📍', label: 'Find Jobs',  screen: 'NearbyJobs', gradColors: ['#EFF6FF', '#DBEAFE'] as [string, string], accent: Colors.systemBlue },
    { icon: '📋', label: 'My Jobs',   screen: 'MyJobs',      gradColors: ['#ECFDF5', '#D1FAE5'] as [string, string], accent: Colors.onlineGreen },
    { icon: '💰', label: 'Earnings',  screen: 'Earnings',    gradColors: ['#FFFBEB', '#FEF3C7'] as [string, string], accent: Colors.earningsGold },
    { icon: '👤', label: 'Profile',   screen: 'PSWProfile',  gradColors: ['#F5F3FF', '#EDE9FE'] as [string, string], accent: Colors.systemPurple },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#fff" progressBackgroundColor={Colors.heroNavy} />
      }
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={isOnline ? ['#065F46', '#059669', '#10B981'] : [Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.locationPill}>
            <Text style={styles.locationText}>📍 Greater Sudbury, ON</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => nav.navigate('PSWProfile')}>
            <Text style={styles.avatarBtnText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </Pressable>
        </View>

        <Text style={styles.heroGreeting}>Hey, {firstName} 👋</Text>
        <Text style={styles.heroSub}>
          {isOnline ? 'You\'re online · Accepting job requests' : 'Go online to start accepting jobs'}
        </Text>

        {/* Online/Offline Toggle — Uber-style */}
        <View style={styles.toggleCenter}>
          {isOnline && (
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: pulseAnim }] }]} />
          )}
          <Animated.View style={{ transform: [{ scale: isOnline ? pulseAnim : 1 }] }}>
            <Pressable
              style={[styles.onlineBtn, isOnline ? styles.onlineBtnOn : styles.onlineBtnOff]}
              onPress={toggleOnline}
              disabled={toggling}
            >
              <Text style={styles.onlineBtnIcon}>{isOnline ? '🟢' : '⚫'}</Text>
              <Text style={[styles.onlineBtnText, { color: isOnline ? Colors.onlineGreen : '#fff' }]}>
                {isOnline ? 'ONLINE' : 'GO ONLINE'}
              </Text>
              <Text style={[styles.onlineBtnSub, { color: isOnline ? Colors.systemGray : 'rgba(255,255,255,0.6)' }]}>
                {isOnline ? 'Tap to go offline' : 'Tap to start'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Earnings row */}
        <View style={styles.earningsRow}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsNum}>${todayEarnings}</Text>
            <Text style={styles.earningsLabel}>Today</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Text style={styles.earningsNum}>${weekEarnings}</Text>
            <Text style={styles.earningsLabel}>This Week</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Text style={styles.earningsNum}>{jobs.filter(j => j.status === 'COMPLETED').length}</Text>
            <Text style={styles.earningsLabel}>Total Jobs</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Approval Pending Banner ───────────────────────────────── */}
      {profile?.pswProfile && !profile.pswProfile.approvedByAdmin && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerIcon}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingBannerTitle}>Awaiting Admin Approval</Text>
            <Text style={styles.pendingBannerSub}>
              Your credentials are under review. You'll receive jobs once approved — usually within 1–2 business days.
            </Text>
          </View>
        </View>
      )}

      {/* ── Active Job Banner ─────────────────────────────────────── */}
      {activeJob && (
        <Pressable
          style={styles.activeJobBanner}
          onPress={() => nav.navigate('JobDetail', { job: activeJob })}
        >
          <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.activeJobBannerGrad}>
            <View style={styles.activeBannerLeft}>
              <Text style={styles.activeBannerIcon}>{ServiceIcons[activeJob.serviceType] ?? '🏥'}</Text>
              <View>
                <Text style={styles.activeBannerTitle}>Active Job</Text>
                <Text style={styles.activeBannerSub}>
                  {activeJob.serviceType} · {activeJob.customer.name}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={activeJob.status} />
              <Text style={styles.activeBannerChevron}>›</Text>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>NAVIGATION</Text>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map(q => (
          <Pressable
            key={q.label}
            style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={() => nav.navigate(q.screen)}
          >
            <LinearGradient colors={q.gradColors} style={styles.quickActionGrad}>
              <Text style={styles.quickActionIcon}>{q.icon}</Text>
              <Text style={[styles.quickActionLabel, { color: q.accent }]}>{q.label}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {/* ── Recent Jobs ───────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>HISTORY</Text>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
        </View>
        <Pressable onPress={() => nav.navigate('MyJobs')} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      </View>

      {!loading && jobs.slice(0, 3).map(j => (
        <JobCard key={j._id} job={j} showStatus onPress={() => nav.navigate('JobDetail', { job: j })} />
      ))}

      {!loading && jobs.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySub}>Go online and find nearby jobs to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  locationPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroGreeting: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginBottom: 28 },

  // Online toggle
  toggleCenter: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  glowRing: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.onlineGreen,
    top: -10,
  },
  onlineBtn: {
    width: 124, height: 124, borderRadius: 62,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  onlineBtnOn: { backgroundColor: '#fff' },
  onlineBtnOff: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  onlineBtnIcon: { fontSize: 26, marginBottom: 4 },
  onlineBtnText: { fontSize: 15, fontWeight: '900' },
  onlineBtnSub: { fontSize: 10, marginTop: 2 },

  // Earnings row
  earningsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsNum: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  earningsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 3, fontWeight: '600', letterSpacing: 0.3 },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },

  // Active job banner
  activeJobBanner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.onlineGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeJobBannerGrad: {
    padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activeBannerIcon: { fontSize: 28 },
  activeBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.trustGreen },
  activeBannerSub: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 1 },
  activeBannerChevron: { fontSize: 22, color: Colors.trustGreen, fontWeight: '700' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 14, marginTop: 24,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.tertiaryLabel, letterSpacing: 1.2, marginBottom: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.label, letterSpacing: -0.4 },
  seeAllBtn: { paddingBottom: 2 },
  seeAll: { fontSize: 14, fontWeight: '600', color: Colors.systemBlue },

  // Quick actions
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  quickAction: {
    flex: 1, minWidth: '44%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  quickActionGrad: { padding: 18, alignItems: 'center', gap: 8 },
  quickActionIcon: { fontSize: 30 },
  quickActionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },

  // Empty / pending states
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.label, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 20 },
  pendingBanner: {
    marginHorizontal: 16, marginTop: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF7ED', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.systemOrange + '30',
    shadowColor: Colors.systemOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingBannerIcon: { fontSize: 24 },
  pendingBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.urgentOrange, marginBottom: 3 },
  pendingBannerSub: { fontSize: 12, color: Colors.secondaryLabel, lineHeight: 17 },
});
