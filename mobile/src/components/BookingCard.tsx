import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Booking } from '../api/client';
import { Colors, ServiceAccentColors, ServiceIcons, StatusColors } from '../utils/colors';
import { StatusBadge } from './StatusBadge';

interface Props {
  booking: Booking;
  onPress?: () => void;
  showPSW?: boolean;
  compact?: boolean;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function BookingCard({ booking, onPress, showPSW = true, compact = false }: Props) {
  const icon    = ServiceIcons[booking.serviceType] ?? '🏥';
  const accent  = ServiceAccentColors[booking.serviceType] ?? Colors.systemBlue;
  const stColor = StatusColors[booking.status] ?? Colors.systemGray;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.93, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.inner}>
        {/* Top row: icon + info + price */}
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '15' }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.serviceType} numberOfLines={1}>{booking.serviceType}</Text>
            <Text style={styles.metaDate}>{fmtDate(booking.scheduledAt)} · {fmtTime(booking.scheduledAt)}</Text>
            <Text style={styles.metaHours}>{booking.hours}h session · Greater Sudbury</Text>
          </View>

          <View style={styles.priceCol}>
            <Text style={styles.price}>${booking.totalPrice?.toFixed(0) ?? '—'}</Text>
            <Text style={styles.perHour}>$25/hr</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom row: status + PSW */}
        <View style={styles.bottomRow}>
          <StatusBadge status={booking.status} />

          {showPSW && !compact && booking.psw ? (
            <View style={styles.pswRow}>
              <View style={[styles.pswAvatar, { backgroundColor: accent }]}>
                <Text style={styles.pswInitial}>{booking.psw.name[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.pswName}>{booking.psw.name}</Text>
                {(booking.psw.rating ?? 0) > 0 && (
                  <Text style={styles.pswRating}>⭐ {booking.psw.rating?.toFixed(1)}</Text>
                )}
              </View>
            </View>
          ) : showPSW && !compact && booking.status === 'REQUESTED' ? (
            <Text style={styles.findingText}>🔍 Finding your PSW…</Text>
          ) : null}

          {onPress && <Text style={styles.chevron}>›</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
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
  },
  accentBar: { width: 4, borderRadius: 0 },
  inner: { flex: 1, padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  serviceType: { fontSize: 15, fontWeight: '700', color: Colors.label, letterSpacing: -0.2 },
  metaDate:    { fontSize: 12, color: Colors.secondaryLabel, marginTop: 2 },
  metaHours:   { fontSize: 12, color: Colors.tertiaryLabel },
  priceCol:    { alignItems: 'flex-end', gap: 1 },
  price:       { fontSize: 20, fontWeight: '800', color: Colors.label, letterSpacing: -0.5 },
  perHour:     { fontSize: 11, color: Colors.tertiaryLabel },
  divider:     { height: 1, backgroundColor: Colors.separator, marginBottom: 12 },
  bottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pswRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pswAvatar:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pswInitial:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  pswName:     { fontSize: 12, fontWeight: '600', color: Colors.label },
  pswRating:   { fontSize: 11, color: Colors.tertiaryLabel },
  findingText: { fontSize: 12, color: Colors.systemOrange, fontWeight: '500' },
  chevron:     { fontSize: 22, color: Colors.systemGray3, marginLeft: 4 },
});
