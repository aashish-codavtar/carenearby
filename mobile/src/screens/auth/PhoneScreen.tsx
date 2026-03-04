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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiLogin } from '../../api/client';
import { Colors } from '../../utils/colors';

type Role = 'CUSTOMER' | 'PSW';

export function PhoneScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isNewUser, setIsNewUser] = useState(true);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [role,    setRole]    = useState<Role>('CUSTOMER');
  const [loading, setLoading] = useState(false);

  function formatPhone(raw: string) {
    const d = raw.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  function formatName(raw: string) {
    return raw.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 50);
  }

  function getE164() {
    const d = phone.replace(/\D/g, '');
    return d.length === 10 ? `+1${d}` : `+${d}`;
  }

  function isValid() {
    const d = phone.replace(/\D/g, '');
    if (d.length < 10) return false;
    if (isNewUser && name.trim().length < 2) return false;
    return true;
  }

  async function sendOTP() {
    if (!isValid()) {
      Alert.alert('Invalid Input', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      await apiLogin({ phone: getE164(), name: isNewUser ? name.trim() : undefined, role: isNewUser ? role : undefined });
      nav.navigate('OTP', { phone: getE164(), isNewUser, role });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send verification code.');
    }
    setLoading(false);
  }

  const valid = isValid();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#060D1F', '#0A1A3A', '#0D2D6B']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.hero}
      >
        {/* Brand mark */}
        <View style={styles.brandRow}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.brandMark}
          >
            <Text style={styles.brandMarkText}>CN</Text>
          </LinearGradient>
          <View>
            <Text style={styles.brandName}>CareNearby</Text>
            <Text style={styles.brandLocation}>Greater Sudbury, ON  🇨🇦</Text>
          </View>
        </View>

        {/* Hero headline */}
        <Text style={styles.heroHeadline}>Professional PSW{'\n'}Care at Home</Text>

        {/* Trust pills */}
        <View style={styles.pillRow}>
          {[
            { icon: '✓', label: 'Verified PSWs' },
            { icon: '✓', label: 'Background Checked' },
            { icon: '✓', label: '$25/hr' },
          ].map(p => (
            <View key={p.label} style={styles.pill}>
              <Text style={styles.pillIcon}>{p.icon}</Text>
              <Text style={styles.pillText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Form card ────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.formOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Tab toggle */}
            <View style={styles.tabRow}>
              {[
                { label: 'New User', value: true },
                { label: 'Sign In',  value: false },
              ].map(t => (
                <Pressable
                  key={t.label}
                  style={[styles.tab, isNewUser === t.value && styles.tabActive]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setIsNewUser(t.value);
                  }}
                >
                  <Text style={[styles.tabText, isNewUser === t.value && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.cardTitle}>{isNewUser ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.cardSub}>{isNewUser ? 'Join thousands of families in Sudbury' : 'Enter your phone number to continue'}</Text>

            {/* Name (new users only) */}
            {isNewUser && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={v => setName(formatName(v))}
                  placeholder="Jane Smith"
                  placeholderTextColor="#C0C0C8"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.phoneWrap}>
                <View style={styles.countryChip}>
                  <Text style={styles.countryChipText}>+1</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={v => setPhone(formatPhone(v))}
                  placeholder="416-555-0100"
                  placeholderTextColor="#C0C0C8"
                  keyboardType="phone-pad"
                  maxLength={12}
                  returnKeyType="done"
                  onSubmitEditing={sendOTP}
                />
              </View>
            </View>

            {/* Role cards (new users only) */}
            {isNewUser && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>I am a</Text>
                <View style={styles.roleGrid}>
                  {/* Client card */}
                  <Pressable
                    style={[styles.roleCard, role === 'CUSTOMER' && styles.roleCardActiveBlue]}
                    onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); setRole('CUSTOMER'); }}
                  >
                    <View style={[styles.roleIconBox, role === 'CUSTOMER' ? styles.roleIconBoxBlue : styles.roleIconBoxGray]}>
                      <Text style={styles.roleIconText}>C</Text>
                    </View>
                    <Text style={[styles.roleTitle, role === 'CUSTOMER' && { color: '#1D4ED8' }]}>Client</Text>
                    <Text style={styles.roleSub}>Book PSW care</Text>
                    {role === 'CUSTOMER' && <View style={styles.roleCheckBlue}><Text style={styles.roleCheckMark}>✓</Text></View>}
                  </Pressable>

                  {/* PSW card */}
                  <Pressable
                    style={[styles.roleCard, role === 'PSW' && styles.roleCardActiveGreen]}
                    onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); setRole('PSW'); }}
                  >
                    <View style={[styles.roleIconBox, role === 'PSW' ? styles.roleIconBoxGreen : styles.roleIconBoxGray]}>
                      <Text style={styles.roleIconText}>P</Text>
                    </View>
                    <Text style={[styles.roleTitle, role === 'PSW' && { color: '#059669' }]}>PSW Worker</Text>
                    <Text style={styles.roleSub}>Find clients</Text>
                    {role === 'PSW' && <View style={styles.roleCheckGreen}><Text style={styles.roleCheckMark}>✓</Text></View>}
                  </Pressable>
                </View>
              </View>
            )}

            {/* CTA */}
            <Pressable
              onPress={sendOTP}
              disabled={!valid || loading}
              style={({ pressed }) => [styles.cta, pressed && valid && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={valid && !loading ? ['#2563EB', '#1D4ED8'] : ['#D1D5DB', '#9CA3AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>{loading ? 'Sending code…' : 'Continue'}</Text>
                {!loading && <Text style={styles.ctaArrow}>→</Text>}
              </LinearGradient>
            </Pressable>

            <Text style={styles.disclaimer}>
              We'll send a 6-digit code via SMS · Standard rates apply
            </Text>
          </View>

          {/* Bottom strip */}
          <View style={styles.bottomStrip}>
            <Text style={styles.bottomStripText}>
              Trusted by families across Greater Sudbury · © {new Date().getFullYear()} CareNearby
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060D1F' },

  // Hero
  hero: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  brandMark: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  brandMarkText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  brandName:     { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  brandLocation: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 },

  heroHeadline: {
    color: '#fff', fontSize: 32, fontWeight: '900',
    letterSpacing: -1, lineHeight: 38, marginBottom: 20,
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  pillIcon: { color: '#60A5FA', fontSize: 12, fontWeight: '700' },
  pillText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  // Form
  formOuter: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
  },

  // Tab
  tabRow: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    borderRadius: 14, padding: 4, marginBottom: 22,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#0F172A' },

  cardTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: '#64748B', marginBottom: 24 },

  // Fields
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#0F172A',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },

  phoneWrap: { flexDirection: 'row', gap: 8 },
  countryChip: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F1F5F9', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  countryChipText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  phoneInput: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#0F172A',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    fontWeight: '500', letterSpacing: 0.5,
  },

  // Role cards
  roleGrid:      { flexDirection: 'row', gap: 10 },
  roleCard: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16,
    padding: 14, borderWidth: 2, borderColor: '#E2E8F0',
    gap: 5, position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  roleCardActiveBlue:  { borderColor: '#2563EB', backgroundColor: '#EFF6FF', shadowColor: '#2563EB', shadowOpacity: 0.12 },
  roleCardActiveGreen: { borderColor: '#059669', backgroundColor: '#F0FDF4', shadowColor: '#059669', shadowOpacity: 0.12 },

  roleIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  roleIconBoxBlue:  { backgroundColor: '#DBEAFE' },
  roleIconBoxGreen: { backgroundColor: '#D1FAE5' },
  roleIconBoxGray:  { backgroundColor: '#E2E8F0' },
  roleIconText: { fontSize: 15, fontWeight: '800', color: '#475569' },

  roleTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  roleSub:   { fontSize: 11, color: '#94A3B8' },

  roleCheckBlue:  { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  roleCheckGreen: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  roleCheckMark:  { color: '#fff', fontSize: 10, fontWeight: '700' },

  // CTA
  cta: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  ctaGrad: {
    paddingVertical: 17, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText:  { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  ctaArrow: { color: 'rgba(255,255,255,0.75)', fontSize: 18, fontWeight: '600' },

  disclaimer: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 14, lineHeight: 16,
  },

  // Bottom
  bottomStrip: {
    backgroundColor: '#F8FAFC', paddingVertical: 20, paddingHorizontal: 24,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  bottomStripText: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
});
