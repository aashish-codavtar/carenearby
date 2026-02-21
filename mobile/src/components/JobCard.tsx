import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Booking } from '../api/client';
import { Colors, ServiceAccentColors, ServiceIcons, StatusColors } from '../utils/colors';

interface Props {
  job: Booking;
  onPress?: () => void;
  distanceKm?: number;
  showStatus?: boolean;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function JobCard({ job, onPress, distanceKm, showStatus = false }: Props) {
  const icon   = ServiceIcons[job.serviceType]         ?? '🏥';
  const accent = ServiceAccentColors[job.serviceType]  ?? Colors.systemBlue;
  const pay    = job.totalPrice ?? 0;
  const rate   = job.hours > 0 ? Math.round(pay / job.hours) : 25;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.93, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Earnings strip */}
      <View style={[styles.earningsStrip, { backgroundColor: accent }]}>
        <Text style={styles.earningsAmt}>${pay}</Text>
        <Text style={styles.earningsRate}>${rate}/hr</Text>
      </View>

      <View style={styles.body}>
        {/* Service + time */}
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.service} numberOfLines={1}>{job.serviceType}</Text>
            <Text style={styles.meta}>{fmtDate(job.scheduledAt)} · {fmtTime(job.scheduledAt)}</Text>
            <Text style={styles.meta}>{job.hours}h · {job.customer.name}</Text>
          </View>
          {onPress && <Text style={styles.chevron}>›</Text>}
        </View>

        {/* Pills row */}
        <View style={styles.pillsRow}>
          {distanceKm !== undefined && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>📍 {distanceKm.toFixed(1)} km</Text>
            </View>
          )}
          {(job.customer.rating ?? 0) > 0 && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>⭐ {job.customer.rating?.toFixed(1)} client</Text>
            </View>
          )}
          {showStatus && (
            <View style={[styles.pill, { backgroundColor: (StatusColors[job.status] ?? Colors.systemGray) + '18', borderColor: (StatusColors[job.status] ?? Colors.systemGray) + '30' }]}>
              <Text style={[styles.pillText, { color: StatusColors[job.status] ?? Colors.systemGray }]}>{job.status}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.separator,
    flexDirection: 'row',
  },
  earningsStrip: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 2,
  },
  earningsAmt:  { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  earningsRate: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  body:    { flex: 1, padding: 14 },
  topRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 20 },
  info:     { flex: 1, gap: 2 },
  service:  { fontSize: 14, fontWeight: '700', color: Colors.label, letterSpacing: -0.2 },
  meta:     { fontSize: 12, color: Colors.secondaryLabel },
  chevron:  { fontSize: 22, color: Colors.systemGray3, alignSelf: 'center' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:     { backgroundColor: Colors.systemGray5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.separator },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.secondaryLabel },
});
