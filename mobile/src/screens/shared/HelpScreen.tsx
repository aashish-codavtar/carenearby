import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

function CheckRow({
  icon, label, desc, status = 'ok',
}: { icon: string; label: string; desc?: string; status?: 'ok' | 'pending' | 'info' }) {
  const badge = status === 'ok' ? '✅' : status === 'pending' ? '⏳' : 'ℹ️';
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {desc ? <Text style={styles.checkDesc}>{desc}</Text> : null}
      </View>
      <Text style={styles.checkBadge}>{badge}</Text>
    </View>
  );
}

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

type SectionKey = 'platform' | 'booking' | 'psw' | 'services' | 'pricing' | 'coverage' | 'safety' | 'contact';

export function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<SectionKey | null>('booking');

  const toggle = (key: SectionKey) => setExpanded(prev => prev === key ? null : key);

  const sections: { key: SectionKey; icon: string; title: string; content: React.ReactNode }[] = [
    {
      key: 'platform',
      icon: '🖥️',
      title: 'Platform Status',
      content: (
        <View style={styles.sectionBody}>
          <CheckRow icon="📱" label="Progressive Web App (PWA)" desc="Install on iOS, Android & Desktop from browser" />
          <CheckRow icon="⚡" label="Service Worker & Offline Cache" desc="App shell cached for fast loading" />
          <CheckRow icon="🌐" label="Bilingual Support" desc="English & French — toggle on Home screen" />
          <CheckRow icon="🔒" label="HTTPS + JWT Auth" desc="All traffic encrypted, token-based sessions" />
          <CheckRow icon="📱" label="OTP Verification" desc="Phone number verified via Twilio SMS" />
          <CheckRow icon="🗄️" label="MongoDB Database" desc="Persistent data with WiredTiger engine" />
          <CheckRow icon="🚀" label="Vercel (PWA)" desc="Auto-deploys from GitHub main branch" />
          <CheckRow icon="🚂" label="Railway (Backend)" desc="Node.js/Express API, always on" />
          <CheckRow icon="📍" label="OpenStreetMap + Leaflet" desc="Real maps with PSW job pins on web" />
          <CheckRow icon="🗺️" label="react-native-maps" desc="Native map view on iOS & Android" />
        </View>
      ),
    },
    {
      key: 'booking',
      icon: '📋',
      title: 'How Booking Works',
      content: (
        <View style={styles.sectionBody}>
          <StepRow step={1} title="Choose Your Service" desc="Select from 7 personal care service types" />
          <StepRow step={2} title="Pick a Date" desc="Tap to advance to your preferred date" />
          <StepRow step={3} title="Set Start Time" desc="Choose from preset time slots (7am – 5pm)" />
          <StepRow step={4} title="Set Duration" desc="Minimum 3 hours, up to 12 hours" />
          <StepRow step={5} title="Add Instructions" desc="Optional notes for the PSW (mobility, meds, etc.)" />
          <StepRow step={6} title="Review & Confirm" desc="Price estimate shown — submit request" />
          <StepRow step={7} title="PSW Accepts" desc="Nearest verified PSW accepts the job" />
          <StepRow step={8} title="Care Session" desc="PSW arrives and marks job as Started" />
          <StepRow step={9} title="Rate Your PSW" desc="Leave a 1–5 star review after completion" />
        </View>
      ),
    },
    {
      key: 'psw',
      icon: '🧑‍⚕️',
      title: 'PSW Verification Process',
      content: (
        <View style={styles.sectionBody}>
          <CheckRow icon="📞" label="Phone Registration" desc="OTP verified phone number at sign-up" />
          <CheckRow icon="📝" label="Credential Type" desc="PSW, RPN, RN, OT, PT, DSW, HCA, or Other" />
          <CheckRow icon="🏫" label="College Registration Number" desc="License number & issuing institution" />
          <CheckRow icon="🚑" label="First Aid & CPR Certificate" desc="Valid certification required" />
          <CheckRow icon="🚗" label="Driver's Licence" desc="Ontario G or G2 checked" />
          <CheckRow icon="🏠" label="Own Transportation" desc="Vehicle availability for client travel" />
          <CheckRow icon="👤" label="Identity Verification" desc="Government-issued ID confirmed by admin" />
          <CheckRow icon="🛡️" label="Police Clearance" desc="Criminal record background check" />
          <CheckRow icon="👮" label="Admin Review" desc="Manual review by CareNearby team (1–2 business days)" />
          <CheckRow icon="✅" label="Approved & Active" desc="PSW appears to customers and can accept jobs" />
        </View>
      ),
    },
    {
      key: 'services',
      icon: '💼',
      title: 'Services Offered',
      content: (
        <View style={styles.sectionBody}>
          {([
            ['🧴', 'Personal Care', 'Bathing, grooming, hygiene, and dressing assistance'],
            ['🤝', 'Companionship', 'Social visits, activities, and emotional support'],
            ['🍽️', 'Meal Preparation', 'Cooking, diet planning, and feeding assistance'],
            ['💊', 'Medication Reminders', 'Scheduled reminders and administration support'],
            ['🧹', 'Light Housekeeping', 'Cleaning, laundry, and tidying living spaces'],
            ['♿', 'Mobility Assistance', 'Transfers, walking support, and exercise help'],
            ['🏥', 'Post-Surgery Support', 'Recovery monitoring, wound care, follow-up help'],
          ] as [string, string, string][]).map(([icon, name, desc]) => (
            <CheckRow key={name} icon={icon} label={name} desc={desc} status="info" />
          ))}
        </View>
      ),
    },
    {
      key: 'pricing',
      icon: '💳',
      title: 'Pricing & Payments',
      content: (
        <View style={styles.sectionBody}>
          <View style={styles.priceHighlight}>
            <Text style={styles.priceAmount}>$25</Text>
            <Text style={styles.priceUnit}>/hr</Text>
          </View>
          {([
            ['⏱️', '3-hour minimum', 'Minimum $75 per session'],
            ['⬆️', 'Up to 12 hours', 'Maximum $300 per session'],
            ['💵', 'Private Pay', 'Not covered by OHIP or provincial insurance'],
            ['💸', 'Cash or e-Transfer', 'Paid directly to PSW at time of service'],
            ['🧾', 'Price shown upfront', 'No hidden fees or platform surcharges'],
            ['📊', 'Rate set by platform', 'Standardized $25/hr for all services'],
          ] as [string, string, string][]).map(([icon, label, desc]) => (
            <CheckRow key={label} icon={icon} label={label} desc={desc} status="info" />
          ))}
        </View>
      ),
    },
    {
      key: 'coverage',
      icon: '📍',
      title: 'Coverage Area',
      content: (
        <View style={styles.sectionBody}>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageTitle}>📍 Greater Sudbury, ON</Text>
            <Text style={styles.coverageSub}>15 km radius · ~706 km² service area</Text>
          </View>
          {([
            ['🏙️', 'Downtown Sudbury', 'Primary coverage zone'],
            ['🏘️', 'South End & New Sudbury', 'High-density residential areas'],
            ['🌿', 'Val-Caron & Hanmer', 'Northeast communities'],
            ['🏔️', 'Capreol', 'Northern coverage boundary'],
            ['🌲', 'Lively & Walden', 'Southwest communities'],
            ['🏡', 'Sudbury East / Azilda', 'Rural east & west coverage'],
          ] as [string, string, string][]).map(([icon, label, desc]) => (
            <CheckRow key={label} icon={icon} label={label} desc={desc} status="info" />
          ))}
        </View>
      ),
    },
    {
      key: 'safety',
      icon: '🛡️',
      title: 'Trust & Safety Features',
      content: (
        <View style={styles.sectionBody}>
          <CheckRow icon="🛡️" label="Police Clearance Required" desc="Criminal record check for every PSW" />
          <CheckRow icon="✅" label="Government ID Verified" desc="Photo ID confirmed before approval" />
          <CheckRow icon="👮" label="Admin Manual Review" desc="Humans review every PSW before going live" />
          <CheckRow icon="⭐" label="Rating & Review System" desc="1–5 star reviews after every completed booking" />
          <CheckRow icon="🚫" label="PSW Rejection & Suspension" desc="Admin can suspend any PSW account" />
          <CheckRow icon="❌" label="Booking Cancellation" desc="Customers can cancel REQUESTED bookings" />
          <CheckRow icon="📍" label="Location Verification" desc="PSW must be within 15 km of Sudbury" />
          <CheckRow icon="🔔" label="Live Status Updates" desc="Booking status: Requested → Accepted → Started → Completed" />
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
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@carenearby.ca</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Service Area</Text>
              <Text style={styles.contactValueDark}>Greater Sudbury, ON 🇨🇦</Text>
            </View>
          </View>
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
        </View>
      ),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.heroIcon}>📖</Text>
        <Text style={styles.heroTitle}>Help & Documentation</Text>
        <Text style={styles.heroSub}>CareNearby platform guide · Fonctionnalités vérifiées</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0.0 · Greater Sudbury, ON</Text>
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
          © {new Date().getFullYear()} CareNearby · Professional PSW Services{'\n'}
          Greater Sudbury, ON · All rights reserved
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 28 },
  heroIcon: { fontSize: 40, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 14 },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  versionText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

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

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkIcon: { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 2 },
  checkDesc: { fontSize: 12, color: '#666', lineHeight: 17 },
  checkBadge: { fontSize: 16, marginTop: 1 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#666', lineHeight: 17 },

  priceHighlight: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', paddingVertical: 16, gap: 4,
  },
  priceAmount: { fontSize: 52, fontWeight: '900', color: '#000' },
  priceUnit: { fontSize: 20, color: '#666', fontWeight: '500' },

  coverageCard: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 4,
  },
  coverageTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
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
