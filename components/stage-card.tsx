import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

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
      <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name="camera" size={25} color={color} />
      </View>
      <Text style={styles.stage}>{stage}</Text>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={styles.caption}>{count === 1 ? 'photo' : 'photos'}</Text>
      <View style={[styles.accent, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 88,
    minHeight: 178,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stage: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  count: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  caption: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  accent: {
    height: 4,
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
    borderRadius: 2,
  },
});
