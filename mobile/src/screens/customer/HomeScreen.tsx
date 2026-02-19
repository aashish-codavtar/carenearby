import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Booking, apiMyBookings } from '../../api/client';
import { BookingCard } from '../../components/BookingCard';
import { useAuth } from '../../context/AuthContext';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../utils/colors';

type Nav = NativeStackNavigationProp<CustomerStackParams>;

const SERVICE_TYPES = [
  { icon: '🧼', label: 'Personal Care' },
  { icon: '🤝', label: 'Companionship' },
  { icon: '🍽️', label: 'Meal Prep' },
  { icon: '💊', label: 'Medication' },
];

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiMyBookings();
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeBookings = bookings.filter(
    (b) => b.status === 'REQUESTED' || b.status === 'ACCEPTED' || b.status === 'STARTED',
  );
  const recent = bookings[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
        </View>

        {/* Active jobs banner */}
        {activeBookings.length > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => navigation.navigate('Bookings')}
            activeOpacity={0.85}
          >
            <Text style={styles.activeBannerIcon}>🟢</Text>
            <Text style={styles.activeBannerText}>
              {activeBookings.length} active booking{activeBookings.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.activeBannerChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Book a Service</Text>
        <View style={styles.servicesGrid}>
          {SERVICE_TYPES.map((svc) => (
            <TouchableOpacity
              key={svc.label}
              style={styles.serviceCard}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('CreateBooking')}
            >
              <Text style={styles.serviceIcon}>{svc.icon}</Text>
              <Text style={styles.serviceLabel}>{svc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big CTA */}
        <TouchableOpacity
          style={styles.bookCTA}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreateBooking')}
        >
          <View>
            <Text style={styles.bookCTATitle}>Need a PSW?</Text>
            <Text style={styles.bookCTASubtitle}>Book a verified worker near you</Text>
          </View>
          <Text style={styles.bookCTAArrow}>→</Text>
        </TouchableOpacity>

        {/* Recent booking */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={Colors.systemBlue} />
        ) : recent ? (
          <>
            <Text style={styles.sectionTitle}>Recent Booking</Text>
            <BookingCard
              booking={recent}
              onPress={() => navigation.navigate('BookingDetail', { booking: recent })}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              Book your first Personal Support Worker today.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 16, color: Colors.secondaryLabel, fontWeight: '400' },
  name: { fontSize: 28, fontWeight: '700', color: Colors.label },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.systemGreen}15`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  activeBannerIcon: { fontSize: 14 },
  activeBannerText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.systemGreen },
  activeBannerChevron: { fontSize: 20, color: Colors.systemGreen },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.label,
    marginBottom: 14,
    marginTop: 4,
  },

  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceIcon: { fontSize: 32 },
  serviceLabel: { fontSize: 13, fontWeight: '600', color: Colors.label, textAlign: 'center' },

  bookCTA: {
    backgroundColor: Colors.systemBlue,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  bookCTATitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  bookCTASubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  bookCTAArrow: { fontSize: 28, color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.label, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 20 },
});
