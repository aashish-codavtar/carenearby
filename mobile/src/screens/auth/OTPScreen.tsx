import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiLogin, apiVerify } from '../../api/client';
import { IOSButton } from '../../components/IOSButton';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParams } from '../../navigation/AuthNavigator';
import { StoredUser } from '../../utils/storage';
import { Colors } from '../../utils/colors';

type Props = NativeStackScreenProps<AuthStackParams, 'OTP'>;

const OTP_LENGTH = 6;

export function OTPScreen({ route, navigation }: Props) {
  const { phone, isNewUser, role } = route.params;
  const { signIn } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  function handleDigit(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!isComplete) return;
    setLoading(true);
    try {
      const { token, user } = await apiVerify({ phone, otp });
      const stored: StoredUser = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role as StoredUser['role'],
      };
      await signIn(token, stored);
    } catch (e: any) {
      Alert.alert('Invalid Code', e.message ?? 'The code you entered is incorrect.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await apiLogin({ phone, ...(isNewUser ? { role } : {}) });
      setResendTimer(30);
      Alert.alert('Code Sent', 'A new code has been sent to your phone.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not resend code.');
    }
  }

  const maskedPhone = phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>📱</Text>
            </View>
            <Text style={styles.title}>Enter Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP Boxes */}
          <View style={styles.boxRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[styles.box, digit ? styles.boxFilled : null]}
                value={digit}
                onChangeText={(t) => handleDigit(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
                textContentType="oneTimeCode"
              />
            ))}
          </View>

          <IOSButton
            title="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={!isComplete}
            style={styles.cta}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Resend code in <Text style={styles.resendCount}>{resendTimer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend Code</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>💡 Check the API server logs for the OTP in dev mode.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemBackground },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },

  back: { marginBottom: 24 },
  backText: { fontSize: 17, color: Colors.systemBlue },

  header: { alignItems: 'center', marginBottom: 40 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: `${Colors.systemBlue}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.label, marginBottom: 10 },
  subtitle: { fontSize: 15, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 22 },
  phoneHighlight: { fontWeight: '600', color: Colors.label },

  boxRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 36 },
  box: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: Colors.secondarySystemBackground,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.label,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boxFilled: {
    borderColor: Colors.systemBlue,
    backgroundColor: `${Colors.systemBlue}0D`,
  },

  cta: { marginBottom: 24 },

  resendRow: { alignItems: 'center', marginBottom: 32 },
  resendTimer: { fontSize: 15, color: Colors.secondaryLabel },
  resendCount: { fontWeight: '600', color: Colors.label },
  resendLink: { fontSize: 15, color: Colors.systemBlue, fontWeight: '500' },

  hint: {
    fontSize: 12,
    color: Colors.tertiaryLabel,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
