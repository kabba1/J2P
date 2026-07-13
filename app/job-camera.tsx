import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import {
  CameraType,
  CameraView,
  FlashMode,
  PermissionStatus,
  useCameraPermissions,
} from 'expo-camera';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraPermissionState } from '@/components/camera-permission-state';
import { OpacitySlider } from '@/components/opacity-slider';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { cameraService } from '@/services/camera-service';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { JobMedia, MediaStage } from '@/types/media';
import { isMediaStage, stageLabel } from '@/utils/media-stage';

const flashModes: FlashMode[] = ['off', 'on', 'auto'];

type BeforeLoadState = 'not-needed' | 'loading' | 'ready' | 'invalid' | 'missing';

function nextFlashMode(current: FlashMode): FlashMode {
  const index = flashModes.indexOf(current);
  return flashModes[(index + 1) % flashModes.length];
}

export default function JobCameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    stage?: string | string[];
    captureMode?: string | string[];
    beforeMediaId?: string | string[];
    pairId?: string | string[];
  }>();
  const rawJobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const rawStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const rawCaptureMode = Array.isArray(params.captureMode)
    ? params.captureMode[0]
    : params.captureMode;
  const beforeMediaId = Array.isArray(params.beforeMediaId)
    ? params.beforeMediaId[0]
    : params.beforeMediaId;
  const pairId = Array.isArray(params.pairId) ? params.pairId[0] : params.pairId;
  const stage: MediaStage | undefined = isMediaStage(rawStage) ? rawStage : undefined;
  const isMatchedCapture = rawCaptureMode === 'matched-after';
  const { jobs, loading: jobsLoading } = useJobs();
  const { countsForJob, fileExists, getMedia, refreshJob } = useMedia();
  const job = jobs.find((candidate) => candidate.id === rawJobId);
  const [permission, requestPermission] = useCameraPermissions();
  const permissionRequested = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const captureInFlightRef = useRef(false);
  const zoomInitializedForRef = useRef<string | undefined>(undefined);
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [cameraAvailable, setCameraAvailable] = useState<boolean>();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [beforeMedia, setBeforeMedia] = useState<JobMedia>();
  const [beforeLoadState, setBeforeLoadState] = useState<BeforeLoadState>('not-needed');
  const [beforeError, setBeforeError] = useState<string>();
  const [ghostEnabled, setGhostEnabled] = useState(true);
  const [ghostOpacity, setGhostOpacity] = useState(0.5);

  useEffect(() => {
    void cameraService
      .isAvailable()
      .then(setCameraAvailable)
      .catch(() => setCameraAvailable(false));
  }, []);

  useEffect(() => {
    if (
      permission?.status === PermissionStatus.UNDETERMINED &&
      !permissionRequested.current
    ) {
      permissionRequested.current = true;
      void requestPermission();
    }
  }, [permission?.status, requestPermission]);

  useEffect(() => {
    if (!isMatchedCapture) {
      setBeforeMedia(undefined);
      setBeforeError(undefined);
      setBeforeLoadState('not-needed');
      return;
    }

    if (!beforeMediaId || !rawJobId || stage !== 'after') {
      setBeforeMedia(undefined);
      setBeforeError('This matched capture is missing a valid Before photo or After stage.');
      setBeforeLoadState('invalid');
      return;
    }

    let active = true;
    setBeforeLoadState('loading');
    setBeforeError(undefined);

    void (async () => {
      try {
        const record = await getMedia(beforeMediaId);
        if (!active) return;
        if (!record || record.jobId !== rawJobId || record.stage !== 'before') {
          setBeforeMedia(undefined);
          setBeforeError('The selected Before photo is no longer available for this job.');
          setBeforeLoadState('invalid');
          return;
        }

        if (!(await fileExists(record.localUri))) {
          if (!active) return;
          setBeforeMedia(record);
          setBeforeError('The selected Before photo file is missing from this device.');
          setBeforeLoadState('missing');
          return;
        }

        if (!active) return;
        setBeforeMedia(record);
        setBeforeLoadState('ready');
      } catch (caughtError) {
        if (!active) return;
        setBeforeMedia(undefined);
        setBeforeError(
          caughtError instanceof Error
            ? caughtError.message
            : 'The selected Before photo could not be loaded.',
        );
        setBeforeLoadState('invalid');
      }
    })();

    return () => {
      active = false;
    };
  }, [beforeMediaId, fileExists, getMedia, isMatchedCapture, rawJobId, stage]);

  useEffect(() => {
    if (!isMatchedCapture || beforeLoadState !== 'ready' || !beforeMedia) return;
    if (zoomInitializedForRef.current === beforeMedia.id) return;

    zoomInitializedForRef.current = beforeMedia.id;
    const storedZoom = beforeMedia.zoom;
    setZoom(
      typeof storedZoom === 'number' && Number.isFinite(storedZoom)
        ? Math.min(0.5, Math.max(0, storedZoom))
        : 0,
    );
    setFacing('back');
  }, [beforeLoadState, beforeMedia, isMatchedCapture]);

  useEffect(() => {
    if (!isFocused) setCameraReady(false);
  }, [isFocused]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => captureInFlightRef.current,
    );
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (rawJobId) void refreshJob(rawJobId).catch(() => undefined);
    }, [rawJobId, refreshJob]),
  );

  const closeCamera = () => {
    if (!captureInFlightRef.current) router.back();
  };

  const capture = async () => {
    if (
      captureInFlightRef.current ||
      !cameraReady ||
      !cameraRef.current ||
      !job ||
      !stage ||
      !rawJobId
    ) {
      return;
    }

    if (isMatchedCapture && (!beforeMedia || beforeLoadState !== 'ready')) return;

    captureInFlightRef.current = true;
    setCapturing(true);
    setCameraError(undefined);
    try {
      const photo = await cameraService.capturePhoto(cameraRef.current, facing, zoom);
      const capturedAt = new Date().toISOString();
      if (isMatchedCapture && beforeMedia) {
        router.push({
          pathname: '/pair-review',
          params: {
            jobId: rawJobId,
            beforeMediaId: beforeMedia.id,
            ...(pairId ? { pairId } : {}),
            tempUri: photo.uri,
            width: String(photo.width),
            height: String(photo.height),
            facing: photo.cameraFacing,
            zoom: String(photo.zoom),
            capturedAt,
          },
        });
      } else {
        router.push({
          pathname: '/review',
          params: {
            jobId: rawJobId,
            stage,
            tempUri: photo.uri,
            width: String(photo.width),
            height: String(photo.height),
            facing: photo.cameraFacing,
            zoom: String(photo.zoom),
            capturedAt,
          },
        });
      }
    } catch {
      setCameraError('The photo could not be captured. Check the camera and try again.');
    } finally {
      captureInFlightRef.current = false;
      setCapturing(false);
    }
  };

  if ((!rawJobId || !stage || !job) && !jobsLoading) {
    return (
      <SafeAreaView style={styles.lightScreen}>
        <StatusBar style="dark" />
        <CameraPermissionState
          title="Camera unavailable"
          message="This job or photo stage is no longer available."
          actionLabel="Return to Jobs"
          onAction={() => router.replace('/')}
        />
      </SafeAreaView>
    );
  }

  if (!job || !stage || !rawJobId) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparing job…</Text>
      </SafeAreaView>
    );
  }

  if (isMatchedCapture && (beforeLoadState === 'loading' || beforeLoadState === 'not-needed')) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading Before photo…</Text>
      </SafeAreaView>
    );
  }

  if (isMatchedCapture && beforeLoadState !== 'ready') {
    return (
      <SafeAreaView style={styles.lightScreen}>
        <StatusBar style="dark" />
        <CameraPermissionState
          title={beforeLoadState === 'missing' ? 'Before photo file missing' : 'Before photo unavailable'}
          message={beforeError || 'The selected Before photo could not be prepared for matching.'}
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (permission === null || cameraAvailable === undefined) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparing camera…</Text>
      </SafeAreaView>
    );
  }

  if (!cameraAvailable) {
    return (
      <SafeAreaView style={styles.lightScreen}>
        <StatusBar style="dark" />
        <CameraPermissionState
          title="No camera available"
          message="JobToPost could not find a camera on this device."
          secondaryLabel="Go Back"
          onSecondary={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;
    return (
      <SafeAreaView style={styles.lightScreen}>
        <StatusBar style="dark" />
        <CameraPermissionState
          title="Camera access needed"
          message={
            canAskAgain
              ? 'Allow camera access to take Before, Progress, and After photos for this job.'
              : 'Camera access is turned off. Open your device settings and allow camera access for Expo Go.'
          }
          actionLabel={canAskAgain ? 'Allow Camera' : 'Open Settings'}
          onAction={() => {
            if (canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
          secondaryLabel="Go Back"
          onSecondary={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const count = countsForJob(job.id)[stage];
  const label = stageLabel(stage);
  const zoomLabel = `${(1 + zoom * 4).toFixed(1).replace('.0', '')}×`;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.cameraScreen}>
      <StatusBar style="dark" />
      <View style={styles.cameraHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          disabled={capturing}
          onPress={closeCamera}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.cameraTitle}>Capture {label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          disabled={capturing}
          onPress={closeCamera}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={32} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.previewContainer}>
        {isFocused ? (
          <CameraView
            ref={cameraRef}
            animateShutter
            facing={facing}
            flash={flash}
            mode="picture"
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError(undefined);
            }}
            onMountError={() => {
              setCameraReady(false);
              setCameraError('The camera could not start. Close this screen and try again.');
            }}
            ratio="4:3"
            style={StyleSheet.absoluteFill}
            zoom={zoom}
          />
        ) : null}

        {isMatchedCapture && beforeMedia && ghostEnabled ? (
          <Image
            accessibilityLabel={`Ghost overlay for ${beforeMedia.shotName || 'selected Before photo'}`}
            cachePolicy="memory-disk"
            contentFit="contain"
            pointerEvents="none"
            source={{ uri: beforeMedia.localUri }}
            style={[StyleSheet.absoluteFillObject, { opacity: ghostOpacity }]}
          />
        ) : null}

        <View pointerEvents="none" style={styles.jobOverlay}>
          <Text numberOfLines={1} style={styles.overlayJobName}>
            {job.name}
          </Text>
          {isMatchedCapture && beforeMedia ? (
            <Text numberOfLines={1} style={styles.overlayService}>
              {beforeMedia.shotName || 'Untitled Before photo'}
            </Text>
          ) : job.serviceType ? (
            <Text numberOfLines={1} style={styles.overlayService}>
              {job.serviceType}
            </Text>
          ) : null}
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>
              {isMatchedCapture ? 'Align with Before' : `${label} photo`}
            </Text>
          </View>
        </View>

        <View style={[styles.sideControls, landscape && styles.sideControlsLandscape]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Flash ${flash}. Tap to change.`}
            onPress={() => setFlash(nextFlashMode(flash))}
            style={({ pressed }) => [styles.roundControl, pressed && styles.pressed]}>
            <Ionicons
              name={flash === 'off' ? 'flash-off' : flash === 'auto' ? 'flash' : 'flash'}
              size={24}
              color={Colors.surface}
            />
            <Text style={styles.controlSmallLabel}>{flash === 'auto' ? 'A' : ''}</Text>
          </Pressable>
          <View style={styles.zoomControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              disabled={zoom <= 0}
              onPress={() => setZoom((current) => Math.max(0, Number((current - 0.1).toFixed(1))))}
              style={styles.zoomButton}>
              <Ionicons name="remove" size={20} color={Colors.surface} />
            </Pressable>
            <Text style={styles.zoomLabel}>{zoomLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              disabled={zoom >= 0.5}
              onPress={() => setZoom((current) => Math.min(0.5, Number((current + 0.1).toFixed(1))))}
              style={styles.zoomButton}>
              <Ionicons name="add" size={20} color={Colors.surface} />
            </Pressable>
          </View>
        </View>

        {isMatchedCapture ? (
          <View style={[styles.ghostPanel, landscape && styles.ghostPanelLandscape]}>
            <View style={styles.ghostToggleRow}>
              <Text style={styles.ghostToggleLabel}>Ghost overlay</Text>
              <Switch
                accessibilityLabel="Toggle Before photo ghost overlay"
                onValueChange={setGhostEnabled}
                thumbColor={Colors.surface}
                trackColor={{ false: '#5E6672', true: Colors.primary }}
                value={ghostEnabled}
              />
            </View>
            <OpacitySlider
              disabled={!ghostEnabled}
              onChange={setGhostOpacity}
              value={ghostOpacity}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.capturePanel, landscape && styles.capturePanelLandscape]}>
        <View style={styles.captureText}>
          <Text numberOfLines={2} style={styles.captureStage}>{label}</Text>
          <Text style={styles.captureCount}>
            {isMatchedCapture && beforeMedia
              ? `Match ${beforeMedia.shotName || 'Before photo'}`
              : `${count} saved ${count === 1 ? 'photo' : 'photos'}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Take ${label} photo`}
          accessibilityState={{ busy: capturing, disabled: !cameraReady || capturing }}
          disabled={!cameraReady || capturing}
          onPress={() => void capture()}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && styles.shutterPressed,
            (!cameraReady || capturing) && styles.disabled,
          ]}>
          {capturing ? (
            <ActivityIndicator color={Colors.primary} size="large" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          disabled={capturing}
          onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
          style={({ pressed }) => [styles.flipButton, pressed && styles.pressed]}>
          <Ionicons name="camera-reverse-outline" size={30} color={Colors.surface} />
        </Pressable>
      </View>

      {cameraError ? (
        <View accessibilityRole="alert" style={styles.cameraError}>
          <Text style={styles.cameraErrorText}>{cameraError}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lightScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#111111',
  },
  cameraHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  cameraTitle: {
    color: Colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    minHeight: 220,
    overflow: 'hidden',
    backgroundColor: '#242424',
  },
  jobOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'flex-start',
  },
  overlayJobName: {
    maxWidth: '88%',
    color: Colors.surface,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayService: {
    color: '#F0F3F7',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  stageBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    marginTop: Spacing.xl,
  },
  stageBadgeText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  sideControls: {
    position: 'absolute',
    left: Spacing.lg,
    bottom: Spacing.lg,
    gap: Spacing.md,
  },
  sideControlsLandscape: {
    bottom: Spacing.md,
  },
  ghostPanel: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    left: 84,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(17,17,17,0.82)',
  },
  ghostPanelLandscape: {
    left: 92,
    bottom: Spacing.sm,
    maxWidth: 420,
  },
  ghostToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  ghostToggleLabel: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  roundControl: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  controlSmallLabel: {
    position: 'absolute',
    right: 9,
    bottom: 7,
    color: Colors.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  zoomControl: {
    width: 54,
    alignItems: 'center',
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  zoomButton: {
    width: 54,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  capturePanel: {
    minHeight: 196,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: '#151515',
  },
  capturePanelLandscape: {
    minHeight: 126,
    paddingVertical: Spacing.sm,
  },
  captureText: {
    width: 96,
  },
  captureStage: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  captureCount: {
    color: '#B9BEC7',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  shutterOuter: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    borderWidth: 5,
    borderColor: Colors.surface,
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.surface,
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  flipButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#5A5A5A',
  },
  cameraError: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 216,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(180, 35, 24, 0.92)',
  },
  cameraErrorText: {
    color: Colors.surface,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.62,
  },
  disabled: {
    opacity: 0.5,
  },
});
