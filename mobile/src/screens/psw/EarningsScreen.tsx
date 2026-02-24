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
  const today = jobs.filter(j =>
    new Date(j.scheduledAt).toDateString() === new Date().toDateString(),
  );
  const thisWeek = jobs.filter(j => {
    const diff = (Date.now() - new Date(j.scheduledAt).getTime()) / 86400000;
    return diff <= 7 && new Date(j.scheduledAt).toDateString() !== new Date().toDateString();
  });
  const older = jobs.filter(j => (Date.now() - new Date(j.scheduledAt).getTime()) / 86400000 > 7);
  return { today, thisWeek, older };
}

// ── Earnings group (defined outside component to avoid remount) ─────────────
function EarningsGroup({ title, items }: { title: string; items: Booking[] }) {
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
          <View style={styles.jobEarningWrap}>
            <Text style={styles.jobEarnings}>${j.totalPrice}</Text>
            <Text style={styles.jobHourRate}>${j.totalPrice / j.hours}/hr</Text>
          </View>
        </View>
      ))}
      <View style={styles.groupTotal}>
        <Text style={styles.groupTotalLabel}>Subtotal</Text>
        <Text style={styles.groupTotalValue}>${items.reduce((s, j) => s + j.totalPrice, 0)}</Text>
      </View>
    </View>
  );
}

export function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [jobs,       setJobs]       = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { bookings } = await apiMyJobs();
      setJobs(
        bookings
          .filter(j => j.status === 'COMPLETED')
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
      );
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalEarned = jobs.reduce((s, j) => s + j.totalPrice, 0);
  const totalHours  = jobs.reduce((s, j) => s + j.hours, 0);
  const avgPerJob   = jobs.length > 0 ? Math.round(totalEarned / jobs.length) : 0;

  const now = new Date();
  const thisMonthJobs = jobs.filter(j => {
    const d = new Date(j.scheduledAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthEarned = thisMonthJobs.reduce((s, j) => s + j.totalPrice, 0);
  const monthGoal = 2000;
  const progressPct = Math.min(thisMonthEarned / monthGoal, 1);

  // ── Last 7 days bar chart ──
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const earned = jobs
      .filter(j => new Date(j.scheduledAt).toDateString() === dayStr)
      .reduce((s, j) => s + j.totalPrice, 0);
    return {
      label: d.toLocaleDateString('en-CA', { weekday: 'short' }).slice(0, 1),
      date:  d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      earned,
    };
  });
  const maxBar = Math.max(...last7.map(d => d.earned), 1);

  const { today, thisWeek, older } = groupByPeriod(jobs);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.earningsGold} />
      }
    >
      {/* ── Hero ── */}
      <LinearGradient
        colors={['#92400E', '#B45309', Colors.earningsGold]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.heroTitle}>Earnings</Text>
        <Text style={styles.heroTotal}>${totalEarned.toLocaleString()}</Text>
        <Text style={styles.heroSub}>Total earned · All time</Text>

        <View style={styles.statsRow}>
          {([
            [String(jobs.length), 'Completed Jobs'],
            [`${totalHours}h`,   'Total Hours'],
            [`$${avgPerJob}`,    'Avg / Job'],
            [`$25`,              'Hourly Rate'],
          ] as [string, string][]).map(([num, label], i, arr) => (
            <View key={label} style={styles.statWrap}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── This Month Goal ── */}
      <View style={styles.sectionPad}>
        <View style={styles.monthCard}>
          <View style={styles.monthTop}>
            <View>
              <Text style={styles.monthLabel}>THIS MONTH</Text>
              <Text style={styles.monthAmount}>${thisMonthEarned.toLocaleString()}</Text>
            </View>
            <View style={styles.monthRight}>
              <Text style={styles.monthGoalLabel}>Goal: ${monthGoal.toLocaleString()}</Text>
              <Text style={[styles.monthPct, { color: progressPct >= 1 ? Colors.trustGreen : Colors.earningsGold }]}>
                {Math.round(progressPct * 100)}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progressPct * 100)}%` as any }]} />
          </View>
          <Text style={styles.monthSub}>
            {progressPct >= 1
              ? '🎉 Monthly goal reached!'
              : `$${monthGoal - thisMonthEarned} to go · ${thisMonthJobs.length} jobs this month`}
          </Text>
        </View>
      </View>

      {/* ── Breakdown cards ── */}
      <View style={styles.breakdownRow}>
        {[
          { label: 'Today',     amount: today.reduce((s, j) => s + j.totalPrice, 0),              color: Colors.systemGreen },
          { label: 'This Week', amount: [...today, ...thisWeek].reduce((s, j) => s + j.totalPrice, 0), color: Colors.systemBlue },
          { label: 'All Time',  amount: totalEarned,                                               color: Colors.earningsGold },
        ].map(c => (
          <View key={c.label} style={[styles.breakdownCard, { borderTopColor: c.color }]}>
            <Text style={[styles.breakdownAmount, { color: c.color }]}>${c.amount.toLocaleString()}</Text>
            <Text style={styles.breakdownLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* ── 7-day bar chart ── */}
      {jobs.length > 0 && (
        <View style={styles.sectionPad}>
          <Text style={styles.chartSectionLabel}>LAST 7 DAYS</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartRow}>
              {last7.map((day, i) => (
                <View key={i} style={styles.chartCol}>
                  {day.earned > 0 && (
                    <Text style={styles.chartBarValue}>${day.earned}</Text>
                  )}
                  <View style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: Math.max((day.earned / maxBar) * 72, day.earned > 0 ? 6 : 0),
                          backgroundColor: day.earned > 0 ? Colors.earningsGold : Colors.systemGray5,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartDayLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Tax note ── */}
      <View style={styles.sectionPad}>
        <View style={styles.taxNote}>
          <Text style={styles.taxNoteIcon}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.taxNoteTitle}>Tax Reminder</Text>
            <Text style={styles.taxNoteSub}>
              As a self-employed PSW, keep records of all income for tax season.
              Contact an accountant for guidance on deductions.
            </Text>
          </View>
        </View>
      </View>

      {/* ── Earnings history ── */}
      {loading ? (
        <View style={{ marginTop: 16 }}><JobCardSkeleton /><JobCardSkeleton /></View>
      ) : jobs.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIconText}>💰</Text>
          </View>
          <Text style={styles.emptyTitle}>No earnings yet</Text>
          <Text style={styles.emptySub}>Complete jobs to see your earnings history here.</Text>
        </View>
      ) : (
        <>
          <EarningsGroup title="Today"     items={today}    />
          <EarningsGroup title="This Week" items={thisWeek} />
          <EarningsGroup title="Earlier"   items={older}    />
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
  statWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4, height: 28 },

  sectionPad: { paddingHorizontal: 16, marginTop: 16 },

  // This month goal card
  monthCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  monthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  monthLabel: { fontSize: 11, fontWeight: '700', color: Colors.secondaryLabel, letterSpacing: 0.8, marginBottom: 4 },
  monthAmount: { fontSize: 32, fontWeight: '900', color: Colors.label, letterSpacing: -0.5 },
  monthRight: { alignItems: 'flex-end' },
  monthGoalLabel: { fontSize: 12, color: Colors.secondaryLabel, marginBottom: 4 },
  monthPct: { fontSize: 22, fontWeight: '900' },
  progressBarBg: {
    height: 8, backgroundColor: Colors.systemGray5, borderRadius: 4, overflow: 'hidden', marginBottom: 10,
  },
  progressBarFill: {
    height: '100%', backgroundColor: Colors.earningsGold, borderRadius: 4,
  },
  monthSub: { fontSize: 12, color: Colors.secondaryLabel },

  breakdownRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  breakdownCard: {
    flex: 1, backgroundColor: Colors.systemBackground, borderRadius: 14, padding: 14, alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  breakdownAmount: { fontSize: 20, fontWeight: '800' },
  breakdownLabel: { fontSize: 11, color: Colors.secondaryLabel, marginTop: 3 },

  // Bar chart
  chartSectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.secondaryLabel, letterSpacing: 0.8, marginBottom: 10,
  },
  chartCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarValue: { fontSize: 9, fontWeight: '700', color: Colors.earningsGold, marginBottom: 3 },
  chartBarContainer: { height: 80, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  chartBar: { width: '70%', borderRadius: 4 },
  chartDayLabel: { fontSize: 11, color: Colors.secondaryLabel, marginTop: 6, fontWeight: '600' },

  // Tax note
  taxNote: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  taxNoteIcon: { fontSize: 22 },
  taxNoteTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  taxNoteSub: { fontSize: 12, color: '#78350F', lineHeight: 18 },

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
  jobEarningWrap: { alignItems: 'flex-end' },
  jobEarnings: { fontSize: 17, fontWeight: '800', color: Colors.earningsGold },
  jobHourRate: { fontSize: 10, color: Colors.tertiaryLabel, marginTop: 1 },
  groupTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.separator, marginTop: 4 },
  groupTotalLabel: { fontSize: 13, color: Colors.secondaryLabel, fontWeight: '600' },
  groupTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.label },

  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.systemGray6, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 21 },
});
