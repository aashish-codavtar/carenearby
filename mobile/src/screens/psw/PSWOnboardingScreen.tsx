import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiSubmitPSWOnboarding } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IOSButton } from '../../components/IOSButton';
import { Colors } from '../../utils/colors';
import { Storage } from '../../utils/storage';

// ── Qualification types ────────────────────────────────────────────────────────
const QUAL_TYPES = [
  { key: 'PSW',   label: 'PSW',  desc: 'Personal Support Worker',    icon: '🧑‍⚕️' },
  { key: 'RPN',   label: 'RPN',  desc: 'Registered Practical Nurse', icon: '💉' },
  { key: 'RN',    label: 'RN',   desc: 'Registered Nurse',           icon: '🩺' },
  { key: 'OT',    label: 'OT',   desc: 'Occupational Therapist',     icon: '🙌' },
  { key: 'PT',    label: 'PT',   desc: 'Physiotherapist',            icon: '🏃' },
  { key: 'DSW',   label: 'DSW',  desc: 'Developmental Services',     icon: '❤️' },
  { key: 'HCA',   label: 'HCA',  desc: 'Home Care Aide',             icon: '🏠' },
  { key: 'Other', label: 'Other', desc: 'Other Healthcare Role',     icon: '⚕️' },
] as const;

type QualType = typeof QUAL_TYPES[number]['key'];

// ── Specialty options ──────────────────────────────────────────────────────────
const SPECIALTY_OPTIONS = [
  'Dementia Care', 'Alzheimer\'s Care', 'Post-Surgery Support',
  'Palliative / Hospice Care', 'Pediatric Care', 'Wound Care',
  'Medication Administration', 'Mobility Assistance', 'Spinal Cord Injury',
  'ABI (Brain Injury)', 'Autism Support', 'Stroke Recovery',
];

// ── Language options ───────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS = ['English', 'French', 'Spanish', 'Mandarin', 'Punjabi', 'Arabic'];

// ── Step indicator (top-level so it never causes re-mount) ────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <View style={styles.stepRow}>
      {[1, 2, 3].map(s => (
        <View key={s} style={styles.stepWrap}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );
}

export function PSWOnboardingScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 – Qualification
  const [qualType, setQualType]     = useState<QualType>('PSW');
  const [licenseNum, setLicenseNum] = useState('');
  const [college, setCollege]       = useState('');
  const [experience, setExperience] = useState('');

  // Step 2 – Specialties & Languages
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages]     = useState<string[]>(['English']);
  const [bio, setBio]                 = useState('');

  // Step 3 – Extras
  const [firstAid, setFirstAid]   = useState(false);
  const [driversLic, setDriversLic] = useState(false);
  const [ownCar, setOwnCar]       = useState(false);

  const [loading, setLoading] = useState(false);

  function toggleSpecialty(s: string) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleLanguage(l: string) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }

  async function submit() {
    setLoading(true);
    try {
      await apiSubmitPSWOnboarding({
        qualificationType: qualType,
        licenseNumber:     licenseNum.trim(),
        collegeName:       college.trim(),
        experienceYears:   Number(experience) || 0,
        specialties,
        languages:         languages.length > 0 ? languages : ['English'],
        bio:               bio.trim(),
        firstAidCertified: firstAid,
        driversLicense:    driversLic,
        ownTransportation: ownCar,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user) {
        const updatedUser = { ...user, onboardingComplete: true };
        const token = await Storage.getToken();
        if (token) await Storage.saveAuth(token, updatedUser);
      }
      nav.reset({ index: 0, routes: [{ name: 'PSWHome' as never }] });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save your credentials. Please try again.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.heroNavy, Colors.heroNavyLight]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Text style={styles.headerIcon}>🧑‍⚕️</Text>
          <Text style={styles.headerTitle}>PSW Verification</Text>
          <Text style={styles.headerSub}>Step {step} of 3 — Let's verify your credentials</Text>
          <StepIndicator step={step} />
        </LinearGradient>

        <View style={styles.body}>

          {/* ── STEP 1: Qualification (inline JSX — no re-mount, no focus loss) ── */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Your Qualifications</Text>
              <Text style={styles.stepSub}>Tell us about your healthcare credential so we can match you with the right clients.</Text>

              <Text style={styles.fieldLabel}>QUALIFICATION TYPE</Text>
              <View style={styles.qualGrid}>
                {QUAL_TYPES.map(q => (
                  <Pressable
                    key={q.key}
                    style={[styles.qualCard, qualType === q.key && styles.qualCardSelected]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setQualType(q.key);
                    }}
                  >
                    <Text style={styles.qualIcon}>{q.icon}</Text>
                    <Text style={[styles.qualLabel, qualType === q.key && styles.qualLabelSelected]}>{q.label}</Text>
                    <Text style={styles.qualDesc} numberOfLines={2}>{q.desc}</Text>
                    {qualType === q.key && (
                      <View style={styles.qualCheck}><Text style={styles.qualCheckText}>✓</Text></View>
                    )}
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>COLLEGE / REGISTRATION NUMBER (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={licenseNum}
                onChangeText={setLicenseNum}
                placeholder="e.g. PSW123456"
                placeholderTextColor={Colors.tertiaryLabel}
                autoCapitalize="characters"
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>ISSUING COLLEGE OR INSTITUTION (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={college}
                onChangeText={setCollege}
                placeholder="e.g. Cambrian College"
                placeholderTextColor={Colors.tertiaryLabel}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>YEARS OF EXPERIENCE</Text>
              <TextInput
                style={styles.textInput}
                value={experience}
                onChangeText={setExperience}
                placeholder="0"
                placeholderTextColor={Colors.tertiaryLabel}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />

              <IOSButton
                title="Continue →"
                onPress={() => setStep(2)}
                style={{ marginTop: 24 }}
              />
            </>
          )}

          {/* ── STEP 2: Specialties & Languages ── */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Specialties & Languages</Text>
              <Text style={styles.stepSub}>Select your care specialties and the languages you speak fluently.</Text>

              <Text style={styles.fieldLabel}>CARE SPECIALTIES (Select all that apply)</Text>
              <View style={styles.chipGrid}>
                {SPECIALTY_OPTIONS.map(s => {
                  const active = specialties.includes(s);
                  return (
                    <Pressable
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleSpecialty(s)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>LANGUAGES SPOKEN</Text>
              <View style={styles.chipGrid}>
                {LANGUAGE_OPTIONS.map(l => {
                  const active = languages.includes(l);
                  return (
                    <Pressable
                      key={l}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleLanguage(l)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{l}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>SHORT BIO (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Brief description of your experience and approach to care..."
                placeholderTextColor={Colors.tertiaryLabel}
                multiline
                numberOfLines={4}
                maxLength={400}
                returnKeyType="default"
              />
              <Text style={styles.charCount}>{bio.length}/400</Text>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <IOSButton title="Continue →" onPress={() => setStep(3)} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {/* ── STEP 3: Extras & Submit ── */}
          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Almost Done!</Text>
              <Text style={styles.stepSub}>A few more details help clients find the right PSW for their needs.</Text>

              <View style={styles.card}>
                {[
                  { label: 'First Aid / CPR Certified', sub: 'Valid first aid certificate', value: firstAid, set: setFirstAid, icon: '🚑' },
                  { label: "Valid Driver's Licence",      sub: 'Ontario G or G2 licence',   value: driversLic, set: setDriversLic, icon: '🚗' },
                  { label: 'Own Transportation',          sub: 'Have a vehicle to travel to clients', value: ownCar, set: setOwnCar, icon: '🔑' },
                ].map((item, i) => (
                  <View key={item.label}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.switchRow}>
                      <Text style={styles.switchIcon}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>{item.label}</Text>
                        <Text style={styles.switchSub}>{item.sub}</Text>
                      </View>
                      <Switch
                        value={item.value}
                        onValueChange={v => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync();
                          item.set(v);
                        }}
                        trackColor={{ false: Colors.systemGray5, true: Colors.onlineGreen + '60' }}
                        thumbColor={item.value ? Colors.onlineGreen : Colors.systemGray3}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.pendingNotice}>
                <Text style={styles.pendingIcon}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>Pending Admin Review</Text>
                  <Text style={styles.pendingDesc}>
                    Your profile will be reviewed within 1–2 business days. You can browse the app while we verify your credentials.
                  </Text>
                </View>
              </View>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <IOSButton
                  title="Submit & Go to Dashboard"
                  variant="success"
                  loading={loading}
                  onPress={submit}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20 },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepWrap: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#fff', borderColor: '#fff' },
  stepNum: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  stepNumActive: { color: Colors.heroNavy },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#fff' },

  body: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.label, marginBottom: 6 },
  stepSub: { fontSize: 14, color: Colors.secondaryLabel, marginBottom: 24, lineHeight: 20 },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.secondaryLabel,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20,
  },

  // Qualification grid
  qualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  qualCard: {
    width: '47%', backgroundColor: Colors.systemBackground,
    borderRadius: 14, padding: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  qualCardSelected: { borderColor: Colors.onlineGreen, backgroundColor: '#F0FFF4' },
  qualIcon: { fontSize: 24, marginBottom: 4 },
  qualLabel: { fontSize: 15, fontWeight: '800', color: Colors.label, marginBottom: 2 },
  qualLabelSelected: { color: Colors.onlineGreen },
  qualDesc: { fontSize: 11, color: Colors.secondaryLabel, lineHeight: 15 },
  qualCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.onlineGreen, alignItems: 'center', justifyContent: 'center',
  },
  qualCheckText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  textInput: {
    backgroundColor: Colors.systemBackground, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.label,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bioInput: { height: 120, textAlignVertical: 'top', paddingTop: 14 },
  charCount: { fontSize: 11, color: Colors.tertiaryLabel, textAlign: 'right', marginTop: 4 },

  // Chip selectors
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.systemBackground,
    borderWidth: 1.5, borderColor: Colors.systemGray4,
  },
  chipActive: { backgroundColor: Colors.systemBlue + '15', borderColor: Colors.systemBlue },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.secondaryLabel },
  chipTextActive: { color: Colors.systemBlue },

  // Card
  card: {
    backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: Colors.separator, marginVertical: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchIcon: { fontSize: 22 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.label, marginBottom: 2 },
  switchSub: { fontSize: 12, color: Colors.secondaryLabel },

  // Pending notice
  pendingNotice: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: Colors.systemOrange + '30',
  },
  pendingIcon: { fontSize: 24 },
  pendingTitle: { fontSize: 14, fontWeight: '700', color: Colors.systemOrange, marginBottom: 4 },
  pendingDesc: { fontSize: 13, color: Colors.secondaryLabel, lineHeight: 19 },

  // Nav row
  navRow: { flexDirection: 'row', gap: 12, marginTop: 24, alignItems: 'center' },
  backBtn: {
    height: 54, paddingHorizontal: 18, justifyContent: 'center',
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.systemGray4,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.secondaryLabel },
});
