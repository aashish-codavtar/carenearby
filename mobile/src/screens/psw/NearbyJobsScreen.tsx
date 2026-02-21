import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { apiNearbyJobs, Booking } from '../../api/client';
import { JobCard } from '../../components/JobCard';
import { JobCardSkeleton } from '../../components/SkeletonLoader';
import { Colors, ServiceIcons } from '../../utils/colors';

// react-native-maps doesn't support web
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;

// ── Leaflet map for web ───────────────────────────────────────────────────────
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

interface WebLeafletProps {
  center: { lat: number; lng: number };
  jobs: Booking[];
  onJobPress: (job: Booking) => void;
}

function WebLeafletMap({ center, jobs, onJobPress }: WebLeafletProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    loadLeaflet().then(() => {
      if (!containerRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current).setView([center.lat, center.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // PSW location marker (green)
      const greenIcon = L.divIcon({ html: '<div style="background:#10B981;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', className: '' });
      L.marker([center.lat, center.lng], { icon: greenIcon }).addTo(map).bindPopup('📍 Your Location');

      // Job markers
      jobs.forEach(job => {
        const [lng, lat] = job.location?.coordinates ?? [0, 0];
        if (!lat || !lng) return;
        const icon = ServiceIcons[job.serviceType] ?? '🏥';
        const jobIcon = L.divIcon({ html: `<div style="background:#0A2540;color:#fff;border-radius:12px;padding:4px 8px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${icon} $${job.totalPrice}</div>`, className: '' });
        const marker = L.marker([lat, lng], { icon: jobIcon }).addTo(map);
        marker.bindPopup(`<b>${job.serviceType}</b><br>$${job.totalPrice} · ${job.hours}h<br><a href="#" onclick="return false;" id="job-${job._id}">View Details →</a>`);
        marker.on('popupopen', () => {
          setTimeout(() => {
            const el = document.getElementById(`job-${job._id}`);
            if (el) el.onclick = () => { onJobPress(job); return false; };
          }, 100);
        });
      });

      mapRef.current = map;
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore – ref to real DOM div on web */}
      <div ref={containerRef} style={{ width: '100%', flex: 1 }} />
      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText}>{jobs.length} jobs · tap a pin for details</Text>
      </View>
    </View>
  );
}

type LocationStatus = 'checking' | 'ok' | 'denied';
type ViewMode = 'list' | 'map';

// Sudbury city centre fallback coordinates
const SUDBURY_CENTER = { latitude: 46.4917, longitude: -80.9930 };

export function NearbyJobsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const coordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { bookings } = await apiNearbyJobs(coordsRef.current);
      setJobs(bookings);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('denied');
          await load();
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationStatus('ok');
      } catch {
        setLocationStatus('denied');
      }
      await load();
    })();
  }, [load]);

  // Auto-refresh every 15s so PSWs see new bookings without manually pulling
  useEffect(() => {
    const timer = setInterval(() => load(), 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const totalEarnings = jobs.reduce((s, j) => s + j.totalPrice, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Find Jobs</Text>
            <Text style={styles.headerSub}>{jobs.length} available near you</Text>
          </View>
          <View style={styles.headerRight}>
            {/* List / Map toggle */}
            <Pressable
              style={styles.viewToggle}
              onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
            >
              <Text style={styles.viewToggleText}>{viewMode === 'list' ? '🗺 Map' : '≡ List'}</Text>
            </Pressable>
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText}>
                {locationStatus === 'ok' ? '📍 Live' : '📍 Sudbury'}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings preview */}
        {jobs.length > 0 && (
          <View style={styles.earningsBanner}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNum}>{jobs.length}</Text>
              <Text style={styles.earningsLabel}>Available Jobs</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNum}>${totalEarnings}</Text>
              <Text style={styles.earningsLabel}>Potential Earnings</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNum}>$25/hr</Text>
              <Text style={styles.earningsLabel}>Base Rate</Text>
            </View>
          </View>
        )}

        {locationStatus === 'denied' && (
          <View style={styles.locationWarning}>
            <Text style={styles.locationWarningText}>⚠️ Location access denied — showing Greater Sudbury area jobs</Text>
          </View>
        )}
      </LinearGradient>

      {/* Map view – web: Leaflet via CDN */}
      {viewMode === 'map' && Platform.OS === 'web' && (
        <WebLeafletMap
          center={coordsRef.current ?? { lat: SUDBURY_CENTER.latitude, lng: SUDBURY_CENTER.longitude }}
          jobs={jobs}
          onJobPress={job => nav.navigate('JobDetail', { job })}
        />
      )}

      {/* Map view – native: react-native-maps */}
      {viewMode === 'map' && Platform.OS !== 'web' && MapView && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.mapFull}
            initialRegion={{
              latitude:  coordsRef.current?.lat ?? SUDBURY_CENTER.latitude,
              longitude: coordsRef.current?.lng ?? SUDBURY_CENTER.longitude,
              latitudeDelta:  0.15,
              longitudeDelta: 0.15,
            }}
          >
            {/* PSW current location */}
            {coordsRef.current && Marker && (
              <Marker
                coordinate={{ latitude: coordsRef.current.lat, longitude: coordsRef.current.lng }}
                title="You"
                pinColor={Colors.onlineGreen}
              />
            )}
            {/* Job markers */}
            {jobs.map(job => {
              const [lng, lat] = job.location?.coordinates ?? [0, 0];
              if (!lat || !lng) return null;
              return Marker ? (
                <Marker
                  key={job._id}
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={job.serviceType}
                  description={`$${job.totalPrice} · ${job.hours}h`}
                  onCalloutPress={() => nav.navigate('JobDetail', { job })}
                />
              ) : null;
            })}
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>{jobs.length} jobs · tap a pin for details</Text>
          </View>
        </View>
      )}

      {/* Jobs list */}
      {viewMode === 'list' && <FlatList
        data={loading ? [] : jobs}
        keyExtractor={i => i._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.systemGreen} />
        }
        ListHeaderComponent={loading ? (
          <View style={{ marginTop: 16 }}>
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No jobs nearby</Text>
            <Text style={styles.emptySub}>
              There are no available jobs in your area right now.{'\n'}Pull down to refresh.
            </Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            distanceKm={item.distanceKm}
            onPress={() => nav.navigate('JobDetail', { job: item })}
          />
        )}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 2 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  viewToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  locationBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mapContainer: { flex: 1, position: 'relative' },
  mapFull: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 10, alignItems: 'center' },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  earningsBanner: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 8 },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  earningsLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2, textAlign: 'center' },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  locationWarning: { backgroundColor: 'rgba(255,149,0,0.2)', borderRadius: 10, padding: 10, marginTop: 8 },
  locationWarningText: { color: '#fff', fontSize: 12, textAlign: 'center' },
  list: { paddingTop: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 21 },
});
