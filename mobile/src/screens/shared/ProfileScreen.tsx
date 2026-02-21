import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../utils/colors';
import { Storage } from '../../utils/storage';

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  CUSTOMER: { label: 'Client',           icon: '🛡️', color: '#007AFF' },
  PSW:      { label: 'PSW Professional', icon: '💼', color: '#34C759' },
  ADMIN:    { label: 'Administrator',    icon: '⚙️', color: '#5856D6' },
};

interface InfoRowProps {
  label: string;
  value: string;
  icon?: string;
  onPress?: () => void;
  valueColor?: string;
}

function InfoRow({ label, value, icon, onPress, valueColor }: InfoRowProps) {
  const Row = onPress ? Pressable : View;
  return (
    <Row style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoRowLeft}>
        {icon && <Text style={styles.infoRowIcon}>{icon}</Text>}
        <Text style={styles.infoRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoRowValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>
        {value}
      </Text>
      {onPress && <Text style={styles.infoRowChevron}>›</Text>}
    </Row>
  );
}

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<any>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const roleConfig = ROLE_CONFIG[user?.role ?? ''] ?? { label: user?.role ?? '', icon: '👤', color: '#8E8E93' };
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Load persisted photo on mount
  useEffect(() => {
    Storage.getPhotoUri().then(uri => { if (uri) setPhotoUri(uri); });
  }, []);

  async function pickPhoto() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo access in Settings to upload a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await Storage.savePhotoUri(uri);
      }
    } catch {}
  }

  async function takePhoto() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow camera access in Settings to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await Storage.savePhotoUri(uri);
      }
    } catch {}
  }

  function showPhotoOptions() {
    if (Platform.OS === 'web') {
      pickPhoto();
      return;
    }
    Alert.alert('Profile Photo', 'Choose how to update your photo', [
      { text: '📷 Take Photo', onPress: takePhoto },
      { text: '🖼 Choose from Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) signOut();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <Pressable style={styles.avatarWrap} onPress={showPhotoOptions}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View>
        </Pressable>

        <Text style={styles.heroName}>{user?.name ?? '—'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20', borderColor: roleConfig.color + '40' }]}>
          <Text style={styles.roleBadgeIcon}>{roleConfig.icon}</Text>
          <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>
        <Text style={styles.heroLocation}>📍 Greater Sudbury, ON</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <InfoRow label="Phone" value={user?.phone ?? '—'} icon="📱" />
            <View style={styles.divider} />
            <InfoRow label="Account ID" value={user?.id ? `CN-${user.id.slice(-6).toUpperCase()}` : '—'} icon="🔑" />
            <View style={styles.divider} />
            <InfoRow label="Role" value={roleConfig.label} icon={roleConfig.icon} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <View style={styles.card}>
            <InfoRow label="Version" value={`v${appVersion}`} icon="📦" />
            <View style={styles.divider} />
            <InfoRow label="Region" value="Greater Sudbury, ON 🇨🇦" icon="🗺️" />
            <View style={styles.divider} />
            <InfoRow label="Coverage" value="15 km radius" icon="📍" />
            <View style={styles.divider} />
            <InfoRow label="Rate" value="$25/hr · 3hr minimum" icon="💳" />
            <View style={styles.divider} />
            <InfoRow
              label="Support"
              value="support@carenearby.ca"
              icon="✉️"
              onPress={() => Linking.openURL('mailto:support@carenearby.ca?subject=CareNearby Support')}
              valueColor="#007AFF"
            />
          </View>
        </View>

        {/* Help & Documentation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
              onPress={() => nav.navigate('Help')}
            >
              <View style={styles.infoRowLeft}>
                <Text style={styles.infoRowIcon}>📖</Text>
                <View>
                  <Text style={[styles.infoRowLabel, { color: '#000', fontWeight: '600' }]}>Help & Documentation</Text>
                  <Text style={styles.helpSubtext}>Features, booking guide, verification</Text>
                </View>
              </View>
              <Text style={styles.infoRowChevron}>›</Text>
            </Pressable>
          </View>
        </View>

        {user?.role === 'CUSTOMER' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trust & Safety</Text>
            <View style={styles.card}>
              {[
                { icon: '🛡️', label: 'Police Checked',  desc: 'All PSWs pass criminal record check' },
                { icon: '✅', label: 'ID Verified',      desc: 'Government-issued ID confirmed' },
                { icon: '👮', label: 'Admin Approved',   desc: 'Manually reviewed by our team' },
                { icon: '💰', label: 'Secure Payments',  desc: 'Protected payment processing' },
              ].map((t, i) => (
                <View key={t.label}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.trustRow}>
                    <View style={styles.trustIconWrap}>
                      <Text style={styles.trustIcon}>{t.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trustLabel}>{t.label}</Text>
                      <Text style={styles.trustDesc}>{t.desc}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} CareNearby{'\n'}
          Professional PSW Services in Greater Sudbury
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 28 },
  avatarWrap: { marginBottom: 16, position: 'relative' },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '700' },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  editBadgeText: { fontSize: 13, color: '#000' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: { fontSize: 13, fontWeight: '600' },
  heroLocation: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#666',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 4, marginBottom: 8, marginTop: 20,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoRowIcon: { fontSize: 16 },
  infoRowLabel: { fontSize: 14, color: '#666' },
  infoRowValue: { fontSize: 14, fontWeight: '500', color: '#000', textAlign: 'right', marginLeft: 8 },
  infoRowChevron: { fontSize: 20, color: '#ccc', marginLeft: 4 },
  helpSubtext: { fontSize: 11, color: '#999', marginTop: 1 },

  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trustIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  trustIcon: { fontSize: 16 },
  trustLabel: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 2 },
  trustDesc: { fontSize: 12, color: '#666' },

  signOutButton: {
    marginTop: 8, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff3b30',
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  signOutButtonPressed: { backgroundColor: '#FFF5F5' },
  signOutButtonText: { color: '#ff3b30', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 11, color: '#999', marginTop: 24, marginHorizontal: 20, lineHeight: 16 },
});
