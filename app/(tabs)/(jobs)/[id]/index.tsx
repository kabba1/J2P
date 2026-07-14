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

type DetailRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={21} color={Colors.primary} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
  const { countsForJob, refreshJob } = useMedia();
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

  useFocusEffect(
    useCallback(() => {
      if (id) {
        void refreshJob(id).catch(() => undefined);
        void refreshGeneratedAssets(id).catch(() => undefined);
      }
    }, [id, refreshGeneratedAssets, refreshJob]),
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
  const totalPhotos = counts.before + counts.progress + counts.after;
  const generatedAssets = assetsForJob(job.id);
  const latestGeneratedAsset = generatedAssets[0];

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Job Dashboard"
        onBack={() => router.back()}
        actionLabel="Edit"
        onAction={() => router.push({ pathname: '/edit', params: { id: job.id } })}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="briefcase" size={31} color={Colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.jobName}>{job.name}</Text>
            {job.serviceType ? <Text style={styles.serviceType}>{job.serviceType}</Text> : null}
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

        <View style={styles.detailsCard}>
          {job.customer ? (
            <DetailRow icon="person-outline" label="Customer" value={job.customer} />
          ) : null}
          {job.address ? (
            <DetailRow icon="location-outline" label="Address" value={job.address} />
          ) : null}
          {job.serviceType ? (
            <DetailRow icon="construct-outline" label="Service" value={job.serviceType} />
          ) : null}
          <DetailRow icon="calendar-outline" label="Created" value={formatDate(job.createdAt)} />
          {job.notes ? (
            <DetailRow icon="document-text-outline" label="Notes" value={job.notes} />
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Capture Progress</Text>
            <Text style={styles.sectionSubtitle}>Keep every job stage organized.</Text>
          </View>
          <Text style={styles.totalCount}>
            {totalPhotos} {totalPhotos === 1 ? 'photo' : 'photos'}
          </Text>
        </View>

        <View style={styles.stageRow}>
          <StageCard
            stage="Before"
            count={counts.before}
            onPress={() => openGallery('before')}
          />
          <StageCard
            stage="Progress"
            count={counts.progress}
            onPress={() => openGallery('progress')}
          />
          <StageCard
            stage="After"
            count={counts.after}
            onPress={() => openGallery('after')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Match After photos"
          accessibilityHint="Open the list of Before photos that need matching After photos"
          onPress={openAfterQueue}
          style={({ pressed }) => [styles.matchCard, pressed && styles.matchCardPressed]}>
          <View style={styles.matchIcon}>
            <Ionicons name="copy-outline" size={27} color={Colors.primary} />
          </View>
          <View style={styles.matchText}>
            <Text style={styles.matchTitle}>Match After Photos</Text>
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
            <View style={styles.generatedCountBadge}>
              <Text style={styles.generatedCountText}>{generatedAssets.length}</Text>
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

        <View style={styles.shotSection}>
          <Text style={styles.sectionTitle}>Shot List</Text>
          <View style={styles.emptyShots}>
            <Ionicons name="images-outline" size={34} color={Colors.textMuted} />
            <Text style={styles.emptyShotTitle}>
              {totalPhotos === 0 ? 'No shots yet' : `${totalPhotos} saved ${totalPhotos === 1 ? 'photo' : 'photos'}`}
            </Text>
            <Text style={styles.emptyShotMessage}>
              {totalPhotos === 0
                ? 'Choose Before, Progress, or After to start documenting this job.'
                : 'Open a stage above to view, edit, or add photos.'}
            </Text>
          </View>
        </View>

        <PrimaryButton
          label="Start Capture"
          icon="camera"
          onPress={() => openGallery('before')}
        />

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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  heroText: {
    flex: 1,
  },
  jobName: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  serviceType: {
    color: Colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: Spacing.xs,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#B7D1FF',
    backgroundColor: Colors.primarySoft,
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
  detailsCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  detailRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  detailValue: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
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
  totalCount: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  stageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  matchCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#B7D1FF',
    backgroundColor: Colors.primarySoft,
  },
  matchCardPressed: {
    opacity: 0.72,
  },
  matchIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Colors.surface,
  },
  matchText: {
    flex: 1,
  },
  matchTitle: {
    color: Colors.text,
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
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  generatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  generatedCountBadge: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  generatedCountText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
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
  shotSection: {
    gap: Spacing.md,
  },
  emptyShots: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  emptyShotTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyShotMessage: {
    maxWidth: 300,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
