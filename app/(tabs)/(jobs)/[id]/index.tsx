import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StageCard } from '@/components/stage-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
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

export default function JobDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { jobs, loading, deleteJob } = useJobs();
  const { countsForJob, refreshJob } = useMedia();
  const job = jobs.find((candidate) => candidate.id === id);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id) void refreshJob(id).catch(() => undefined);
    }, [id, refreshJob]),
  );

  const openGallery = (stage: MediaStage) => {
    if (!job) return;
    router.push({ pathname: '/gallery', params: { jobId: job.id, stage } });
  };

  const confirmDelete = () => {
    if (!job) return;
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (!job) return;
    await deleteJob(job.id);
    setDeleteVisible(false);
    router.replace('/');
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

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Job actions</Text>
          <PrimaryButton
            label="Delete Job"
            icon="trash-outline"
            onPress={confirmDelete}
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={deleteVisible}
        onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete job?</Text>
            <Text style={styles.modalMessage}>
              “{job.name}” and its job details will be removed from this device.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
                onPress={() => setDeleteVisible(false)}
                style={({ pressed }) => [styles.modalButton, pressed && styles.modalPressed]}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm delete job"
                onPress={() => void handleDelete()}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.confirmButton,
                  pressed && styles.modalPressed,
                ]}>
                <Text style={styles.confirmLabel}>Delete</Text>
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
  dangerZone: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  dangerTitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
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
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  modalPressed: {
    opacity: 0.7,
  },
});
