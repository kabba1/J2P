import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { usePairs } from '@/state/pairs-context';
import { JobMedia } from '@/types/media';
import { BeforeAfterPair } from '@/types/pair';
import { getAfterQueuePrimaryAction, selectLatestPair } from '@/utils/after-queue-state';
import { formatDateTime } from '@/utils/format-date';

type QueueItemProps = {
  before: JobMedia;
  pair?: BeforeAfterPair;
  beforeMissing: boolean;
  afterMissing: boolean;
  compact: boolean;
  onPress: () => void;
};

function QueueAction({
  matched,
  unavailable,
  needsAttention,
}: {
  matched: boolean;
  unavailable: boolean;
  needsAttention: boolean;
}) {
  const label = unavailable
    ? 'Unavailable'
    : needsAttention
      ? 'Review'
      : matched
        ? 'Matched'
        : 'Take After';

  return (
    <View
      style={[
        styles.actionPill,
        matched && !unavailable && !needsAttention && styles.matchedPill,
        !matched && !unavailable && styles.takeAfterPill,
        (unavailable || needsAttention) && styles.unavailablePill,
      ]}>
      {matched && !unavailable && !needsAttention ? (
        <Ionicons name="checkmark-circle" size={17} color={Colors.after} />
      ) : null}
      <Text
        style={[
          styles.actionPillText,
          matched && !unavailable && !needsAttention && styles.matchedPillText,
          !matched && !unavailable && styles.takeAfterPillText,
          (unavailable || needsAttention) && styles.unavailablePillText,
        ]}>
        {label}
      </Text>
    </View>
  );
}

function QueueItem({
  before,
  pair,
  beforeMissing,
  afterMissing,
  compact,
  onPress,
}: QueueItemProps) {
  const matched = Boolean(pair);
  const needsAttention = matched && (beforeMissing || afterMissing);
  const unavailable = !matched && beforeMissing;
  const shotName = before.shotName?.trim() || 'Before photo';
  const statusText = beforeMissing
    ? 'Before photo file missing'
    : afterMissing
      ? 'Paired After file missing'
      : matched
        ? 'After photo matched'
        : 'After photo needed';
  const action = (
    <QueueAction
      matched={matched}
      unavailable={unavailable}
      needsAttention={needsAttention}
    />
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${shotName}. ${statusText}.`}
      accessibilityHint={
        unavailable
          ? 'This item cannot be opened because a saved photo file is missing.'
          : matched
            ? 'Opens the saved pair details, including any missing-file recovery options.'
            : 'Opens the camera with this Before photo as a ghost overlay.'
      }
      accessibilityState={{ disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.queueCard,
        compact && styles.queueCardCompact,
        pressed && !unavailable && styles.cardPressed,
        unavailable && styles.cardUnavailable,
      ]}>
      {beforeMissing ? (
        <View style={[styles.thumbnail, compact && styles.thumbnailCompact, styles.missingThumbnail]}>
          <Ionicons name="image-outline" size={34} color={Colors.textMuted} />
          <Text style={styles.missingThumbnailText}>Missing</Text>
        </View>
      ) : (
        <Image
          accessibilityLabel={`${shotName} Before photo`}
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: before.localUri }}
          style={[styles.thumbnail, compact && styles.thumbnailCompact]}
        />
      )}

      <View style={styles.itemContent}>
        <Text numberOfLines={2} style={styles.shotName}>
          {shotName}
        </Text>
        <View style={styles.detailRow}>
          <Ionicons name="camera-outline" size={18} color={Colors.primary} />
          <Text numberOfLines={1} style={styles.detailText}>
            Before photo captured
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons
            name={matched && !afterMissing ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={
                needsAttention || unavailable
                  ? Colors.danger
                : matched
                  ? Colors.after
                  : Colors.textMuted
            }
          />
          <Text
            numberOfLines={1}
            style={[
              styles.detailText,
              matched && !unavailable && styles.matchedStatus,
              (needsAttention || unavailable) && styles.unavailableStatus,
            ]}>
            {statusText}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.capturedAt}>
          Captured {formatDateTime(before.createdAt)}
        </Text>
        {compact ? <View style={styles.compactAction}>{action}</View> : null}
      </View>

      {!compact ? (
        <View style={styles.actionColumn}>
          {action}
          <Ionicons
            name="chevron-forward"
            size={22}
            color={unavailable ? Colors.border : Colors.textMuted}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AfterShotQueueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string | string[] }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { jobs, loading: jobsLoading } = useJobs();
  const { media, refreshJob, fileExists } = useMedia();
  const {
    pairs,
    error: pairError,
    refreshJobPairs,
  } = usePairs();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const [missingMediaIds, setMissingMediaIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const refreshQueue = useCallback(async () => {
    if (!jobId) return;

    setRefreshing(true);
    setLoadError(undefined);
    try {
      const [records] = await Promise.all([
        refreshJob(jobId),
        refreshJobPairs(jobId),
      ]);
      const checks = await Promise.all(
        records.map(async (record) => ({
          id: record.id,
          exists: await fileExists(record.localUri),
        })),
      );
      setMissingMediaIds(
        new Set(checks.filter((check) => !check.exists).map((check) => check.id)),
      );
    } catch (caughtError) {
      setLoadError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The After Shot Queue could not be loaded.',
      );
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, [fileExists, jobId, refreshJob, refreshJobPairs]);

  useFocusEffect(
    useCallback(() => {
      void refreshQueue();
    }, [refreshQueue]),
  );

  const beforeMedia = useMemo(
    () =>
      jobId
        ? media
            .filter((item) => item.jobId === jobId && item.stage === 'before')
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        : [],
    [jobId, media],
  );

  const jobPairs = useMemo(
    () => pairs.filter((pair) => pair.jobId === jobId),
    [jobId, pairs],
  );

  const pairByBeforeId = useMemo(
    () => new Map(jobPairs.map((pair) => [pair.beforeMediaId, pair])),
    [jobPairs],
  );

  const completed = beforeMedia.reduce(
    (count, before) => count + (pairByBeforeId.has(before.id) ? 1 : 0),
    0,
  );
  const total = beforeMedia.length;
  const remaining = Math.max(total - completed, 0);
  const progress = total === 0 ? 0 : completed / total;
  const progressPercent = Math.round(progress * 100);
  const nextUnmatched = beforeMedia.find(
    (before) => !pairByBeforeId.has(before.id) && !missingMediaIds.has(before.id),
  );
  const latestPair = selectLatestPair(jobPairs);
  const primaryAction = getAfterQueuePrimaryAction({
    total,
    remaining,
    hasNextUnmatched: Boolean(nextUnmatched),
    hasSavedPair: Boolean(latestPair),
  });

  const openCamera = useCallback(
    (before: JobMedia) => {
      if (!jobId) return;
      router.push({
        pathname: '/job-camera',
        params: {
          jobId,
          stage: 'after',
          captureMode: 'matched-after',
          beforeMediaId: before.id,
        },
      });
    },
    [jobId, router],
  );

  const openPair = useCallback(
    (pair: BeforeAfterPair) => {
      if (!jobId) return;
      router.push({ pathname: '/pair', params: { jobId, pairId: pair.id } });
    },
    [jobId, router],
  );

  const openBeforeGallery = useCallback(() => {
    if (!jobId) return;
    router.push({ pathname: '/gallery', params: { jobId, stage: 'before' } });
  }, [jobId, router]);

  if ((!jobId || !job) && !jobsLoading) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={27} color={Colors.primary} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>After Photos</Text>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.notFound}>
          <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Queue unavailable</Text>
          <Text style={styles.notFoundMessage}>
            This job is no longer available on this device.
          </Text>
          <PrimaryButton label="Return to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (!job || !jobId || !loaded) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  const visibleError = loadError ?? pairError;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to job"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={27} color={Colors.primary} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          After Photos
        </Text>
        <View style={styles.headerSide} />
      </View>

      <FlatList
        data={beforeMedia}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          beforeMedia.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={refreshing}
        onRefresh={() => void refreshQueue()}
        renderItem={({ item }) => {
          const pair = pairByBeforeId.get(item.id);
          const after = pair
            ? media.find((candidate) => candidate.id === pair.afterMediaId)
            : undefined;
          const afterMissing = Boolean(
            pair && (!after || missingMediaIds.has(pair.afterMediaId)),
          );

          return (
            <QueueItem
              before={item}
              pair={pair}
              beforeMissing={missingMediaIds.has(item.id)}
              afterMissing={afterMissing}
              compact={compact}
              onPress={() => {
                if (pair) openPair(pair);
                else openCamera(item);
              }}
            />
          );
        }}
        ListHeaderComponent={
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryText}>
                <Text style={styles.jobName}>{job.name}</Text>
                <Text style={styles.summaryCaption}>
                  {completed} of {total} after {total === 1 ? 'shot' : 'shots'} completed
                </Text>
              </View>
              <View style={styles.percentBadge}>
                <Ionicons name="camera" size={19} color={Colors.primary} />
                <Text style={styles.percentText}>{progressPercent}%</Text>
              </View>
            </View>

            <View
              accessibilityRole="progressbar"
              accessibilityLabel="After photo completion"
              accessibilityValue={{ min: 0, max: total, now: completed }}
              style={styles.progressTrack}>
              {progress > 0 ? (
                <View
                  style={[styles.progressFill, { width: `${progressPercent}%` }]}
                />
              ) : null}
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{completed} matched</Text>
              <Text style={styles.progressLabel}>{remaining} remaining</Text>
            </View>

            {visibleError ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                <Text style={styles.errorText}>{visibleError}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={39} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Capture Before photos first</Text>
            <Text style={styles.emptyMessage}>
              Every matching After starts with a Before photo from this job.
            </Text>
          </View>
        }
      />

      <View style={styles.bottomAction}>
        <PrimaryButton
          label={primaryAction.label}
          icon={
            primaryAction.kind === 'view-pair'
              ? 'images-outline'
              : primaryAction.kind === 'unavailable'
                ? 'alert-circle-outline'
                : 'camera'
          }
          disabled={primaryAction.disabled}
          accessibilityHint={
            primaryAction.kind === 'add-before'
              ? 'Opens this job’s Before gallery so you can add source photos.'
              : primaryAction.kind === 'start-next'
                ? 'Opens the first unmatched Before photo in the ghost alignment camera.'
                : primaryAction.kind === 'view-pair'
                  ? 'Opens the most recently saved Before and After comparison.'
                  : 'The remaining Before photo files are unavailable.'
          }
          onPress={() => {
            if (primaryAction.kind === 'add-before') {
              openBeforeGallery();
            } else if (primaryAction.kind === 'start-next' && nextUnmatched) {
              openCamera(nextUnmatched);
            } else if (primaryAction.kind === 'view-pair' && latestPair) {
              openPair(latestPair);
            }
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerSide: {
    width: 88,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  listContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  summarySection: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  jobName: {
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  summaryCaption: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  percentBadge: {
    minWidth: 82,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  percentText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: Spacing.md,
  },
  queueCard: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  queueCardCompact: {
    minHeight: 154,
  },
  cardPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.995 }],
  },
  cardUnavailable: {
    backgroundColor: '#FAFAFB',
  },
  thumbnail: {
    width: 104,
    minHeight: 116,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  thumbnailCompact: {
    width: 86,
    minHeight: 128,
  },
  missingThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  missingThumbnailText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  shotName: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  detailRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  matchedStatus: {
    color: Colors.after,
    fontWeight: '600',
  },
  unavailableStatus: {
    color: Colors.danger,
    fontWeight: '600',
  },
  capturedAt: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
  actionColumn: {
    minWidth: 101,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  compactAction: {
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
  },
  actionPill: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  matchedPill: {
    backgroundColor: '#EAF7EC',
  },
  takeAfterPill: {
    backgroundColor: Colors.primary,
  },
  unavailablePill: {
    backgroundColor: Colors.surfaceMuted,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  matchedPillText: {
    color: Colors.after,
  },
  takeAfterPillText: {
    color: Colors.onPrimary,
  },
  unavailablePillText: {
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 52,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: Colors.primarySoft,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyMessage: {
    maxWidth: 300,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomAction: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  notFoundTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  notFoundMessage: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
  },
  pressed: {
    opacity: 0.58,
  },
});
