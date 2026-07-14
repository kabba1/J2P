import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Job } from '@/types/job';
import { MediaStageCounts } from '@/types/media';
import { formatDate } from '@/utils/format-date';

type JobCardProps = {
  job: Job;
  onPress: () => void;
  counts?: MediaStageCounts;
  previewUri?: string;
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

export function JobCard({ job, onPress, counts, previewUri }: JobCardProps) {
  const subtitle = [job.customer, job.serviceType].filter(Boolean).join(' · ');
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUri]);

  const showPreview = Boolean(previewUri) && !previewFailed;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${job.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.summaryRow}>
        <View style={styles.photoPreview}>
          {showPreview ? (
            <Image
              accessibilityLabel={`Latest photo for ${job.name}`}
              cachePolicy="memory-disk"
              contentFit="cover"
              onError={() => setPreviewFailed(true)}
              source={{ uri: previewUri }}
              style={styles.previewImage}
              transition={120}
            />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="camera-outline" size={28} color={Colors.textTertiary} />
              <Text style={styles.photoFallbackLabel}>No photo</Text>
            </View>
          )}
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
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  photoPreview: {
    width: 104,
    height: 104,
    overflow: 'hidden',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceRaised,
  },
  photoFallbackLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
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
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
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
    fontVariant: ['tabular-nums'],
  },
  countDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: Colors.border,
  },
});
