import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BeforeAfterPostComposition,
  getPostAspectRatio,
} from '@/components/before-after-post-composition';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  createBeforeAfterPostRenderer,
  RenderBeforeAfterPostInput,
} from '@/services/before-after-post-renderer';
import { GeneratedAssetServiceError } from '@/services/generated-asset-service';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { usePairs } from '@/state/pairs-context';
import {
  GeneratedAssetFormat,
  GeneratedAssetLayout,
} from '@/types/generated-asset';
import { JobMedia } from '@/types/media';
import { BeforeAfterPair } from '@/types/pair';
import {
  GENERATED_ASSET_FOOTER_MAX_LENGTH,
  getGeneratedAssetDimensions,
  normalizeFooterText,
} from '@/utils/generated-asset';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type OptionButtonProps = {
  label: string;
  caption: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function OptionButton({
  label,
  caption,
  icon,
  selected,
  disabled = false,
  onPress,
}: OptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={icon} size={23} color={selected ? Colors.primary : Colors.textMuted} />
      </View>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      <Text style={styles.optionCaption}>{caption}</Text>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={styles.check} />
      ) : null}
    </Pressable>
  );
}

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    pairId?: string | string[];
  }>();
  const jobId = first(params.jobId);
  const pairId = first(params.pairId);
  const { jobs, loading: jobsLoading } = useJobs();
  const { getPair } = usePairs();
  const { getMedia, fileExists } = useMedia();
  const { generateAsset, generatingPairIds } = useGeneratedAssets();
  const job = jobs.find((candidate) => candidate.id === jobId);
  const compositionRef = useRef<View>(null);
  const previewReadyRef = useRef(false);
  const compositionStateRef = useRef<{
    beforeUri?: string;
    afterUri?: string;
    format: GeneratedAssetFormat;
    layout: GeneratedAssetLayout;
    labelsEnabled: boolean;
    footerText?: string;
  }>({
    format: 'portrait',
    layout: 'side-by-side',
    labelsEnabled: true,
  });
  const [pair, setPair] = useState<BeforeAfterPair>();
  const [before, setBefore] = useState<JobMedia>();
  const [after, setAfter] = useState<JobMedia>();
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [sourceAvailable, setSourceAvailable] = useState(false);
  const [format, setFormat] = useState<GeneratedAssetFormat>('portrait');
  const [layout, setLayout] = useState<GeneratedAssetLayout>('side-by-side');
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const [footerText, setFooterText] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [sourceRevision, setSourceRevision] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const pairGenerationInFlight = Boolean(pair && generatingPairIds.has(pair.id));
  const generationInFlight = generating || pairGenerationInFlight;
  const webGenerationUnavailable = Platform.OS === 'web';

  compositionStateRef.current = {
    beforeUri: before?.localUri,
    afterUri: after?.localUri,
    format,
    layout,
    labelsEnabled,
    footerText: normalizeFooterText(footerText),
  };

  const renderer = useMemo(
    () => createBeforeAfterPostRenderer({
      ref: compositionRef,
      isReady: () => previewReadyRef.current,
      matchesInput: (input: RenderBeforeAfterPostInput) => {
        const current = compositionStateRef.current;
        return (
          current.beforeUri === input.beforeUri &&
          current.afterUri === input.afterUri &&
          current.format === input.format &&
          current.layout === input.layout &&
          current.labelsEnabled === input.labelsEnabled &&
          current.footerText === normalizeFooterText(input.footerText)
        );
      },
    }),
    [],
  );

  const onReadyChange = useCallback((ready: boolean) => {
    previewReadyRef.current = ready;
    setPreviewReady(ready);
    if (ready) setPreviewError(undefined);
  }, []);

  const handlePreviewError = useCallback((message: string) => {
    previewReadyRef.current = false;
    setPreviewReady(false);
    setPreviewError(message);
  }, []);

  const retryPreview = useCallback(() => {
    previewReadyRef.current = false;
    setPreviewReady(false);
    setPreviewError(undefined);
    setPreviewAttempt((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const requestedSourceRevision = sourceRevision;
      const load = async () => {
        setSourceLoaded(false);
        setSourceAvailable(false);
        setPair(undefined);
        setBefore(undefined);
        setAfter(undefined);
        previewReadyRef.current = false;
        setPreviewReady(false);
        setPreviewError(undefined);
        setPreviewAttempt((current) => Math.max(current + 1, requestedSourceRevision + 1));
        setError(undefined);

        if (!jobId || !pairId) {
          if (active) setSourceLoaded(true);
          return;
        }

        try {
          const loadedPair = await getPair(pairId);
          if (!loadedPair || loadedPair.jobId !== jobId) return;
          const [loadedBefore, loadedAfter] = await Promise.all([
            getMedia(loadedPair.beforeMediaId),
            getMedia(loadedPair.afterMediaId),
          ]);
          if (
            !loadedBefore ||
            !loadedAfter ||
            loadedBefore.stage !== 'before' ||
            loadedAfter.stage !== 'after'
          ) return;
          const [beforeExists, afterExists] = await Promise.all([
            fileExists(loadedBefore.localUri),
            fileExists(loadedAfter.localUri),
          ]);
          if (!active) return;
          setPair(loadedPair);
          setBefore(loadedBefore);
          setAfter(loadedAfter);
          setSourceAvailable(beforeExists && afterExists);
        } catch (caughtError) {
          if (active) {
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : 'This Before and After pair could not be loaded.',
            );
          }
        } finally {
          if (active) setSourceLoaded(true);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [fileExists, getMedia, getPair, jobId, pairId, sourceRevision]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !generationInFlight) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [generationInFlight]);

  const leaveBuilder = useCallback(() => {
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

  const createPost = async () => {
    if (
      !job ||
      !pair ||
      !before ||
      !after ||
      !sourceAvailable ||
      !previewReady ||
      generating
    ) return;
    Keyboard.dismiss();
    setGenerating(true);
    setError(undefined);
    try {
      const asset = await generateAsset({
        jobId: job.id,
        pairId: pair.id,
        format,
        layout,
        labelsEnabled,
        footerText,
        renderer,
      });
      router.replace({ pathname: '/generated-asset', params: { assetId: asset.id } });
    } catch (caughtError) {
      if (caughtError instanceof GeneratedAssetServiceError) {
        if (caughtError.code === 'source-changed') {
          setSourceRevision((current) => current + 1);
        } else if (
          caughtError.code === 'job-not-found' ||
          caughtError.code === 'pair-not-found' ||
          caughtError.code === 'before-media-not-found' ||
          caughtError.code === 'after-media-not-found' ||
          caughtError.code === 'source-file-missing'
        ) {
          setSourceAvailable(false);
        }
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The post could not be generated. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const routeLoading = !sourceLoaded || (!job && jobsLoading);
  if (routeLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Create Post" onBack={leaveBuilder} />
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!job || !pair || !before || !after || !sourceAvailable) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Create Post" onBack={leaveBuilder} />
        <View style={styles.unavailable}>
          <View style={styles.unavailableIcon}>
            <Ionicons name="images-outline" size={42} color={Colors.textMuted} />
          </View>
          <Text style={styles.unavailableTitle}>Pair unavailable</Text>
          <Text style={styles.unavailableMessage}>
            The saved pair or one of its local photo files is no longer available. Return to the job and choose another pair.
          </Text>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          <PrimaryButton label={job ? 'Return to Job' : 'Return to Jobs'} onPress={leaveBuilder} />
        </View>
      </ScreenContainer>
    );
  }

  const dimensions = getGeneratedAssetDimensions(format);
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Create Post"
        onBack={generationInFlight ? undefined : leaveBuilder}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text numberOfLines={1} style={styles.jobName}>{job.name}</Text>
            <Text numberOfLines={1} style={styles.shotName}>
              {before.shotName || after.shotName || 'Untitled shot'}
            </Text>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.sectionTitle}>Preview</Text>
                <Text style={styles.sectionCaption}>
                  {dimensions.width} × {dimensions.height} PNG
                </Text>
              </View>
              <View
                style={[
                  styles.readyBadge,
                  previewReady && styles.readyBadgeActive,
                  previewError && styles.readyBadgeError,
                ]}>
                <View
                  style={[
                    styles.readyDot,
                    previewReady && styles.readyDotActive,
                    previewError && styles.readyDotError,
                  ]}
                />
                <Text
                  style={[
                    styles.readyText,
                    previewReady && styles.readyTextActive,
                    previewError && styles.readyTextError,
                  ]}>
                  {previewReady ? 'Ready' : previewError ? 'Needs retry' : 'Loading'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.previewFrame,
                {
                  aspectRatio: getPostAspectRatio(format),
                  maxWidth: format === 'portrait' ? 420 : 520,
                },
              ]}>
              <BeforeAfterPostComposition
                key={`${pair.id}-${previewAttempt}`}
                ref={compositionRef}
                beforeUri={before.localUri}
                afterUri={after.localUri}
                format={format}
                layout={layout}
                labelsEnabled={labelsEnabled}
                footerText={footerText}
                onReadyChange={onReadyChange}
                onLoadError={handlePreviewError}
              />
            </View>
            {previewError ? (
              <View accessibilityRole="alert" style={styles.previewErrorPanel}>
                <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
                <Text style={styles.previewErrorText}>{previewError}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry preview"
                  disabled={generationInFlight}
                  onPress={retryPreview}
                  style={({ pressed }) => [
                    styles.retryPreviewButton,
                    pressed && !generationInFlight && styles.pressed,
                    generationInFlight && styles.disabled,
                  ]}>
                  <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                  <Text style={styles.retryPreviewLabel}>Retry Preview</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.cropNote}>
              Photos fill each frame and may be cropped at the edges.
            </Text>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.sectionTitle}>Output Format</Text>
            <Text style={styles.sectionCaption}>Choose the size for your finished post.</Text>
            <View accessibilityRole="radiogroup" style={styles.optionRow}>
              <OptionButton
                label="Portrait"
                caption="1080 × 1350 · 4:5"
                icon="phone-portrait-outline"
                selected={format === 'portrait'}
                disabled={generationInFlight}
                onPress={() => setFormat('portrait')}
              />
              <OptionButton
                label="Square"
                caption="1080 × 1080 · 1:1"
                icon="square-outline"
                selected={format === 'square'}
                disabled={generationInFlight}
                onPress={() => setFormat('square')}
              />
            </View>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.sectionTitle}>Layout</Text>
            <Text style={styles.sectionCaption}>Arrange the Before and After photos.</Text>
            <View accessibilityRole="radiogroup" style={styles.optionRow}>
              <OptionButton
                label="Side by Side"
                caption="Left and right"
                icon="code-outline"
                selected={layout === 'side-by-side'}
                disabled={generationInFlight}
                onPress={() => setLayout('side-by-side')}
              />
              <OptionButton
                label="Stacked"
                caption="Top and bottom"
                icon="reorder-two-outline"
                selected={layout === 'stacked'}
                disabled={generationInFlight}
                onPress={() => setLayout('stacked')}
              />
            </View>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.sectionTitle}>Before / After Labels</Text>
                <Text style={styles.sectionCaption}>Show a label on each photo.</Text>
              </View>
              <Switch
                accessibilityLabel="Show Before and After labels"
                value={labelsEnabled}
                disabled={generationInFlight}
                onValueChange={setLabelsEnabled}
                trackColor={{ false: '#C8CED8', true: '#9FC4FF' }}
                thumbColor={labelsEnabled ? Colors.primary : Colors.surface}
              />
            </View>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.footerHeader}>
              <Text style={styles.sectionTitle}>Footer Text</Text>
              <Text style={styles.characterCount}>
                {footerText.length}/{GENERATED_ASSET_FOOTER_MAX_LENGTH}
              </Text>
            </View>
            <Text style={styles.sectionCaption}>Optional business name or call to action.</Text>
            <TextInput
              accessibilityLabel="Footer text"
              autoCapitalize="sentences"
              maxLength={GENERATED_ASSET_FOOTER_MAX_LENGTH}
              editable={!generationInFlight}
              onChangeText={setFooterText}
              placeholder="Johnson Painting Co. · Request a free estimate"
              placeholderTextColor="#9098A8"
              returnKeyType="done"
              style={styles.input}
              value={footerText}
            />
          </View>

          {error ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={21} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {webGenerationUnavailable ? (
            <View style={styles.deviceNotice}>
              <Ionicons name="phone-portrait-outline" size={21} color={Colors.primary} />
              <Text style={styles.deviceNoticeText}>
                Preview and customize here, then open this pair in Expo Go to generate and save the persistent PNG.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.actionFooter, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryButton
            label={webGenerationUnavailable ? 'Generate in Expo Go' : error ? 'Try Again' : 'Generate Post'}
            icon="sparkles-outline"
            loading={generationInFlight}
            disabled={!previewReady || webGenerationUnavailable}
            onPress={() => void createPost()}
          />
          <Text style={styles.actionCaption}>
            {webGenerationUnavailable
              ? 'Persistent image generation uses native device storage.'
              : 'Saved privately on this device.'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  intro: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  jobName: {
    maxWidth: '100%',
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  shotName: {
    maxWidth: '100%',
    color: Colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  previewCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  previewFrame: {
    width: '100%',
    overflow: 'hidden',
    alignSelf: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  cropNote: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  readyBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  readyBadgeActive: {
    backgroundColor: '#E9F7EC',
  },
  readyBadgeError: {
    backgroundColor: Colors.dangerSoft,
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  readyDotActive: {
    backgroundColor: Colors.after,
  },
  readyDotError: {
    backgroundColor: Colors.danger,
  },
  readyText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  readyTextActive: {
    color: Colors.after,
  },
  readyTextError: {
    color: Colors.danger,
  },
  previewErrorPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  previewErrorText: {
    flex: 1,
    minWidth: 180,
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  retryPreviewButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  retryPreviewLabel: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  settingsCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  sectionCaption: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  option: {
    flex: 1,
    minHeight: 118,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: Spacing.md - 1,
    backgroundColor: '#F8FBFF',
  },
  optionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  optionIconSelected: {
    backgroundColor: Colors.primarySoft,
  },
  optionLabel: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  check: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  switchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  switchText: {
    flex: 1,
  },
  footerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  characterCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    color: Colors.text,
    fontSize: 15,
  },
  actionFooter: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: Spacing.xs,
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
  deviceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#B7D1FF',
    backgroundColor: Colors.primarySoft,
  },
  deviceNoticeText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  unavailableIcon: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: Colors.surfaceMuted,
  },
  unavailableTitle: {
    color: Colors.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
  },
  unavailableMessage: {
    maxWidth: 380,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  inlineError: {
    maxWidth: 380,
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  loader: {
    marginTop: 140,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.65,
  },
});
