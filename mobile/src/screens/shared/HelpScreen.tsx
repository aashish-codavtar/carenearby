import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

function StepRow({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBubble}>
        <Text style={styles.stepNum}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
    </View>
  );
}

type SectionKey = 'register' | 'qualifications' | 'documents' | 'earnings' | 'coverage' | 'safety' | 'contact';

export function HelpScreen() {
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<any>();
  const [expanded, setExpanded] = useState<SectionKey | null>('register');

  const toggle = (key: SectionKey) => setExpanded(prev => prev === key ? null : key);

  const sections: { key: SectionKey; icon: string; title: string; content: React.ReactNode }[] = [
    {
      key: 'register',
      icon: '📝',
      title: 'How to Register as a Healthcare Pro',
      content: (
        <View style={styles.sectionBody}>
          <StepRow step={1} title="Download the App" desc="Open CareNearby in your browser and tap 'Add to Home Screen' to install the PWA" />
          <StepRow step={2} title="Create Your Account" desc="Enter your name, phone number, and select 'PSW Professional' role" />
          <StepRow step={3} title="Verify Your Phone" desc="Enter the 6-digit OTP code sent via SMS to confirm your identity" />
          <StepRow step={4} title="Choose Your Qualification" desc="Select PSW, RPN, RN, OT, PT, DSW, HCA, or Other — then enter your college & registration number" />
          <StepRow step={5} title="Select Specialties & Languages" desc="Choose your care specialties (dementia, post-surgery, etc.) and languages you speak" />
          <StepRow step={6} title="Confirm Your Extras" desc="First Aid / CPR certificate, driver's licence, and own transportation" />
          <StepRow step={7} title="Upload Documents" desc="Police check, PSW certificate, First Aid cert, and Government ID" />
          <StepRow step={8} title="Wait for Approval" desc="Our team reviews your profile within 1–2 business days and approves you to accept clients" />
          <StepRow step={9} title="Start Accepting Jobs" desc="Go online in the Dashboard and accept nearby client bookings to start earning" />
        </View>
      ),
    },
    {
      key: 'qualifications',
      icon: '🏅',
      title: 'Qualification Types We Accept',
      content: (
        <View style={styles.sectionBody}>
          <InfoRow icon="🧑‍⚕️" label="PSW — Personal Support Worker" desc="Ontario college-trained support workers providing personal care at home" />
          <InfoRow icon="💉" label="RPN — Registered Practical Nurse" desc="Licensed practical nurses with full medication and wound care authority" />
          <InfoRow icon="🩺" label="RN — Registered Nurse" desc="Full registered nurses for complex care needs and medical oversight" />
          <InfoRow icon="🙌" label="OT — Occupational Therapist" desc="Specialists in mobility, adaptive equipment, and daily living activities" />
          <InfoRow icon="🏃" label="PT — Physiotherapist" desc="Rehabilitation and physical therapy for injury recovery and mobility" />
          <InfoRow icon="❤️" label="DSW — Developmental Services Worker" desc="Specialists supporting individuals with intellectual disabilities" />
          <InfoRow icon="🏠" label="HCA — Home Care Aide" desc="Trained home care assistants for personal support and companionship" />
          <InfoRow icon="⚕️" label="Other Healthcare Role" desc="Any other verified healthcare professional — submit your credentials for review" />
        </View>
      ),
    },
    {
      key: 'documents',
      icon: '📄',
      title: 'Required Verification Documents',
      content: (
        <View style={styles.sectionBody}>
          <View style={styles.requiredNote}>
            <Text style={styles.requiredNoteText}>✱ Required documents must be uploaded before your profile can be approved</Text>
          </View>
          <InfoRow icon="🛡️" label="Police Check Clearance ✱" desc="RCMP or OPP criminal record check — must be recent (within 2 years)" />
          <InfoRow icon="🏅" label="PSW / Healthcare Certificate ✱" desc="Official credential from your accredited college or university" />
          <InfoRow icon="🚑" label="First Aid / CPR Certificate ✱" desc="Valid St. John Ambulance or Canadian Red Cross certification" />
          <InfoRow icon="🚗" label="Driver's Licence (optional)" desc="Ontario G or G2 licence — both sides of the card" />
          <InfoRow icon="🪪" label="Government-Issued ID (optional)" desc="Passport, Ontario Photo Card, or provincial health card" />
          <InfoRow icon="📋" label="Liability Insurance (optional)" desc="Professional liability or errors & omissions policy if applicable" />
        </View>
      ),
    },
    {
      key: 'earnings',
      icon: '💰',
      title: 'Earnings & How You Get Paid',
      content: (
        <View style={styles.sectionBody}>
          <View style={styles.rateCard}>
            <Text style={styles.rateAmount}>$25</Text>
            <Text style={styles.rateUnit}>/hr</Text>
          </View>
          <InfoRow icon="⏱️" label="3-hour minimum per booking" desc="Minimum guaranteed earnings of $75 per job" />
          <InfoRow icon="⬆️" label="Up to 12 hours per booking" desc="Maximum $300 per single session" />
          <InfoRow icon="💵" label="Private-pay direct to you" desc="Clients pay you directly — cash or e-Transfer at time of service" />
          <InfoRow icon="🧾" label="Price shown upfront to client" desc="No hidden platform fees or commissions deducted from your pay" />
          <InfoRow icon="📍" label="Jobs within 15 km of Sudbury" desc="Accept jobs near you — no long-distance travel required" />
        </View>
      ),
    },
    {
      key: 'coverage',
      icon: '📍',
      title: 'Service Area — Greater Sudbury',
      content: (
        <View style={styles.sectionBody}>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageTitle}>📍 Greater Sudbury, ON</Text>
            <Text style={styles.coverageSub}>15 km radius · ~706 km² service area</Text>
          </View>
          <InfoRow icon="🏙️" label="Downtown Sudbury" desc="Primary coverage zone — highest job volume" />
          <InfoRow icon="🏘️" label="South End & New Sudbury" desc="High-density residential areas" />
          <InfoRow icon="🌿" label="Val-Caron & Hanmer" desc="Northeast communities" />
          <InfoRow icon="🏔️" label="Capreol" desc="Northern coverage boundary" />
          <InfoRow icon="🌲" label="Lively & Walden" desc="Southwest communities" />
          <InfoRow icon="🏡" label="Azilda & Sudbury East" desc="Rural east & west coverage" />
        </View>
      ),
    },
    {
      key: 'safety',
      icon: '🛡️',
      title: 'Trust & Safety',
      content: (
        <View style={styles.sectionBody}>
          <InfoRow icon="🛡️" label="Police Clearance Required" desc="Criminal record background check for every healthcare worker" />
          <InfoRow icon="✅" label="Government ID Verified" desc="Photo ID confirmed by our admin team before account approval" />
          <InfoRow icon="👮" label="Manual Admin Review" desc="A real person reviews every PSW profile before they go live" />
          <InfoRow icon="⭐" label="Rating & Review System" desc="Clients leave 1–5 star reviews after every completed booking" />
          <InfoRow icon="🚫" label="Suspension Controls" desc="Admin can suspend any account immediately if needed" />
          <InfoRow icon="🔔" label="Live Job Status" desc="Requested → Accepted → Started → Completed — always tracked" />
        </View>
      ),
    },
    {
      key: 'contact',
      icon: '✉️',
      title: 'Contact & Support',
      content: (
        <View style={styles.sectionBody}>
          <Pressable
            style={styles.contactRow}
            onPress={() => Linking.openURL('mailto:support@carenearby.ca?subject=CareNearby Support')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>support@carenearby.ca</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>⏰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Support Hours</Text>
              <Text style={styles.contactValueDark}>Mon – Fri, 9 am – 5 pm ET</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>🌐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Language / Langue</Text>
              <Text style={styles.contactValueDark}>English · Français</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Service Area</Text>
              <Text style={styles.contactValueDark}>Greater Sudbury, ON 🇨🇦</Text>
            </View>
          </View>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.backBar, { paddingTop: Platform.OS === 'web' ? 12 : insets.top + 4 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => nav.goBack()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.backBarTitle}>Join as a Professional</Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#065F46', '#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroIcon}>🧑‍⚕️</Text>
          <Text style={styles.heroTitle}>Join as a Healthcare Professional</Text>
          <Text style={styles.heroSub}>Register as a PSW, nurse, or healthcare expert and start earning in Greater Sudbury</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>PSW</Text></View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>RPN</Text></View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>RN</Text></View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>OT</Text></View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>+ more</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {sections.map(section => (
            <View key={section.key} style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.cardHeader, pressed && { opacity: 0.85 }]}
                onPress={() => toggle(section.key)}
              >
                <Text style={styles.cardIcon}>{section.icon}</Text>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardChevron}>{expanded === section.key ? '▲' : '▼'}</Text>
              </Pressable>
              {expanded === section.key && section.content}
            </View>
          ))}

          <Text style={styles.footer}>
            © {new Date().getFullYear()} CareNearby · Private-Pay PSW Services{'\n'}
            Greater Sudbury, ON · All rights reserved
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#065F46' },

  backBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#065F46',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 70 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backBarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtnSpacer: { minWidth: 70 },

  container: { flex: 1, backgroundColor: '#f5f5f5' },

  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  heroIcon: { fontSize: 44, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6, textAlign: 'center', letterSpacing: -0.3 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  body: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cardIcon: { fontSize: 20 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#000' },
  cardChevron: { fontSize: 11, color: '#999' },

  sectionBody: { paddingHorizontal: 16, paddingBottom: 18, gap: 14 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#065F46', alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#666', lineHeight: 17 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 2 },
  infoDesc: { fontSize: 12, color: '#666', lineHeight: 17 },

  requiredNote: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  requiredNoteText: { fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 17 },

  rateCard: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', paddingVertical: 16, gap: 4,
  },
  rateAmount: { fontSize: 52, fontWeight: '900', color: '#065F46' },
  rateUnit: { fontSize: 20, color: '#666', fontWeight: '500' },

  coverageCard: {
    backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 4,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  coverageTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginBottom: 4 },
  coverageSub: { fontSize: 13, color: '#555' },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon: { fontSize: 20 },
  contactLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  contactValueDark: { fontSize: 14, fontWeight: '600', color: '#000' },
  contactArrow: { fontSize: 16, color: '#007AFF' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  footer: {
    textAlign: 'center', fontSize: 11, color: '#aaa',
    marginTop: 10, lineHeight: 18,
  },
});
