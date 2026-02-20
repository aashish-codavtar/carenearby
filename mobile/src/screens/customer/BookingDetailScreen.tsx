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
import { apiCancelBooking, apiRateBooking } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { StatusBadge } from '../../components/StatusBadge';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../utils/colors';

type Props = NativeStackScreenProps<CustomerStackParams, 'BookingDetail'>;

export function BookingDetailScreen({ route }: Props) {
  const [booking, setBooking] = useState(route.params.booking);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const date = new Date(booking.scheduledAt);
  const dateStr = date.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });

  async function handleRate() {
    if (rating === 0) return;
    setLoading(true);
    try {
      await apiRateBooking({ bookingId: booking._id, rating });
      setRatingSubmitted(true);
      Alert.alert('Thank you!', 'Your rating has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not submit rating.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancelLoading(true);
            try {
              const { booking: updated } = await apiCancelBooking(booking._id);
              setBooking(updated);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not cancel booking.');
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <View style={styles.hero}>
          <StatusBadge status={booking.status} />
          <Text style={styles.serviceType}>{booking.serviceType}</Text>
          <Text style={styles.price}>${booking.totalPrice?.toFixed(2)}</Text>
        </View>

        {/* Info rows */}
        <View style={styles.card}>
          <Row icon="📅" label="Date" value={dateStr} />
          <Divider />
          <Row icon="🕐" label="Time" value={timeStr} />
          <Divider />
          <Row icon="⏱️" label="Duration" value={`${booking.hours} hours`} />
          <Divider />
          <Row icon="💳" label="Payment" value={booking.paymentStatus} />
        </View>

        {/* PSW info */}
        {booking.psw ? (
          <>
            <Text style={styles.sectionTitle}>Your PSW</Text>
            <View style={styles.card}>
              <View style={styles.pswCard}>
                <View style={styles.pswAvatar}>
                  <Text style={styles.pswAvatarText}>{booking.psw.name[0]}</Text>
                </View>
                <View>
                  <Text style={styles.pswName}>{booking.psw.name}</Text>
                  <Text style={styles.pswPhone}>{booking.psw.phone}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingIcon}>⏳</Text>
            <Text style={styles.waitingText}>Waiting for a PSW to accept</Text>
          </View>
        )}

        {/* Cancel booking */}
        {(booking.status === 'REQUESTED' || booking.status === 'ACCEPTED') && (
          <IOSButton
            title="Cancel Booking"
            onPress={handleCancel}
            loading={cancelLoading}
            variant="destructive"
            size="medium"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Rating */}
        {booking.status === 'COMPLETED' && !booking.ratingGiven && !ratingSubmitted && (
          <>
            <Text style={styles.sectionTitle}>Rate Your PSW</Text>
            <View style={styles.card}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text
                    key={s}
                    style={[styles.star, s <= rating && styles.starActive]}
                    onPress={() => setRating(s)}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <IOSButton
                title="Submit Rating"
                onPress={handleRate}
                loading={loading}
                disabled={rating === 0}
                size="medium"
                style={{ marginTop: 16 }}
              />
            </View>
          </>
        )}

        {(booking.ratingGiven || ratingSubmitted) && (
          <View style={styles.ratedBanner}>
            <Text style={styles.ratedText}>⭐ Rating submitted — thank you!</Text>
          </View>
        )}

        {/* Booking ID */}
        <Text style={styles.bookingId}>Booking ID: {booking._id}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={rowStyles.divider} />;
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  icon: { fontSize: 18, width: 26 },
  label: { flex: 1, fontSize: 15, color: Colors.secondaryLabel },
  value: { fontSize: 15, fontWeight: '500', color: Colors.label, textAlign: 'right', flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.separator },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  content: { padding: 20, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  serviceType: { fontSize: 24, fontWeight: '700', color: Colors.label, marginTop: 4 },
  price: { fontSize: 36, fontWeight: '800', color: Colors.systemBlue },

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
    marginTop: 8,
  },

  pswCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 8 },
  pswAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.systemGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pswAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  pswName: { fontSize: 16, fontWeight: '600', color: Colors.label },
  pswPhone: { fontSize: 13, color: Colors.secondaryLabel, marginTop: 2 },

  waitingCard: {
    backgroundColor: `${Colors.systemOrange}15`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  waitingIcon: { fontSize: 28 },
  waitingText: { fontSize: 15, color: Colors.systemOrange, fontWeight: '500' },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { fontSize: 40, color: Colors.systemGray4 },
  starActive: { color: Colors.systemYellow },

  ratedBanner: {
    backgroundColor: `${Colors.systemGreen}15`,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  ratedText: { fontSize: 15, color: Colors.systemGreen, fontWeight: '600' },

  bookingId: {
    fontSize: 11,
    color: Colors.tertiaryLabel,
    textAlign: 'center',
    marginTop: 8,
  },
});
