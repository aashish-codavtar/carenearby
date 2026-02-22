import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { apiAcceptJob, apiNearbyJobs, Booking } from '../../api/client';
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
  onAcceptJob: (job: Booking) => void;
  filterText: string;
}

function WebLeafletMap({ center, jobs, onJobPress, onAcceptJob, filterText }: WebLeafletProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Inject custom Leaflet CSS for better controls
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; }
      .leaflet-control-zoom { border-radius: 10px !important; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important; }
      .leaflet-popup-content-wrapper { border-radius: 14px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.18) !important; }
      .leaflet-popup-content { margin: 14px 18px !important; font-family: -apple-system, sans-serif; }
      .cn-accept-btn { background: #34C759; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 10px; }
      .cn-accept-btn:hover { background: #28a745; }
      .cn-detail-btn { background: #007AFF; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 6px; }
      .cn-detail-btn:hover { background: #0055cc; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    loadLeaflet().then(() => {
      if (!containerRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.lat, center.lng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // PSW location marker (green pulsing)
      const greenIcon = L.divIcon({
        html: '<div style="background:#10B981;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(16,185,129,0.5)"></div>',
        className: '',
        iconAnchor: [9, 9],
      });
      L.marker([center.lat, center.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup('<b>📍 Your Location</b><br>You are here');

      mapRef.current = map;
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update job markers when jobs or filter changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;

    // Remove old job markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const filtered = filterText.trim()
      ? jobs.filter(j => j.serviceType.toLowerCase().includes(filterText.toLowerCase()))
      : jobs;

    filtered.forEach(job => {
      const [lng, lat] = job.location?.coordinates ?? [0, 0];
      if (!lat || !lng) return;
      const icon = ServiceIcons[job.serviceType] ?? '🏥';
      const isRequested = job.status === 'REQUESTED';
      const jobIcon = L.divIcon({
        html: `<div style="background:${isRequested ? '#0A2540' : '#6B7280'};color:#fff;border-radius:12px;padding:5px 10px;font-size:13px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2px solid rgba(255,255,255,0.2)">${icon} $${job.totalPrice}</div>`,
        className: '',
        iconAnchor: [0, 0],
      });
      const marker = L.marker([lat, lng], { icon: jobIcon }).addTo(map);
      const popupContent = `
        <div style="min-width:200px">
          <div style="font-size:16px;font-weight:800;color:#0A2540;margin-bottom:4px">${icon} ${job.serviceType}</div>
          <div style="font-size:14px;color:#555;margin-bottom:2px">💰 $${job.totalPrice} · ${job.hours}h</div>
          <div style="font-size:12px;color:#888">${new Date(job.scheduledAt).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          ${isRequested ? `<button class="cn-accept-btn" id="accept-${job._id}">✅ Accept Job</button>` : ''}
          <button class="cn-detail-btn" id="detail-${job._id}">View Details →</button>
        </div>`;
      marker.bindPopup(popupContent, { maxWidth: 260 });
      marker.on('popupopen', () => {
        setTimeout(() => {
          const acceptEl = document.getElementById(`accept-${job._id}`);
          if (acceptEl) acceptEl.onclick = () => { onAcceptJob(job); return false; };
          const detailEl = document.getElementById(`detail-${job._id}`);
          if (detailEl) detailEl.onclick = () => { onJobPress(job); return false; };
        }, 100);
      });
      markersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, filterText]);

  function handleLocateMe() {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lng], 14, { animate: true });
  }

  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore – ref to real DOM div on web */}
      <div ref={containerRef} style={{ width: '100%', flex: 1 }} />
      {/* Locate me button */}
      <Pressable style={styles.locateBtn} onPress={handleLocateMe}>
        <Text style={styles.locateBtnText}>📍</Text>
      </Pressable>
      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText}>
          {filterText ? `Showing: "${filterText}" — ` : ''}{markersRef.current.length} job{markersRef.current.length !== 1 ? 's' : ''} · tap a pin for details
        </Text>
      </View>
    </View>
  );
}

type LocationStatus = 'checking' | 'ok' | 'denied';
type ViewMode = 'list' | 'map';

const SUDBURY_CENTER = { latitude: 46.4917, longitude: -80.9930 };

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyJobsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchText, setSearchText] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
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

  // Auto-refresh every 15s
  useEffect(() => {
    const timer = setInterval(() => load(), 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function quickAccept(job: Booking) {
    const doAccept = async () => {
      setAcceptingId(job._id);
      try {
        await apiAcceptJob(job._id);
        await load();
        nav.navigate('JobDetail', { job: { ...job, status: 'ACCEPTED' } });
      } catch (e: any) {
        if (Platform.OS === 'web') alert(e.message || 'Failed to accept job.');
        else Alert.alert('Error', e.message || 'Failed to accept job.');
      }
      setAcceptingId(null);
    };

    if (Platform.OS === 'web') {
      if (confirm(`Accept ${job.serviceType} job — $${job.totalPrice}? Are you sure?`)) doAccept();
    } else {
      Alert.alert('Accept Job', `Accept ${job.serviceType} job for $${job.totalPrice}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: doAccept },
      ]);
    }
  }

  // Enrich jobs with distance from current PSW location
  const jobsWithDistance = jobs.map(j => {
    const [lng, lat] = j.location?.coordinates ?? [0, 0];
    if (!lat || !lng || !coordsRef.current) return { ...j, distanceKm: undefined as number | undefined };
    return { ...j, distanceKm: Math.round(getDistanceKm(coordsRef.current.lat, coordsRef.current.lng, lat, lng) * 10) / 10 };
  });

  // Unique service types for filter chips
  const serviceTypes = Array.from(new Set(jobs.map(j => j.serviceType))).slice(0, 6);

  const filteredJobs = jobsWithDistance.filter(j => {
    const matchSearch = !searchText.trim() || j.serviceType.toLowerCase().includes(searchText.toLowerCase());
    const matchChip = !serviceFilter || j.serviceType === serviceFilter;
    return matchSearch && matchChip;
  });

  const totalEarnings = filteredJobs.reduce((s, j) => s + j.totalPrice, 0);
  const mapCenter = coordsRef.current ?? { lat: SUDBURY_CENTER.latitude, lng: SUDBURY_CENTER.longitude };

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
            <Text style={styles.headerSub}>{filteredJobs.length} available near you</Text>
          </View>
          <View style={styles.headerRight}>
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

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by service type…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} style={styles.searchClear}>
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Service type filter chips */}
        {serviceTypes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            <Pressable
              style={[styles.filterChip, !serviceFilter && styles.filterChipActive]}
              onPress={() => setServiceFilter(null)}
            >
              <Text style={[styles.filterChipText, !serviceFilter && styles.filterChipTextActive]}>All</Text>
            </Pressable>
            {serviceTypes.map(st => (
              <Pressable
                key={st}
                style={[styles.filterChip, serviceFilter === st && styles.filterChipActive]}
                onPress={() => setServiceFilter(prev => prev === st ? null : st)}
              >
                <Text style={[styles.filterChipText, serviceFilter === st && styles.filterChipTextActive]}>
                  {ServiceIcons[st] ?? '🏥'} {st}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Earnings preview */}
        {filteredJobs.length > 0 && (
          <View style={styles.earningsBanner}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNum}>{filteredJobs.length}</Text>
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

      {/* Map view – web: Leaflet */}
      {viewMode === 'map' && Platform.OS === 'web' && (
        <WebLeafletMap
          center={mapCenter}
          jobs={filteredJobs}
          onJobPress={job => nav.navigate('JobDetail', { job })}
          onAcceptJob={quickAccept}
          filterText={searchText}
        />
      )}

      {/* Map view – native: react-native-maps */}
      {viewMode === 'map' && Platform.OS !== 'web' && MapView && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.mapFull}
            initialRegion={{
              latitude:  mapCenter.lat,
              longitude: mapCenter.lng,
              latitudeDelta:  0.15,
              longitudeDelta: 0.15,
            }}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            showsScale
          >
            {coordsRef.current && Marker && (
              <Marker
                coordinate={{ latitude: coordsRef.current.lat, longitude: coordsRef.current.lng }}
                title="You"
                pinColor={Colors.onlineGreen}
              />
            )}
            {filteredJobs.map(job => {
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
            <Text style={styles.mapOverlayText}>{filteredJobs.length} jobs · tap a pin for details</Text>
          </View>
        </View>
      )}

      {/* Jobs list */}
      {viewMode === 'list' && (
        <FlatList
          data={loading ? [] : filteredJobs}
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
              <Text style={styles.emptyIcon}>{searchText ? '🔍' : '🗺️'}</Text>
              <Text style={styles.emptyTitle}>{searchText ? 'No matching jobs' : 'No jobs nearby'}</Text>
              <Text style={styles.emptySub}>
                {searchText
                  ? `No jobs match "${searchText}". Try a different search.`
                  : 'There are no available jobs in your area right now.\nPull down to refresh.'}
              </Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View>
              <JobCard
                job={item}
                distanceKm={item.distanceKm}
                onPress={() => nav.navigate('JobDetail', { job: item })}
              />
              {/* Quick Accept button for REQUESTED jobs */}
              {item.status === 'REQUESTED' && (
                <Pressable
                  style={[styles.quickAcceptBtn, acceptingId === item._id && { opacity: 0.6 }]}
                  onPress={() => quickAccept(item)}
                  disabled={acceptingId === item._id}
                >
                  {acceptingId === item._id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.quickAcceptText}>✅  Accept This Job  ·  ${item.totalPrice}</Text>
                  )}
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 2 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  viewToggleText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  locationBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  locationBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Filter chips
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: Colors.heroNavy },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  searchClear: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  searchClearText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Earnings banner
  earningsBanner: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 8 },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  earningsLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  locationWarning: { backgroundColor: 'rgba(255,149,0,0.2)', borderRadius: 10, padding: 10, marginTop: 8 },
  locationWarningText: { color: '#fff', fontSize: 12, textAlign: 'center' },

  // Map
  mapContainer: { flex: 1, position: 'relative' },
  mapFull: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, padding: 10, alignItems: 'center' },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  locateBtn: {
    position: 'absolute', bottom: 70, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  locateBtnText: { fontSize: 22 },

  // List
  list: { paddingTop: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.label, marginBottom: 8 },
  emptySub: { fontSize: 15, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 22 },

  // Quick accept button (shown below each REQUESTED job card)
  quickAcceptBtn: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 16,
    backgroundColor: Colors.onlineGreen,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.onlineGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  quickAcceptText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
