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
import { IOSButton } from '../../components/IOSButton';
import { Colors } from '../../utils/colors';

type Role = 'CUSTOMER' | 'PSW';

const ROLES: { key: Role; label: string; sub: string; icon: string; color: string }[] = [
  {
    key: 'CUSTOMER',
    label: 'I need care',
    sub: 'Book PSW services for yourself or a loved one',
    icon: '🏥',
    color: Colors.systemBlue,
  },
  {
    key: 'PSW',
    label: 'I\'m a PSW',
    sub: 'Find clients and manage your care schedule',
    icon: '🧑‍⚕️',
    color: Colors.onlineGreen,
  },
];

export function PhoneScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [loading, setLoading] = useState(false);

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function formatName(raw: string) {
    // Title-case each word, collapse spaces, strip leading/trailing "and"/"&"
    return raw
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\s+(And|&)\s*$/i, '')
      .replace(/^\s*(And|&)\s+/i, '')
      .replace(/\s+$/, ''); // don't trim mid-typing trailing space, just collapse multiples
  }

  function getE164() {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }

  function isValid() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return false;
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
      await apiLogin({
        phone: getE164(),
        name: isNewUser ? name.trim() : undefined,
        role: isNewUser ? role : undefined,
      });
      nav.navigate('OTP', { phone: getE164(), isNewUser, role });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send verification code.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[Colors.heroNavy, Colors.heroNavyLight, '#1E4976']}
          style={[styles.hero, { paddingTop: insets.top + 30 }]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏥</Text>
          </View>
          <Text style={styles.appName}>CareNearby</Text>
          <Text style={styles.tagline}>Professional PSW care,{'\n'}on demand in Sudbury.</Text>
          <View style={styles.locationPill}>
            <Text style={styles.locationText}>📍 Greater Sudbury, ON · Bilingual</Text>
          </View>
        </LinearGradient>

        <View style={styles.formContainer}>
          {/* New / Returning toggle */}
          <View style={styles.toggleRow}>
            {[
              { label: 'New User', value: true },
              { label: 'Returning', value: false },
            ].map(t => (
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

          {/* Name field (new users only) */}
          {isNewUser && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={v => setName(formatName(v))}
                placeholder="Jane Smith"
                placeholderTextColor={Colors.tertiaryLabel}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          )}

          {/* Phone input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇨🇦 +1</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.phoneInput]}
                value={phone}
                onChangeText={t => setPhone(formatPhone(t))}
                placeholder="416-555-0100"
                placeholderTextColor={Colors.tertiaryLabel}
                keyboardType="phone-pad"
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={sendOTP}
              />
            </View>
          </View>

          {/* Role selection (new users only) */}
          {isNewUser && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>I AM A</Text>
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
                      <Text style={styles.roleIcon}>{r.icon}</Text>
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
          <IOSButton
            title={`Send Verification Code ${isValid() ? '→' : ''}`}
            loading={loading}
            disabled={!isValid()}
            onPress={sendOTP}
            style={{ marginTop: 8 }}
          />

          <Text style={styles.disclaimer}>
            By continuing, you agree to receive an SMS verification code.{'\n'}
            Standard message rates may apply.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  appName: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: 17, textAlign: 'center', lineHeight: 24, marginBottom: 16 },
  locationPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  formContainer: { padding: 20 },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.systemGray6, borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.systemBackground, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 15, fontWeight: '600', color: Colors.systemGray },
  toggleTextActive: { color: Colors.label },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.secondaryLabel, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  textInput: {
    backgroundColor: Colors.systemBackground, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: Colors.label,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCode: {
    backgroundColor: Colors.systemBackground, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  countryCodeText: { fontSize: 15, fontWeight: '600', color: Colors.label },
  phoneInput: { flex: 1 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1, backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: 'transparent', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  roleCardSelected: { backgroundColor: '#F8FAFF' },
  roleIcon: { fontSize: 28 },
  roleLabel: { fontSize: 15, fontWeight: '800', color: Colors.label },
  roleSub: { fontSize: 12, color: Colors.secondaryLabel, lineHeight: 16 },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  roleCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: Colors.tertiaryLabel, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
