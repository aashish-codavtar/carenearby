import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { apiAcceptJob, apiCompleteJob, apiStartJob, Booking } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, ServiceIcons, StatusColors } from '../../utils/colors';

// Conditionally import MapView – react-native-maps doesn't support web
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function JobDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Booking>(route.params.job);
  const [loading, setLoading] = useState(false);

  const statusColor = StatusColors[job.status] ?? Colors.systemGray;
  const icon = ServiceIcons[job.serviceType] ?? '🏥';
  const hourlyRate = job.hours > 0 ? Math.round(job.totalPrice / job.hours) : 25;

  async function performAction(
    label: string,
    fn: () => Promise<{ booking: Booking }>,
  ) {
    const doAction = async () => {
      setLoading(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const { booking } = await fn();
        setJob(booking);
        if (booking.status === 'COMPLETED') {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e: any) {
        if (Platform.OS === 'web') {
          // eslint-disable-next-line no-alert
          alert(e.message || 'Something went wrong.');
        } else {
          Alert.alert('Error', e.message || 'Something went wrong.');
        }
      }
      setLoading(false);
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (confirm(`${label} — Are you sure?`)) doAction();
      return;
    }
    Alert.alert(label, `Are you sure you want to ${label.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: label === 'Cancel Job' ? 'destructive' : 'default', onPress: doAction },
    ]);
  }

  function callCustomer() {
    if (job.customer?.phone) Linking.openURL(`tel:${job.customer.phone}`);
  }

  const [lng, lat] = job.location?.coordinates ?? [0, 0];

  function openMaps() {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Explicit back button (visible on web where native header may hide it) */}
      <Pressable
        style={[styles.backButton, { marginTop: insets.top + 8 }]}
        onPress={() => nav.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Jobs</Text>
      </Pressable>

      {/* Hero */}
      <LinearGradient
        colors={[statusColor + 'CC', statusColor + '44', Colors.systemGroupedBackground]}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroIcon}>{icon}</Text>
          <View style={{ flex: 1, gap: 8 }}>
            <StatusBadge status={job.status} size="md" />
            <Text style={styles.heroService}>{job.serviceType}</Text>
            <Text style={styles.heroEarnings}>${job.totalPrice}</Text>
            <Text style={styles.heroRate}>${hourlyRate}/hr · {job.hours}h</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.card}>
          {[
            ['📅 Date', formatDate(job.scheduledAt)],
            ['⏰ Start Time', formatTime(job.scheduledAt)],
            ['⏱ Duration', `${job.hours} hours`],
            ['📍 Address', job.address || 'Greater Sudbury, ON'],
            ['💰 Pay', `$${job.totalPrice} total ($${hourlyRate}/hr)`],
          ].map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Map / Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        {Platform.OS !== 'web' && MapView && lat !== 0 ? (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {Marker && (
                <Marker coordinate={{ latitude: lat, longitude: lng }} title="Job Location" />
              )}
            </MapView>
            <Pressable style={styles.mapOpenBtn} onPress={openMaps}>
              <Text style={styles.mapOpenBtnText}>Open in Maps →</Text>
            </Pressable>
          </View>
        ) : lat !== 0 ? (
          /* Web: real embedded OpenStreetMap */
          <View style={styles.mapCard}>
            {/* @ts-ignore – iframe is valid on web */}
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}&layer=mapnik&marker=${lat},${lng}`}
              style={{ width: '100%', height: 200, border: 'none', display: 'block' } as any}
              title="Job Location Map"
              loading="lazy"
            />
            <Pressable style={styles.mapOpenBtn} onPress={openMaps}>
              <Text style={styles.mapOpenBtnText}>Open in Google Maps →</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.webMapCard} onPress={openMaps}>
            <View style={styles.webMapIconRow}>
              <Text style={styles.webMapIcon}>📍</Text>
              <View>
                <Text style={styles.webMapTitle}>Greater Sudbury, ON</Text>
                <Text style={styles.webMapSub}>Tap to open in Google Maps</Text>
              </View>
            </View>
            <Text style={styles.webMapArrow}>→</Text>
          </Pressable>
        )}
      </View>

      {/* Notes */}
      {job.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notesText}>{job.notes}</Text>
          </View>
        </View>
      ) : null}

      {/* Customer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client</Text>
        <View style={[styles.card, styles.customerCard]}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{job.customer.name[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{job.customer.name}</Text>
            {(job.customer.rating ?? 0) > 0 && (
              <Text style={styles.customerRating}>⭐ {job.customer.rating?.toFixed(1)} rating</Text>
            )}
          </View>
          {['ACCEPTED', 'STARTED'].includes(job.status) && job.customer.phone ? (
            <Pressable style={styles.callBtn} onPress={callCustomer}>
              <Text style={styles.callBtnText}>📞</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {job.status === 'REQUESTED' && (
          <IOSButton
            title="✅  Accept Job"
            variant="success"
            loading={loading}
            onPress={() => performAction('Accept Job', () => apiAcceptJob(job._id))}
          />
        )}
        {job.status === 'ACCEPTED' && (
          <IOSButton
            title="▶️  Start Job"
            loading={loading}
            onPress={() => performAction('Start Job', () => apiStartJob(job._id))}
          />
        )}
        {job.status === 'STARTED' && (
          <IOSButton
            title="✅  Mark as Complete"
            variant="success"
            loading={loading}
            onPress={() => performAction('Complete Job', () => apiCompleteJob(job._id))}
          />
        )}
        {job.status === 'COMPLETED' && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerIcon}>🎉</Text>
            <View>
              <Text style={styles.doneBannerTitle}>Job Completed!</Text>
              <Text style={styles.doneBannerSub}>You earned ${job.totalPrice}. Great work!</Text>
            </View>
          </View>
        )}
        {job.status === 'CANCELLED' && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledBannerIcon}>❌</Text>
            <Text style={styles.cancelledBannerText}>This job was cancelled.</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={styles.jobId}>Job #{job._id.slice(-8).toUpperCase()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  backButton: {
    marginHorizontal: 16, marginBottom: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16, fontWeight: '600', color: Colors.onlineGreen,
  },
  hero: { padding: 24, paddingBottom: 32 },
  heroContent: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  heroIcon: { fontSize: 48, marginTop: 4 },
  heroService: { fontSize: 22, fontWeight: '800', color: Colors.label },
  heroEarnings: { fontSize: 36, fontWeight: '900', color: Colors.label },
  heroRate: { fontSize: 13, color: Colors.secondaryLabel },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4, marginBottom: 8, marginTop: 16 },
  card: { backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: Colors.secondaryLabel },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.label, flex: 1, textAlign: 'right' },
  notesText: { fontSize: 15, color: Colors.label, lineHeight: 22 },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  customerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.systemPurple, alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  customerName: { fontSize: 16, fontWeight: '700', color: Colors.label, marginBottom: 3 },
  customerRating: { fontSize: 13, color: Colors.secondaryLabel },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.systemGreen + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.systemGreen + '40' },
  callBtnText: { fontSize: 20 },
  actions: { paddingHorizontal: 16, marginTop: 24 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#BBF7D0' },
  doneBannerIcon: { fontSize: 32 },
  doneBannerTitle: { fontSize: 16, fontWeight: '800', color: Colors.trustGreen, marginBottom: 2 },
  doneBannerSub: { fontSize: 13, color: Colors.secondaryLabel },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF1F2', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#FECDD3' },
  cancelledBannerIcon: { fontSize: 24 },
  cancelledBannerText: { fontSize: 15, fontWeight: '600', color: Colors.systemRed },
  jobId: { fontSize: 12, color: Colors.tertiaryLabel, textAlign: 'center', marginTop: 8 },
  mapCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.systemBackground, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  map: { height: 180, width: '100%' },
  mapOpenBtn: { padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.separator },
  mapOpenBtnText: { fontSize: 14, fontWeight: '600', color: Colors.systemBlue },
  webMapCard: { backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  webMapIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  webMapIcon: { fontSize: 28 },
  webMapTitle: { fontSize: 15, fontWeight: '700', color: Colors.label },
  webMapSub: { fontSize: 12, color: Colors.systemBlue, marginTop: 2 },
  webMapArrow: { fontSize: 18, color: Colors.systemGray3 },
});
