import Ionicons from '@expo/vector-icons/Ionicons';
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

import { MediaGridItem } from '@/components/media-grid-item';
import { StageSegmentedControl } from '@/components/stage-segmented-control';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { JobMedia, MediaStage } from '@/types/media';
import { isMediaStage, stageCaptureLabel, stageLabel } from '@/utils/media-stage';

export default function StageGalleryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    stage?: string | string[];
  }>();
  const rawJobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const rawStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const stage: MediaStage | undefined = isMediaStage(rawStage) ? rawStage : undefined;
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;
  const { jobs, loading: jobsLoading } = useJobs();
  const {
    media,
    loadingJobIds,
    error,
    refreshJob,
    deleteMedia,
    fileExists,
  } = useMedia();
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<JobMedia>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const job = jobs.find((candidate) => candidate.id === rawJobId);

  const refreshGallery = useCallback(async () => {
    if (!rawJobId) return;
    const records = await refreshJob(rawJobId);
    const checks = await Promise.all(
      records.map(async (record) => ({ id: record.id, exists: await fileExists(record.localUri) })),
    );
    setMissingIds(new Set(checks.filter((check) => !check.exists).map((check) => check.id)));
  }, [fileExists, rawJobId, refreshJob]);

  useFocusEffect(
    useCallback(() => {
      void refreshGallery().catch(() => undefined);
    }, [refreshGallery]),
  );

  const stageMedia = useMemo(
    () =>
      stage && rawJobId
        ? media
            .filter((item) => item.jobId === rawJobId && item.stage === stage)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    [media, rawJobId, stage],
  );

  const changeStage = (nextStage: MediaStage) => {
    if (!rawJobId) return;
    router.setParams({ jobId: rawJobId, stage: nextStage });
  };

  const openCamera = () => {
    if (!rawJobId || !stage) return;
    router.push({ pathname: '/job-camera', params: { jobId: rawJobId, stage } });
  };

  const openAfterQueue = () => {
    if (!rawJobId) return;
    router.push({ pathname: '/after-queue', params: { jobId: rawJobId } });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteMedia(pendingDelete.id);
      setPendingDelete(undefined);
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error ? caughtError.message : 'The photo could not be deleted.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if ((!rawJobId || !stage || !job) && !jobsLoading) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Gallery unavailable</Text>
          <Text style={styles.notFoundMessage}>
            This job or photo stage is no longer available.
          </Text>
          <PrimaryButton label="Return to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (!job || !stage || !rawJobId) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={Colors.primary} size="large" style={styles.centerLoader} />
      </ScreenContainer>
    );
  }

  const loading = loadingJobIds.has(rawJobId) && stageMedia.length === 0;
  const label = stageLabel(stage);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to job"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={27} color={Colors.primary} />
          <Text numberOfLines={1} style={styles.jobName}>
            {job.name}
          </Text>
        </Pressable>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        key={columns}
        data={stageMedia}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={[styles.content, stageMedia.length === 0 && styles.emptyContent]}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <MediaGridItem
              media={item}
              missing={missingIds.has(item.id)}
              onLongPress={() => setPendingDelete(item)}
              onPress={() =>
                router.push({ pathname: '/media', params: { mediaId: item.id, jobId: job.id } })
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <StageSegmentedControl value={stage} onChange={changeStage} />
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>
                {stageMedia.length} {label} {stageMedia.length === 1 ? 'photo' : 'photos'}
              </Text>
              <Text style={styles.longPressHint}>Long press a photo to delete</Text>
            </View>
            {error ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {deleteError ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={styles.centerLoader} />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="camera-outline" size={38} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {label} photos yet</Text>
              <Text style={styles.emptyMessage}>
                Capture your first {label.toLowerCase()} photo for {job.name}.
              </Text>
            </View>
          )
        }
      />

      <View style={styles.bottomAction}>
        {stage === 'after' ? (
          <PrimaryButton
            label="Match Before Photos"
            icon="copy-outline"
            onPress={openAfterQueue}
          />
        ) : null}
        <PrimaryButton label={stageCaptureLabel(stage)} icon="camera" onPress={openCamera} />
      </View>

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Delete photo?"
        message="This photo and its saved file will be removed from this device."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => void handleDelete()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  headerSide: {
    width: 120,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobName: {
    flex: 1,
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 120,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyContent: {
    flexGrow: 1,
  },
  listHeader: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  countLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  longPressHint: {
    flexShrink: 1,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  gridRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 72,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: Colors.primarySoft,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  emptyMessage: {
    maxWidth: 300,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bottomAction: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
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
  centerLoader: {
    marginTop: Spacing.xxl,
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
  pressed: {
    opacity: 0.58,
  },
});
