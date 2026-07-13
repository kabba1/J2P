import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconName;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
}: PrimaryButtonProps) {
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors.surface} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={24} color={Colors.surface} /> : null}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    backgroundColor: Colors.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    color: Colors.surface,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
});
