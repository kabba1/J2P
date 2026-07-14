import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { MediaStage } from '@/types/media';

type StageSegmentedControlProps = {
  value: MediaStage;
  onChange: (stage: MediaStage) => void;
};

const options: { label: string; value: MediaStage }[] = [
  { label: 'Before', value: 'before' },
  { label: 'Progress', value: 'progress' },
  { label: 'After', value: 'after' },
];

export function StageSegmentedControl({ value, onChange }: StageSegmentedControlProps) {
  return (
    <View accessibilityRole="tablist" style={styles.compactRail}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={`${option.label} photos`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selectedOption,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRail: {
    minHeight: 52,
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  selectedLabel: {
    color: Colors.text,
  },
});
