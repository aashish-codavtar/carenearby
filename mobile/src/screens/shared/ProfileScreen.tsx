import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGetProfile, apiSetAvailability } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../utils/colors';

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  PSW: 'Personal Support Worker',
  ADMIN: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: Colors.systemBlue,
  PSW: Colors.systemGreen,
  ADMIN: Colors.systemPurple,
};

const ROLE_ICONS: Record<string, string> = {
  CUSTOMER: '👨‍👩‍👧',
  PSW: '🧑‍⚕️',
  ADMIN: '🛡️',
};

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'PSW') {
      apiGetProfile()
        .then(({ pswProfile }) => {
          if (pswProfile != null) setAvailability(pswProfile.availability);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  async function handleAvailabilityToggle(value: boolean) {
    setAvailabilityLoading(true);
    try {
      await apiSetAvailability(value);
      setAvailability(value);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not update availability.');
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const roleColor = ROLE_COLORS[user?.role ?? 'CUSTOMER'];
  const roleIcon = ROLE_ICONS[user?.role ?? 'CUSTOMER'];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}1A` }]}>
            <Text style={styles.roleIcon}>{roleIcon}</Text>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <InfoRow label="Phone" value={user?.phone ?? '—'} icon="📱" />
          <Divider />
          <InfoRow label="Account ID" value={user?.id ? `…${user.id.slice(-8)}` : '—'} icon="🔑" />
          <Divider />
          <InfoRow label="Role" value={ROLE_LABELS[user?.role ?? ''] ?? '—'} icon="👤" />
        </View>

        {/* PSW Availability */}
        {user?.role === 'PSW' && availability !== null && (
          <View style={styles.card}>
            <View style={styles.availabilityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.availabilityLabel}>Available for Jobs</Text>
                <Text style={styles.availabilityHint}>
                  {availability ? 'You appear in nearby job listings' : 'Hidden from job listings'}
                </Text>
              </View>
              <Switch
                value={availability}
                onValueChange={handleAvailabilityToggle}
                disabled={availabilityLoading}
                trackColor={{ false: Colors.systemGray4, true: Colors.systemGreen }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}

        {/* App info */}
        <View style={styles.card}>
          <InfoRow label="App Version" value="1.0.0" icon="📦" />
          <Divider />
          <InfoRow label="Region" value="Sudbury, ON 🇨🇦" icon="📍" />
          <Divider />
          <InfoRow label="Support" value="support@carenearby.ca" icon="💬" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>CareNearby · © 2024 · Sudbury, Ontario</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={infoRowStyles.icon}>{icon}</Text>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={infoRowStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={infoRowStyles.divider} />;
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  icon: { fontSize: 18, width: 26 },
  label: { flex: 1, fontSize: 15, color: Colors.secondaryLabel },
  value: { fontSize: 15, fontWeight: '500', color: Colors.label, maxWidth: '55%', textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.separator },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  pageTitle: { fontSize: 32, fontWeight: '700', color: Colors.label, marginBottom: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.label },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleIcon: { fontSize: 16 },
  roleText: { fontSize: 14, fontWeight: '600' },

  card: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  signOutBtn: {
    backgroundColor: `${Colors.systemRed}15`,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.systemRed },

  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  availabilityLabel: { fontSize: 15, fontWeight: '600', color: Colors.label },
  availabilityHint: { fontSize: 13, color: Colors.secondaryLabel, marginTop: 2 },

  footer: { fontSize: 12, color: Colors.tertiaryLabel, textAlign: 'center' },
});
