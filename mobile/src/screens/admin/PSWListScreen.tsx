import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PSWEntry, apiApprovePSW, apiGetPSWs } from '../../api/client';
import { Colors } from '../../utils/colors';

type Filter = 'ALL' | 'PENDING' | 'APPROVED';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
];

export function PSWListScreen() {
  const [psws, setPSWs] = useState<PSWEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const approved = filter === 'APPROVED' ? true : filter === 'PENDING' ? false : undefined;
      const data = await apiGetPSWs(approved);
      setPSWs(data.psws ?? []);
    } catch {
      setPSWs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(psw: PSWEntry) {
    Alert.alert(
      'Approve PSW',
      `Approve ${psw.name} as a verified PSW?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setApprovingId(psw._id);
            try {
              await apiApprovePSW(psw._id);
              Alert.alert('Approved', `${psw.name} is now a verified PSW.`);
              load();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not approve.');
            } finally {
              setApprovingId(null);
            }
          },
        },
      ],
    );
  }

  function renderPSW({ item }: { item: PSWEntry }) {
    const isApproved = item.profile?.approvedByAdmin ?? false;
    const qualType   = (item.profile as any)?.qualificationType ?? 'PSW';
    const licenseNum = (item.profile as any)?.licenseNumber ?? '';
    const college    = (item.profile as any)?.collegeName ?? '';
    const experience = item.profile?.experienceYears ?? 0;
    const firstAid   = (item.profile as any)?.firstAidCertified ?? false;
    const hasCar     = (item.profile as any)?.ownTransportation ?? false;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.ratingCount > 0 && (
              <Text style={styles.rating}>⭐ {item.rating?.toFixed(1)} ({item.ratingCount} ratings)</Text>
            )}
          </View>
          <View style={[styles.statusDot, { backgroundColor: isApproved ? Colors.systemGreen : Colors.systemOrange }]} />
        </View>

        {/* Qualification row */}
        <View style={styles.qualRow}>
          <View style={styles.qualBadge}>
            <Text style={styles.qualText}>{qualType}</Text>
          </View>
          {experience > 0 && (
            <Text style={styles.qualDetail}>{experience} yrs exp</Text>
          )}
          {firstAid && <Text style={styles.qualDetail}>🚑 First Aid</Text>}
          {hasCar    && <Text style={styles.qualDetail}>🚗 Own Car</Text>}
        </View>

        {/* License / College */}
        {(licenseNum || college) ? (
          <View style={styles.licenseRow}>
            {licenseNum ? <Text style={styles.licenseText}>#{licenseNum}</Text> : null}
            {college    ? <Text style={styles.licenseText}>{college}</Text>    : null}
          </View>
        ) : null}

        {item.profile?.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{item.profile.bio}</Text>
        ) : null}

        {item.profile?.specialties?.length ? (
          <View style={styles.certRow}>
            {item.profile.specialties.slice(0, 3).map((c) => (
              <View key={c} style={styles.certBadge}>
                <Text style={styles.certText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : item.profile?.certifications?.length ? (
          <View style={styles.certRow}>
            {item.profile.certifications.slice(0, 3).map((c) => (
              <View key={c} style={styles.certBadge}>
                <Text style={styles.certText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={[styles.approvalBadge, { backgroundColor: isApproved ? `${Colors.systemGreen}1A` : `${Colors.systemOrange}1A` }]}>
            <Text style={[styles.approvalText, { color: isApproved ? Colors.systemGreen : Colors.systemOrange }]}>
              {isApproved ? '✓ Approved' : '⏳ Pending Review'}
            </Text>
          </View>
          {!isApproved && (
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApprove(item)}
              activeOpacity={0.8}
              disabled={approvingId === item._id}
            >
              <Text style={styles.approveBtnText}>
                {approvingId === item._id ? '...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PSW Workers</Text>
        <Text style={styles.subtitle}>{psws.length} workers</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.systemPurple} />
      ) : (
        <FlatList
          data={psws}
          keyExtractor={(item) => item._id}
          renderItem={renderPSW}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.systemPurple}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧑‍⚕️</Text>
              <Text style={styles.emptyText}>No PSWs found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 32, fontWeight: '700', color: Colors.label },
  subtitle: { fontSize: 14, color: Colors.secondaryLabel, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.systemBackground,
  },
  filterBtnActive: { backgroundColor: Colors.systemPurple },
  filterText: { fontSize: 14, fontWeight: '500', color: Colors.secondaryLabel },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.systemBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.systemPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.label },
  phone: { fontSize: 13, color: Colors.secondaryLabel, marginTop: 1 },
  rating: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  bio: { fontSize: 13, color: Colors.secondaryLabel, lineHeight: 18, marginBottom: 10 },
  qualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  qualBadge: { backgroundColor: Colors.onlineGreen + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.onlineGreen + '40' },
  qualText: { fontSize: 12, fontWeight: '700', color: Colors.onlineGreen },
  qualDetail: { fontSize: 12, color: Colors.secondaryLabel, fontWeight: '500' },
  licenseRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  licenseText: { fontSize: 12, color: Colors.secondaryLabel, backgroundColor: Colors.systemGray6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  certBadge: {
    backgroundColor: Colors.systemGray6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  certText: { fontSize: 11, color: Colors.secondaryLabel, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approvalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  approvalText: { fontSize: 13, fontWeight: '600' },
  approveBtn: {
    backgroundColor: Colors.systemGreen,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.secondaryLabel },
});
