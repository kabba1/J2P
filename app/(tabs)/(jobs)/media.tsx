import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PhotoMetadataForm } from '@/components/photo-metadata-form';
import { StageSegmentedControl } from '@/components/stage-segmented-control';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { usePairs } from '@/state/pairs-context';
import { JobMedia, MediaStage } from '@/types/media';
import { formatDateTime } from '@/utils/format-date';
import { stageLabel } from '@/utils/media-stage';

export default function MediaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mediaId?: string | string[];
    jobId?: string | string[];
  }>();
  const mediaId = Array.isArray(params.mediaId) ? params.mediaId[0] : params.mediaId;
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const { jobs, loading: jobsLoading } = useJobs();
  const { media, getMedia, updateMedia, deleteMedia, fileExists } = useMedia();
  const { pairs, refreshJobPairs } = usePairs();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const cached = media.find((item) => item.id === mediaId);
  const [record, setRecord] = useState<JobMedia | undefined>(cached);
  const [shotName, setShotName] = useState(cached?.shotName ?? '');
  const [note, setNote] = useState(cached?.note ?? '');
  const [stage, setStage] = useState<MediaStage>(cached?.stage ?? 'before');
  const [loading, setLoading] = useState(!cached);
  const [missingFile, setMissingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!mediaId) return;
    setLoading(true);
    setError(undefined);
    try {
      const [loaded] = await Promise.all([
        getMedia(mediaId),
        jobId ? refreshJobPairs(jobId) : Promise.resolve([]),
      ]);
      setRecord(loaded);
      if (loaded) {
        setMissingFile(!(await fileExists(loaded.localUri)));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The photo could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [fileExists, getMedia, jobId, mediaId, refreshJobPairs]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!record) return;
    setShotName(record.shotName ?? '');
    setNote(record.note ?? '');
    setStage(record.stage);
  }, [record]);

  const saveChanges = async () => {
    if (!record || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const updated = await updateMedia(record.id, { shotName, note, stage });
      if (!updated) throw new Error('This photo no longer exists.');
      router.dismissTo({ pathname: '/gallery', params: { jobId: updated.jobId, stage: updated.stage } });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Changes could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record || deleting) return;
    setDeleting(true);
    setError(undefined);
    try {
      await deleteMedia(record.id);
      setConfirmDelete(false);
      router.back();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The photo could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

  if ((!mediaId || !jobId || !job) && !jobsLoading) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Photo unavailable</Text>
          <Text style={styles.notFoundMessage}>This job or photo no longer exists.</Text>
          <PrimaryButton label="Return to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Photo Details" onBack={() => router.back()} />
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!record || !job) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Photo Details" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Photo not found</Text>
          <Text style={styles.notFoundMessage}>It may have been deleted from this job.</Text>
          <PrimaryButton label="Go Back" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const activePair = pairs.find(
    (pair) => pair.beforeMediaId === record.id || pair.afterMediaId === record.id,
  );

  return (
    <ScreenContainer>
      <ScreenHeader title="Photo Details" onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.titleBlock}>
            <Text numberOfLines={1} style={styles.jobName}>{job.name}</Text>
            <Text style={styles.photoTitle}>{shotName.trim() || 'Untitled photo'}</Text>
            <Text style={styles.captured}>{formatDateTime(record.createdAt)}</Text>
          </View>

          {missingFile ? (
            <View style={styles.missingPhoto}>
              <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.missingTitle}>Saved file missing</Text>
              <Text style={styles.missingMessage}>
                The photo information is still available, but its local image file could not be found.
              </Text>
            </View>
          ) : (
            <Image
              accessibilityLabel={record.shotName || 'Saved job photo'}
              cachePolicy="memory-disk"
              contentFit="contain"
              source={{ uri: record.localUri }}
              style={[
                styles.photo,
                record.width && record.height
                  ? { aspectRatio: record.width / record.height }
                  : undefined,
              ]}
            />
          )}

          <View style={styles.stageSection}>
            <Text style={styles.sectionTitle}>Move to stage</Text>
            <StageSegmentedControl value={stage} onChange={setStage} />
            {stage !== record.stage ? (
              <Text style={styles.stageHint}>
                This photo will move from {stageLabel(record.stage)} to {stageLabel(stage)}.
                {activePair ? ' Its Before and After pairing will also be removed.' : ''}
              </Text>
            ) : null}
          </View>

          <PhotoMetadataForm
            shotName={shotName}
            note={note}
            onChangeShotName={setShotName}
            onChangeNote={setNote}
          />

          {error ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label="Save Changes"
            icon="save-outline"
            loading={saving}
            onPress={() => void saveChanges()}
          />
          <PrimaryButton
            label="Delete Photo"
            icon="trash-outline"
            disabled={saving}
            onPress={() => setConfirmDelete(true)}
            style={styles.deleteButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete photo?"
        message={
          activePair
            ? 'This photo, its local file, and its Before and After pairing will be permanently removed from this job.'
            : 'This photo and its local file will be permanently removed from this job.'
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  titleBlock: {
    alignItems: 'center',
  },
  jobName: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  photoTitle: {
    color: Colors.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  captured: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  photo: {
    width: '100%',
    minHeight: 260,
    maxHeight: 460,
    borderRadius: Radius.md,
    backgroundColor: '#E5E7EB',
  },
  missingPhoto: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  missingTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  missingMessage: {
    maxWidth: 320,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  stageSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  stageHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
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
    marginTop: 120,
  },
});
