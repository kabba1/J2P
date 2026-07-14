import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { generatedAssetExportService } from '@/services/generated-asset-export-service';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { usePairs } from '@/state/pairs-context';
import { GeneratedAsset } from '@/types/generated-asset';
import { formatDateTime } from '@/utils/format-date';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type SecondaryActionProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
};

function SecondaryAction({ label, icon, onPress, disabled, busy }: SecondaryActionProps) {
  const unavailable = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
      ]}>
      {busy ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <Ionicons name={icon} size={23} color={Colors.primary} />
      )}
      <Text style={styles.secondaryActionLabel}>{label}</Text>
    </Pressable>
  );
}

function formatLabel(asset: GeneratedAsset): string {
  return asset.format === 'square' ? 'Square · 1:1' : 'Portrait · 4:5';
}

function layoutLabel(asset: GeneratedAsset): string {
  return asset.layout === 'side-by-side' ? 'Side by Side' : 'Stacked';
}

export default function GeneratedAssetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ assetId?: string | string[] }>();
  const assetId = first(params.assetId);
  const { jobs } = useJobs();
  const { getAsset, deleteAsset, fileExists: generatedFileExists } = useGeneratedAssets();
  const { getPair } = usePairs();
  const { getMedia, fileExists: mediaFileExists } = useMedia();
  const [asset, setAsset] = useState<GeneratedAsset>();
  const [loading, setLoading] = useState(true);
  const [fileMissing, setFileMissing] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [canCreateAnother, setCanCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [offerSettings, setOfferSettings] = useState(false);

  const load = useCallback(async () => {
    setAsset(undefined);
    setCanCreateAnother(false);
    setFileMissing(false);
    setDecodeFailed(false);
    setMessage(undefined);
    setOfferSettings(false);
    if (!assetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await getAsset(assetId);
      setAsset(record);
      if (!record) return;
      const exists = await generatedFileExists(record.localUri).catch(() => false);
      setFileMissing(!exists);

      const pair = await getPair(record.pairId).catch(() => undefined);
      if (!pair || pair.jobId !== record.jobId) {
        setCanCreateAnother(false);
        return;
      }
      const [before, after] = await Promise.all([
        getMedia(pair.beforeMediaId),
        getMedia(pair.afterMediaId),
      ]);
      if (!before || !after || before.stage !== 'before' || after.stage !== 'after') {
        setCanCreateAnother(false);
        return;
      }
      const [beforeExists, afterExists] = await Promise.all([
        mediaFileExists(before.localUri).catch(() => false),
        mediaFileExists(after.localUri).catch(() => false),
      ]);
      setCanCreateAnother(beforeExists && afterExists);
    } catch (caughtError) {
      setMessageTone('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'The generated post could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [assetId, generatedFileExists, getAsset, getMedia, getPair, mediaFileExists]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const leaveGeneratedAsset = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/content');
  }, [router]);

  const assetFileUnavailable = fileMissing || decodeFailed;

  const handleDecodeError = useCallback(() => {
    setDecodeFailed(true);
    setMessageTone('error');
    setMessage('The generated PNG could not be opened. It may be damaged or incomplete.');
    setOfferSettings(false);
  }, []);

  const saveToPhotos = async () => {
    if (!asset || assetFileUnavailable || saving) return;
    setSaving(true);
    setMessage(undefined);
    setOfferSettings(false);
    try {
      const result = await generatedAssetExportService.saveToPhotos(asset.localUri);
      if (result.status === 'saved') {
        setMessageTone('success');
        setMessage('Saved to your device photo library.');
      } else if (result.status === 'permission-denied') {
        setMessageTone('error');
        setMessage(
          result.canAskAgain
            ? 'Photo access was not granted. Tap Save to Photos to try again.'
            : 'Photo access is blocked. Open device Settings to allow it.',
        );
        setOfferSettings(!result.canAskAgain);
      } else {
        setMessageTone('error');
        setMessage('Saving to Photos is not available on this device.');
      }
    } catch (caughtError) {
      setMessageTone('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'The post could not be saved to Photos.',
      );
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!asset || assetFileUnavailable || sharing) return;
    setSharing(true);
    setMessage(undefined);
    setOfferSettings(false);
    try {
      const result = await generatedAssetExportService.share(asset.localUri);
      if (result.status === 'unavailable') {
        setMessageTone('error');
        setMessage('Sharing is not available on this device.');
      }
    } catch (caughtError) {
      setMessageTone('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'The post could not be shared.',
      );
    } finally {
      setSharing(false);
    }
  };

  const openSettings = async () => {
    try {
      await generatedAssetExportService.openSettings();
    } catch (caughtError) {
      setMessageTone('error');
      setMessage(
        caughtError instanceof Error ? caughtError.message : 'Device Settings could not be opened.',
      );
    }
  };

  const removeAsset = async () => {
    if (!asset || deleting || saving || sharing) return;
    setDeleting(true);
    try {
      await deleteAsset(asset.id);
      setConfirmDelete(false);
      router.replace('/content');
    } catch (caughtError) {
      setConfirmDelete(false);
      setMessageTone('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'The generated post could not be deleted.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <ScreenHeader title="Generated Post" onBack={leaveGeneratedAsset} />
        <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!asset) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <ScreenHeader title="Generated Post" onBack={leaveGeneratedAsset} />
        <View style={styles.unavailable}>
          <Ionicons name="image-outline" size={50} color={Colors.textMuted} />
          <Text style={styles.unavailableTitle}>Post not found</Text>
          <Text style={styles.unavailableMessage}>
            This generated post may have been deleted from the device.
          </Text>
          <PrimaryButton label="Open Content" onPress={() => router.replace('/content')} />
        </View>
      </ScreenContainer>
    );
  }

  const jobName = jobs.find((job) => job.id === asset.jobId)?.name ?? 'Deleted job';

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title="Generated Post" onBack={leaveGeneratedAsset} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text numberOfLines={1} style={styles.jobName}>{jobName}</Text>
          <Text numberOfLines={1} style={styles.shotName}>
            {asset.sourceShotName || 'Before & After post'}
          </Text>
        </View>

        <View style={styles.previewCard}>
          {assetFileUnavailable ? (
            <View style={[styles.assetImage, styles.missingImage]}>
              <Ionicons name="image-outline" size={50} color={Colors.textMuted} />
              <Text style={styles.missingTitle}>
                {decodeFailed ? 'Generated PNG unreadable' : 'Generated PNG missing'}
              </Text>
              <Text style={styles.missingMessage}>
                {decodeFailed
                  ? 'The saved file exists, but it could not be opened as an image.'
                  : 'The saved file is no longer available on this device.'}
              </Text>
            </View>
          ) : (
            <Image
              accessibilityLabel="Generated Before and After post"
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={handleDecodeError}
              source={{ uri: asset.localUri }}
              style={[
                styles.assetImage,
                {
                  aspectRatio: asset.width / asset.height,
                  maxWidth: asset.format === 'portrait' ? 520 : 620,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Ionicons name="resize-outline" size={21} color={Colors.primary} />
            <Text style={styles.metadataLabel}>Format</Text>
            <Text style={styles.metadataValue}>{formatLabel(asset)}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Ionicons name="albums-outline" size={21} color={Colors.primary} />
            <Text style={styles.metadataLabel}>Layout</Text>
            <Text style={styles.metadataValue}>{layoutLabel(asset)}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Ionicons name="scan-outline" size={21} color={Colors.primary} />
            <Text style={styles.metadataLabel}>Size</Text>
            <Text style={styles.metadataValue}>{asset.width} × {asset.height} PNG</Text>
          </View>
          <View style={[styles.metadataRow, styles.lastMetadataRow]}>
            <Ionicons name="calendar-outline" size={21} color={Colors.primary} />
            <Text style={styles.metadataLabel}>Created</Text>
            <Text style={styles.metadataValue}>{formatDateTime(asset.createdAt)}</Text>
          </View>
        </View>

        {message ? (
          <View
            accessibilityRole="alert"
            style={[styles.messageBanner, messageTone === 'error' && styles.errorBanner]}>
            <Ionicons
              name={messageTone === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={22}
              color={messageTone === 'error' ? Colors.danger : Colors.after}
            />
            <Text style={[styles.messageText, messageTone === 'error' && styles.errorText]}>
              {message}
            </Text>
            {offerSettings ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                onPress={() => void openSettings()}
                style={({ pressed }) => [styles.settingsAction, pressed && styles.pressed]}>
                <Text style={styles.settingsLink}>Open Settings</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.primaryActionWrapper}>
            <PrimaryButton
              label="Save to Photos"
              icon="download-outline"
              loading={saving}
              disabled={assetFileUnavailable || sharing}
              onPress={() => void saveToPhotos()}
            />
          </View>
          <SecondaryAction
            label="Share"
            icon="share-outline"
            busy={sharing}
            disabled={assetFileUnavailable || saving}
            onPress={() => void share()}
          />
        </View>

        <View style={styles.versionCard}>
          <Ionicons name="copy-outline" size={24} color={Colors.primary} />
          <View style={styles.versionText}>
            <Text style={styles.versionTitle}>Want a different version?</Text>
            <Text style={styles.versionCaption}>
              {canCreateAnother
                ? 'Reuse the saved pair with another format, layout, or footer.'
                : 'The original saved pair is no longer available, but this PNG remains usable.'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create another version"
            accessibilityState={{ disabled: !canCreateAnother || saving || sharing || deleting }}
            disabled={!canCreateAnother || saving || sharing || deleting}
            onPress={() =>
              router.push({
                pathname: '/create-post',
                params: { jobId: asset.jobId, pairId: asset.pairId },
              })
            }
            style={({ pressed }) => [
              styles.versionButton,
              pressed && styles.pressed,
              (!canCreateAnother || saving || sharing || deleting) && styles.disabled,
            ]}>
            <Text style={styles.versionButtonLabel}>Create Another</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete generated post"
          accessibilityState={{ disabled: saving || sharing || deleting }}
          disabled={saving || sharing || deleting}
          onPress={() => setConfirmDelete(true)}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
            (saving || sharing || deleting) && styles.disabled,
          ]}>
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          <Text style={styles.deleteLabel}>Delete Generated Post</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this generated post?"
        message="This removes only the finished PNG. The original job photos and pair will stay unchanged."
        confirmLabel="Delete Post"
        destructive
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeAsset()}
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
    paddingHorizontal: 20,
    paddingBottom: Spacing.xxl,
  },
  heading: {
    alignItems: 'center',
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  previewCard: {
    overflow: 'hidden',
    padding: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  assetImage: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 0,
    backgroundColor: Colors.surfaceMuted,
  },
  missingImage: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  missingTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  missingMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  metadataCard: {
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  metadataRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  lastMetadataRow: {
    borderBottomWidth: 0,
  },
  metadataLabel: {
    width: 62,
    color: Colors.textMuted,
    fontSize: 13,
  },
  metadataValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  primaryActionWrapper: {
    flexGrow: 1,
    flexBasis: 210,
  },
  secondaryAction: {
    minHeight: 58,
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  secondaryActionLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.after,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  errorBanner: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  messageText: {
    flex: 1,
    color: Colors.after,
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    color: Colors.danger,
  },
  settingsLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  settingsAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  versionText: {
    flex: 1,
    minWidth: 0,
  },
  versionTitle: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  versionCaption: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  versionButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
  },
  versionButtonLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  deleteButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  deleteLabel: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '800',
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
    maxWidth: 350,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  loader: {
    marginTop: 140,
  },
  disabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.65,
  },
});
