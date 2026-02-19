import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Booking } from '../api/client';
import { Colors } from '../utils/colors';

interface Props {
  job: Booking;
  onPress?: () => void;
  distanceKm?: number;
}

const SERVICE_ICONS: Record<string, string> = {
  'Personal Care': '🧼',
  'Companionship': '🤝',
  'Meal Preparation': '🍽️',
  'Medication Reminders': '💊',
  'Light Housekeeping': '🧹',
};

export function JobCard({ job, onPress, distanceKm }: Props) {
  const icon = SERVICE_ICONS[job.serviceType] ?? '🏥';
  const date = new Date(job.scheduledAt);
  const dateStr = date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rating = job.customer?.rating;
  const stars = rating ? '⭐'.repeat(Math.round(rating)) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.service}>{job.serviceType}</Text>
          <Text style={styles.meta}>{dateStr} · {timeStr}</Text>
          {stars && <Text style={styles.rating}>{stars} {rating?.toFixed(1)}</Text>}
        </View>
        <View style={styles.right}>
          <Text style={styles.pay}>${job.totalPrice?.toFixed(0)}</Text>
          <Text style={styles.hours}>{job.hours}h</Text>
          {distanceKm !== undefined && (
            <Text style={styles.distance}>{distanceKm.toFixed(1)} km</Text>
          )}
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${Colors.systemBlue}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  service: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.label,
    marginBottom: 3,
  },
  meta: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    marginBottom: 2,
  },
  rating: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pay: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.systemGreen,
  },
  hours: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  distance: {
    fontSize: 12,
    color: Colors.systemBlue,
    fontWeight: '500',
  },
});
