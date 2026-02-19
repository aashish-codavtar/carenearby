import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Colors } from '../utils/colors';

interface Props extends TouchableOpacityProps {
  title: string;
  variant?: 'filled' | 'outline' | 'ghost' | 'destructive';
  size?: 'large' | 'medium' | 'small';
  loading?: boolean;
}

export function IOSButton({
  title,
  variant = 'filled',
  size = 'large',
  loading = false,
  onPress,
  style,
  disabled,
  ...rest
}: Props) {
  const handlePress = async (e: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'filled' || variant === 'destructive' ? '#fff' : Colors.systemBlue}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variants
  filled: {
    backgroundColor: Colors.systemBlue,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.systemBlue,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.systemRed,
  },
  // Sizes
  large: { height: 54, paddingHorizontal: 24 },
  medium: { height: 44, paddingHorizontal: 20 },
  small: { height: 34, paddingHorizontal: 14 },
  // Labels
  label: { fontWeight: '600', letterSpacing: 0.2 },
  filledLabel: { color: '#fff', fontSize: 17 },
  outlineLabel: { color: Colors.systemBlue, fontSize: 17 },
  ghostLabel: { color: Colors.systemBlue, fontSize: 17 },
  destructiveLabel: { color: '#fff', fontSize: 17 },
  // State
  disabled: { opacity: 0.4 },
});
