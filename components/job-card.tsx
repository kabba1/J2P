import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Job } from '@/types/job';
import { MediaStageCounts } from '@/types/media';
import { formatDate } from '@/utils/format-date';

type JobCardProps = {
  job: Job;
  onPress: () => void;
  counts?: MediaStageCounts;
};

type CountProps = {
  label: string;
  value: number;
  color: string;
};

function Count({ label, value, color }: CountProps) {
  return (
    <View style={styles.countItem}>
      <Text style={styles.countLabel}>{label}</Text>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
    </View>
  );
}

export function JobCard({ job, onPress, counts }: JobCardProps) {
  const subtitle = [job.customer, job.serviceType].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${job.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="briefcase" size={27} color={Colors.primary} />
        </View>
        <View style={styles.details}>
          {job.archivedAt ? (
            <View style={styles.archivedBadge}>
              <Ionicons name="archive-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.archivedLabel}>Archived</Text>
            </View>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>
            {job.name}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.date}>{formatDate(job.createdAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
      </View>
      <View style={styles.divider} />
      <View style={styles.countRow}>
        <Count label="Before" value={counts?.before ?? job.beforeCount} color={Colors.before} />
        <View style={styles.countDivider} />
        <Count label="Progress" value={counts?.progress ?? job.progressCount} color={Colors.progress} />
        <View style={styles.countDivider} />
        <Count label="After" value={counts?.after ?? job.afterCount} color={Colors.after} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  archivedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    marginBottom: 2,
  },
  archivedLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  name: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countItem: {
    flex: 1,
    alignItems: 'center',
  },
  countLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  countValue: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  countDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: Colors.border,
  },
});
