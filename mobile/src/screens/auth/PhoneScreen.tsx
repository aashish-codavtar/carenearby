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
import * as Haptics from 'expo-haptics';
import { apiLogin } from '../../api/client';
import { Colors } from '../../utils/colors';

type Role = 'CUSTOMER' | 'PSW';

const ROLES: { key: Role; label: string; sub: string; icon: string; color: string }[] = [
  { key: 'CUSTOMER', label: 'Client',           sub: 'Book professional PSW care', icon: '🛡️', color: Colors.systemBlue },
  { key: 'PSW',      label: 'PSW Professional', sub: 'Find clients & earn income',  icon: '💼', color: Colors.onlineGreen },
];

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
    return raw
      .replace(/\b\w/g, c => c.toUpperCase())
      .slice(0, 50);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Compact top bar ─────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <View>
            <Text style={styles.appName}>CareNearby</Text>
            <Text style={styles.tagline}>Greater Sudbury, ON</Text>
          </View>
        </View>
      </View>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Get Started</Text>
            <Text style={styles.formSub}>Enter your phone number to continue</Text>

            {/* New / Returning toggle */}
            <View style={styles.toggleRow}>
              {[{ label: 'New User', value: true }, { label: 'Returning', value: false }].map(t => (
                <Pressable
                  key={t.label}
                  style={[styles.toggleBtn, isNewUser === t.value && styles.toggleBtnActive]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setIsNewUser(t.value);
                  }}
                >
                  <Text style={[styles.toggleText, isNewUser === t.value && styles.toggleTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Name */}
            {isNewUser && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={v => setName(formatName(v))}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryBadge}>
                  <Text style={styles.countryFlag}>🇨🇦</Text>
                  <Text style={styles.countryCode}>+1</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.phoneInput]}
                  value={phone}
                  onChangeText={t => setPhone(formatPhone(t))}
                  placeholder="416-555-0100"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={12}
                  returnKeyType="done"
                  onSubmitEditing={sendOTP}
                />
              </View>
            </View>

            {/* Role selection */}
            {isNewUser && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>I am a</Text>
                <View style={styles.roleRow}>
                  {ROLES.map(r => {
                    const selected = role === r.key;
                    return (
                      <Pressable
                        key={r.key}
                        style={[
                          styles.roleCard,
                          selected && [styles.roleCardSelected, { borderColor: r.color }],
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync();
                          setRole(r.key);
                        }}
                      >
                        <View style={[styles.roleIconWrap, { backgroundColor: r.color + '18' }]}>
                          <Text style={styles.roleIcon}>{r.icon}</Text>
                        </View>
                        <Text style={[styles.roleLabel, selected && { color: r.color }]}>{r.label}</Text>
                        <Text style={styles.roleSub} numberOfLines={2}>{r.sub}</Text>
                        {selected && (
                          <View style={[styles.roleCheck, { backgroundColor: r.color }]}>
                            <Text style={styles.roleCheckText}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                !isValid() && styles.ctaBtnDisabled,
                pressed && isValid() && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={sendOTP}
              disabled={!isValid() || loading}
            >
              <Text style={styles.ctaBtnText}>{loading ? 'Sending…' : 'Continue'}</Text>
              {!loading && (
                <View style={styles.ctaArrow}>
                  <Text style={styles.ctaArrowText}>→</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.disclaimer}>
              You'll receive an SMS with a verification code.{'\n'}Standard rates may apply.
            </Text>
          </View>

          {/* Trust strip */}
          <View style={styles.trustStrip}>
            {[['🛡️', 'Verified PSWs'], ['📍', 'Greater Sudbury'], ['💳', 'Private Pay']].map(([icon, label]) => (
              <View key={label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{icon}</Text>
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>© {new Date().getFullYear()} CareNearby · Greater Sudbury, ON</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top bar
  topBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    backgroundColor: '#000',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },

  // Form
  formContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, minHeight: 300,
  },
  formTitle: { fontSize: 26, fontWeight: '800', color: '#000', marginBottom: 6, letterSpacing: -0.5 },
  formSub: { fontSize: 14, color: '#777', marginBottom: 22 },

  // Toggle
  toggleRow: {
    flexDirection: 'row', backgroundColor: '#f5f5f5',
    borderRadius: 12, padding: 4, marginBottom: 22,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#000' },

  // Inputs
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  textInput: {
    backgroundColor: '#f8f8f8', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#000', borderWidth: 1, borderColor: '#e8e8e8',
  },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  countryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0f0f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 15,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 15, fontWeight: '700', color: '#111' },
  phoneInput: {
    flex: 1, backgroundColor: '#f8f8f8', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 17, color: '#000', borderWidth: 1, borderColor: '#e8e8e8',
    fontWeight: '500', letterSpacing: 0.5,
  },

  // Role cards
  roleRow: { flexDirection: 'row', gap: 10 },
  roleCard: {
    flex: 1, backgroundColor: '#fafafa', borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: 'transparent', gap: 6,
  },
  roleCardSelected: { backgroundColor: '#f0f7ff' },
  roleIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  roleIcon: { fontSize: 22 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: '#000' },
  roleSub: { fontSize: 11, color: '#666', lineHeight: 15 },
  roleCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  roleCheckText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // CTA
  ctaBtn: {
    marginTop: 6, borderRadius: 14, backgroundColor: '#000',
    paddingVertical: 17, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  ctaBtnDisabled: { backgroundColor: '#ccc', shadowOpacity: 0.08 },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  ctaArrowText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  disclaimer: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 18, lineHeight: 16 },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', justifyContent: 'center', gap: 28,
    paddingVertical: 20, paddingHorizontal: 24,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  trustItem: { alignItems: 'center', gap: 4 },
  trustIcon: { fontSize: 20 },
  trustText: { fontSize: 11, color: '#666', fontWeight: '500' },
  
  bottomBar: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#000' },
  bottomText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
});
