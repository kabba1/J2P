import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, TouchTarget } from '@/constants/theme';

type StageCardProps = {
  stage: 'Before' | 'Progress' | 'After';
  count: number;
  onPress: () => void;
};

const stageColors = {
  Before: Colors.before,
  Progress: Colors.progress,
  After: Colors.after,
} as const;

export function StageCard({ stage, count, onPress }: StageCardProps) {
  const color = stageColors[stage];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stage} photos, ${count}`}
      accessibilityHint={`Open the ${stage} photo gallery`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.stageHeader}>
        <Ionicons name="camera-outline" size={23} color={color} />
        <Text style={styles.stage}>{stage.toUpperCase()}</Text>
      </View>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={styles.caption}>{count === 1 ? 'photo' : 'photos'}</Text>
      <View style={[styles.accent, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: TouchTarget.minimum,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: Colors.surfaceRaised,
  },
  stageHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  stage: {
    color: Colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.xs,
  },
  caption: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  accent: {
    height: 3,
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    borderRadius: 2,
  },
});
