import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../utils/colors';

const STEPS = [
  { key: 'REQUESTED', label: 'Requested', icon: '🔔', desc: 'Your booking request was sent' },
  { key: 'ACCEPTED', label: 'PSW Accepted', icon: '✅', desc: 'A PSW has accepted your request' },
  { key: 'STARTED', label: 'Care Started', icon: '▶️', desc: 'Your PSW has started their shift' },
  { key: 'COMPLETED', label: 'Completed', icon: '⭐', desc: 'Care session completed successfully' },
];

const ORDER = ['REQUESTED', 'ACCEPTED', 'STARTED', 'COMPLETED'];

interface Props {
  status: string;
}

export function StatusTimeline({ status }: Props) {
  if (status === 'CANCELLED') {
    return (
      <View style={styles.cancelledBox}>
        <Text style={styles.cancelledIcon}>❌</Text>
        <View>
          <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
          <Text style={styles.cancelledDesc}>This booking was cancelled.</Text>
        </View>
      </View>
    );
  }

  const currentIndex = ORDER.indexOf(status);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.leftCol}>
              <View style={[
                styles.dot,
                isCompleted && styles.dotCompleted,
                isCurrent && styles.dotCurrent,
                isPending && styles.dotPending,
              ]}>
                {isCompleted && <Text style={styles.checkText}>✓</Text>}
                {isCurrent && <View style={styles.innerDot} />}
              </View>
              {index < STEPS.length - 1 && (
                <View style={[styles.line, isCompleted ? styles.lineCompleted : styles.linePending]} />
              )}
            </View>

            <View style={[styles.content, index < STEPS.length - 1 && { marginBottom: 4 }]}>
              <Text style={[styles.stepIcon, isPending && { opacity: 0.35 }]}>{step.icon}</Text>
              <View style={styles.stepText}>
                <Text style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  isPending && styles.stepLabelPending,
                ]}>
                  {step.label}
                </Text>
                {(isCompleted || isCurrent) && (
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  stepRow: { flexDirection: 'row', minHeight: 56 },
  leftCol: { width: 32, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotCompleted: { backgroundColor: Colors.systemGreen },
  dotCurrent: {
    backgroundColor: Colors.systemBlue,
    shadowColor: Colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  dotPending: { backgroundColor: Colors.systemGray5, borderWidth: 1.5, borderColor: Colors.systemGray4 },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  line: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  lineCompleted: { backgroundColor: Colors.systemGreen },
  linePending: { backgroundColor: Colors.systemGray5 },
  content: { flex: 1, flexDirection: 'row', paddingBottom: 20, paddingLeft: 12 },
  stepIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  stepText: { flex: 1 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: Colors.label, marginBottom: 2 },
  stepLabelCurrent: { color: Colors.systemBlue },
  stepLabelPending: { color: Colors.tertiaryLabel, fontWeight: '500' },
  stepDesc: { fontSize: 13, color: Colors.secondaryLabel },
  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  cancelledIcon: { fontSize: 28 },
  cancelledTitle: { fontSize: 15, fontWeight: '700', color: Colors.systemRed, marginBottom: 2 },
  cancelledDesc: { fontSize: 13, color: Colors.secondaryLabel },
});
