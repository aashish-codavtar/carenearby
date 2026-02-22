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
import { Storage, StoredDocument } from '../../utils/storage';
import { Colors } from '../../utils/colors';

// ── Document types required from PSWs ─────────────────────────────────────────
const DOC_TYPES: {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  required: boolean;
}[] = [
  { id: 'police_check',    label: 'Police Check Clearance',   sublabel: 'RCMP/OPP criminal record check — required', icon: '🛡️', required: true },
  { id: 'psw_certificate', label: 'PSW Certificate',          sublabel: 'Official credential from your college',       icon: '🏅', required: true },
  { id: 'first_aid',       label: 'First Aid / CPR Certificate', sublabel: 'Valid St. John Ambulance or Red Cross cert', icon: '🚑', required: true },
  { id: 'drivers_license', label: "Driver's Licence",         sublabel: 'Ontario G or G2 — both sides',               icon: '🚗', required: false },
  { id: 'id_card',         label: 'Government ID',            sublabel: 'Passport, Ontario Photo Card, or health card', icon: '🪪', required: false },
  { id: 'insurance',       label: 'Liability Insurance',      sublabel: 'Professional liability / E&O if applicable',  icon: '📄', required: false },
];

export function PSWDocumentsScreen() {
  const insets   = useSafeAreaInsets();
  const nav      = useNavigation<any>();
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    Storage.getDocuments().then(setDocs);
    // Check if already submitted
    Storage.getDocuments().then(d => {
      const required = DOC_TYPES.filter(t => t.required);
      const allRequired = required.every(t => d.find(u => u.id === t.id));
      if (allRequired && d.some(dd => (dd as any).submitted)) setSubmitted(true);
    });
  }, []);

  const uploadedCount    = docs.length;
  const requiredDone     = DOC_TYPES.filter(t => t.required && docs.find(d => d.id === t.id)).length;
  const requiredTotal    = DOC_TYPES.filter(t => t.required).length;
  const canSubmit        = requiredDone === requiredTotal;
  const progressPct      = Math.round((requiredDone / requiredTotal) * 100);

  async function uploadDoc(docType: typeof DOC_TYPES[0]) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploading(docType.id);

    const doPickFile = async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow photo access in Settings to upload documents.');
            setUploading(null);
            return;
          }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.92,
        });
        if (!result.canceled && result.assets[0]) {
          const doc: StoredDocument = {
            id: docType.id,
            label: docType.label,
            uri: result.assets[0].uri,
            uploadedAt: new Date().toISOString(),
          };
          await Storage.saveDocument(doc);
          const updated = await Storage.getDocuments();
          setDocs(updated);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
      setUploading(null);
    };

    const existing = docs.find(d => d.id === docType.id);
    if (existing && Platform.OS !== 'web') {
      Alert.alert(
        'Replace Document',
        `You already uploaded ${docType.label}. Replace it?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setUploading(null) },
          { text: 'Replace', onPress: doPickFile },
        ],
      );
    } else {
      await doPickFile();
    }
  }

  async function removeDoc(docId: string, label: string) {
    const doRemove = async () => {
      await Storage.removeDocument(docId);
      setDocs(await Storage.getDocuments());
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${label}?`)) doRemove();
    } else {
      Alert.alert('Remove Document', `Remove "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }

  async function submitDocuments() {
    if (!canSubmit) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const doSubmit = async () => {
      // Mark each doc as submitted
      const updated = docs.map(d => ({ ...d, submitted: true }));
      for (const d of updated) await Storage.saveDocument(d as any);
      setSubmitted(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Submit your documents for admin review? You will be notified once approved.')) doSubmit();
    } else {
      Alert.alert(
        'Submit Documents',
        "Send your uploaded documents to the CareNearby admin team for review? You'll be approved within 1-2 business days.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: doSubmit },
        ],
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0A1628', '#0D2042', '#065F46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>My Documents</Text>
          <Text style={styles.headerSub}>Upload your credentials for admin verification</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Required documents</Text>
            <Text style={styles.progressCount}>{requiredDone}/{requiredTotal} uploaded</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
        </View>

        {/* Status banner */}
        {submitted ? (
          <View style={styles.submittedBanner}>
            <Text style={styles.submittedBannerIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.submittedBannerTitle}>Documents Submitted</Text>
              <Text style={styles.submittedBannerSub}>Our team will review within 1–2 business days</Text>
            </View>
          </View>
        ) : canSubmit ? (
          <View style={styles.readyBanner}>
            <Text style={styles.readyBannerIcon}>🎉</Text>
            <Text style={styles.readyBannerText}>All required docs uploaded — ready to submit!</Text>
          </View>
        ) : null}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Instruction card ───────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardLeft}>
            <Text style={styles.infoCardIcon}>ℹ️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>How it works</Text>
            <Text style={styles.infoCardText}>
              Upload clear photos of each document. Required documents (marked ✱) must be submitted before you can accept jobs. Documents are reviewed by our team and kept private.
            </Text>
          </View>
        </View>

        {/* ── Document list ──────────────────────────────────────────── */}
        {DOC_TYPES.map(docType => {
          const uploaded = docs.find(d => d.id === docType.id);
          const isLoading = uploading === docType.id;

          return (
            <View key={docType.id} style={[styles.docCard, uploaded && styles.docCardUploaded]}>
              {/* Top row */}
              <View style={styles.docCardTop}>
                <View style={[styles.docIconWrap, { backgroundColor: uploaded ? '#ECFDF5' : '#F9FAFB' }]}>
                  <Text style={styles.docTypeIcon}>{docType.icon}</Text>
                </View>
                <View style={styles.docCardInfo}>
                  <View style={styles.docCardTitleRow}>
                    <Text style={styles.docCardTitle}>{docType.label}</Text>
                    {docType.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.docCardSub}>{docType.sublabel}</Text>
                  {uploaded && (
                    <Text style={styles.docUploadedDate}>
                      ✅ Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Document preview (if uploaded) */}
              {uploaded && (
                <View style={styles.docPreviewWrap}>
                  <Image source={{ uri: uploaded.uri }} style={styles.docPreview} resizeMode="cover" />
                  <View style={styles.docPreviewOverlay}>
                    <View style={styles.docPreviewBadge}>
                      <Text style={styles.docPreviewBadgeText}>✅ Saved</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.docCardActions}>
                {uploaded && (
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => removeDoc(docType.id, docType.label)}
                  >
                    <Text style={styles.removeBtnText}>🗑 Remove</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[
                    styles.uploadBtn,
                    uploaded ? styles.uploadBtnReplace : styles.uploadBtnNew,
                    isLoading && { opacity: 0.6 },
                    !uploaded && { flex: 1 },
                  ]}
                  onPress={() => uploadDoc(docType)}
                  disabled={isLoading}
                >
                  <Text style={[styles.uploadBtnText, uploaded ? styles.uploadBtnTextReplace : styles.uploadBtnTextNew]}>
                    {isLoading ? 'Selecting…' : uploaded ? '↑ Replace' : '↑ Upload Photo'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* ── Submit button ──────────────────────────────────────────── */}
        <View style={styles.submitSection}>
          {!submitted ? (
            <>
              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={submitDocuments}
                disabled={!canSubmit}
              >
                <LinearGradient
                  colors={canSubmit ? ['#059669', '#047857'] : ['#D1D5DB', '#9CA3AF']}
                  style={styles.submitBtnGrad}
                >
                  <Text style={styles.submitBtnText}>
                    {canSubmit ? '📤  Submit Documents for Review' : `Upload required docs first (${requiredDone}/${requiredTotal})`}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.submitDisclaimer}>
                Your documents are stored securely and only reviewed by the CareNearby admin team.
                You will be notified when your account is approved.
              </Text>
            </>
          ) : (
            <View style={styles.doneCard}>
              <Text style={styles.doneCardIcon}>🎉</Text>
              <Text style={styles.doneCardTitle}>Documents Submitted Successfully</Text>
              <Text style={styles.doneCardSub}>
                Our team will review your credentials within 1–2 business days. You'll be able to accept jobs once approved. You can still add or replace documents while waiting.
              </Text>
              <Pressable
                style={styles.resubmitBtn}
                onPress={() => setSubmitted(false)}
              >
                <Text style={styles.resubmitBtnText}>Update Documents</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} CareNearby · Greater Sudbury, ON
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
  headerBody: { marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },

  // Progress
  progressWrap: { marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  progressCount: { color: '#fff', fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#34D399', borderRadius: 3 },

  // Banners
  submittedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
  },
  submittedBannerIcon: { fontSize: 24 },
  submittedBannerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  submittedBannerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  readyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  readyBannerIcon: { fontSize: 20 },
  readyBannerText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },

  // Body
  body: { padding: 16, gap: 12, paddingBottom: 40 },

  // Info card
  infoCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoCardLeft: { paddingTop: 2 },
  infoCardIcon: { fontSize: 20 },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  infoCardText: { fontSize: 13, color: '#3B82F6', lineHeight: 19 },

  // Document card
  docCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  docCardUploaded: {
    borderColor: '#A7F3D0',
    shadowColor: '#059669', shadowOpacity: 0.1,
  },
  docCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  docIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', flexShrink: 0,
  },
  docTypeIcon: { fontSize: 26 },
  docCardInfo: { flex: 1 },
  docCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  docCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  requiredBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  requiredBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  docCardSub: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 4 },
  docUploadedDate: { fontSize: 12, color: '#059669', fontWeight: '600' },

  // Preview
  docPreviewWrap: {
    borderRadius: 14, overflow: 'hidden', height: 160,
    backgroundColor: '#F3F4F6', position: 'relative',
  },
  docPreview: { width: '100%', height: '100%' },
  docPreviewOverlay: {
    position: 'absolute', top: 10, right: 10,
  },
  docPreviewBadge: {
    backgroundColor: '#059669', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  docPreviewBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Action buttons
  docCardActions: { flexDirection: 'row', gap: 10 },
  removeBtn: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, backgroundColor: '#FFF1F2',
    borderWidth: 1, borderColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  uploadBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnNew: { backgroundColor: '#0D2042', flex: 1 },
  uploadBtnReplace: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC' },
  uploadBtnText: { fontSize: 15, fontWeight: '700' },
  uploadBtnTextNew: { color: '#fff' },
  uploadBtnTextReplace: { color: '#059669' },

  // Submit section
  submitSection: { gap: 12 },
  submitBtn: { borderRadius: 18, overflow: 'hidden', shadowColor: '#059669', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 },
  submitBtnDisabled: { shadowOpacity: 0 },
  submitBtnGrad: { paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  submitDisclaimer: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },

  // Done card
  doneCard: {
    backgroundColor: '#F0FDF4', borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#A7F3D0',
    gap: 10,
  },
  doneCardIcon: { fontSize: 44 },
  doneCardTitle: { fontSize: 18, fontWeight: '800', color: '#065F46', textAlign: 'center' },
  doneCardSub: { fontSize: 14, color: '#047857', textAlign: 'center', lineHeight: 21 },
  resubmitBtn: {
    marginTop: 6, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#059669',
  },
  resubmitBtnText: { color: '#059669', fontSize: 14, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 8 },
});
