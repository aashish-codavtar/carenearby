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
import { apiGetProfile, UserProfile } from '../../api/client';
import { Storage, StoredDocument } from '../../utils/storage';

// ── Verified badge ─────────────────────────────────────────────────────────────
function VerifiedChip({ label }: { label: string }) {
  return (
    <View style={styles.verifiedChip}>
      <Text style={styles.verifiedChipText}>✅ {label}</Text>
    </View>
  );
}

// ── Simple info row ────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, onPress, valueColor,
}: { icon: string; label: string; value: string; onPress?: () => void; valueColor?: string }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoLeft}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>
          {value}
        </Text>
        {onPress && <Text style={styles.infoChevron}>›</Text>}
      </View>
    </Wrap>
  );
}

// ── Status chip ────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const config = {
    pending:  { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', label: '⏳ Pending Review' },
    approved: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: '✅ Approved' },
    rejected: { bg: '#FFF1F2', border: '#FECDD3', text: '#DC2626', label: '❌ Not Approved' },
  }[status];
  return (
    <View style={[styles.statusChip, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.statusChipText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

// ── Document types PSWs can upload ────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'police_check',   label: 'Police Check',          icon: '🛡️' },
  { id: 'first_aid',      label: 'First Aid Certificate', icon: '🚑' },
  { id: 'psw_certificate', label: 'PSW Certificate',      icon: '🏅' },
  { id: 'drivers_license', label: "Driver's Licence",     icon: '🚗' },
  { id: 'id_card',        label: 'Government ID',         icon: '🪪' },
];

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<any>();

  const [photoUri,  setPhotoUri]  = useState<string | null>(null);
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const isCustomer = user?.role === 'CUSTOMER';
  const isPSW      = user?.role === 'PSW';

  useEffect(() => {
    Storage.getPhotoUri().then(uri => { if (uri) setPhotoUri(uri); });
    apiGetProfile().then(res => setProfile(res.user)).catch(() => {});
    Storage.getDocuments().then(setDocuments);
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

  async function takePhoto() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Needed', 'Please allow camera access in Settings.'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await Storage.savePhotoUri(uri);
      }
    } catch {}
  }

  function showPhotoOptions() {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    Alert.alert('Profile Photo', 'How would you like to update your photo?', [
      { text: '📷 Take Photo', onPress: takePhoto },
      { text: '🖼 Choose from Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function uploadDocument(docType: typeof DOC_TYPES[0]) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Needed', 'Please allow photo access in Settings.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        const doc: StoredDocument = {
          id: docType.id,
          label: docType.label,
          uri: result.assets[0].uri,
          uploadedAt: new Date().toISOString(),
        };
        await Storage.saveDocument(doc);
        setDocuments(await Storage.getDocuments());
        Alert.alert('Uploaded ✅', `${docType.label} saved. Our team will review it shortly.`);
      }
    } catch {}
  }

  function removeDocument(id: string, label: string) {
    const doRemove = async () => {
      await Storage.removeDocument(id);
      setDocuments(await Storage.getDocuments());
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${label}?`)) doRemove();
    } else {
      Alert.alert('Remove Document', `Remove ${label}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of CareNearby?')) signOut();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const pswP = profile?.pswProfile;
  const approvalStatus: 'pending' | 'approved' | 'rejected' =
    !pswP ? 'pending' : pswP.approvedByAdmin ? 'approved' : 'pending';

  const roleLabel = isCustomer ? 'Client' : isPSW ? 'PSW Professional' : 'Administrator';
  const roleColor = isCustomer ? '#007AFF' : isPSW ? '#34C759' : '#5856D6';
  const roleIcon  = isCustomer ? '🛡️' : isPSW ? '💼' : '⚙️';
  const initial   = user?.name?.[0]?.toUpperCase() ?? '?';
  const accountId = user?.id ? `CN-${user.id.slice(-6).toUpperCase()}` : '—';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0A1628', '#0D2042', '#1a1a2e']}
          style={[styles.hero, { paddingTop: insets.top + 24 }]}
        >
          <Pressable style={styles.avatarWrap} onPress={showPhotoOptions}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={[roleColor, roleColor + 'CC']} style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </Pressable>

          <Text style={styles.heroName}>{user?.name ?? '—'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor + '55' }]}>
            <Text style={styles.roleBadgeIcon}>{roleIcon}</Text>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            {isPSW && pswP?.approvedByAdmin && (
              <View style={[styles.verifiedDot, { backgroundColor: '#34C759' }]} />
            )}
          </View>
          <Text style={styles.heroLocation}>📍 Greater Sudbury, ON</Text>
          <View style={styles.heroBottom} />
        </LinearGradient>

        {/* ── Account ───────────────────────────────────────────────── */}
        <Section title="Account">
          <InfoRow icon="📱" label="Phone" value={user?.phone ?? '—'} />
          <View style={styles.verifiedRow}><VerifiedChip label="OTP Verified" /></View>
          <Divider />
          <InfoRow icon="🔑" label="Account ID" value={accountId} />
          <Divider />
          <InfoRow icon={roleIcon} label="Role" value={roleLabel} />
        </Section>

        {/* ── PSW: Professional Verification ───────────────────────── */}
        {isPSW && (
          <Section title="Professional Verification">
            <View style={styles.approvalRow}><StatusChip status={approvalStatus} /></View>
            {pswP ? (
              <>
                <Divider />
                {pswP.experienceYears > 0 && (
                  <>
                    <InfoRow icon="🏅" label="Experience" value={`${pswP.experienceYears} years`} />
                    <Divider />
                  </>
                )}
                {(pswP.languages?.length ?? 0) > 0 && (
                  <>
                    <InfoRow icon="🌐" label="Languages" value={pswP.languages!.join(' · ')} />
                    <Divider />
                  </>
                )}
                {(pswP.specialties?.length ?? 0) > 0 && (
                  <>
                    <View style={styles.specialtiesRow}>
                      <Text style={styles.infoLabel}>🎯 Specialties</Text>
                      <View style={styles.chips}>
                        {pswP.specialties!.slice(0, 4).map(s => (
                          <View key={s} style={styles.chip}>
                            <Text style={styles.chipText}>{s}</Text>
                          </View>
                        ))}
                        {pswP.specialties!.length > 4 && (
                          <View style={styles.chip}>
                            <Text style={styles.chipText}>+{pswP.specialties!.length - 4} more</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Divider />
                  </>
                )}
                <View style={styles.checkGrid}>
                  {[
                    { icon: '🚑', label: 'First Aid',       ok: !!pswP.certifications?.includes('firstAid') },
                    { icon: '🛡️', label: 'Police Check',    ok: !!pswP.policeCheckCleared },
                    { icon: '✅', label: 'ID Verified',      ok: pswP.approvedByAdmin },
                    { icon: '👮', label: 'Admin Approved',   ok: pswP.approvedByAdmin },
                  ].map(item => (
                    <View key={item.label} style={styles.checkCell}>
                      <Text style={styles.checkCellIcon}>{item.icon}</Text>
                      <Text style={[styles.checkCellStatus, { color: item.ok ? '#16A34A' : '#EA580C' }]}>
                        {item.ok ? '✅' : '⏳'}
                      </Text>
                      <Text style={styles.checkCellLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.noProfileNote}>
                <Text style={styles.noProfileText}>Complete your credential onboarding to see verification status.</Text>
              </View>
            )}
          </Section>
        )}

        {/* ── PSW: Documents ─────────────────────────────────────────── */}
        {isPSW && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Documents</Text>
            <View style={[styles.card, { gap: 0 }]}>
              <Text style={styles.docNote}>
                Upload your credentials for admin review. Tap any document to upload or replace.
              </Text>
              {DOC_TYPES.map((docType, idx) => {
                const uploaded = documents.find(d => d.id === docType.id);
                return (
                  <View key={docType.id}>
                    {idx > 0 && <Divider />}
                    <View style={styles.docRow}>
                      <View style={styles.docLeft}>
                        <View style={[styles.docIconWrap, { backgroundColor: uploaded ? '#F0FDF4' : '#F9FAFB', borderColor: uploaded ? '#BBF7D0' : '#E5E7EB' }]}>
                          <Text style={styles.docIcon}>{docType.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docLabel}>{docType.label}</Text>
                          {uploaded ? (
                            <Text style={styles.docDate}>
                              Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          ) : (
                            <Text style={styles.docMissing}>Not uploaded</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.docActions}>
                        {uploaded && (
                          <Pressable
                            style={styles.docRemoveBtn}
                            onPress={() => removeDocument(docType.id, docType.label)}
                          >
                            <Text style={styles.docRemoveText}>✕</Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.docUploadBtn, uploaded ? styles.docUploadBtnDone : styles.docUploadBtnNew]}
                          onPress={() => uploadDocument(docType)}
                        >
                          <Text style={[styles.docUploadText, uploaded ? styles.docUploadTextDone : styles.docUploadTextNew]}>
                            {uploaded ? '↑ Replace' : '↑ Upload'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    {uploaded && (
                      <View style={styles.docPreviewWrap}>
                        <Image source={{ uri: uploaded.uri }} style={styles.docPreview} resizeMode="cover" />
                        <View style={styles.docPreviewBadge}>
                          <Text style={styles.docPreviewBadgeText}>✅ Saved</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── PSW: Earnings ─────────────────────────────────────────── */}
        {isPSW && (
          <Section title="Earnings">
            <View style={styles.earningsCard}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsNum}>$25</Text>
                <Text style={styles.earningsLabel}>Per Hour</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsNum}>3h</Text>
                <Text style={styles.earningsLabel}>Min. Session</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsNum}>$75+</Text>
                <Text style={styles.earningsLabel}>Min. Earn</Text>
              </View>
            </View>
          </Section>
        )}

        {/* ── Customer: Verification ────────────────────────────────── */}
        {isCustomer && (
          <Section title="Account Verification">
            <View style={styles.customerVerification}>
              {[
                { icon: '📱', label: 'Phone\nVerified' },
                { icon: '🔑', label: 'Account\nActive' },
                { icon: '💳', label: 'Private\nPay' },
                { icon: '🛡️', label: 'PSWs\nVerified' },
              ].map(item => (
                <View key={item.label} style={styles.checkCell}>
                  <Text style={styles.checkCellIcon}>{item.icon}</Text>
                  <Text style={[styles.checkCellStatus, { color: '#16A34A' }]}>✅</Text>
                  <Text style={styles.checkCellLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── Customer: Trust & Safety ──────────────────────────────── */}
        {isCustomer && (
          <Section title="Trust & Safety">
            {[
              { icon: '🛡️', label: 'Police Checked',  desc: 'All PSWs pass criminal record check' },
              { icon: '✅', label: 'ID Verified',      desc: 'Government-issued ID confirmed' },
              { icon: '👮', label: 'Admin Approved',   desc: 'Manually reviewed by our team' },
              { icon: '⭐', label: 'Rating System',    desc: '1–5 stars after every session' },
            ].map((t, i) => (
              <View key={t.label}>
                {i > 0 && <Divider />}
                <View style={styles.trustRow}>
                  <View style={styles.trustIconWrap}><Text style={styles.trustIcon}>{t.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trustLabel}>{t.label}</Text>
                    <Text style={styles.trustDesc}>{t.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* ── Help ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help</Text>
          <Pressable
            style={({ pressed }) => [styles.helpCard, pressed && { opacity: 0.8 }]}
            onPress={() => nav.navigate('Help')}
          >
            <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.helpCardGrad}>
              <View style={styles.helpCardLeft}>
                <Text style={styles.helpCardIcon}>📖</Text>
                <View>
                  <Text style={styles.helpCardTitle}>Help & Documentation</Text>
                  <Text style={styles.helpCardSub}>Platform guide · Booking help · PSW verification</Text>
                </View>
              </View>
              <Text style={styles.helpCardArrow}>→</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── App Info ──────────────────────────────────────────────── */}
        <Section title="App Info">
          <InfoRow icon="📦" label="Version" value={`v${appVersion}`} />
          <Divider />
          <InfoRow icon="🗺️" label="Region" value="Greater Sudbury, ON 🇨🇦" />
          <Divider />
          <InfoRow icon="📍" label="Coverage" value="15 km radius" />
          <Divider />
          <InfoRow
            icon="✉️" label="Support" value="support@carenearby.ca"
            valueColor="#007AFF"
            onPress={() => Linking.openURL('mailto:support@carenearby.ca?subject=CareNearby Support')}
          />
        </Section>

        {/* ── Sign Out ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.8 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} CareNearby · Professional PSW Services{'\n'}Greater Sudbury, ON
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  heroBottom: { height: 8 },
  avatarWrap: { marginBottom: 16, position: 'relative' },
  avatarImg: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarCircle: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 40, fontWeight: '800' },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#0A1628',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  editBadgeText: { fontSize: 14, color: '#0A1628' },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 10, letterSpacing: -0.3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginBottom: 10,
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: { fontSize: 13, fontWeight: '700' },
  verifiedDot: { width: 7, height: 7, borderRadius: 4 },
  heroLocation: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 20, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 16 },
  infoLabel: { fontSize: 15, color: '#666' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#000', textAlign: 'right' },
  infoChevron: { fontSize: 20, color: '#ccc' },

  // Verified chip
  verifiedRow: { marginTop: 6 },
  verifiedChip: {
    backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0',
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  verifiedChipText: { fontSize: 13, fontWeight: '600', color: '#16A34A' },

  // Status chip
  approvalRow: { marginBottom: 4 },
  statusChip: {
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  statusChipText: { fontSize: 14, fontWeight: '700' },

  // Specialties
  specialtiesRow: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#1D4ED8' },

  // Check grid
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  customerVerification: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  checkCell: { alignItems: 'center', gap: 4, minWidth: 70 },
  checkCellIcon: { fontSize: 24 },
  checkCellStatus: { fontSize: 16 },
  checkCellLabel: { fontSize: 12, fontWeight: '600', color: '#666', textAlign: 'center' },

  // Documents
  docNote: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 16 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  docIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  docIcon: { fontSize: 22 },
  docLabel: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  docDate: { fontSize: 12, color: '#16A34A', fontWeight: '500' },
  docMissing: { fontSize: 12, color: '#9CA3AF' },
  docActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FECDD3',
  },
  docRemoveText: { fontSize: 11, color: '#DC2626', fontWeight: '700' },
  docUploadBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
    minWidth: 84, alignItems: 'center',
  },
  docUploadBtnNew: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  docUploadBtnDone: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  docUploadText: { fontSize: 13, fontWeight: '700' },
  docUploadTextNew: { color: '#1D4ED8' },
  docUploadTextDone: { color: '#16A34A' },
  docPreviewWrap: { marginTop: 10, marginBottom: 4, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  docPreview: { width: '100%', height: 120, backgroundColor: '#f5f5f5' },
  docPreviewBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  docPreviewBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Earnings
  earningsCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsNum: { fontSize: 26, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  earningsLabel: { fontSize: 12, color: '#888', marginTop: 2, fontWeight: '600' },
  earningsDivider: { width: 1, height: 36, backgroundColor: '#eee' },

  // No profile
  noProfileNote: { paddingVertical: 8 },
  noProfileText: { fontSize: 14, color: '#888', lineHeight: 20 },

  // Trust
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trustIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  trustIcon: { fontSize: 16 },
  trustLabel: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  trustDesc: { fontSize: 13, color: '#666' },

  // Help card
  helpCard: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    marginTop: -2,
  },
  helpCardGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  helpCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  helpCardIcon: { fontSize: 28 },
  helpCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  helpCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  helpCardArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Sign out
  signOutBtn: {
    marginTop: 8, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#FF3B30',
    paddingVertical: 18, alignItems: 'center',
  },
  signOutText: { color: '#FF3B30', fontSize: 17, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 24, marginHorizontal: 20, lineHeight: 16 },
});
