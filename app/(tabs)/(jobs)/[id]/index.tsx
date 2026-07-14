import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ComponentProps, useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StageCard } from '@/components/stage-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { GeneratedAsset } from '@/types/generated-asset';
import { MediaStage } from '@/types/media';
import { formatDate } from '@/utils/format-date';
import {
  getNextCaptureStage,
  selectLatestJobMedia,
} from '@/utils/job-dashboard-presentation';
import { stageLabel } from '@/utils/media-stage';

type MetadataRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

const stageColors = {
  before: Colors.before,
  progress: Colors.progress,
  after: Colors.after,
} as const;

function MetadataRow({ icon, label, value }: MetadataRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons accessible={false} name={icon} size={16} color={Colors.textMuted} />
      <Text
        accessibilityLabel={`${label}: ${value}`}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function assetDescription(asset: GeneratedAsset): string {
  const format = asset.format === 'square' ? 'Square 1:1' : 'Portrait 4:5';
  const layout = asset.layout === 'side-by-side' ? 'Side by Side' : 'Stacked';
  return `${format} / ${layout}`;
}

export default function JobDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { jobs, loading, archiveJob, restoreJob, deleteJob } = useJobs();
  const { media, countsForJob, fileExists, refreshJob } = useMedia();
  const {
    assetsForJob,
    refreshJob: refreshGeneratedAssets,
  } = useGeneratedAssets();
  const job = jobs.find((candidate) => candidate.id === id);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string>();
  const [jobOptionsExpanded, setJobOptionsExpanded] = useState(false);
  const [unavailableMediaIds, setUnavailableMediaIds] = useState<Set<string>>(new Set());

  const markMediaUnavailable = useCallback((mediaId: string) => {
    setUnavailableMediaIds((current) => {
      if (current.has(mediaId)) return current;
      return new Set([...current, mediaId]);
    });
  }, []);

  const refreshDashboardMedia = useCallback(async (jobId: string) => {
    const records = await refreshJob(jobId);
    const checks = await Promise.all(
      records.map(async (item) => ({
        id: item.id,
        exists: await fileExists(item.localUri).catch(() => false),
      })),
    );
    setUnavailableMediaIds(
      new Set(checks.filter((check) => !check.exists).map((check) => check.id)),
    );
  }, [fileExists, refreshJob]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        void refreshDashboardMedia(id).catch(() => undefined);
        void refreshGeneratedAssets(id).catch(() => undefined);
      }
    }, [id, refreshDashboardMedia, refreshGeneratedAssets]),
  );

  const openGallery = (stage: MediaStage) => {
    if (!job) return;
    router.push({ pathname: '/gallery', params: { jobId: job.id, stage } });
  };

  const openAfterQueue = () => {
    if (!job) return;
    router.push({ pathname: '/after-queue', params: { jobId: job.id } });
  };

  const openContent = () => {
    router.push('/content');
  };

  const openGeneratedAsset = (assetId: string) => {
    router.push({ pathname: '/generated-asset', params: { assetId } });
  };

  const confirmDelete = () => {
    if (!job) return;
    setDeleteError(undefined);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (!job || deleting) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      const deleted = await deleteJob(job.id);
      if (!deleted) {
        setDeleteError('The job could not be deleted. Please try again.');
        return;
      }
      setDeleteVisible(false);
      router.replace('/');
    } catch {
      setDeleteError(
        'The job could not be deleted safely. Your job was kept. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!job || lifecycleBusy || job.archivedAt) return;
    setLifecycleBusy(true);
    setLifecycleError(undefined);
    try {
      const archived = await archiveJob(job.id);
      if (!archived) {
        setLifecycleError('The job could not be archived. Please try again.');
        setArchiveVisible(false);
        return;
      }
      setArchiveVisible(false);
      router.replace('/');
    } catch {
      setLifecycleError('The job could not be archived safely. Nothing was deleted.');
      setArchiveVisible(false);
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!job || lifecycleBusy || !job.archivedAt) return;
    setLifecycleBusy(true);
    setLifecycleError(undefined);
    try {
      const restored = await restoreJob(job.id);
      if (!restored) {
        setLifecycleError('The job could not be restored. Please try again.');
      }
    } catch {
      setLifecycleError('The job could not be restored. Please try again.');
    } finally {
      setLifecycleBusy(false);
    }
  };

  if (!job && !loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Job" onBack={() => router.replace('/')} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>This job isn’t available</Text>
          <Text style={styles.notFoundMessage}>It may have been deleted from this device.</Text>
          <PrimaryButton label="Back to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Job" onBack={() => router.back()} />
      </ScreenContainer>
    );
  }

  const counts = countsForJob(job.id);
  const latestMedia = selectLatestJobMedia(media, job.id);
  const recentMedia = media
    .filter((item) => item.jobId === job.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3);
  const nextCaptureStage = getNextCaptureStage(counts);
  const nextCaptureLabel = stageLabel(nextCaptureStage);
  const generatedAssets = assetsForJob(job.id);
  const latestGeneratedAsset = generatedAssets[0];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroMedia}>
            {latestMedia && !unavailableMediaIds.has(latestMedia.id) ? (
              <Image
                accessible={false}
                cachePolicy="memory-disk"
                contentFit="cover"
                onError={() => markMediaUnavailable(latestMedia.id)}
                source={{ uri: latestMedia.localUri }}
                style={styles.heroImage}
              />
            ) : (
              <View style={styles.heroFallback}>
                <Ionicons
                  accessible={false}
                  name="camera-outline"
                  size={54}
                  color={Colors.textMuted}
                />
              </View>
            )}
            {latestMedia && !unavailableMediaIds.has(latestMedia.id) ? (
              <View style={styles.heroScrim} />
            ) : null}
            <View style={styles.heroTopBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={8}
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.heroTopButton,
                  pressed && styles.heroTopButtonPressed,
                ]}>
                <Ionicons name="chevron-back" size={28} color={Colors.text} />
              </Pressable>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.heroTopTitle}>
                Job Dashboard
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit job"
                hitSlop={8}
                onPress={() => router.push({ pathname: '/edit', params: { id: job.id } })}
                style={({ pressed }) => [
                  styles.heroTopButton,
                  pressed && styles.heroTopButtonPressed,
                ]}>
                <Ionicons name="create-outline" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <View style={styles.heroContent}>
              {!latestMedia || unavailableMediaIds.has(latestMedia.id) ? (
                <View style={styles.heroStatus}>
                  <Ionicons
                    accessible={false}
                    name="image-outline"
                    size={16}
                    color={Colors.textMuted}
                  />
                  {latestMedia ? (
                    <Text maxFontSizeMultiplier={1.2} style={styles.heroStatusText}>
                      Photo unavailable
                    </Text>
                  ) : (
                    <Text maxFontSizeMultiplier={1.2} style={styles.heroStatusText}>
                      No job photos yet
                    </Text>
                  )}
                </View>
              ) : null}
              <Text
                accessibilityLabel={job.name}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
                style={styles.jobName}>
                {job.name}
              </Text>
              <View style={styles.heroMetadata}>
                {job.serviceType ? (
                  <MetadataRow icon="construct-outline" label="Service" value={job.serviceType} />
                ) : null}
                {job.customer ? (
                  <MetadataRow icon="person-outline" label="Customer" value={job.customer} />
                ) : null}
                {job.address ? (
                  <MetadataRow icon="location-outline" label="Address" value={job.address} />
                ) : null}
                <MetadataRow
                  icon="calendar-outline"
                  label="Created"
                  value={formatDate(job.createdAt)}
                />
              </View>
            </View>
          </View>
        </View>

        {job.archivedAt ? (
          <View style={styles.archivedBanner}>
            <Ionicons name="archive-outline" size={24} color={Colors.primary} />
            <View style={styles.archivedText}>
              <Text style={styles.archivedTitle}>Archived job</Text>
              <Text style={styles.archivedMessage}>
                Every original photo, saved pair, and generated post is still here. Restore this job to return it to Active.
              </Text>
              {lifecycleError ? (
                <View accessibilityRole="alert" style={styles.lifecycleError}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                  <Text style={styles.lifecycleErrorText}>{lifecycleError}</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore job"
                accessibilityState={{ busy: lifecycleBusy, disabled: lifecycleBusy }}
                disabled={lifecycleBusy}
                onPress={() => void handleRestore()}
                style={({ pressed }) => [
                  styles.restoreButton,
                  pressed && !lifecycleBusy && styles.generatedPressed,
                ]}>
                {lifecycleBusy ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Ionicons name="refresh-outline" size={19} color={Colors.primary} />
                )}
                <Text style={styles.restoreButtonLabel}>Restore Job</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.stageRow}>
          <StageCard
            stage="Before"
            count={counts.before}
            onPress={() => openGallery('before')}
          />
          <View style={styles.stageDivider} />
          <StageCard
            stage="Progress"
            count={counts.progress}
            onPress={() => openGallery('progress')}
          />
          <View style={styles.stageDivider} />
          <StageCard
            stage="After"
            count={counts.after}
            onPress={() => openGallery('after')}
          />
        </View>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent shots</Text>
            {recentMedia.length > 0 ? (
              <Text style={styles.recentCount}>
                Latest {recentMedia.length}
              </Text>
            ) : null}
          </View>
          {recentMedia.length > 0 ? (
            <View style={styles.recentList}>
              {recentMedia.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.shotName || `${stageLabel(item.stage)} photo`}${
                    unavailableMediaIds.has(item.id) ? '. Photo unavailable' : ''
                  }`}
                  accessibilityHint="View or manage this photo"
                  onPress={() =>
                    router.push({
                      pathname: '/media',
                      params: { mediaId: item.id, jobId: job.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.recentRow,
                    pressed && styles.generatedPressed,
                  ]}>
                  {unavailableMediaIds.has(item.id) ? (
                    <View style={styles.recentThumbnailFallback}>
                      <Ionicons name="image-outline" size={25} color={Colors.textTertiary} />
                    </View>
                  ) : (
                    <Image
                      accessible={false}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      onError={() => markMediaUnavailable(item.id)}
                      source={{ uri: item.localUri }}
                      style={styles.recentThumbnail}
                    />
                  )}
                  <View style={styles.recentText}>
                    <Text numberOfLines={1} style={styles.recentTitle}>
                      {item.shotName || 'Untitled photo'}
                    </Text>
                    <Text
                      style={[
                        styles.recentStage,
                        { color: stageColors[item.stage] },
                      ]}>
                      {stageLabel(item.stage)}
                    </Text>
                    <Text style={styles.recentDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={21} color={Colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.recentEmpty}>
              <Ionicons name="camera-outline" size={25} color={Colors.textTertiary} />
              <Text style={styles.recentEmptyText}>
                Your latest job photos will appear here after capture.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue capture. Next: ${nextCaptureLabel}`}
          accessibilityHint={`Open the ${nextCaptureLabel} photo gallery`}
          onPress={() => openGallery(nextCaptureStage)}
          style={({ pressed }) => [
            styles.continueCaptureButton,
            pressed && styles.continueCapturePressed,
          ]}>
          <Ionicons name="camera" size={27} color={Colors.onPrimary} />
          <View style={styles.continueCaptureText}>
            <Text style={styles.continueCaptureTitle}>Continue capture</Text>
            <Text style={styles.continueCaptureSubtitle}>Next: {nextCaptureLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={23} color={Colors.onPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Match after photos"
          accessibilityHint="Open the list of Before photos that need matching After photos"
          onPress={openAfterQueue}
          style={({ pressed }) => [styles.matchCard, pressed && styles.matchCardPressed]}>
          <View style={styles.matchIcon}>
            <Ionicons name="copy-outline" size={27} color={Colors.primary} />
          </View>
          <View style={styles.matchText}>
            <Text style={styles.matchTitle}>Match after photos</Text>
            <Text style={styles.matchMessage}>
              Recreate each Before angle with a guided camera overlay.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={23} color={Colors.primary} />
        </Pressable>

        <View style={styles.generatedSection}>
          <View style={styles.generatedHeader}>
            <View>
              <Text style={styles.sectionTitle}>Generated Content</Text>
              <Text style={styles.sectionSubtitle}>
                {generatedAssets.length} {generatedAssets.length === 1 ? 'post' : 'posts'} from this job
              </Text>
            </View>
          </View>

          {latestGeneratedAsset ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open latest generated post for this job"
              onPress={() => openGeneratedAsset(latestGeneratedAsset.id)}
              style={({ pressed }) => [
                styles.latestGeneratedRow,
                pressed && styles.generatedPressed,
              ]}>
              <Image
                accessibilityLabel="Latest generated Before and After post"
                cachePolicy="memory-disk"
                contentFit="cover"
                source={{ uri: latestGeneratedAsset.localUri }}
                style={styles.latestGeneratedThumbnail}
              />
              <View style={styles.latestGeneratedText}>
                <Text numberOfLines={1} style={styles.latestGeneratedTitle}>
                  {latestGeneratedAsset.sourceShotName || 'Latest post'}
                </Text>
                <Text numberOfLines={1} style={styles.latestGeneratedMetadata}>
                  {assetDescription(latestGeneratedAsset)}
                </Text>
                <Text numberOfLines={1} style={styles.latestGeneratedDate}>
                  Created {formatDate(latestGeneratedAsset.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.noGeneratedContent}>
              <Ionicons name="image-outline" size={27} color={Colors.textMuted} />
              <Text style={styles.noGeneratedContentText}>
                Create a saved Before and After pair, then turn it into a finished post.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Content"
            onPress={openContent}
            style={({ pressed }) => [
              styles.openContentButton,
              pressed && styles.generatedPressed,
            ]}>
            <Ionicons name="layers-outline" size={20} color={Colors.primary} />
            <Text style={styles.openContentLabel}>Open Content</Text>
          </Pressable>
        </View>

        {job.notes ? (
          <View style={styles.notesRegion}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={19} color={Colors.textMuted} />
              <Text style={styles.notesTitle}>Job notes</Text>
            </View>
            <Text style={styles.notesText}>{job.notes}</Text>
          </View>
        ) : null}

        <View style={styles.jobOptionsSection}>
          {!job.archivedAt && lifecycleError ? (
            <View accessibilityRole="alert" style={styles.lifecycleError}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
              <Text style={styles.lifecycleErrorText}>{lifecycleError}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Job options"
            accessibilityHint="Shows archive and delete actions"
            accessibilityState={{ expanded: jobOptionsExpanded }}
            onPress={() => setJobOptionsExpanded((current) => !current)}
            style={({ pressed }) => [
              styles.jobOptionsToggle,
              pressed && styles.generatedPressed,
            ]}>
            <View style={styles.jobOptionsToggleLabel}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color={Colors.textMuted} />
              <Text style={styles.jobOptionsText}>Job options</Text>
            </View>
            <Ionicons
              name={jobOptionsExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={Colors.textMuted}
            />
          </Pressable>
          {jobOptionsExpanded ? (
            <View style={styles.jobOptionsPanel}>
              {!job.archivedAt ? (
                <PrimaryButton
                  label="Archive Job"
                  icon="archive-outline"
                  loading={lifecycleBusy}
                  onPress={() => {
                    setLifecycleError(undefined);
                    setArchiveVisible(true);
                  }}
                />
              ) : null}
              <PrimaryButton
                label="Delete Job"
                icon="trash-outline"
                onPress={confirmDelete}
                style={styles.deleteButton}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={archiveVisible}
        title="Archive this job?"
        message={`“${job.name}” will move out of Active Jobs. Its original photos, saved pairs, and generated posts will stay on this device.`}
        confirmLabel="Archive"
        busy={lifecycleBusy}
        onCancel={() => {
          if (!lifecycleBusy) setArchiveVisible(false);
        }}
        onConfirm={() => void handleArchive()}
      />
      <Modal
        animationType="fade"
        transparent
        visible={deleteVisible}
        onRequestClose={() => {
          if (!deleting) setDeleteVisible(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete job?</Text>
            <Text style={styles.modalMessage}>
              “{job.name}”, its original photos, saved pairs, and generated posts will be permanently removed from this device.
            </Text>
            {deleteError ? (
              <View accessibilityRole="alert" style={styles.modalError}>
                <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{deleteError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
                accessibilityState={{ disabled: deleting }}
                disabled={deleting}
                onPress={() => {
                  setDeleteError(undefined);
                  setDeleteVisible(false);
                }}
                style={({ pressed }) => [styles.modalButton, pressed && styles.modalPressed]}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm delete job"
                accessibilityState={{ busy: deleting, disabled: deleting }}
                disabled={deleting}
                onPress={() => void handleDelete()}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.confirmButton,
                  pressed && styles.modalPressed,
                ]}>
                {deleting ? (
                  <ActivityIndicator color={Colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.confirmLabel}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: Spacing.xxl,
    gap: 14,
  },
  hero: {
    width: 'auto',
    marginHorizontal: -20,
    marginTop: -20,
    backgroundColor: Colors.surfaceRaised,
  },
  heroMedia: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceRaised,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceRaised,
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 82,
    backgroundColor: Colors.surfaceRaised,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    backgroundColor: 'rgba(15, 20, 27, 0.22)',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 2,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15, 20, 27, 0.76)',
  },
  heroTopButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(27, 36, 48, 0.88)',
  },
  heroTopButtonPressed: {
    opacity: 0.62,
  },
  heroTopTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroContent: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 20, 27, 0.90)',
  },
  heroStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroStatusText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  jobName: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  heroMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: Spacing.xs,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  archivedText: {
    flex: 1,
    gap: 2,
  },
  archivedTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  archivedMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  restoreButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    marginTop: Spacing.sm,
  },
  restoreButtonLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  notesRegion: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notesTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notesText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailValue: {
    flexShrink: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  stageRow: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  stageDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: Spacing.lg,
    backgroundColor: Colors.border,
  },
  recentSection: {
    gap: Spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  recentCount: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  recentList: {
    overflow: 'hidden',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  recentRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  recentThumbnail: {
    width: 88,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
  },
  recentThumbnailFallback: {
    width: 88,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  recentText: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  recentStage: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recentDate: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  recentEmpty: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  recentEmptyText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  continueCaptureButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  continueCapturePressed: {
    backgroundColor: Colors.primaryPressed,
  },
  continueCaptureText: {
    flex: 1,
  },
  continueCaptureTitle: {
    color: Colors.onPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  continueCaptureSubtitle: {
    color: Colors.onPrimary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  matchCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  matchCardPressed: {
    opacity: 0.72,
  },
  matchIcon: {
    width: 32,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchText: {
    flex: 1,
  },
  matchTitle: {
    color: Colors.primary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  matchMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  generatedSection: {
    gap: Spacing.md,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  generatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  latestGeneratedRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  latestGeneratedThumbnail: {
    width: 74,
    height: 74,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  latestGeneratedText: {
    flex: 1,
    minWidth: 0,
  },
  latestGeneratedTitle: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  latestGeneratedMetadata: {
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  latestGeneratedDate: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 1,
  },
  noGeneratedContent: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  noGeneratedContentText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  openContentButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  openContentLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  generatedPressed: {
    opacity: 0.64,
  },
  jobOptionsSection: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  jobOptionsToggle: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  jobOptionsToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobOptionsText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  jobOptionsPanel: {
    gap: Spacing.sm,
  },
  lifecycleError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dangerSoft,
  },
  lifecycleErrorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  notFoundTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundMessage: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(11, 18, 32, 0.48)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerSoft,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  modalMessage: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modalError: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dangerSoft,
    marginTop: Spacing.lg,
  },
  modalErrorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmButton: {
    borderColor: Colors.danger,
    backgroundColor: Colors.danger,
  },
  cancelLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmLabel: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  modalPressed: {
    opacity: 0.7,
  },
});
