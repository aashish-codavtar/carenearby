// iOS System Colors — matches Apple Human Interface Guidelines
export const Colors = {
  // System blues / actions
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemPurple: '#AF52DE',
  systemTeal: '#5AC8FA',

  // Grays
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',

  // Labels
  label: '#000000',
  secondaryLabel: '#6D6D72',
  tertiaryLabel: '#A9A9AE',

  // Backgrounds
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',

  // Grouped Backgrounds
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',

  // Separators
  separator: '#C6C6C8',
  opaqueSeparator: '#C6C6C8',
} as const;

// Booking status colors
export const StatusColors: Record<string, string> = {
  REQUESTED: Colors.systemOrange,
  ACCEPTED: Colors.systemBlue,
  STARTED: Colors.systemPurple,
  COMPLETED: Colors.systemGreen,
  CANCELLED: Colors.systemRed,
};
