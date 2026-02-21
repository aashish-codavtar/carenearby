import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiMyJobs, Booking } from '../../api/client';
import { JobCard } from '../../components/JobCard';
import { JobCardSkeleton } from '../../components/SkeletonLoader';
import { Colors } from '../../utils/colors';

type Filter = 'ALL' | 'ACTIVE' | 'COMPLETED';

const FILTERS: { key: Filter; label: string; emoji: string }[] = [
  { key: 'ALL', label: 'All', emoji: '📋' },
  { key: 'ACTIVE', label: 'Active', emoji: '🟢' },
  { key: 'COMPLETED', label: 'Done', emoji: '✅' },
];

export function MyJobsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { bookings } = await apiMyJobs();
      setJobs(bookings.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ACTIVE_S = new Set(['ACCEPTED', 'STARTED']);
  const filtered = filter === 'ACTIVE'
    ? jobs.filter(j => ACTIVE_S.has(j.status))
    : filter === 'COMPLETED'
    ? jobs.filter(j => j.status === 'COMPLETED')
    : jobs;

  const totalEarned = jobs.filter(j => j.status === 'COMPLETED').reduce((s, j) => s + j.totalPrice, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>My Jobs</Text>
        <Text style={styles.headerSub}>{jobs.length} jobs · ${totalEarned} earned</Text>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.emoji} {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={i => i._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.systemGreen} />
        }
        ListHeaderComponent={loading ? (
          <View style={{ marginTop: 16 }}>
            <JobCardSkeleton /><JobCardSkeleton /><JobCardSkeleton />
          </View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No {filter.toLowerCase()} jobs</Text>
            <Text style={styles.emptySub}>Accept jobs from the Find Jobs tab to see them here.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <JobCard job={item} showStatus onPress={() => nav.navigate('JobDetail', { job: item })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterPillActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: Colors.heroNavy },
  list: { paddingTop: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 21 },
});
