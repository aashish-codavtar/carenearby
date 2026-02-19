import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Booking, apiNearbyJobs } from '../../api/client';
import { JobCard } from '../../components/JobCard';
import { PSWStackParams } from '../../navigation/PSWNavigator';
import { Colors } from '../../utils/colors';

type Nav = NativeStackNavigationProp<PSWStackParams>;

export function NearbyJobsScreen() {
  const navigation = useNavigation<Nav>();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'ok' | 'denied'>('checking');
  const coordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  const requestLocationAndLoad = useCallback(async () => {
    try {
      // Request GPS permission (required for PSW nearby matching)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationStatus('ok');
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      } else {
        setLocationStatus('denied');
      }
    } catch {
      setLocationStatus('denied');
    }

    // Fetch jobs – passes coords so backend can update PSW location atomically
    try {
      const data = await apiNearbyJobs(coordsRef.current);
      setJobs(data.bookings ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { requestLocationAndLoad(); }, [requestLocationAndLoad]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Jobs</Text>
        <Text style={styles.subtitle}>
          {locationStatus === 'denied'
            ? 'Enable location in Settings for accurate matching'
            : 'Within 15 km of your location'}
        </Text>
        {locationStatus === 'denied' && (
          <View style={styles.locationWarning}>
            <Text style={styles.locationWarningText}>
              📍 Location access denied – showing default Sudbury area jobs
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.systemGreen} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              distanceKm={item.distanceKm}
              onPress={() => navigation.navigate('JobDetail', { job: item })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); requestLocationAndLoad(); }}
              tintColor={Colors.systemGreen}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>No jobs nearby</Text>
              <Text style={styles.emptySubtitle}>
                Pull down to refresh, or check back later when new bookings are posted.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 32, fontWeight: '700', color: Colors.label },
  subtitle: { fontSize: 14, color: Colors.secondaryLabel, marginTop: 2, marginBottom: 4 },
  locationWarning: {
    backgroundColor: `${Colors.systemOrange}15`,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  locationWarningText: { fontSize: 13, color: Colors.systemOrange },
  list: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.label, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 20 },
});
