import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';

type CameraPermissionStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function CameraPermissionState({
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: CameraPermissionStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="camera-outline" size={38} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} icon="camera" onPress={onAction} style={styles.action} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
          onPress={onSecondary}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    maxWidth: 340,
    color: Colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  action: {
    width: '100%',
    maxWidth: 340,
    marginTop: Spacing.xl,
  },
  secondary: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  secondaryLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
