import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCreateBooking } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { Colors } from '../../utils/colors';

const SERVICE_TYPES = [
  { icon: '🧼', label: 'Personal Care' },
  { icon: '🤝', label: 'Companionship' },
  { icon: '🍽️', label: 'Meal Preparation' },
  { icon: '💊', label: 'Medication Reminders' },
  { icon: '🧹', label: 'Light Housekeeping' },
];

// Default Sudbury, ON coordinates – used until location permission is implemented
const DEFAULT_COORDS: [number, number] = [-80.9924, 46.4917];
const HOURLY_RATE = 25;

function getDefaultDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function CreateBookingScreen() {
  const navigation = useNavigation();
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0].label);
  const [hours, setHours] = useState(3);
  const [scheduledDate, setScheduledDate] = useState<Date>(getDefaultDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalPrice = hours * HOURLY_RATE;
  const minDate = new Date(); // Can't book in the past

  function handleDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      // Keep the existing time when changing date
      const newDate = new Date(selected);
      newDate.setHours(scheduledDate.getHours(), scheduledDate.getMinutes(), 0, 0);
      setScheduledDate(newDate);
      // On Android, show time picker next
      if (Platform.OS === 'android') setShowTimePicker(true);
    }
  }

  function handleTimeChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setScheduledDate(newDate);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await apiCreateBooking({
        serviceType,
        hours,
        scheduledAt: scheduledDate.toISOString(),
        location: { coordinates: DEFAULT_COORDS },
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      Alert.alert('Booking Failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setServiceType(SERVICE_TYPES[0].label);
    setHours(3);
    setScheduledDate(getDefaultDate());
    setNotes('');
    setSuccess(false);
  }

  const formattedDate = scheduledDate.toLocaleDateString('en-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Booking Requested!</Text>
          <Text style={styles.successSub}>
            Your request has been sent. A verified PSW near you will accept it shortly.
          </Text>
          <IOSButton
            title="View My Bookings"
            onPress={() => navigation.navigate('BookingsTab' as never)}
            style={{ marginTop: 32 }}
          />
          <IOSButton
            title="Book Another"
            onPress={handleReset}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>New Booking</Text>
          <Text style={styles.pageSubtitle}>Book a Personal Support Worker</Text>

          {/* Service type */}
          <Text style={styles.label}>Service Type</Text>
          <View style={styles.serviceGrid}>
            {SERVICE_TYPES.map((svc) => (
              <TouchableOpacity
                key={svc.label}
                style={[styles.svcBtn, serviceType === svc.label && styles.svcBtnActive]}
                onPress={() => setServiceType(svc.label)}
                activeOpacity={0.8}
              >
                <Text style={styles.svcIcon}>{svc.icon}</Text>
                <Text style={[styles.svcText, serviceType === svc.label && styles.svcTextActive]}>
                  {svc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date & Time Pickers */}
          <Text style={styles.label}>Date & Time</Text>

          {Platform.OS === 'web' ? (
            // Web: native HTML datetime-local input
            // @ts-ignore – HTML input element works via react-native-web
            <input
              type="datetime-local"
              value={scheduledDate.toISOString().slice(0, 16)}
              min={minDate.toISOString().slice(0, 16)}
              onChange={(e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setScheduledDate(d);
              }}
              style={{
                fontSize: 16,
                padding: 14,
                borderRadius: 12,
                border: `2px solid ${Colors.systemBlue}`,
                color: Colors.systemBlue,
                fontWeight: '600',
                width: '100%',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <>
              <View style={styles.dateTimeRow}>
                {/* Date button */}
                <TouchableOpacity
                  style={[styles.dateBtn, { flex: 1.4 }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateBtnIcon}>📅</Text>
                  <Text style={styles.dateBtnText}>{formattedDate}</Text>
                </TouchableOpacity>

                {/* Time button */}
                <TouchableOpacity
                  style={[styles.dateBtn, { flex: 1 }]}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateBtnIcon}>🕐</Text>
                  <Text style={styles.dateBtnText}>{formattedTime}</Text>
                </TouchableOpacity>
              </View>

              {/* iOS inline pickers */}
              {Platform.OS === 'ios' && (
                <>
                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display="inline"
                      minimumDate={minDate}
                      onChange={handleDateChange}
                      accentColor={Colors.systemBlue}
                      style={styles.iosPicker}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.iosPicker}
                    />
                  )}
                </>
              )}

              {/* Android pickers (shown as dialogs) */}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display="default"
                  minimumDate={minDate}
                  onChange={handleDateChange}
                />
              )}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </>
          )}

          {/* Hours */}
          <Text style={styles.label}>Duration (minimum 3 hours)</Text>
          <View style={styles.hoursRow}>
            <TouchableOpacity
              style={[styles.hoursBtn, hours <= 3 && styles.hoursBtnDisabled]}
              onPress={() => setHours((h) => Math.max(3, h - 1))}
              activeOpacity={0.7}
            >
              <Text style={styles.hoursBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.hoursDisplay}>
              <Text style={styles.hoursValue}>{hours}</Text>
              <Text style={styles.hoursUnit}>hours</Text>
            </View>
            <TouchableOpacity
              style={[styles.hoursBtn, hours >= 12 && styles.hoursBtnDisabled]}
              onPress={() => setHours((h) => Math.min(12, h + 1))}
              activeOpacity={0.7}
            >
              <Text style={styles.hoursBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Text style={styles.label}>Special Instructions (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special needs, access codes, allergies, etc."
            placeholderTextColor={Colors.tertiaryLabel}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Location note */}
          <View style={styles.locationNote}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              Sudbury, ON (Greater Sudbury area coverage)
            </Text>
          </View>

          {/* Price preview */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Hourly Rate</Text>
              <Text style={styles.priceValue}>${HOURLY_RATE}/hr</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalLabel}>Estimated Total</Text>
              <Text style={styles.priceTotalValue}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>

          <IOSButton
            title="Request Booking"
            onPress={handleSubmit}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  content: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 28, fontWeight: '700', color: Colors.label, marginBottom: 4 },
  pageSubtitle: { fontSize: 15, color: Colors.secondaryLabel, marginBottom: 28 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  svcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.systemBackground,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  svcBtnActive: { borderColor: Colors.systemBlue, backgroundColor: `${Colors.systemBlue}0D` },
  svcIcon: { fontSize: 18 },
  svcText: { fontSize: 13, fontWeight: '500', color: Colors.secondaryLabel },
  svcTextActive: { color: Colors.systemBlue, fontWeight: '600' },

  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.systemBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: Colors.systemBlue,
  },
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: Colors.systemBlue, flexShrink: 1 },
  iosPicker: { marginBottom: 8 },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  hoursBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursBtnDisabled: { backgroundColor: Colors.systemGray5 },
  hoursBtnText: { fontSize: 24, fontWeight: '300', color: '#fff', lineHeight: 28 },
  hoursDisplay: { alignItems: 'center', minWidth: 80 },
  hoursValue: { fontSize: 40, fontWeight: '700', color: Colors.label },
  hoursUnit: { fontSize: 13, color: Colors.secondaryLabel },

  notesInput: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.label,
    minHeight: 90,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.separator,
  },

  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.systemBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  locationIcon: { fontSize: 18 },
  locationText: { fontSize: 14, color: Colors.secondaryLabel, flex: 1 },

  priceCard: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 15, color: Colors.secondaryLabel },
  priceValue: { fontSize: 15, color: Colors.label },
  priceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.separator, marginVertical: 12 },
  priceTotalLabel: { fontSize: 16, fontWeight: '600', color: Colors.label },
  priceTotalValue: { fontSize: 20, fontWeight: '700', color: Colors.systemBlue },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '700', color: Colors.label, marginBottom: 12 },
  successSub: { fontSize: 15, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 22 },
});
