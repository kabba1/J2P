import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PhotoMetadataForm } from '@/components/photo-metadata-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { MediaStage } from '@/types/media';
import { formatDateTime } from '@/utils/format-date';
import { isMediaStage, stageLabel } from '@/utils/media-stage';

function parseOptionalNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export default function ReviewPhotoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    stage?: string | string[];
    tempUri?: string | string[];
    width?: string | string[];
    height?: string | string[];
    facing?: string | string[];
    zoom?: string | string[];
    capturedAt?: string | string[];
  }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const rawStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const stage: MediaStage | undefined = isMediaStage(rawStage) ? rawStage : undefined;
  const tempUri = Array.isArray(params.tempUri) ? params.tempUri[0] : params.tempUri;
  const width = parseOptionalNumber(params.width);
  const height = parseOptionalNumber(params.height);
  const zoom = parseOptionalNumber(params.zoom);
  const facingParam = Array.isArray(params.facing) ? params.facing[0] : params.facing;
  const facing = facingParam === 'front' || facingParam === 'back' ? facingParam : undefined;
  const capturedParam = Array.isArray(params.capturedAt) ? params.capturedAt[0] : params.capturedAt;
  const capturedAt = capturedParam && !Number.isNaN(Date.parse(capturedParam))
    ? new Date(capturedParam).toISOString()
    : new Date().toISOString();
  const { jobs, loading: jobsLoading } = useJobs();
  const { saveCapturedPhoto, fileExists, discardTemporaryCapture } = useMedia();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const [shotName, setShotName] = useState('');
  const [note, setNote] = useState('');
  const [savingAction, setSavingAction] = useState<'use' | 'another'>();
  const [error, setError] = useState<string>();
  const [tempExists, setTempExists] = useState<boolean>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!tempUri) {
      setTempExists(false);
      return;
    }
    void fileExists(tempUri).then(setTempExists).catch(() => setTempExists(false));
  }, [fileExists, tempUri]);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !job ||
      !stage ||
      !tempUri ||
      tempExists !== true
    ) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!savingAction) setConfirmDiscard(true);
      return true;
    });
    return () => subscription.remove();
  }, [job, savingAction, stage, tempExists, tempUri]);

  const discardAndBack = useCallback(async () => {
    if (tempUri) await discardTemporaryCapture(tempUri);
    setConfirmDiscard(false);
    router.back();
  }, [discardTemporaryCapture, router, tempUri]);

  const save = async (action: 'use' | 'another') => {
    if (!job || !jobId || !stage || !tempUri || savingAction) return;
    setSavingAction(action);
    setError(undefined);
    try {
      await saveCapturedPhoto({
        tempUri,
        jobId,
        stage,
        capturedAt,
        shotName,
        note,
        width,
        height,
        cameraFacing: facing,
        zoom,
      });
      if (action === 'another') router.back();
      else router.dismiss(2);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The photo could not be saved.');
    } finally {
      setSavingAction(undefined);
    }
  };

  if ((!jobId || !stage || !tempUri || !job) && !jobsLoading) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Photo unavailable</Text>
          <Text style={styles.notFoundMessage}>
            The temporary photo, job, or stage is no longer available.
          </Text>
          <PrimaryButton label="Return to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (!job || !stage || !tempUri || tempExists === undefined) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!tempExists) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Review Photo" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.notFoundTitle}>Captured photo missing</Text>
          <Text style={styles.notFoundMessage}>
            The temporary photo could not be found. Return to the camera and try again.
          </Text>
          <PrimaryButton label="Return to Camera" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const label = stageLabel(stage);

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Review Photo"
        onBack={() => setConfirmDiscard(true)}
        actionLabel="Cancel"
        onAction={() => setConfirmDiscard(true)}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text numberOfLines={1} style={styles.jobName}>{job.name}</Text>
          <Image
            accessibilityLabel={`Captured ${label} photo`}
            contentFit="contain"
            source={{ uri: tempUri }}
            style={[styles.photo, width && height ? { aspectRatio: width / height } : undefined]}
          />

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="layers-outline" size={22} color={Colors.primary} />
              <Text style={styles.summaryLabel}>Stage</Text>
              <Text style={styles.summaryValue}>{label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
              <Text style={styles.summaryLabel}>Captured</Text>
              <Text style={styles.summaryValue}>{formatDateTime(capturedAt)}</Text>
            </View>
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

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use photo"
              accessibilityState={{ busy: savingAction === 'use' }}
              disabled={Boolean(savingAction)}
              onPress={() => void save('use')}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
              {savingAction === 'use' ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Ionicons name="checkmark-circle" size={31} color={Colors.onPrimary} />
              )}
              <Text style={styles.primaryTitle}>Use Photo</Text>
              <Text style={styles.primaryCaption}>Keep this photo</Text>
            </Pressable>
            <View style={styles.secondaryActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retake photo"
                disabled={Boolean(savingAction)}
                onPress={() => void discardAndBack()}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                <Ionicons name="refresh" size={24} color={Colors.primary} />
                <View style={styles.secondaryText}>
                  <Text style={styles.secondaryTitle}>Retake</Text>
                  <Text style={styles.secondaryCaption}>Capture again</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save and take another photo"
                accessibilityState={{ busy: savingAction === 'another' }}
                disabled={Boolean(savingAction)}
                onPress={() => void save('another')}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                {savingAction === 'another' ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={25} color={Colors.primary} />
                )}
                <View style={styles.secondaryText}>
                  <Text style={styles.secondaryTitle}>Take Another</Text>
                  <Text style={styles.secondaryCaption}>Save and continue</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDiscard}
        title="Discard this photo?"
        message="This capture has not been saved to the job yet."
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => void discardAndBack()}
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
    paddingHorizontal: 20,
    paddingBottom: Spacing.xxl,
  },
  jobName: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    minHeight: 250,
    maxHeight: 430,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  summaryCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: Spacing.lg,
  },
  summaryRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    width: 72,
    color: Colors.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    gap: Spacing.sm,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  primaryAction: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  secondaryTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryText: {
    minWidth: 0,
  },
  secondaryCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  primaryTitle: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryCaption: {
    color: Colors.onPrimary,
    fontSize: 11,
    lineHeight: 15,
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
  pressed: {
    opacity: 0.68,
  },
});
