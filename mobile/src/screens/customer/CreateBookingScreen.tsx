import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiCreateBooking } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { Colors, ServiceColors, ServiceIcons } from '../../utils/colors';

const SERVICES = [
  'Personal Care',
  'Companionship',
  'Meal Preparation',
  'Medication Reminders',
  'Light Housekeeping',
  'Mobility Assistance',
  'Post-Surgery Support',
];

const DEFAULT_COORDS: [number, number] = [-80.9924, 46.4917];
const RATE = 25;
const STEPS = ['Service', 'Schedule', 'Confirm'];

function tomorrow9am() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTimeDisplay(d: Date) {
  return d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function CreateBookingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [service, setService] = useState(SERVICES[0]);
  const [hours, setHours] = useState(3);
  const [date, setDate] = useState(tomorrow9am());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = hours * RATE;

  async function submit() {
    setLoading(true);
    try {
      await apiCreateBooking({
        serviceType: service,
        hours,
        scheduledAt: date.toISOString(),
        location: { coordinates: DEFAULT_COORDS },
        notes: notes.trim() || undefined,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message || 'Please try again.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top + 40 }]}>
        <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.successGrad}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Booking Requested!</Text>
          <Text style={styles.successSub}>
            We're finding the best available PSW for your {service.toLowerCase()} needs.
          </Text>
          <View style={styles.successDetail}>
            <Text style={styles.successDetailRow}>📅 {formatDateDisplay(date)}</Text>
            <Text style={styles.successDetailRow}>⏰ {formatTimeDisplay(date)}</Text>
            <Text style={styles.successDetailRow}>⏱ {hours} hours · ${total}</Text>
          </View>
          <IOSButton
            title="Book Another"
            variant="outline"
            onPress={() => { setStep(0); setSuccess(false); setNotes(''); setHours(3); setDate(tomorrow9am()); }}
            style={{ marginTop: 24 }}
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.heroNavy, Colors.heroNavyLight]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Text style={styles.headerTitle}>Book a PSW</Text>
          <Text style={styles.headerSub}>Greater Sudbury · $25/hr · 3hr minimum</Text>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                  {i < step ? (
                    <Text style={styles.stepCheck}>✓</Text>
                  ) : (
                    <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
                {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Step 0: Service Selection */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What care do you need?</Text>
            <View style={styles.serviceGrid}>
              {SERVICES.map(s => {
                const selected = s === service;
                const icon = ServiceIcons[s] ?? '🏥';
                const bg = ServiceColors[s] ?? Colors.servicePersonal;
                return (
                  <Pressable
                    key={s}
                    style={[styles.serviceOption, selected && styles.serviceOptionSelected]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setService(s);
                    }}
                  >
                    <View style={[styles.serviceOptIcon, { backgroundColor: selected ? Colors.systemBlue + '20' : bg }]}>
                      <Text style={styles.serviceOptEmoji}>{icon}</Text>
                    </View>
                    <Text style={[styles.serviceOptName, selected && styles.serviceOptNameSelected]} numberOfLines={2}>
                      {s}
                    </Text>
                    {selected && (
                      <View style={styles.selectedCheck}>
                        <Text style={styles.selectedCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <IOSButton title="Next: Schedule →" onPress={() => setStep(1)} style={{ marginTop: 20 }} />
          </View>
        )}

        {/* Step 1: Schedule */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>When do you need care?</Text>

            {/* Date */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>📅  Date</Text>
              <Pressable
                onPress={() => {
                  const next = new Date(date);
                  next.setDate(next.getDate() + 1);
                  setDate(next);
                }}
                style={styles.scheduleValue}
              >
                <Text style={styles.scheduleValueText}>{formatDateDisplay(date)}</Text>
                <Text style={styles.scheduleHint}>Tap to advance date →</Text>
              </Pressable>
            </View>

            {/* Time */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>⏰  Start Time</Text>
              <View style={styles.timeRow}>
                {[7, 9, 11, 13, 15, 17].map(h => {
                  const active = date.getHours() === h;
                  const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
                  return (
                    <Pressable
                      key={h}
                      style={[styles.timeChip, active && styles.timeChipActive]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        const next = new Date(date);
                        next.setHours(h, 0, 0, 0);
                        setDate(next);
                      }}
                    >
                      <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>⏱  Duration</Text>
              <View style={styles.durationRow}>
                <Pressable
                  style={[styles.durationBtn, hours <= 3 && styles.durationBtnDisabled]}
                  onPress={() => hours > 3 && setHours(h => h - 1)}
                  disabled={hours <= 3}
                >
                  <Text style={styles.durationBtnText}>−</Text>
                </Pressable>
                <View style={styles.durationDisplay}>
                  <Text style={styles.durationNum}>{hours}</Text>
                  <Text style={styles.durationUnit}>hours</Text>
                </View>
                <Pressable
                  style={[styles.durationBtn, hours >= 12 && styles.durationBtnDisabled]}
                  onPress={() => hours < 12 && setHours(h => h + 1)}
                  disabled={hours >= 12}
                >
                  <Text style={styles.durationBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>📝  Special Instructions (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any specific needs, medications, mobility requirements..."
                placeholderTextColor={Colors.tertiaryLabel}
                multiline
                maxLength={500}
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{notes.length}/500</Text>
            </View>

            <View style={styles.navBtns}>
              <IOSButton title="← Back" variant="outline" onPress={() => setStep(0)} style={{ flex: 1 }} />
              <IOSButton title="Review →" onPress={() => setStep(2)} style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review your booking</Text>

            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmIcon}>{ServiceIcons[service] ?? '🏥'}</Text>
                <Text style={styles.confirmService}>{service}</Text>
              </View>
              <View style={styles.confirmDivider} />
              {[
                ['📅 Date', formatDateDisplay(date)],
                ['⏰ Time', formatTimeDisplay(date)],
                ['⏱ Duration', `${hours} hours`],
                ['📍 Location', 'Greater Sudbury, ON'],
                ['💳 Payment', 'Private pay · Cash/e-Transfer'],
              ].map(([label, value]) => (
                <View key={label} style={styles.confirmDetail}>
                  <Text style={styles.confirmDetailLabel}>{label}</Text>
                  <Text style={styles.confirmDetailValue}>{value}</Text>
                </View>
              ))}
              {notes.trim().length > 0 && (
                <>
                  <View style={styles.confirmDivider} />
                  <Text style={styles.confirmNotesLabel}>📝 Notes</Text>
                  <Text style={styles.confirmNotes}>{notes.trim()}</Text>
                </>
              )}
            </View>

            {/* Price breakdown */}
            <View style={styles.priceCard}>
              <Text style={styles.priceTitle}>Price Estimate</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>$25/hr × {hours} hours</Text>
                <Text style={styles.priceValue}>${total}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>Total</Text>
                <Text style={styles.priceTotalValue}>${total}</Text>
              </View>
              <Text style={styles.priceNote}>Not covered by OHIP · Private pay</Text>
            </View>

            <View style={styles.navBtns}>
              <IOSButton title="← Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }} />
              <IOSButton title="Confirm Booking" loading={loading} onPress={submit} style={{ flex: 2 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#fff' },
  stepNum: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  stepNumActive: { color: Colors.systemBlue },
  stepCheck: { fontSize: 13, fontWeight: '700', color: Colors.systemBlue },
  stepLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginLeft: 6, marginRight: 6 },
  stepLabelActive: { color: '#fff' },
  stepLine: { width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: 'rgba(255,255,255,0.6)' },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.label, marginBottom: 20 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceOption: {
    width: '47%', backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: 'transparent', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  serviceOptionSelected: { borderColor: Colors.systemBlue, backgroundColor: '#EFF6FF' },
  serviceOptIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceOptEmoji: { fontSize: 24 },
  serviceOptName: { fontSize: 13, fontWeight: '600', color: Colors.label, lineHeight: 18 },
  serviceOptNameSelected: { color: Colors.systemBlue },
  selectedCheck: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.systemBlue, alignItems: 'center', justifyContent: 'center',
  },
  selectedCheckText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scheduleCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  scheduleLabel: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduleValue: { gap: 2 },
  scheduleValueText: { fontSize: 16, fontWeight: '700', color: Colors.label },
  scheduleHint: { fontSize: 11, color: Colors.tertiaryLabel },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.systemGray6, borderWidth: 1.5, borderColor: 'transparent' },
  timeChipActive: { backgroundColor: Colors.systemBlue + '15', borderColor: Colors.systemBlue },
  timeChipText: { fontSize: 14, fontWeight: '600', color: Colors.secondaryLabel },
  timeChipTextActive: { color: Colors.systemBlue },
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  durationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.systemBlue, alignItems: 'center', justifyContent: 'center' },
  durationBtnDisabled: { backgroundColor: Colors.systemGray5 },
  durationBtnText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
  durationDisplay: { alignItems: 'center', minWidth: 60 },
  durationNum: { fontSize: 36, fontWeight: '800', color: Colors.label },
  durationUnit: { fontSize: 13, color: Colors.secondaryLabel },
  notesInput: { backgroundColor: Colors.systemGray6, borderRadius: 10, padding: 12, fontSize: 15, color: Colors.label, minHeight: 80, marginBottom: 4 },
  charCount: { fontSize: 11, color: Colors.tertiaryLabel, textAlign: 'right' },
  navBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  confirmCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  confirmIcon: { fontSize: 32 },
  confirmService: { fontSize: 20, fontWeight: '800', color: Colors.label, flex: 1 },
  confirmDivider: { height: 1, backgroundColor: Colors.separator, marginVertical: 14 },
  confirmDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  confirmDetailLabel: { fontSize: 14, color: Colors.secondaryLabel },
  confirmDetailValue: { fontSize: 14, fontWeight: '600', color: Colors.label },
  confirmNotesLabel: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel, marginBottom: 6 },
  confirmNotes: { fontSize: 14, color: Colors.label, lineHeight: 20 },
  priceCard: { backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 20, marginBottom: 14 },
  priceTitle: { fontSize: 16, fontWeight: '800', color: Colors.label, marginBottom: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 15, color: Colors.secondaryLabel },
  priceValue: { fontSize: 15, fontWeight: '600', color: Colors.label },
  priceDivider: { height: 1, backgroundColor: Colors.separator, marginVertical: 12 },
  priceTotalLabel: { fontSize: 17, fontWeight: '800', color: Colors.label },
  priceTotalValue: { fontSize: 20, fontWeight: '900', color: Colors.systemBlue },
  priceNote: { fontSize: 12, color: Colors.tertiaryLabel, marginTop: 8 },
  successScreen: { flex: 1, backgroundColor: '#F0FDF4' },
  successGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.trustGreen, marginBottom: 12 },
  successSub: { fontSize: 16, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  successDetail: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', gap: 10 },
  successDetailRow: { fontSize: 15, color: Colors.label, fontWeight: '500' },
});
