import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { apiCreateBooking, apiGetAvailablePSWs, AvailablePSW } from '../../api/client';
import { Colors, ServiceColors, ServiceIcons } from '../../utils/colors';

// react-native-maps (native only)
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;

// ── Leaflet for web ───────────────────────────────────────────────────────────
declare global { interface Window { L: any } }

function loadLeaflet(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (window.L) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// Defined outside parent component to avoid remount on re-render
function PSWMapWeb({ psws }: { psws: AvailablePSW[] }) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadLeaflet().then(() => {
      if (!containerRef.current || mapRef.current) return;
      try {
        const L = window.L;
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
          .setView([46.4917, -80.9924], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

        const pswIcon = L.divIcon({
          html: '<div style="background:#007AFF;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,122,255,0.5)"></div>',
          className: '',
          iconAnchor: [8, 8],
        });

        psws.forEach(p => {
          L.marker([p.lat, p.lng], { icon: pswIcon })
            .addTo(map)
            .bindPopup(`<b>${p.qualificationType}</b><br>⭐ ${p.rating.toFixed(1)}`);
        });

        mapRef.current = map;
      } catch {
        setFailed(true);
      }
    }).catch(() => setFailed(true));
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [psws]);

  if (failed) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 180, borderRadius: '12px 12px 0 0', overflow: 'hidden' } as any}
    />
  );
}

const SUDBURY_CENTER = { lat: 46.4917, lng: -80.9924 };

const SERVICES = [
  'Personal Care',
  'Companionship',
  'Meal Preparation',
  'Medication Reminders',
  'Light Housekeeping',
  'Mobility Assistance',
  'Post-Surgery Support',
];

type CareType = 'on-demand' | 'scheduled' | 'home-care';
type Frequency = 'weekly' | 'biweekly' | 'monthly';

const CARE_TYPES: { id: CareType; label: string; icon: string; sub: string; color: string; bg: string }[] = [
  { id: 'on-demand',  label: 'On Demand',  icon: '⚡', sub: 'Available today',  color: '#EA580C', bg: '#FFF7ED' },
  { id: 'scheduled',  label: 'Scheduled',  icon: '📅', sub: 'Plan ahead',       color: '#007AFF', bg: '#EFF6FF' },
  { id: 'home-care',  label: 'Home Care',  icon: '🏡', sub: 'Regular visits',   color: '#059669', bg: '#F0FDF4' },
];

const FREQUENCIES: { id: Frequency; label: string; sub: string }[] = [
  { id: 'weekly',    label: 'Weekly',    sub: 'Every week' },
  { id: 'biweekly',  label: 'Bi-weekly', sub: 'Every 2 weeks' },
  { id: 'monthly',   label: 'Monthly',   sub: 'Once a month' },
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

function today2hours() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
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
  const [careType, setCareType] = useState<CareType>('scheduled');
  const [service, setService] = useState(SERVICES[0]);
  const [hours, setHours] = useState(3);
  const [date, setDate] = useState(tomorrow9am());
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [availablePSWs, setAvailablePSWs] = useState<AvailablePSW[]>([]);
  const [pswCount, setPswCount] = useState<number | null>(null);

  useEffect(() => {
    apiGetAvailablePSWs()
      .then(d => { setAvailablePSWs(d.psws); setPswCount(d.count); })
      .catch(() => {}); // silently ignore if fails
  }, []);

  const total = hours * RATE;
  const activeType = CARE_TYPES.find(c => c.id === careType)!;

  function haptic() {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  async function submit() {
    setLoading(true);
    const scheduledAt = careType === 'on-demand' ? today2hours() : date;
    const extraParts = [
      careType !== 'scheduled' ? `[${activeType.label}]` : '',
      careType === 'home-care' ? `Frequency: ${FREQUENCIES.find(f => f.id === frequency)?.label}` : '',
      notes.trim(),
    ].filter(Boolean);
    try {
      await apiCreateBooking({
        serviceType: service,
        hours,
        scheduledAt: scheduledAt.toISOString(),
        location: { coordinates: DEFAULT_COORDS },
        address: address.trim() || 'Greater Sudbury, ON',
        notes: extraParts.join(' · ') || undefined,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message || 'Please try again.');
    }
    setLoading(false);
  }

  function resetForm() {
    setStep(0); setSuccess(false); setNotes(''); setAddress('');
    setHours(3); setDate(tomorrow9am()); setCareType('scheduled');
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    const displayDate = careType === 'on-demand' ? today2hours() : date;
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top + 40 }]}>
        <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.successGrad}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Booking Requested!</Text>
          <Text style={styles.successSub}>
            We're finding the best available PSW for your {service.toLowerCase()} needs.
          </Text>

          <View style={[styles.successTypeBadge, { backgroundColor: activeType.bg, borderColor: activeType.color + '40' }]}>
            <Text style={styles.successTypeBadgeText}>{activeType.icon} {activeType.label}</Text>
          </View>

          <View style={styles.successDetail}>
            <Text style={styles.successDetailRow}>📋 {service}</Text>
            {careType === 'on-demand' ? (
              <Text style={styles.successDetailRow}>⚡ Today, ASAP · ETA 2–4 hours</Text>
            ) : (
              <>
                <Text style={styles.successDetailRow}>📅 {formatDateDisplay(displayDate)}</Text>
                <Text style={styles.successDetailRow}>⏰ {formatTimeDisplay(displayDate)}</Text>
              </>
            )}
            <Text style={styles.successDetailRow}>⏱ {hours} hours · ${total}</Text>
            {careType === 'home-care' && (
              <Text style={styles.successDetailRow}>🔄 {FREQUENCIES.find(f => f.id === frequency)?.label}</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.bookAnotherBtn, pressed && styles.bookAnotherBtnPressed]}
            onPress={resetForm}
          >
            <Text style={styles.bookAnotherBtnText}>Book Another</Text>
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[Colors.heroNavy, Colors.heroNavyLight]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Text style={styles.headerTitle}>Book a PSW</Text>
          <Text style={styles.headerSub}>Greater Sudbury · $25/hr · 3hr minimum</Text>

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

        {/* ── Step 0: Service + Care Type ── */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What care do you need?</Text>

            {/* ── PSW Availability Map ── */}
            <View style={styles.pswAvailCard}>
              {Platform.OS === 'web' && availablePSWs.length > 0 ? (
                <PSWMapWeb psws={availablePSWs} />
              ) : Platform.OS === 'web' ? (
                // @ts-ignore
                <iframe
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-81.15,46.42,-80.83,46.57&layer=mapnik"
                  style={{ width: '100%', height: 180, border: 'none', display: 'block', borderRadius: '12px 12px 0 0', pointerEvents: 'none' }}
                  title="Greater Sudbury coverage"
                />
              ) : (
                MapView ? (
                  <MapView
                    style={styles.pswNativeMap}
                    initialRegion={{ latitude: 46.4917, longitude: -80.9924, latitudeDelta: 0.18, longitudeDelta: 0.18 }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    {availablePSWs.map(p => (
                      Marker && (
                        <Marker
                          key={String(p._id)}
                          coordinate={{ latitude: p.lat, longitude: p.lng }}
                          pinColor="#007AFF"
                          title={p.qualificationType}
                          description={`⭐ ${p.rating.toFixed(1)}`}
                        />
                      )
                    ))}
                  </MapView>
                ) : (
                  <View style={styles.pswNativeMap} />
                )
              )}
              <View style={styles.pswAvailInfo}>
                <View style={styles.pswAvailBadge}>
                  <Text style={styles.pswAvailCount}>
                    {pswCount === null ? '...' : pswCount}
                  </Text>
                  <Text style={styles.pswAvailCountLabel}> PSWs available nearby</Text>
                </View>
                <Text style={styles.pswAvailSub}>Greater Sudbury · 15 km radius · Verified & insured</Text>
              </View>
            </View>

            <Text style={styles.subSectionLabel}>CARE TYPE</Text>
            <View style={styles.careTypeRow}>
              {CARE_TYPES.map(ct => {
                const active = careType === ct.id;
                return (
                  <Pressable
                    key={ct.id}
                    style={({ pressed }) => [
                      styles.careTypeCard,
                      active && { borderColor: ct.color, backgroundColor: ct.bg },
                      pressed && { opacity: 0.88 },
                    ]}
                    onPress={() => { haptic(); setCareType(ct.id); }}
                  >
                    <Text style={styles.careTypeIcon}>{ct.icon}</Text>
                    <Text style={[styles.careTypeLabel, active && { color: ct.color }]}>{ct.label}</Text>
                    <Text style={styles.careTypeSub}>{ct.sub}</Text>
                    {active && (
                      <View style={[styles.careTypeCheckDot, { backgroundColor: ct.color }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.subSectionLabel, { marginTop: 20 }]}>SERVICE</Text>
            <View style={styles.serviceGrid}>
              {SERVICES.map(s => {
                const selected = s === service;
                const icon = ServiceIcons[s] ?? '🏥';
                const bg = ServiceColors[s] ?? Colors.servicePersonal;
                return (
                  <Pressable
                    key={s}
                    style={[styles.serviceOption, selected && styles.serviceOptionSelected]}
                    onPress={() => { haptic(); setService(s); }}
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

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => setStep(1)}
            >
              <Text style={styles.primaryBtnText}>Next: Schedule</Text>
              <View style={styles.primaryBtnArrow}><Text style={styles.primaryBtnArrowText}>→</Text></View>
            </Pressable>
          </View>
        )}

        {/* ── Step 1: Schedule ── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>When do you need care?</Text>

            {/* On Demand: ASAP banner */}
            {careType === 'on-demand' && (
              <View style={styles.onDemandBanner}>
                <LinearGradient colors={['#FFF7ED', '#FEF3C7']} style={styles.onDemandGrad}>
                  <View style={styles.onDemandIconWrap}>
                    <Text style={styles.onDemandIcon}>⚡</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.onDemandTitle}>On Demand – Available Today</Text>
                    <Text style={styles.onDemandSub}>A verified PSW will arrive within 2–4 hours of confirmation</Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Home Care: Frequency */}
            {careType === 'home-care' && (
              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleLabel}>🔄  Visit Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCIES.map(f => (
                    <Pressable
                      key={f.id}
                      style={[styles.freqChip, frequency === f.id && styles.freqChipActive]}
                      onPress={() => { haptic(); setFrequency(f.id); }}
                    >
                      <Text style={[styles.freqChipLabel, frequency === f.id && styles.freqChipLabelActive]}>{f.label}</Text>
                      <Text style={[styles.freqChipSub, frequency === f.id && styles.freqChipSubActive]}>{f.sub}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Date – hidden for on-demand */}
            {careType !== 'on-demand' && (
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
            )}

            {/* Time – hidden for on-demand */}
            {careType !== 'on-demand' && (
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
                          haptic();
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
            )}

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

            {/* Address */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>📍  Service Address</Text>
              <TextInput
                style={styles.notesInput}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 123 Elm St, Sudbury, ON"
                placeholderTextColor={Colors.tertiaryLabel}
                returnKeyType="done"
                autoComplete="street-address"
              />
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
              <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]} onPress={() => setStep(0)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { flex: 2 }, pressed && styles.primaryBtnPressed]}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryBtnText}>Review</Text>
                <View style={styles.primaryBtnArrow}><Text style={styles.primaryBtnArrowText}>→</Text></View>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Step 2: Confirm ── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review your booking</Text>

            {/* Care type banner */}
            <View style={[styles.careTypeSummaryBanner, { backgroundColor: activeType.bg, borderColor: activeType.color + '44' }]}>
              <View style={[styles.careTypeSummaryIconWrap, { backgroundColor: activeType.color + '18' }]}>
                <Text style={styles.careTypeSummaryIcon}>{activeType.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.careTypeSummaryLabel, { color: activeType.color }]}>{activeType.label}</Text>
                <Text style={styles.careTypeSummarySub}>{activeType.sub}</Text>
              </View>
            </View>

            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <View style={styles.confirmServiceIconWrap}>
                  <Text style={styles.confirmIcon}>{ServiceIcons[service] ?? '🏥'}</Text>
                </View>
                <Text style={styles.confirmService}>{service}</Text>
              </View>
              <View style={styles.confirmDivider} />
              {(careType !== 'on-demand' ? [
                ['📅 Date',     formatDateDisplay(date)],
                ['⏰ Time',     formatTimeDisplay(date)],
                ['⏱ Duration', `${hours} hours`],
              ] : [
                ['⚡ When',     'Today, ASAP'],
                ['⏱ Duration', `${hours} hours`],
                ['🕐 ETA',     '2–4 hours'],
              ]).map(([label, value]) => (
                <View key={label} style={styles.confirmDetail}>
                  <Text style={styles.confirmDetailLabel}>{label}</Text>
                  <Text style={styles.confirmDetailValue}>{value}</Text>
                </View>
              ))}
              {careType === 'home-care' && (
                <View style={styles.confirmDetail}>
                  <Text style={styles.confirmDetailLabel}>🔄 Frequency</Text>
                  <Text style={styles.confirmDetailValue}>{FREQUENCIES.find(f => f.id === frequency)?.label}</Text>
                </View>
              )}
            </View>

            {/* Map */}
            <View style={styles.mapCard}>
              {Platform.OS === 'web' ? (
                // @ts-ignore – iframe valid on web
                <iframe
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-81.15,46.42,-80.83,46.57&layer=mapnik"
                  style={{ width: '100%', height: 170, border: 'none', display: 'block', borderRadius: '18px 18px 0 0', pointerEvents: 'none' }}
                  title="Service location – Greater Sudbury"
                />
              ) : (
                <View style={styles.mapPreview}>
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapText}>📍 Greater Sudbury, ON</Text>
                    <Text style={styles.mapSubtext}>Tap to view on map</Text>
                  </View>
                </View>
              )}
              <Pressable
                style={styles.mapInfo}
                onPress={() => {
                  const query = address.trim() || `${SUDBURY_CENTER.lat},${SUDBURY_CENTER.lng}`;
                  Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(query)}`);
                }}
              >
                <View style={styles.mapInfoRow}>
                  <Text style={styles.mapInfoIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapInfoTitle}>Service Location</Text>
                    <Text style={styles.mapInfoSub}>
                      {address.trim() || 'Greater Sudbury, ON · 15 km radius'}
                    </Text>
                  </View>
                  <Text style={styles.mapArrow}>→</Text>
                </View>
              </Pressable>
            </View>

            {/* Payment Info */}
            <View style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentIcon}>💳</Text>
                <Text style={styles.paymentText}>Private Pay</Text>
                <Text style={styles.paymentSub}>Cash or e-Transfer</Text>
              </View>
            </View>

            {notes.trim().length > 0 && (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>📝 Special Instructions</Text>
                <Text style={styles.notesText}>{notes.trim()}</Text>
              </View>
            )}

            <View style={styles.priceCard}>
              <Text style={styles.priceTitle}>Price Estimate</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>$25/hr × {hours} hours</Text>
                <Text style={styles.priceValue}>${total}</Text>
              </View>
              {careType === 'home-care' && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Recurring ({FREQUENCIES.find(f => f.id === frequency)?.label})</Text>
                  <Text style={[styles.priceValue, { color: '#059669' }]}>✓</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>Total</Text>
                <Text style={styles.priceTotalValue}>${total}</Text>
              </View>
              <Text style={styles.priceNote}>Not covered by OHIP · Private pay</Text>
            </View>

            <View style={styles.navBtns}>
              <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                onPress={submit}
                disabled={loading}
              >
                <Text style={styles.confirmBtnText}>{loading ? 'Confirming...' : 'Confirm Booking'}</Text>
              </Pressable>
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
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.label, marginBottom: 18 },

  subSectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.secondaryLabel,
    letterSpacing: 0.8, marginBottom: 10,
  },

  // ── PSW availability map card ──
  pswAvailCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 16, marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  pswNativeMap: { width: '100%', height: 180 },
  pswAvailInfo: {
    padding: 14, borderTopWidth: 1, borderTopColor: Colors.separator,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pswAvailBadge: { flexDirection: 'row', alignItems: 'center' },
  pswAvailCount: { fontSize: 22, fontWeight: '900', color: Colors.systemBlue },
  pswAvailCountLabel: { fontSize: 14, fontWeight: '600', color: Colors.label },
  pswAvailSub: { fontSize: 11, color: Colors.tertiaryLabel, flex: 1, textAlign: 'right' },

  // ── Care type ──
  careTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  careTypeCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  careTypeIcon: { fontSize: 22 },
  careTypeLabel: { fontSize: 13, fontWeight: '700', color: Colors.label },
  careTypeSub: { fontSize: 10, color: Colors.secondaryLabel, textAlign: 'center' },
  careTypeCheckDot: {
    position: 'absolute', top: 6, right: 6,
    width: 10, height: 10, borderRadius: 5,
  },

  // ── Services ──
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
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

  // ── Primary button (blue, not black) ──
  primaryBtn: {
    marginTop: 20,
    backgroundColor: Colors.systemBlue,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.systemBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primaryBtnArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnArrowText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Schedule ──
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

  // ── On demand ──
  onDemandBanner: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
    borderWidth: 1.5, borderColor: '#FED7AA',
  },
  onDemandGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  onDemandIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  onDemandIcon: { fontSize: 22 },
  onDemandTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  onDemandSub: { fontSize: 12, color: '#78350F', lineHeight: 18 },

  // ── Frequency ──
  frequencyRow: { flexDirection: 'row', gap: 10 },
  freqChip: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.systemGray6, borderWidth: 1.5, borderColor: 'transparent',
    alignItems: 'center', gap: 2,
  },
  freqChipActive: { backgroundColor: '#F0FDF4', borderColor: '#059669' },
  freqChipLabel: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel },
  freqChipLabelActive: { color: '#059669' },
  freqChipSub: { fontSize: 10, color: Colors.tertiaryLabel },
  freqChipSubActive: { color: '#059669' },

  // ── Nav ──
  navBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  backBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  backBtnPressed: { backgroundColor: '#f5f5f5' },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 2, backgroundColor: '#34C759', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#34C759', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Care type summary banner (step 2) ──
  careTypeSummaryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1.5,
  },
  careTypeSummaryIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  careTypeSummaryIcon: { fontSize: 22 },
  careTypeSummaryLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  careTypeSummarySub: { fontSize: 12, color: Colors.secondaryLabel },

  // ── Confirm card ──
  confirmCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  confirmServiceIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.systemGray6, alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { fontSize: 28 },
  confirmService: { fontSize: 20, fontWeight: '800', color: Colors.label, flex: 1 },
  confirmDivider: { height: 1, backgroundColor: Colors.separator, marginVertical: 14 },
  confirmDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  confirmDetailLabel: { fontSize: 14, color: Colors.secondaryLabel },
  confirmDetailValue: { fontSize: 14, fontWeight: '600', color: Colors.label },

  // ── Map ──
  mapCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4, marginBottom: 14,
  },
  mapPreview: {
    height: 160, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  mapOverlay: {
    backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
    alignItems: 'center',
  },
  mapText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mapSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  mapInfo: { padding: 16 },
  mapInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapInfoIcon: { fontSize: 24 },
  mapInfoTitle: { fontSize: 15, fontWeight: '700', color: Colors.label },
  mapInfoSub: { fontSize: 13, color: Colors.secondaryLabel },
  mapArrow: { fontSize: 18, color: Colors.systemBlue, fontWeight: '600' },

  // ── Payment ──
  paymentCard: {
    backgroundColor: '#F0F7FF', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#007AFF20',
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentIcon: { fontSize: 20 },
  paymentText: { fontSize: 15, fontWeight: '700', color: Colors.label },
  paymentSub: { fontSize: 13, color: Colors.secondaryLabel, flex: 1, textAlign: 'right' },

  notesCard: {
    backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16, marginBottom: 14,
  },
  notesLabel: { fontSize: 12, fontWeight: '700', color: Colors.secondaryLabel, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 14, color: Colors.label, lineHeight: 20 },

  // ── Price ──
  priceCard: { backgroundColor: Colors.systemBackground, borderRadius: 18, padding: 20, marginBottom: 14 },
  priceTitle: { fontSize: 16, fontWeight: '800', color: Colors.label, marginBottom: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 15, color: Colors.secondaryLabel },
  priceValue: { fontSize: 15, fontWeight: '600', color: Colors.label },
  priceDivider: { height: 1, backgroundColor: Colors.separator, marginVertical: 12 },
  priceTotalLabel: { fontSize: 17, fontWeight: '800', color: Colors.label },
  priceTotalValue: { fontSize: 20, fontWeight: '900', color: Colors.systemBlue },
  priceNote: { fontSize: 12, color: Colors.tertiaryLabel, marginTop: 8 },

  // ── Success ──
  successScreen: { flex: 1, backgroundColor: '#F0FDF4' },
  successGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconWrap: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(52,199,89,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successIcon: { fontSize: 52 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.trustGreen, marginBottom: 10 },
  successSub: { fontSize: 15, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  successTypeBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, marginBottom: 16,
  },
  successTypeBadgeText: { fontSize: 14, fontWeight: '700' },
  successDetail: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', gap: 12, marginBottom: 24 },
  successDetailRow: { fontSize: 15, color: Colors.label, fontWeight: '500' },
  bookAnotherBtn: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 2, borderColor: '#34C759',
  },
  bookAnotherBtnPressed: { backgroundColor: '#F0FDF4' },
  bookAnotherBtnText: { color: '#34C759', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
