import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import {
  CameraType,
  CameraView,
  FlashMode,
  PermissionStatus,
  useCameraPermissions,
} from 'expo-camera';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraPermissionState } from '@/components/camera-permission-state';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { cameraService } from '@/services/camera-service';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { MediaStage } from '@/types/media';
import { isMediaStage, stageLabel } from '@/utils/media-stage';

const flashModes: FlashMode[] = ['off', 'on', 'auto'];

function nextFlashMode(current: FlashMode): FlashMode {
  const index = flashModes.indexOf(current);
  return flashModes[(index + 1) % flashModes.length];
}

export default function JobCameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string | string[];
    stage?: string | string[];
  }>();
  const rawJobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const rawStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const stage: MediaStage | undefined = isMediaStage(rawStage) ? rawStage : undefined;
  const { jobs, loading: jobsLoading } = useJobs();
  const { countsForJob, refreshJob } = useMedia();
  const job = jobs.find((candidate) => candidate.id === rawJobId);
  const [permission, requestPermission] = useCameraPermissions();
  const permissionRequested = useRef(false);
  const cameraRef = useRef<CameraView>(null);
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

  useFocusEffect(
    useCallback(() => {
      if (rawJobId) void refreshJob(rawJobId).catch(() => undefined);
    }, [rawJobId, refreshJob]),
  );

  const closeCamera = () => {
    if (!capturing) router.back();
  };

  const capture = async () => {
    if (
      capturing ||
      !cameraReady ||
      !cameraRef.current ||
      !job ||
      !stage ||
      !rawJobId
    ) {
      return;
    }

    setCapturing(true);
    setCameraError(undefined);
    try {
      const photo = await cameraService.capturePhoto(cameraRef.current, facing, zoom);
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
          capturedAt: new Date().toISOString(),
        },
      });
    } catch {
      setCameraError('The photo could not be captured. Check the camera and try again.');
    } finally {
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

  if (!job || !stage || !rawJobId || permission === null || cameraAvailable === undefined) {
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

        <View pointerEvents="none" style={styles.jobOverlay}>
          <Text numberOfLines={1} style={styles.overlayJobName}>
            {job.name}
          </Text>
          {job.serviceType ? (
            <Text numberOfLines={1} style={styles.overlayService}>
              {job.serviceType}
            </Text>
          ) : null}
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>{label} photo</Text>
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
      </View>

      <View style={[styles.capturePanel, landscape && styles.capturePanelLandscape]}>
        <View style={styles.captureText}>
          <Text style={styles.captureStage}>{label}</Text>
          <Text style={styles.captureCount}>
            {count} saved {count === 1 ? 'photo' : 'photos'}
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
