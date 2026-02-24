import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiMyBookings, Booking } from '../../api/client';
import { BookingCard } from '../../components/BookingCard';
import { BookingCardSkeleton } from '../../components/SkeletonLoader';
import { Colors } from '../../utils/colors';

type Filter = 'ALL' | 'ACTIVE' | 'COMPLETED';

const FILTERS: { key: Filter; label: string; emoji: string }[] = [
  { key: 'ALL',       label: 'All',     emoji: '📋' },
  { key: 'ACTIVE',    label: 'Active',  emoji: '🟢' },
  { key: 'COMPLETED', label: 'Done',    emoji: '✅' },
];

const ACTIVE_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'STARTED']);

function filterBookings(bookings: Booking[], filter: Filter) {
  if (filter === 'ACTIVE')    return bookings.filter(b => ACTIVE_STATUSES.has(b.status));
  if (filter === 'COMPLETED') return bookings.filter(b => !ACTIVE_STATUSES.has(b.status));
  return bookings;
}

export function BookingsScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [filter,     setFilter]     = useState<Filter>('ALL');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered          = filterBookings(bookings, filter);
  const activeCount       = bookings.filter(b => ACTIVE_STATUSES.has(b.status)).length;
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const totalSpent        = completedBookings.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
  const totalHours        = completedBookings.reduce((s, b) => s + (b.hours ?? 0), 0);

  const statsHeader = !loading && bookings.length > 0 ? (
    <View style={styles.statsCard}>
      {([
        ['📋', String(bookings.length),        'Bookings'],
        ['✅', String(completedBookings.length), 'Completed'],
        ['💰', `$${totalSpent}`,                'Spent'],
        ['⏱', `${totalHours}h`,                'Hours'],
      ] as [string, string, string][]).map(([icon, val, label]) => (
        <View key={label} style={styles.statCell}>
          <Text style={styles.statCellIcon}>{icon}</Text>
          <Text style={styles.statCellVal}>{val}</Text>
          <Text style={styles.statCellLabel}>{label}</Text>
        </View>
      ))}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSub}>{bookings.length} total · {activeCount} active</Text>

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
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.systemBlue} />
        }
        ListHeaderComponent={
          loading ? (
            <View style={{ marginTop: 16 }}>
              <BookingCardSkeleton /><BookingCardSkeleton /><BookingCardSkeleton />
            </View>
          ) : statsHeader
        }
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'ALL' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
            </Text>
            <Text style={styles.emptySub}>
              {filter === 'ALL'
                ? 'Book your first PSW session to get started.'
                : `You have no ${filter.toLowerCase()} bookings right now.`}
            </Text>
            {filter === 'ALL' && (
              <Pressable
                style={({ pressed }) => [styles.bookNowBtn, pressed && { opacity: 0.85 }]}
                onPress={() => nav.navigate('NewBooking')}
              >
                <Text style={styles.bookNowBtnText}>Book a PSW →</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View>
            <BookingCard
              booking={item}
              onPress={() => nav.navigate('BookingDetail', { booking: item })}
            />
            {item.status === 'COMPLETED' && (
              <Pressable
                style={({ pressed }) => [styles.reBookBtn, pressed && { opacity: 0.82 }]}
                onPress={() => nav.navigate('NewBooking')}
              >
                <Text style={styles.reBookBtnText}>🔄 Book Again</Text>
              </Pressable>
            )}
          </View>
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
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  filterPillActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: Colors.heroNavy },

  statsCard: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statCellIcon: { fontSize: 18, marginBottom: 2 },
  statCellVal: { fontSize: 16, fontWeight: '800', color: Colors.label },
  statCellLabel: { fontSize: 10, color: Colors.secondaryLabel, fontWeight: '600' },

  list: { paddingTop: 8, paddingBottom: 40 },

  reBookBtn: {
    marginHorizontal: 16, marginTop: -6, marginBottom: 12,
    backgroundColor: '#EFF6FF', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
    borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  reBookBtnText: { fontSize: 13, fontWeight: '700', color: Colors.systemBlue },

  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.systemGray6, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  bookNowBtn: {
    backgroundColor: Colors.systemBlue, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  bookNowBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
