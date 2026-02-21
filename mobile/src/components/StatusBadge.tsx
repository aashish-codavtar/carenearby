import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, StatusColors } from '../utils/colors';

const STATUS_META: Record<string, { label: string; icon: string }> = {
  REQUESTED: { label: 'Requested',   icon: '⏳' },
  ACCEPTED:  { label: 'Accepted',    icon: '✓' },
  STARTED:   { label: 'In Progress', icon: '▶' },
  COMPLETED: { label: 'Completed',   icon: '✓' },
  CANCELLED: { label: 'Cancelled',   icon: '✕' },
  PENDING:   { label: 'Pending',     icon: '⏳' },
  PAID:      { label: 'Paid',        icon: '✓' },
  RELEASED:  { label: 'Released',    icon: '✓' },
};

interface Props { status: string; size?: 'sm' | 'md'; }

export function StatusBadge({ status, size = 'sm' }: Props) {
  const color = StatusColors[status] ?? Colors.systemGray;
  const meta  = STATUS_META[status] ?? { label: status, icon: '•' };
  return (
    <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color + '35' }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.icon, { color }, size === 'md' && styles.iconMd]}>{meta.icon}</Text>
      <Text style={[styles.label, { color }, size === 'md' && styles.labelMd]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeMd: { paddingHorizontal: 12, paddingVertical: 6 },
  icon:    { fontSize: 10, fontWeight: '800' },
  iconMd:  { fontSize: 12 },
  label:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  labelMd: { fontSize: 13, fontWeight: '700' },
});
