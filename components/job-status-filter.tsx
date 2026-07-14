import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { JobStatusFilter as JobStatusFilterValue } from '@/utils/job-list';

type JobStatusFilterProps = {
  value: JobStatusFilterValue;
  activeCount: number;
  archivedCount: number;
  onChange: (value: JobStatusFilterValue) => void;
};

const OPTIONS: { value: JobStatusFilterValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function JobStatusFilter({
  value,
  activeCount,
  archivedCount,
  onChange,
}: JobStatusFilterProps) {
  const counts: Record<JobStatusFilterValue, number> = {
    active: activeCount,
    archived: archivedCount,
    all: activeCount + archivedCount,
  };

  return (
    <View accessibilityRole="tablist" style={styles.compactRail}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={`${option.label} jobs, ${counts[option.value]}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selectedOption,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {option.label}
            </Text>
            <View style={[styles.countBadge, selected && styles.selectedCountBadge]}>
              <Text style={[styles.count, selected && styles.selectedCount]}>
                {counts[option.value]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRail: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  option: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedLabel: {
    color: Colors.text,
  },
  countBadge: {
    minWidth: 22,
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  selectedCountBadge: {
    backgroundColor: Colors.primarySoft,
  },
  count: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  selectedCount: {
    color: Colors.text,
  },
  pressed: {
    opacity: 0.68,
  },
});
