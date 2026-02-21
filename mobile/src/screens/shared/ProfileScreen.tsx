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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { apiGetProfile, UserProfile } from '../../api/client';
import { Storage } from '../../utils/storage';

function Divider() {
  return <View style={styles.divider} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon, label, value, onPress, valueColor,
}: { icon: string; label: string; value: string; onPress?: () => void; valueColor?: string }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>
          {value}
        </Text>
        {onPress && <Text style={styles.rowChevron}>›</Text>}
      </View>
    </Wrap>
  );
}

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const isCustomer = user?.role === 'CUSTOMER';
  const isPSW = user?.role === 'PSW';

  useEffect(() => {
    Storage.getPhotoUri().then(uri => { if (uri) setPhotoUri(uri); });
    apiGetProfile().then(res => setProfile(res.user)).catch(() => {});
  }, []);

  async function pickPhoto() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Needed', 'Please allow photo access in Settings.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await Storage.savePhotoUri(uri);
      }
    } catch {}
  }

  function showPhotoOptions() {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: '🖼 Choose from Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of CareNearby?')) signOut();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const pswP = profile?.pswProfile;
  const roleColor = isCustomer ? '#007AFF' : isPSW ? '#34C759' : '#5856D6';
  const roleLabel = isCustomer ? 'Client' : isPSW ? 'PSW Professional' : 'Administrator';
  const roleIcon = isCustomer ? '🛡️' : isPSW ? '💼' : '⚙️';
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const accountId = user?.id ? `CN-${user.id.slice(-6).toUpperCase()}` : '—';
  const approvalStatus = pswP?.approvedByAdmin ? 'Approved ✅' : 'Pending Review ⏳';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.avatarWrap} onPress={showPhotoOptions}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: roleColor }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </Pressable>

          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <View style={[styles.rolePill, { backgroundColor: roleColor + '18', borderColor: roleColor + '40' }]}>
            <Text style={styles.rolePillIcon}>{roleIcon}</Text>
            <Text style={[styles.rolePillText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
          <Text style={styles.location}>📍 Greater Sudbury, ON</Text>
        </View>

        {/* ── Account ─────────────────────────────────────────────── */}
        <Section title="Account">
          <Row icon="📱" label="Phone" value={user?.phone ?? '—'} />
          <Divider />
          <Row icon="🔑" label="Account ID" value={accountId} />
          <Divider />
          <Row icon="✅" label="Verification" value="Phone Verified" valueColor="#34C759" />
        </Section>

        {/* ── PSW: Credentials ────────────────────────────────────── */}
        {isPSW && (
          <Section title="Credentials">
            <Row icon="🏅" label="Status" value={approvalStatus} />
            {pswP?.experienceYears != null && pswP.experienceYears > 0 && (
              <>
                <Divider />
                <Row icon="📅" label="Experience" value={`${pswP.experienceYears} years`} />
              </>
            )}
            {(pswP?.languages?.length ?? 0) > 0 && (
              <>
                <Divider />
                <Row icon="🌐" label="Languages" value={pswP!.languages!.join(', ')} />
              </>
            )}
            {(pswP?.certifications?.length ?? 0) > 0 && (
              <>
                <Divider />
                <Row icon="🚑" label="First Aid" value={pswP!.certifications!.includes('firstAid') ? 'Certified' : '—'} />
              </>
            )}
          </Section>
        )}

        {/* ── PSW: Rate Info ───────────────────────────────────────── */}
        {isPSW && (
          <Section title="Rate Info">
            <Row icon="💵" label="Hourly Rate" value="$25 / hour" />
            <Divider />
            <Row icon="⏱" label="Minimum Session" value="3 hours ($75 min.)" />
          </Section>
        )}

        {/* ── Customer: Trust ──────────────────────────────────────── */}
        {isCustomer && (
          <Section title="About CareNearby">
            <Row icon="🛡️" label="All PSWs" value="Police checked" />
            <Divider />
            <Row icon="✅" label="ID Verification" value="Government ID confirmed" />
            <Divider />
            <Row icon="💳" label="Payment" value="Private pay (cash / e-Transfer)" />
            <Divider />
            <Row icon="⭐" label="Ratings" value="1–5 stars after every session" />
          </Section>
        )}

        {/* ── Help ─────────────────────────────────────────────────── */}
        <Section title="Help">
          <Pressable style={styles.helpRow} onPress={() => nav.navigate('Help')}>
            <Text style={styles.helpRowIcon}>📖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.helpRowTitle}>Help & Documentation</Text>
              <Text style={styles.helpRowSub}>Platform guide, booking help, PSW verification</Text>
            </View>
            <Text style={styles.helpRowArrow}>›</Text>
          </Pressable>
        </Section>

        {/* ── App Info ─────────────────────────────────────────────── */}
        <Section title="App Info">
          <Row icon="📦" label="Version" value={`v${appVersion}`} />
          <Divider />
          <Row icon="📍" label="Region" value="Greater Sudbury, ON 🇨🇦" />
          <Divider />
          <Row
            icon="✉️" label="Support" value="support@carenearby.ca"
            valueColor="#007AFF"
            onPress={() => Linking.openURL('mailto:support@carenearby.ca')}
          />
        </Section>

        {/* ── Sign Out ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} CareNearby · Greater Sudbury, ON</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  // Header
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 20,
  },
  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: '#E5E5EA' },
  avatarCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 38, fontWeight: '700' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
  },
  editBadgeText: { fontSize: 13, color: '#555' },
  name: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 8 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 8,
  },
  rolePillIcon: { fontSize: 13 },
  rolePillText: { fontSize: 13, fontWeight: '600' },
  location: { fontSize: 13, color: '#888' },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 6, marginTop: 16, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  divider: { height: 1, backgroundColor: '#F2F2F7' },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  rowLabel: { fontSize: 15, color: '#555' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#000', textAlign: 'right', maxWidth: 180 },
  rowChevron: { fontSize: 20, color: '#C7C7CC' },

  // Help row
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  helpRowIcon: { fontSize: 22 },
  helpRowTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  helpRowSub: { fontSize: 12, color: '#888' },
  helpRowArrow: { fontSize: 20, color: '#C7C7CC' },

  // Sign out
  signOutBtn: {
    marginTop: 8, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#FF3B30',
    paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },

  footer: { textAlign: 'center', fontSize: 11, color: '#C7C7CC', marginTop: 16, marginBottom: 8 },
});
