import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  apiGetPSWDetail,
  apiApprovePSW,
  apiRejectPSW,
  apiVerifyDocument,
  apiTogglePoliceCheck,
  PSWEntry,
} from '../../api/client';
import { Colors } from '../../utils/colors';

// ── Doc type icons ─────────────────────────────────────────────────────────────
const DOC_ICONS: Record<string, string> = {
  police_check:    '🛡️',
  psw_certificate: '🏅',
  first_aid:       '🚑',
  drivers_license: '🚗',
  id_card:         '🪪',
  insurance:       '📄',
};

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function AdminPSWDetailScreen() {
  const nav    = useNavigation<any>();
  const route  = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { pswId } = route.params as { pswId: string };

  const [psw,      setPSW]      = useState<PSWEntry | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    try {
      const { psw: data } = await apiGetPSWDetail(pswId);
      setPSW(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const isApproved      = psw?.profile?.approvedByAdmin ?? false;
  const policeCleared   = psw?.profile?.policeCheckCleared ?? false;
  const docs            = psw?.profile?.submittedDocuments ?? [];
  const verifiedDocCount = docs.filter(d => d.verifiedByAdmin).length;

  async function handleApprove() {
    const doIt = async () => {
      setActingOn('approve');
      try {
        await apiApprovePSW(pswId);
        await load();
      } catch (e: any) {
        const msg = e.message || 'Could not approve';
        if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
      }
      setActingOn(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Approve ${psw?.name} as a verified PSW?`)) doIt();
    } else {
      Alert.alert('Approve PSW', `Approve ${psw?.name} as a verified PSW?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doIt },
      ]);
    }
  }

  async function handleReject() {
    const doIt = async () => {
      setActingOn('reject');
      try {
        await apiRejectPSW(pswId);
        await load();
      } catch (e: any) {
        const msg = e.message || 'Could not reject';
        if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
      }
      setActingOn(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Reject / revoke ${psw?.name}?`)) doIt();
    } else {
      Alert.alert('Reject PSW', `Remove approval for ${psw?.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: doIt },
      ]);
    }
  }

  async function handleVerifyDoc(docType: string, verified: boolean) {
    setActingOn(`doc_${docType}`);
    try {
      await apiVerifyDocument(pswId, { docType, verified });
      await load();
    } catch (e: any) {
      const msg = e.message || 'Could not update';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
    }
    setActingOn(null);
  }

  async function handlePoliceCheck(cleared: boolean) {
    setActingOn('police');
    try {
      await apiTogglePoliceCheck(pswId, cleared);
      await load();
    } catch (e: any) {
      const msg = e.message || 'Could not update';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
    }
    setActingOn(null);
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.systemPurple} />
      </View>
    );
  }

  if (!psw) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>PSW not found</Text>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnFallbackText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const initial = psw.name?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#6D28D9']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>← Workers</Text>
        </Pressable>

        <View style={styles.heroRow}>
          <View style={styles.heroAvatar}>
            {psw.profile?.photoUrl ? (
              <Image source={{ uri: psw.profile.photoUrl }} style={styles.heroAvatarImg} />
            ) : (
              <Text style={styles.heroAvatarText}>{initial}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{psw.name}</Text>
            <Text style={styles.heroPhone}>{psw.phone}</Text>
            {(psw.ratingCount ?? 0) > 0 && (
              <Text style={styles.heroRating}>⭐ {psw.rating?.toFixed(1)} ({psw.ratingCount} ratings)</Text>
            )}
          </View>
          <View style={[styles.statusPill, { backgroundColor: isApproved ? '#16A34A' : '#EA580C' }]}>
            <Text style={styles.statusPillText}>{isApproved ? '✓ Approved' : '⏳ Pending'}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{docs.length}</Text>
            <Text style={styles.statLabel}>Docs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{verifiedDocCount}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{policeCleared ? '✅' : '⏳'}</Text>
            <Text style={styles.statLabel}>Police</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Approve / Reject actions ──────────────────────────────── */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.approveBtn, isApproved && styles.approveBtnDone, actingOn === 'approve' && { opacity: 0.7 }]}
            onPress={handleApprove}
            disabled={actingOn !== null}
          >
            {actingOn === 'approve' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveBtnText}>{isApproved ? '✓ Approved' : '✅ Approve PSW'}</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.rejectBtn, actingOn === 'reject' && { opacity: 0.7 }]}
            onPress={handleReject}
            disabled={actingOn !== null}
          >
            {actingOn === 'reject' ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <Text style={styles.rejectBtnText}>{isApproved ? '✗ Revoke' : '✗ Reject'}</Text>
            )}
          </Pressable>
        </View>

        {/* ── Credential info ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credentials</Text>
          <View style={styles.card}>
            <InfoRow icon="🏅" label="Qualification" value={psw.profile?.qualificationType ?? 'PSW'} />
            {psw.profile?.experienceYears ? (
              <>
                <Divider />
                <InfoRow icon="📅" label="Experience" value={`${psw.profile.experienceYears} years`} />
              </>
            ) : null}
            {(psw.profile?.languages?.length ?? 0) > 0 && (
              <>
                <Divider />
                <InfoRow icon="🌐" label="Languages" value={psw.profile!.languages!.join(', ')} />
              </>
            )}
            {psw.profile?.firstAidCertified && (
              <>
                <Divider />
                <InfoRow icon="🚑" label="First Aid" value="Certified" />
              </>
            )}
            {psw.profile?.ownTransportation && (
              <>
                <Divider />
                <InfoRow icon="🚗" label="Transport" value="Own vehicle" />
              </>
            )}
          </View>
        </View>

        {/* ── Police Check toggle ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Police Check</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🛡️</Text>
                <View>
                  <Text style={styles.toggleLabel}>Police Check Cleared</Text>
                  <Text style={styles.toggleSub}>RCMP / OPP criminal record check</Text>
                </View>
              </View>
              <Pressable
                style={[
                  styles.togglePill,
                  policeCleared ? styles.togglePillOn : styles.togglePillOff,
                  actingOn === 'police' && { opacity: 0.7 },
                ]}
                onPress={() => handlePoliceCheck(!policeCleared)}
                disabled={actingOn !== null}
              >
                {actingOn === 'police' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.togglePillText}>{policeCleared ? '✓ Cleared' : 'Not Cleared'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Submitted Documents ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Submitted Documents ({docs.length}){' '}
            {verifiedDocCount > 0 && `· ${verifiedDocCount} verified`}
          </Text>

          {docs.length === 0 ? (
            <View style={styles.emptyDocsCard}>
              <Text style={styles.emptyDocsIcon}>📭</Text>
              <Text style={styles.emptyDocsText}>No documents submitted yet</Text>
              <Text style={styles.emptyDocsSub}>The PSW has not uploaded any documents from the app</Text>
            </View>
          ) : (
            docs.map(doc => {
              const isVerified = doc.verifiedByAdmin;
              const actionKey  = `doc_${doc.docType}`;
              return (
                <View key={doc.docType} style={[styles.docCard, isVerified && styles.docCardVerified]}>
                  <View style={styles.docCardHeader}>
                    <Text style={styles.docCardIcon}>{DOC_ICONS[doc.docType] ?? '📄'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docCardLabel}>{doc.label || doc.docType}</Text>
                      <Text style={styles.docCardDate}>
                        Submitted {new Date(doc.submittedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      {isVerified && doc.verifiedAt && (
                        <Text style={styles.docVerifiedDate}>
                          ✅ Verified {new Date(doc.verifiedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.docStatusBadge, { backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
                      <Text style={[styles.docStatusText, { color: isVerified ? '#16A34A' : '#92400E' }]}>
                        {isVerified ? '✓ Verified' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Document image preview */}
                  {doc.dataUrl ? (
                    <View style={styles.docImageWrap}>
                      <Image source={{ uri: doc.dataUrl }} style={styles.docImage} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={styles.docNoImageWrap}>
                      <Text style={styles.docNoImageText}>No image preview available</Text>
                    </View>
                  )}

                  {/* Verify / Reject buttons */}
                  <View style={styles.docActions}>
                    {!isVerified ? (
                      <Pressable
                        style={[styles.verifyBtn, actingOn === actionKey && { opacity: 0.7 }]}
                        onPress={() => handleVerifyDoc(doc.docType, true)}
                        disabled={actingOn !== null}
                      >
                        {actingOn === actionKey ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.verifyBtnText}>✅ Verify Document</Text>
                        )}
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.unverifyBtn, actingOn === actionKey && { opacity: 0.7 }]}
                        onPress={() => handleVerifyDoc(doc.docType, false)}
                        disabled={actingOn !== null}
                      >
                        <Text style={styles.unverifyBtnText}>✗ Mark Unverified</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Specialties & Bio ─────────────────────────────────────── */}
        {((psw.profile?.specialties?.length ?? 0) > 0 || psw.profile?.bio) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              {psw.profile?.bio ? (
                <Text style={styles.bioText}>{psw.profile.bio}</Text>
              ) : null}
              {(psw.profile?.specialties?.length ?? 0) > 0 && (
                <View style={[styles.chipsWrap, psw.profile?.bio ? { marginTop: 12 } : {}]}>
                  {psw.profile!.specialties!.map(s => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.secondaryLabel, marginBottom: 16 },
  backBtnFallback: { backgroundColor: Colors.systemBlue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnFallbackText: { color: '#fff', fontWeight: '700' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  heroAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  heroAvatarImg: { width: 60, height: 60, borderRadius: 30 },
  heroAvatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  heroPhone: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  heroRating: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 4 },
  approveBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  approveBtnDone: { backgroundColor: '#16A34A' },
  approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 2, borderColor: '#FCA5A5',
  },
  rejectBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },

  // Section
  body: { padding: 16, gap: 0 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },

  // InfoRow
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 16, width: 22 },
  infoLabel: { flex: 1, fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right' },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { fontSize: 24 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleSub: { fontSize: 12, color: '#888', marginTop: 1 },
  togglePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, minWidth: 100, alignItems: 'center' },
  togglePillOn: { backgroundColor: '#059669' },
  togglePillOff: { backgroundColor: '#6B7280' },
  togglePillText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Document cards
  emptyDocsCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  emptyDocsIcon: { fontSize: 40, marginBottom: 12 },
  emptyDocsText: { fontSize: 16, fontWeight: '700', color: Colors.label, marginBottom: 6 },
  emptyDocsSub: { fontSize: 13, color: Colors.secondaryLabel, textAlign: 'center', lineHeight: 19 },

  docCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  docCardVerified: { borderColor: '#A7F3D0' },
  docCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  docCardIcon: { fontSize: 28, marginTop: 2 },
  docCardLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  docCardDate: { fontSize: 12, color: '#6B7280' },
  docVerifiedDate: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2 },
  docStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  docStatusText: { fontSize: 12, fontWeight: '700' },

  docImageWrap: {
    height: 180, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#F9FAFB', marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  docImage: { width: '100%', height: '100%' },
  docNoImageWrap: {
    height: 80, borderRadius: 12,
    backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  docNoImageText: { fontSize: 13, color: '#9CA3AF' },

  docActions: { flexDirection: 'row', gap: 10 },
  verifyBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  verifyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  unverifyBtn: {
    flex: 1, backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FED7AA',
  },
  unverifyBtnText: { color: '#EA580C', fontSize: 14, fontWeight: '700' },

  // About
  bioText: { fontSize: 14, color: '#374151', lineHeight: 21 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
});
