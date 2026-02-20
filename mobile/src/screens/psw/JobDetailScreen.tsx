import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Booking, apiAcceptJob, apiCompleteJob, apiStartJob } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { StatusBadge } from '../../components/StatusBadge';
import { PSWStackParams } from '../../navigation/PSWNavigator';
import { Colors } from '../../utils/colors';

type Props = NativeStackScreenProps<PSWStackParams, 'JobDetail'>;

export function JobDetailScreen({ route, navigation }: Props) {
  const [job, setJob] = useState<Booking>(route.params.job);
  const [loading, setLoading] = useState(false);

  const date = new Date(job.scheduledAt);
  const dateStr = date.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });

  async function doAction(
    label: string,
    fn: (id: string) => Promise<{ booking: Booking }>,
  ) {
    Alert.alert(
      label,
      `Are you sure you want to ${label.toLowerCase()} this job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: label === 'Accept' ? 'default' : 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { booking } = await fn(job._id);
              setJob(booking);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Action failed.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  const customerRating = job.customer?.rating;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <StatusBadge status={job.status} />
          <Text style={styles.serviceType}>{job.serviceType}</Text>
          <Text style={styles.earnings}>${job.totalPrice?.toFixed(2)}</Text>
          <Text style={styles.earningsLabel}>{job.hours}h · ${(job.totalPrice / job.hours).toFixed(0)}/hr</Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <InfoRow icon="📅" label="Date" value={dateStr} />
          <Divider />
          <InfoRow icon="🕐" label="Start Time" value={timeStr} />
          <Divider />
          <InfoRow icon="⏱️" label="Duration" value={`${job.hours} hours`} />
          <Divider />
          <InfoRow icon="📍" label="Location" value="Greater Sudbury Area" />
        </View>

        {/* Notes from customer */}
        {job.notes ? (
          <>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <View style={[styles.card, styles.notesPad]}>
              <Text style={styles.notesText}>{job.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Customer info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.avatarText}>{job.customer?.name?.[0] ?? 'C'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{job.customer?.name ?? '—'}</Text>
              {(job.status === 'ACCEPTED' || job.status === 'STARTED') && job.customer?.phone && (
                <Text style={styles.customerPhone}>{job.customer.phone}</Text>
              )}
              {customerRating !== undefined && customerRating > 0 && (
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={styles.ratingText}>{customerRating.toFixed(1)} rating</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {job.status === 'REQUESTED' && (
            <IOSButton
              title="Accept Job"
              onPress={() => doAction('Accept', apiAcceptJob)}
              loading={loading}
              variant="filled"
            />
          )}
          {job.status === 'ACCEPTED' && (
            <IOSButton
              title="Start Job"
              onPress={() => doAction('Start', apiStartJob)}
              loading={loading}
            />
          )}
          {job.status === 'STARTED' && (
            <IOSButton
              title="Mark as Complete"
              onPress={() => doAction('Complete', apiCompleteJob)}
              loading={loading}
            />
          )}
          {(job.status === 'COMPLETED' || job.status === 'CANCELLED') && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneText}>
                {job.status === 'COMPLETED' ? '✅ Job completed' : '❌ Job cancelled'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.bookingId}>ID: {job._id}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={infoRowStyles.icon}>{icon}</Text>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={infoRowStyles.value}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={infoRowStyles.divider} />;
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  icon: { fontSize: 18, width: 26 },
  label: { flex: 1, fontSize: 15, color: Colors.secondaryLabel },
  value: { fontSize: 15, fontWeight: '500', color: Colors.label, textAlign: 'right', flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.separator },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  content: { padding: 20, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  serviceType: { fontSize: 24, fontWeight: '700', color: Colors.label, marginTop: 4 },
  earnings: { fontSize: 40, fontWeight: '800', color: Colors.systemGreen },
  earningsLabel: { fontSize: 14, color: Colors.secondaryLabel },

  card: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
    marginBottom: 10,
    marginTop: 4,
  },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 8 },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  customerName: { fontSize: 16, fontWeight: '600', color: Colors.label },
  customerPhone: { fontSize: 13, color: Colors.secondaryLabel, marginTop: 1 },
  notesPad: { padding: 14 },
  notesText: { fontSize: 15, color: Colors.label, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingStar: { fontSize: 12 },
  ratingText: { fontSize: 13, color: Colors.secondaryLabel },

  actions: { gap: 12, marginBottom: 16 },
  doneBanner: {
    backgroundColor: Colors.systemGray6,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  doneText: { fontSize: 16, fontWeight: '600', color: Colors.secondaryLabel },

  bookingId: { fontSize: 11, color: Colors.tertiaryLabel, textAlign: 'center', marginTop: 8 },
});
