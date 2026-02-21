import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../utils/colors';
import { IOSButton } from '../../components/IOSButton';

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  CUSTOMER: { label: 'Client',         icon: '🏥', color: Colors.systemBlue },
  PSW:      { label: 'PSW Worker',     icon: '🧑‍⚕️', color: Colors.onlineGreen },
  ADMIN:    { label: 'Administrator',  icon: '⚙️', color: Colors.systemPurple },
};

interface InfoRowProps {
  label: string;
  value: string;
  icon?: string;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        {icon && <Text style={styles.infoRowIcon}>{icon}</Text>}
        <Text style={styles.infoRowLabel}>{label}</Text>
      </View>
      <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const roleConfig = ROLE_CONFIG[user?.role ?? ''] ?? { label: user?.role ?? '', icon: '👤', color: Colors.systemGray };
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
        setPhotoUri(result.assets[0].uri);
        // TODO: upload to backend via apiUpdateProfile({ photoUrl: uploadedUrl })
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
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  }

  function showPhotoOptions() {
    Alert.alert('Profile Photo', 'Choose how to update your photo', [
      { text: '📷 Take Photo', onPress: takePhoto },
      { text: '🖼 Choose from Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to sign out of CareNearby?')) {
        signOut();
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of CareNearby?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ],
    );
  }

  function contactSupport() {
    Linking.openURL('mailto:support@carenearby.ca?subject=CareNearby Support');
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[Colors.heroNavy, Colors.heroNavyLight]}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        {/* Avatar */}
        <Pressable style={styles.avatarWrap} onPress={showPhotoOptions}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>📷</Text>
          </View>
        </Pressable>

        <Text style={styles.heroName}>{user?.name ?? '—'}</Text>

        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '30', borderColor: roleConfig.color + '60' }]}>
          <Text style={styles.roleBadgeIcon}>{roleConfig.icon}</Text>
          <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>

        <Text style={styles.heroLocation}>📍 Greater Sudbury, ON</Text>
      </LinearGradient>

      {/* Account Info */}
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

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.card}>
          <InfoRow label="Version" value={`v${appVersion}`} icon="📦" />
          <View style={styles.divider} />
          <InfoRow label="Region" value="Greater Sudbury, ON 🇨🇦" icon="🗺️" />
          <View style={styles.divider} />
          <InfoRow label="Coverage" value="15 km radius" icon="📍" />
          <View style={styles.divider} />
          <InfoRow label="Rate" value="$25/hr · 3hr minimum" icon="💰" />
          <View style={styles.divider} />
          <Pressable style={styles.infoRow} onPress={contactSupport}>
            <View style={styles.infoRowLeft}>
              <Text style={styles.infoRowIcon}>✉️</Text>
              <Text style={styles.infoRowLabel}>Support</Text>
            </View>
            <Text style={[styles.infoRowValue, { color: Colors.systemBlue }]}>support@carenearby.ca</Text>
          </Pressable>
        </View>
      </View>

      {/* Trust Info (Customer only) */}
      {user?.role === 'CUSTOMER' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our PSW Standards</Text>
          <View style={styles.card}>
            {[
              { icon: '✓', label: 'Police Checked', desc: 'All PSWs pass a criminal record check' },
              { icon: '✓', label: 'ID Verified', desc: 'Government-issued ID confirmed' },
              { icon: '✓', label: 'Admin Approved', desc: 'Manually reviewed by our team' },
              { icon: '✓', label: 'Insured', desc: 'Liability coverage on all sessions' },
            ].map((t, i) => (
              <View key={t.label}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.trustRow}>
                  <View style={styles.trustCheck}>
                    <Text style={styles.trustCheckText}>{t.icon}</Text>
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

      {/* Sign Out */}
      <View style={styles.section}>
        <IOSButton
          title="Sign Out"
          variant="destructive"
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.footer}>
        © {new Date().getFullYear()} CareNearby · Private pay PSW platform{'\n'}Greater Sudbury, Ontario
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 28 },
  avatarWrap: { marginBottom: 16, position: 'relative' },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '800' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.heroNavy,
  },
  editBadgeText: { fontSize: 12 },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 10,
  },
  roleBadgeIcon: { fontSize: 16 },
  roleBadgeText: { fontSize: 14, fontWeight: '700' },
  heroLocation: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4, marginBottom: 8, marginTop: 20 },
  card: { backgroundColor: Colors.systemBackground, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  divider: { height: 1, backgroundColor: Colors.separator, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRowIcon: { fontSize: 16 },
  infoRowLabel: { fontSize: 14, color: Colors.secondaryLabel },
  infoRowValue: { fontSize: 14, fontWeight: '600', color: Colors.label, flex: 1, textAlign: 'right', marginLeft: 8 },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trustCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  trustCheckText: { fontSize: 14, color: Colors.trustGreen, fontWeight: '700' },
  trustLabel: { fontSize: 14, fontWeight: '700', color: Colors.label, marginBottom: 2 },
  trustDesc: { fontSize: 12, color: Colors.secondaryLabel },
  footer: { textAlign: 'center', fontSize: 12, color: Colors.tertiaryLabel, marginTop: 24, marginHorizontal: 20, lineHeight: 18 },
});
