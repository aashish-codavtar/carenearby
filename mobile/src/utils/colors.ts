export const Colors = {
  // Brand
  brand: '#0A2540',
  brandLight: '#1A3A5C',
  brandAccent: '#00B4D8',   // vibrant teal accent

  // System blues (iOS-inspired but richer)
  systemBlue: '#007AFF',
  systemBlueDark: '#0056CC',
  systemGreen: '#00C853',
  systemRed: '#FF3B30',
  systemOrange: '#FF6B00',
  systemYellow: '#FFB800',
  systemPurple: '#7C3AED',
  systemTeal: '#00B4D8',

  // Grays (more refined)
  systemGray:  '#6B7280',
  systemGray2: '#9CA3AF',
  systemGray3: '#D1D5DB',
  systemGray4: '#E5E7EB',
  systemGray5: '#F3F4F6',
  systemGray6: '#F9FAFB',

  // Labels
  label:           '#0F172A',
  secondaryLabel:  '#64748B',
  tertiaryLabel:   '#94A3B8',

  // Backgrounds
  systemBackground:              '#FFFFFF',
  secondarySystemBackground:     '#F8FAFC',
  tertiarySystemBackground:      '#FFFFFF',
  systemGroupedBackground:       '#F1F5F9',
  secondarySystemGroupedBackground: '#FFFFFF',

  // Separators
  separator:       '#E2E8F0',
  opaqueSeparator: '#CBD5E1',

  // Brand gradients (use these pairs in LinearGradient)
  heroNavy:      '#0A2540',
  heroNavyLight: '#1E3A5F',

  // Status / semantic
  trustGreen:   '#059669',
  onlineGreen:  '#10B981',
  offlineGray:  '#6B7280',
  urgentOrange: '#EA580C',
  earningsGold: '#D97706',
  accentGold:   '#F59E0B',

  // Card / shadow
  cardShadow: '#0F172A',

  // Service pastels (more vibrant)
  servicePersonal:   '#EFF6FF',
  serviceCompanion:  '#F5F3FF',
  serviceMeal:       '#FFF7ED',
  serviceMedication: '#ECFDF5',
  serviceHousing:    '#FFF1F2',
  serviceMobility:   '#F0FDFA',
  serviceSurgery:    '#F0F9FF',

  // Accent service colors
  servicePersonalAccent:   '#3B82F6',
  serviceCompanionAccent:  '#7C3AED',
  serviceMealAccent:       '#F97316',
  serviceMedicationAccent: '#10B981',
  serviceHousingAccent:    '#F43F5E',
  serviceMobilityAccent:   '#14B8A6',
  serviceSurgeryAccent:    '#0EA5E9',
} as const;

export const StatusColors: Record<string, string> = {
  REQUESTED: '#F59E0B',
  ACCEPTED:  '#3B82F6',
  STARTED:   '#7C3AED',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

export const ServiceColors: Record<string, string> = {
  'Personal Care':          Colors.servicePersonal,
  'Companionship':          Colors.serviceCompanion,
  'Meal Preparation':       Colors.serviceMeal,
  'Medication Reminders':   Colors.serviceMedication,
  'Light Housekeeping':     Colors.serviceHousing,
  'Mobility Assistance':    Colors.serviceMobility,
  'Post-Surgery Support':   Colors.serviceSurgery,
};

export const ServiceAccentColors: Record<string, string> = {
  'Personal Care':          Colors.servicePersonalAccent,
  'Companionship':          Colors.serviceCompanionAccent,
  'Meal Preparation':       Colors.serviceMealAccent,
  'Medication Reminders':   Colors.serviceMedicationAccent,
  'Light Housekeeping':     Colors.serviceHousingAccent,
  'Mobility Assistance':    Colors.serviceMobilityAccent,
  'Post-Surgery Support':   Colors.serviceSurgeryAccent,
};

export const ServiceIcons: Record<string, string> = {
  'Personal Care':          '🧼',
  'Companionship':          '🤝',
  'Meal Preparation':       '🍽️',
  'Medication Reminders':   '💊',
  'Light Housekeeping':     '🏠',
  'Mobility Assistance':    '♿',
  'Post-Surgery Support':   '🏥',
};
