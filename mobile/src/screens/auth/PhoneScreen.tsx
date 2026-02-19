import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
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
import { apiLogin } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { AuthStackParams } from '../../navigation/AuthNavigator';
import { Colors } from '../../utils/colors';

type Props = NativeStackScreenProps<AuthStackParams, 'Phone'>;

type Role = 'CUSTOMER' | 'PSW';

export function PhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [isNewUser, setIsNewUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const formattedPhone = phone.startsWith('+1') ? phone : `+1${phone.replace(/\D/g, '')}`;
  const isValid = formattedPhone.replace(/\D/g, '').length === 11 && (!isNewUser || name.trim().length > 1);

  async function handleContinue() {
    if (!isValid) return;
    setLoading(true);
    try {
      await apiLogin({
        phone: formattedPhone,
        ...(isNewUser ? { name: name.trim(), role } : {}),
      });
      navigation.navigate('OTP', { phone: formattedPhone, isNewUser, role });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏥</Text>
            </View>
            <Text style={styles.appName}>CareNearby</Text>
            <Text style={styles.tagline}>Connect with trusted PSWs in Sudbury</Text>
          </View>

          {/* Toggle new / returning */}
          <View style={styles.toggleRow}>
            {(['New user', 'Returning user'] as const).map((label, i) => {
              const isActive = isNewUser === (i === 0);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                  onPress={() => setIsNewUser(i === 0)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isNewUser && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Your Name</Text>
                <TextInput
                  ref={nameRef}
                  style={styles.input}
                  placeholder="Jane Smith"
                  placeholderTextColor={Colors.systemGray3}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => {}}
                />
              </View>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇨🇦 +1</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="(705) 555-0100"
                  placeholderTextColor={Colors.systemGray3}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  maxLength={14}
                />
              </View>
            </View>

            {isNewUser && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>I am a…</Text>
                <View style={styles.roleRow}>
                  {(['CUSTOMER', 'PSW'] as Role[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                      onPress={() => setRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.roleEmoji}>
                        {r === 'CUSTOMER' ? '👨‍👩‍👧' : '🧑‍⚕️'}
                      </Text>
                      <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                        {r === 'CUSTOMER' ? 'Family / Customer' : 'PSW Worker'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <IOSButton
            title="Send Code"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
            style={styles.cta}
          />

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service. A verification code will be sent to
            your phone.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemBackground },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },

  brand: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${Colors.systemBlue}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 30, fontWeight: '700', color: Colors.label, marginBottom: 6 },
  tagline: { fontSize: 15, color: Colors.secondaryLabel, textAlign: 'center' },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.systemGray6,
    borderRadius: 10,
    padding: 3,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: Colors.systemBackground, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '500', color: Colors.secondaryLabel },
  toggleTextActive: { color: Colors.label, fontWeight: '600' },

  form: { gap: 20, marginBottom: 32 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    height: 50,
    backgroundColor: Colors.secondarySystemBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.label,
  },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCode: {
    height: 50,
    backgroundColor: Colors.secondarySystemBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  countryCodeText: { fontSize: 16 },
  phoneInput: { flex: 1 },

  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.secondarySystemBackground,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleBtnActive: { borderColor: Colors.systemBlue, backgroundColor: `${Colors.systemBlue}0D` },
  roleEmoji: { fontSize: 28 },
  roleText: { fontSize: 13, fontWeight: '500', color: Colors.secondaryLabel, textAlign: 'center' },
  roleTextActive: { color: Colors.systemBlue, fontWeight: '600' },

  cta: { marginBottom: 16 },
  disclaimer: { fontSize: 12, color: Colors.tertiaryLabel, textAlign: 'center', lineHeight: 18 },
});
