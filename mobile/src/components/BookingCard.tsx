import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Booking } from '../api/client';
import { Colors } from '../utils/colors';
import { StatusBadge } from './StatusBadge';

interface Props {
  booking: Booking;
  onPress?: () => void;
  showPSW?: boolean;
}

const SERVICE_ICONS: Record<string, string> = {
  'Personal Care': '🧼',
  'Companionship': '🤝',
  'Meal Preparation': '🍽️',
  'Medication Reminders': '💊',
  'Light Housekeeping': '🧹',
};

export function BookingCard({ booking, onPress, showPSW = true }: Props) {
  const icon = SERVICE_ICONS[booking.serviceType] ?? '🏥';
  const date = new Date(booking.scheduledAt);
  const dateStr = date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.service}>{booking.serviceType}</Text>
          <Text style={styles.meta}>
            {dateStr} · {timeStr} · {booking.hours}h
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {showPSW && booking.psw && (
        <View style={styles.divider} />
      )}
      {showPSW && booking.psw && (
        <View style={styles.pswRow}>
          <Text style={styles.pswLabel}>PSW</Text>
          <Text style={styles.pswName}>{booking.psw.name}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.price}>${booking.totalPrice?.toFixed(2) ?? '—'}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondarySystemBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  service: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.label,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
    marginVertical: 12,
  },
  pswRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pswLabel: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    fontWeight: '500',
  },
  pswName: {
    fontSize: 13,
    color: Colors.label,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.label,
  },
  chevron: {
    fontSize: 20,
    color: Colors.systemGray3,
    fontWeight: '300',
  },
});
