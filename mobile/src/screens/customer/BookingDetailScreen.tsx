import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { apiCancelBooking, apiRateBooking, Booking } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Colors, ServiceIcons, StatusColors } from '../../utils/colors';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function BookingDetailScreen() {
  const route  = useRoute<any>();
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<Booking>(route.params.booking);
  const [rating, setRating]   = useState(0);
  const [rated, setRated]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const statusColor = StatusColors[booking.status] ?? Colors.systemGray;
  const icon = ServiceIcons[booking.serviceType] ?? '🏥';

  async function submitRating() {
    if (rating === 0) {
      Alert.alert('Select a Star', 'Please tap a star to rate your experience.');
      return;
    }
    setLoading(true);
    try {
      await apiRateBooking({ bookingId: booking._id, rating });
      if (typeof Haptics.notificationAsync === 'function') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setRated(true);
    } catch (e: any) {
      Alert.alert('Rating Failed', e.message || 'Please try again.');
    }
    setLoading(false);
  }

  function cancelBooking() {
    const doCancel = async () => {
      setCancelling(true);
      try {
        const res = await apiCancelBooking(booking._id);
        if (typeof Haptics.notificationAsync === 'function') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        setBooking(res.booking);
      } catch (e: any) {
        Alert.alert('Cancel Failed', e.message || 'Please try again.');
      }
      setCancelling(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this booking? This cannot be undone.')) doCancel();
    } else {
      Alert.alert('Cancel Booking', 'Are you sure you want to cancel? This cannot be undone.', [
        { text: 'Keep Booking', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: doCancel },
      ]);
    }
  }

  function callPSW() {
    if (booking.psw?.phone) Linking.openURL(`tel:${booking.psw.phone}`);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[statusColor + 'CC', statusColor + '44', Colors.systemGroupedBackground]}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroIcon}>{icon}</Text>
          <View style={{ flex: 1, gap: 8 }}>
            <StatusBadge status={booking.status} size="md" />
            <Text style={styles.heroService}>{booking.serviceType}</Text>
            <Text style={styles.heroPrice}>${booking.totalPrice?.toFixed(0) ?? '—'}</Text>
            <Text style={styles.heroPay}>Private pay · {booking.paymentStatus}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Status Timeline */}
      {booking.status !== 'CANCELLED' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Status</Text>
          <View style={styles.card}>
            <StatusTimeline status={booking.status} />
          </View>
        </View>
      )}

      {/* Cancelled banner */}
      {booking.status === 'CANCELLED' && (
        <View style={styles.section}>
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledIcon}>❌</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
              <Text style={styles.cancelledDesc}>This booking was cancelled and is no longer active.</Text>
            </View>
          </View>
        </View>
      )}

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.card}>
          {([
            ['📅 Date', formatDate(booking.scheduledAt)],
            ['⏰ Start Time', formatTime(booking.scheduledAt)],
            ['⏱ Duration', `${booking.hours} hours`],
            ['📍 Location', 'Greater Sudbury, ON'],
            ['💳 Payment', booking.paymentStatus],
          ] as [string, string][]).map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Notes */}
      {booking.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <View style={styles.card}>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        </View>
      ) : null}

      {/* PSW Card */}
      {booking.psw ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your PSW</Text>
          <View style={[styles.card, styles.pswCard]}>
            <View style={styles.pswAvatar}>
              <Text style={styles.pswAvatarText}>{booking.psw.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pswName}>{booking.psw.name}</Text>
              {(booking.psw.rating ?? 0) > 0 && (
                <Text style={styles.pswRating}>⭐ {booking.psw.rating?.toFixed(1)} rating</Text>
              )}
              <View style={styles.pswBadgesRow}>
                <View style={styles.pswBadge}><Text style={styles.pswBadgeText}>✓ Admin Verified</Text></View>
                <View style={styles.pswBadge}><Text style={styles.pswBadgeText}>✓ Sudbury PSW</Text></View>
              </View>
            </View>
            {['ACCEPTED', 'STARTED'].includes(booking.status) && booking.psw.phone ? (
              <Pressable style={({ pressed }) => [styles.callBtn, pressed && styles.callBtnPressed]} onPress={callPSW}>
                <Text style={styles.callBtnText}>📞</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : booking.status === 'REQUESTED' ? (
        <View style={styles.section}>
          <View style={styles.findingCard}>
            <Text style={styles.findingIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.findingTitle}>Finding your PSW</Text>
              <Text style={styles.findingDesc}>We're matching you with the best available PSW in your area.</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Cancel button (REQUESTED only) */}
      {booking.status === 'REQUESTED' && (
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && styles.actionBtnPressed]}
            onPress={cancelBooking}
            disabled={cancelling}
          >
            <Text style={styles.cancelBtnText}>{cancelling ? 'Cancelling...' : 'Cancel Booking'}</Text>
          </Pressable>
        </View>
      )}

      {/* Rating */}
      {booking.status === 'COMPLETED' && !rated && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Your Experience</Text>
          <View style={styles.card}>
            <Text style={styles.ratingPrompt}>How was your care session?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Pressable
                  key={s}
                  onPress={() => {
                    if (typeof Haptics.selectionAsync === 'function') Haptics.selectionAsync();
                    setRating(s);
                  }}
                  style={styles.starBtn}
                >
                  <Text style={[styles.star, s <= rating ? styles.starActive : styles.starInactive]}>★</Text>
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.submitRatingBtn,
                rating === 0 && styles.submitRatingBtnOutline,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={submitRating}
              disabled={loading}
            >
              <Text style={[styles.submitRatingText, rating > 0 && styles.submitRatingTextActive]}>
                {loading ? 'Submitting...' : rating === 0 ? 'Select a star to rate' : 'Submit Rating'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {rated && (
        <View style={styles.section}>
          <View style={styles.ratedBanner}>
            <Text style={styles.ratedIcon}>⭐</Text>
            <Text style={styles.ratedText}>Rating submitted! Thank you for your feedback.</Text>
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={styles.bookingId}>Booking #{booking._id.slice(-8).toUpperCase()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  hero: { padding: 24, paddingBottom: 32 },
  heroContent: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  heroIcon: { fontSize: 48, marginTop: 4 },
  heroService: { fontSize: 22, fontWeight: '800', color: Colors.label },
  heroPrice: { fontSize: 32, fontWeight: '900', color: Colors.label },
  heroPay: { fontSize: 13, color: Colors.secondaryLabel },

  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 4, marginBottom: 8, marginTop: 16,
  },
  card: {
    backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: Colors.secondaryLabel },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.label, flex: 1, textAlign: 'right' },
  notesText: { fontSize: 15, color: Colors.label, lineHeight: 22 },

  pswCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pswAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.systemBlue, alignItems: 'center', justifyContent: 'center',
  },
  pswAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  pswName: { fontSize: 16, fontWeight: '700', color: Colors.label, marginBottom: 3 },
  pswRating: { fontSize: 13, color: Colors.secondaryLabel, marginBottom: 6 },
  pswBadgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pswBadge: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pswBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.trustGreen },
  callBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#34C759',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#34C759', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  callBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  callBtnText: { fontSize: 22 },

  findingCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: '#FFF7ED', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.systemOrange + '30',
  },
  findingIcon: { fontSize: 28 },
  findingTitle: { fontSize: 15, fontWeight: '700', color: Colors.systemOrange, marginBottom: 4 },
  findingDesc: { fontSize: 13, color: Colors.secondaryLabel, lineHeight: 19 },

  cancelledBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFF5F5', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#FF3B3020',
  },
  cancelledIcon: { fontSize: 24 },
  cancelledTitle: { fontSize: 15, fontWeight: '700', color: '#FF3B30', marginBottom: 4 },
  cancelledDesc: { fontSize: 13, color: Colors.secondaryLabel, lineHeight: 19 },

  // Shared action button base
  actionBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },

  // Cancel booking button
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#FF3B30' },

  // Rating submit button
  submitRatingBtn: {
    backgroundColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  submitRatingBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Text is dark by default (readable on white outline button)
  submitRatingText: { fontSize: 16, fontWeight: '600', color: '#888' },
  // When rating is selected, button goes dark → white text
  submitRatingTextActive: { color: '#fff', fontWeight: '700' },

  ratingPrompt: { fontSize: 16, fontWeight: '700', color: Colors.label, marginBottom: 16, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  starBtn: { padding: 6 },
  star: { fontSize: 40 },
  starActive: { color: Colors.systemYellow },
  starInactive: { color: Colors.systemGray4 },
  ratingLabel: { textAlign: 'center', fontSize: 15, fontWeight: '600', color: Colors.systemOrange, marginBottom: 4 },

  ratedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  ratedIcon: { fontSize: 24 },
  ratedText: { fontSize: 14, fontWeight: '600', color: Colors.trustGreen, flex: 1 },

  bookingId: { fontSize: 12, color: Colors.tertiaryLabel, textAlign: 'center', marginTop: 8 },
});
