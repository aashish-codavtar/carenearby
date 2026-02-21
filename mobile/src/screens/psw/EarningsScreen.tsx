import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiMyJobs, Booking } from '../../api/client';
import { Colors, ServiceIcons } from '../../utils/colors';
import { JobCardSkeleton } from '../../components/SkeletonLoader';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function groupByPeriod(jobs: Booking[]) {
  const today = jobs.filter(j => {
    return new Date(j.scheduledAt).toDateString() === new Date().toDateString();
  });
  const thisWeek = jobs.filter(j => {
    const d = new Date(j.scheduledAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && new Date(j.scheduledAt).toDateString() !== new Date().toDateString();
  });
  const older = jobs.filter(j => {
    const d = new Date(j.scheduledAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7;
  });
  return { today, thisWeek, older };
}

export function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { bookings } = await apiMyJobs();
      setJobs(bookings.filter(j => j.status === 'COMPLETED').sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      ));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalEarned = jobs.reduce((s, j) => s + j.totalPrice, 0);
  const totalHours = jobs.reduce((s, j) => s + j.hours, 0);
  const avgPerJob = jobs.length > 0 ? Math.round(totalEarned / jobs.length) : 0;
  const { today, thisWeek, older } = groupByPeriod(jobs);

  const EarningsGroup = ({ title, items }: { title: string; items: Booking[] }) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        {items.map(j => (
          <View key={j._id} style={styles.jobRow}>
            <View style={styles.jobIconWrap}>
              <Text style={styles.jobIcon}>{ServiceIcons[j.serviceType] ?? '🏥'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobService} numberOfLines={1}>{j.serviceType}</Text>
              <Text style={styles.jobMeta}>{formatDate(j.scheduledAt)} · {j.hours}h · {j.customer.name}</Text>
            </View>
            <Text style={styles.jobEarnings}>${j.totalPrice}</Text>
          </View>
        ))}
        <View style={styles.groupTotal}>
          <Text style={styles.groupTotalLabel}>Subtotal</Text>
          <Text style={styles.groupTotalValue}>
            ${items.reduce((s, j) => s + j.totalPrice, 0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.earningsGold} />
      }
    >
      {/* Hero */}
      <LinearGradient
        colors={['#92400E', '#B45309', Colors.earningsGold]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.heroTitle}>Earnings</Text>
        <Text style={styles.heroTotal}>${totalEarned.toLocaleString()}</Text>
        <Text style={styles.heroSub}>Total earned · All time</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{jobs.length}</Text>
            <Text style={styles.statLabel}>Completed Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalHours}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>${avgPerJob}</Text>
            <Text style={styles.statLabel}>Avg / Job</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Breakdown cards */}
      <View style={styles.breakdownRow}>
        {[
          { label: 'Today', amount: today.reduce((s, j) => s + j.totalPrice, 0), color: Colors.systemGreen },
          { label: 'This Week', amount: [...today, ...thisWeek].reduce((s, j) => s + j.totalPrice, 0), color: Colors.systemBlue },
          { label: 'All Time', amount: totalEarned, color: Colors.earningsGold },
        ].map(c => (
          <View key={c.label} style={[styles.breakdownCard, { borderTopColor: c.color }]}>
            <Text style={[styles.breakdownAmount, { color: c.color }]}>${c.amount}</Text>
            <Text style={styles.breakdownLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ marginTop: 16 }}><JobCardSkeleton /><JobCardSkeleton /></View>
      ) : jobs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyTitle}>No earnings yet</Text>
          <Text style={styles.emptySub}>Complete jobs to see your earnings history here.</Text>
        </View>
      ) : (
        <>
          <EarningsGroup title="Today" items={today} />
          <EarningsGroup title="This Week" items={thisWeek} />
          <EarningsGroup title="Earlier" items={older} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  heroTotal: { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: -1 },
  heroSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  breakdownRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  breakdownCard: {
    flex: 1, backgroundColor: Colors.systemBackground, borderRadius: 14, padding: 14, alignItems: 'center',
    borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  breakdownAmount: { fontSize: 20, fontWeight: '800' },
  breakdownLabel: { fontSize: 11, color: Colors.secondaryLabel, marginTop: 3 },
  group: { marginHorizontal: 16, marginTop: 20 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  jobRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.systemBackground, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  jobIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.systemGray6, alignItems: 'center', justifyContent: 'center' },
  jobIcon: { fontSize: 20 },
  jobService: { fontSize: 14, fontWeight: '700', color: Colors.label },
  jobMeta: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 2 },
  jobEarnings: { fontSize: 17, fontWeight: '800', color: Colors.earningsGold },
  groupTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.separator, marginTop: 4 },
  groupTotalLabel: { fontSize: 13, color: Colors.secondaryLabel, fontWeight: '600' },
  groupTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.label },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 21 },
});
