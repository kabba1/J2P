import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ComparisonMode, ComparisonView } from '@/components/comparison-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { usePairs } from '@/state/pairs-context';
import { GeneratedAsset } from '@/types/generated-asset';
import { JobMedia } from '@/types/media';
import { BeforeAfterPair } from '@/types/pair';
import { formatDateTime } from '@/utils/format-date';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function assetDescription(asset: GeneratedAsset): string {
  const format = asset.format === 'square' ? 'Square 1:1' : 'Portrait 4:5';
  const layout = asset.layout === 'side-by-side' ? 'Side by Side' : 'Stacked';
  return `${format} / ${layout}`;
}

export default function PairDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    pairId?: string | string[];
  }>();
  const jobId = first(params.jobId);
  const pairId = first(params.pairId);
  const { jobs, loading: jobsLoading } = useJobs();
  const { getMedia, deleteMedia, fileExists } = useMedia();
  const { getPair, deletePair } = usePairs();
  const {
    assetsForJob,
    refreshJob: refreshGeneratedAssets,
  } = useGeneratedAssets();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const [pair, setPair] = useState<BeforeAfterPair>();
  const [before, setBefore] = useState<JobMedia>();
  const [after, setAfter] = useState<JobMedia>();
  const [beforeMissing, setBeforeMissing] = useState(false);
  const [afterMissing, setAfterMissing] = useState(false);
  const [mode, setMode] = useState<ComparisonMode>('slider');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [confirmDeleteAfter, setConfirmDeleteAfter] = useState(false);
  const [unpaired, setUnpaired] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setPair(undefined);
    setBefore(undefined);
    setAfter(undefined);
    setBeforeMissing(false);
    setAfterMissing(false);
    setUnpaired(false);
    if (!pairId || !jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const loadedPair = await getPair(pairId);
      if (!loadedPair || loadedPair.jobId !== jobId) {
        setPair(undefined);
        setBefore(undefined);
        setAfter(undefined);
        return;
      }
      const [loadedBefore, loadedAfter] = await Promise.all([
        getMedia(loadedPair.beforeMediaId),
        getMedia(loadedPair.afterMediaId),
      ]);
      const [beforeFileExists, afterFileExists] = await Promise.all([
        loadedBefore ? fileExists(loadedBefore.localUri) : Promise.resolve(false),
        loadedAfter ? fileExists(loadedAfter.localUri) : Promise.resolve(false),
      ]);
      setPair(loadedPair);
      setBefore(loadedBefore);
      setAfter(loadedAfter);
      setBeforeMissing(!loadedBefore || !beforeFileExists);
      setAfterMissing(!loadedAfter || !afterFileExists);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'This pair could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [fileExists, getMedia, getPair, jobId, pairId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (jobId) {
        void refreshGeneratedAssets(jobId).catch(() => undefined);
      }
    }, [jobId, load, refreshGeneratedAssets]),
  );

  const leavePair = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (job) {
      router.replace({ pathname: '/(tabs)/(jobs)/[id]', params: { id: job.id } });
      return;
    }
    router.replace('/');
  }, [job, router]);

  const returnToAfterQueue = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (job) {
      router.replace({ pathname: '/after-queue', params: { jobId: job.id } });
      return;
    }
    router.replace('/');
  }, [job, router]);

  const openCreatePost = () => {
    if (!pair || !before || !after || beforeMissing || afterMissing) return;
    router.push({
      pathname: '/create-post',
      params: { pairId: pair.id, jobId: pair.jobId },
    });
  };

  const openContent = () => {
    router.push('/content');
  };

  const openGeneratedAsset = (assetId: string) => {
    router.push({ pathname: '/generated-asset', params: { assetId } });
  };

  const beginReplacement = () => {
    if (!pair || !before || beforeMissing) return;
    router.push({
      pathname: '/job-camera',
      params: {
        jobId: pair.jobId,
        stage: 'after',
        captureMode: 'matched-after',
        beforeMediaId: pair.beforeMediaId,
        pairId: pair.id,
      },
    });
  };

  const handleUnpair = async () => {
    if (!pair || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await deletePair(pair.id);
      setConfirmUnpair(false);
      setUnpaired(true);
      setConfirmDeleteAfter(Boolean(after));
      if (!after) returnToAfterQueue();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The pair could not be removed.');
      setConfirmUnpair(false);
    } finally {
      setBusy(false);
    }
  };

  const finishKeepingAfter = () => {
    setConfirmDeleteAfter(false);
    returnToAfterQueue();
  };

  const handleDeleteAfter = async () => {
    if (!after || busy) {
      finishKeepingAfter();
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await deleteMedia(after.id);
      setConfirmDeleteAfter(false);
      returnToAfterQueue();
    } catch (caughtError) {
      setConfirmDeleteAfter(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The pair was removed, but the After photo could not be deleted.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!job && jobsLoading)) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Matched Pair" onBack={leavePair} />
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!job || !pair) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Matched Pair" onBack={leavePair} />
        <View style={styles.unavailable}>
          <Ionicons name="unlink-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.unavailableTitle}>Pair not found</Text>
          <Text style={styles.unavailableMessage}>
            This relationship may have already been removed from the job.
          </Text>
          <PrimaryButton label={job ? 'Return to Job' : 'Return to Jobs'} onPress={leavePair} />
        </View>
      </ScreenContainer>
    );
  }

  const aspectRatio = before?.width && before.height
    ? before.width / before.height
    : after?.width && after.height
      ? after.width / after.height
      : 4 / 3;
  const comparisonAvailable =
    before &&
    after &&
    before.jobId === pair.jobId &&
    after.jobId === pair.jobId &&
    before.stage === 'before' &&
    after.stage === 'after' &&
    !beforeMissing &&
    !afterMissing;
  const pairAssets = assetsForJob(pair.jobId).filter(
    (asset) => asset.pairId === pair.id,
  );
  const latestAsset = pairAssets[0];

  return (
    <ScreenContainer>
      <ScreenHeader title="Matched Pair" onBack={leavePair} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.jobName}>{job.name}</Text>
          <Text style={styles.shotName}>{before?.shotName || after?.shotName || 'Untitled shot'}</Text>
          <View style={styles.matchedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.after} />
            <Text style={styles.matchedText}>Matched pair</Text>
          </View>
        </View>

        {comparisonAvailable ? (
          <>
            <View style={styles.modeControl}>
              {(['side-by-side', 'slider'] as ComparisonMode[]).map((option) => {
                const selected = mode === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
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
                afterUri={after.localUri}
                mode={mode}
                aspectRatio={aspectRatio}
                contentFit="contain"
              />
            </View>
          </>
        ) : (
          <View style={styles.missingCard}>
            <Ionicons name="images-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.missingTitle}>A saved photo is missing</Text>
            <Text style={styles.missingMessage}>
              {beforeMissing && afterMissing
                ? 'Neither local image file could be found.'
                : beforeMissing
                  ? 'The local Before image file could not be found.'
                  : 'The local After image file could not be found.'}
            </Text>
          </View>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Before</Text>
            <Text style={styles.detailValue}>{before ? formatDateTime(before.createdAt) : 'Photo unavailable'}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>After</Text>
            <Text style={styles.detailValue}>{after ? formatDateTime(after.createdAt) : 'Photo unavailable'}</Text>
          </View>
        </View>

        {comparisonAvailable && !unpaired ? (
          <PrimaryButton
            label="Create Post"
            icon="images-outline"
            accessibilityHint="Build a social-ready image from this saved Before and After pair"
            onPress={openCreatePost}
          />
        ) : null}

        <View style={styles.contentSummaryCard}>
          <View style={styles.contentSummaryHeader}>
            <View>
              <Text style={styles.contentSummaryTitle}>Generated Posts</Text>
              <Text style={styles.contentSummaryCount}>
                {pairAssets.length} {pairAssets.length === 1 ? 'version' : 'versions'} from this pair
              </Text>
            </View>
            <View style={styles.contentCountBadge}>
              <Text style={styles.contentCountText}>{pairAssets.length}</Text>
            </View>
          </View>

          {latestAsset ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open latest generated post"
              onPress={() => openGeneratedAsset(latestAsset.id)}
              style={({ pressed }) => [
                styles.latestAssetRow,
                pressed && styles.pressed,
              ]}>
              <Image
                accessibilityLabel="Latest generated Before and After post"
                cachePolicy="memory-disk"
                contentFit="cover"
                source={{ uri: latestAsset.localUri }}
                style={styles.latestAssetThumbnail}
              />
              <View style={styles.latestAssetText}>
                <Text numberOfLines={1} style={styles.latestAssetTitle}>
                  Latest version
                </Text>
                <Text numberOfLines={1} style={styles.latestAssetMetadata}>
                  {assetDescription(latestAsset)}
                </Text>
                <Text numberOfLines={1} style={styles.latestAssetDate}>
                  {formatDateTime(latestAsset.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.noGeneratedContent}>
              <Ionicons name="image-outline" size={27} color={Colors.textMuted} />
              <Text style={styles.noGeneratedContentText}>
                No posts have been created from this pair yet.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Content"
            onPress={openContent}
            style={({ pressed }) => [styles.openContentButton, pressed && styles.pressed]}>
            <Ionicons name="layers-outline" size={20} color={Colors.primary} />
            <Text style={styles.openContentLabel}>Open Content</Text>
          </Pressable>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={21} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {unpaired ? (
          <PrimaryButton label="Return to After Queue" onPress={returnToAfterQueue} />
        ) : (
          <>
            <PrimaryButton
              label="Retake / Replace After"
              icon="camera-reverse-outline"
              disabled={!before || beforeMissing}
              onPress={beginReplacement}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unpair photos"
              onPress={() => setConfirmUnpair(true)}
              style={({ pressed }) => [styles.unpairButton, pressed && styles.pressed]}>
              <Ionicons name="unlink-outline" size={22} color={Colors.danger} />
              <Text style={styles.unpairLabel}>Unpair Photos</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmUnpair}
        title="Unpair these photos?"
        message="Only the Before and After relationship will be removed. Both photos will stay in the job."
        confirmLabel="Unpair"
        destructive
        busy={busy}
        onCancel={() => setConfirmUnpair(false)}
        onConfirm={() => void handleUnpair()}
      />
      <ConfirmDialog
        visible={confirmDeleteAfter}
        title="Delete the After photo too?"
        message="The pair is removed. Delete the After photo and its local file, or cancel to keep it as an ordinary unpaired After photo."
        confirmLabel="Delete After"
        destructive
        busy={busy}
        onCancel={finishKeepingAfter}
        onConfirm={() => void handleDeleteAfter()}
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
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: '#E9F7EC',
    marginTop: Spacing.sm,
  },
  matchedText: {
    color: Colors.after,
    fontSize: 13,
    fontWeight: '800',
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
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  detailsCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  contentSummaryCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  contentSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  contentSummaryTitle: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  contentSummaryCount: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  contentCountBadge: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  contentCountText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  latestAssetRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  latestAssetThumbnail: {
    width: 74,
    height: 74,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  latestAssetText: {
    flex: 1,
    minWidth: 0,
  },
  latestAssetTitle: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  latestAssetMetadata: {
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  latestAssetDate: {
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
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  detailValue: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  missingCard: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  missingTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  missingMessage: {
    maxWidth: 330,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  unpairButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.surface,
  },
  unpairLabel: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '800',
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
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  unavailableTitle: {
    color: Colors.text,
    fontSize: 23,
    fontWeight: '800',
  },
  unavailableMessage: {
    maxWidth: 360,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginTop: 140,
  },
  pressed: {
    opacity: 0.64,
  },
});
