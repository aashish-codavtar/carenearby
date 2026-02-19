import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusColors } from '../utils/colors';

interface Props {
  status: string;
}

const LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  STARTED: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
  PAID: 'Paid',
  RELEASED: 'Released',
};

export function StatusBadge({ status }: Props) {
  const color = StatusColors[status] ?? '#8E8E93';
  const label = LABELS[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
