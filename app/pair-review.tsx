import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ComparisonMode, ComparisonView } from '@/components/comparison-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { JobMedia } from '@/types/media';
import { formatDateTime } from '@/utils/format-date';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function optionalNumber(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default function PairReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    beforeMediaId?: string | string[];
    pairId?: string | string[];
    tempUri?: string | string[];
    width?: string | string[];
    height?: string | string[];
    facing?: string | string[];
    zoom?: string | string[];
    capturedAt?: string | string[];
  }>();
  const jobId = first(params.jobId);
  const beforeMediaId = first(params.beforeMediaId);
  const replacePairId = first(params.pairId);
  const tempUri = first(params.tempUri);
  const width = optionalNumber(params.width);
  const height = optionalNumber(params.height);
  const zoom = optionalNumber(params.zoom);
  const facingParam = first(params.facing);
  const cameraFacing = facingParam === 'front' || facingParam === 'back' ? facingParam : undefined;
  const capturedParam = first(params.capturedAt);
  const capturedAt = capturedParam && !Number.isNaN(Date.parse(capturedParam))
    ? new Date(capturedParam).toISOString()
    : new Date().toISOString();
  const { jobs, loading: jobsLoading } = useJobs();
  const { media, getMedia, fileExists, discardTemporaryCapture, saveMatchedAfter } = useMedia();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const [before, setBefore] = useState<JobMedia | undefined>(
    media.find((item) => item.id === beforeMediaId),
  );
  const [loading, setLoading] = useState(true);
  const [filesReady, setFilesReady] = useState(false);
  const [mode, setMode] = useState<ComparisonMode>('slider');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const approvalInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!beforeMediaId || !tempUri) {
        if (active) {
          setFilesReady(false);
          setLoading(false);
        }
        return;
      }
      try {
        const record = await getMedia(beforeMediaId);
        const validBefore = record && record.jobId === jobId && record.stage === 'before'
          ? record
          : undefined;
        const [beforeExists, afterExists] = await Promise.all([
          validBefore ? fileExists(validBefore.localUri) : Promise.resolve(false),
          fileExists(tempUri),
        ]);
        if (active) {
          setBefore(validBefore);
          setFilesReady(Boolean(validBefore && beforeExists && afterExists));
        }
      } catch {
        if (active) setFilesReady(false);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [beforeMediaId, fileExists, getMedia, jobId, tempUri]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !tempUri) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) setConfirmDiscard(true);
      return true;
    });
    return () => subscription.remove();
  }, [saving, tempUri]);

  const discardAndReturn = useCallback(async () => {
    if (tempUri) await discardTemporaryCapture(tempUri);
    setConfirmDiscard(false);
    router.dismiss(2);
  }, [discardTemporaryCapture, router, tempUri]);

  const retake = async () => {
    if (!tempUri || saving) return;
    await discardTemporaryCapture(tempUri);
    router.back();
  };

  const approve = async () => {
    if (
      approvalInFlight.current ||
      saving ||
      !before ||
      !jobId ||
      !tempUri ||
      !filesReady
    ) {
      return;
    }
    approvalInFlight.current = true;
    setSaving(true);
    setError(undefined);
    try {
      await saveMatchedAfter({
        tempUri,
        jobId,
        beforeMediaId: before.id,
        replacePairId,
        capturedAt,
        shotName: before.shotName,
        width,
        height,
        cameraFacing,
        zoom,
      });
      router.dismiss(2);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The matched After photo could not be saved.',
      );
      setSaving(false);
      approvalInFlight.current = false;
    }
  };

  if (loading || (!job && jobsLoading)) {
    return (
      <>
        <ScreenContainer>
          <ScreenHeader title="Review Pair" />
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        </ScreenContainer>
        <ConfirmDialog
          visible={confirmDiscard}
          title="Discard this After photo?"
          message="The temporary photo will be removed and the existing Before photo will stay unchanged."
          confirmLabel="Discard"
          destructive
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => void discardAndReturn()}
        />
      </>
    );
  }

  if (!job || !before || !tempUri || !filesReady) {
    return (
      <>
        <ScreenContainer>
          <ScreenHeader title="Review Pair" />
          <View style={styles.unavailable}>
            <View style={styles.unavailableIcon}>
              <Ionicons name="images-outline" size={42} color={Colors.primary} />
            </View>
            <Text style={styles.unavailableTitle}>Pair preview unavailable</Text>
            <Text style={styles.unavailableMessage}>
              The Before photo or temporary After photo could not be found on this device.
            </Text>
            <PrimaryButton label="Return" onPress={() => void discardAndReturn()} />
          </View>
        </ScreenContainer>
        <ConfirmDialog
          visible={confirmDiscard}
          title="Discard this After photo?"
          message="The temporary photo will be removed and the existing Before photo will stay unchanged."
          confirmLabel="Discard"
          destructive
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => void discardAndReturn()}
        />
      </>
    );
  }

  const aspectRatio = before.width && before.height
    ? before.width / before.height
    : width && height
      ? width / height
      : 4 / 3;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Review Pair"
        onBack={() => {
          if (!saving) setConfirmDiscard(true);
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.jobName}>{job.name}</Text>
          <Text style={styles.shotName}>{before.shotName || 'Untitled shot'}</Text>
          <Text style={styles.subtitle}>
            Compare the captured After photo before approving this pair.
          </Text>
        </View>

        <View style={styles.modeControl}>
          {(['side-by-side', 'slider'] as ComparisonMode[]).map((option) => {
            const selected = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option === 'side-by-side' ? 'Side by side view' : 'Slider view'}
                accessibilityState={{ selected }}
                onPress={() => setMode(option)}
                style={[styles.modeButton, selected && styles.modeButtonSelected]}>
                <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>
                  {option === 'side-by-side' ? 'Side by Side' : 'Slider'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.comparisonCard}>
          <ComparisonView
            beforeUri={before.localUri}
            afterUri={tempUri}
            mode={mode}
            aspectRatio={aspectRatio}
            contentFit="contain"
          />
          <View style={styles.metadata}>
            <View style={styles.metadataColumn}>
              <Text style={styles.metadataLabel}>Before</Text>
              <Text style={styles.metadataValue}>{formatDateTime(before.createdAt)}</Text>
            </View>
            <View style={styles.metadataColumn}>
              <Text style={styles.metadataLabel}>After</Text>
              <Text style={styles.metadataValue}>{formatDateTime(capturedAt)}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={21} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.secondaryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retake After photo"
            disabled={saving}
            onPress={() => void retake()}
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
            <Ionicons name="camera-reverse-outline" size={22} color={Colors.primary} />
            <Text style={styles.outlineLabel}>Retake After</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel pair"
            disabled={saving}
            onPress={() => setConfirmDiscard(true)}
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
            <Text style={styles.outlineLabel}>Cancel</Text>
          </Pressable>
        </View>
        <PrimaryButton
          label={replacePairId ? 'Approve Replacement' : 'Approve Pair'}
          icon="checkmark-circle"
          loading={saving}
          onPress={() => void approve()}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmDiscard}
        title="Discard this After photo?"
        message="The temporary photo will be removed and the existing Before photo will stay unchanged."
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => void discardAndReturn()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  titleBlock: {
    alignItems: 'center',
  },
  jobName: {
    maxWidth: '100%',
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  shotName: {
    color: Colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  subtitle: {
    maxWidth: 420,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  modeControl: {
    minHeight: 50,
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  modeButtonSelected: {
    backgroundColor: Colors.primary,
  },
  modeLabel: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  modeLabelSelected: {
    color: Colors.surface,
  },
  comparisonCard: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  metadata: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metadataColumn: {
    flex: 1,
  },
  metadataLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  metadataValue: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  outlineButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  outlineLabel: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  loader: {
    marginTop: 140,
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  unavailableIcon: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: Colors.primarySoft,
  },
  unavailableTitle: {
    color: Colors.text,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  unavailableMessage: {
    maxWidth: 360,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
