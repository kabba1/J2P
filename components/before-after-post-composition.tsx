import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  GeneratedAssetFormat,
  GeneratedAssetLayout,
} from '@/types/generated-asset';
import { normalizeFooterText } from '@/utils/generated-asset';

type ImageLoadStatus = 'idle' | 'loaded' | 'error';

type ImageLoadState = {
  sourceKey: string;
  before: ImageLoadStatus;
  after: ImageLoadStatus;
};

export type BeforeAfterPostCompositionProps = {
  beforeUri: string;
  afterUri: string;
  format: GeneratedAssetFormat;
  layout: GeneratedAssetLayout;
  labelsEnabled: boolean;
  footerText?: string;
  onReadyChange?: (ready: boolean) => void;
  onLoadError?: (message: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function getPostAspectRatio(format: GeneratedAssetFormat): number {
  return format === 'portrait' ? 4 / 5 : 1;
}

export const BeforeAfterPostComposition = forwardRef<
  View,
  BeforeAfterPostCompositionProps
>(function BeforeAfterPostComposition(
  {
    beforeUri,
    afterUri,
    format,
    layout,
    labelsEnabled,
    footerText,
    onReadyChange,
    onLoadError,
    style,
  },
  ref,
) {
  const sourceKey = `${beforeUri}\u0000${afterUri}`;
  const [loadState, setLoadState] = useState<ImageLoadState>({
    sourceKey,
    before: 'idle',
    after: 'idle',
  });
  const activeState = loadState.sourceKey === sourceKey
    ? loadState
    : { sourceKey, before: 'idle' as const, after: 'idle' as const };
  const ready = activeState.before === 'loaded' && activeState.after === 'loaded';
  const normalizedFooter = useMemo(() => normalizeFooterText(footerText), [footerText]);
  const sideBySide = layout === 'side-by-side';

  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready, sourceKey]);

  const updateLoadStatus = useCallback(
    (image: 'before' | 'after', status: ImageLoadStatus) => {
      setLoadState((current) => {
        const next = current.sourceKey === sourceKey
          ? current
          : { sourceKey, before: 'idle' as const, after: 'idle' as const };
        return { ...next, [image]: status };
      });
    },
    [sourceKey],
  );

  const reportLoadError = useCallback(
    (image: 'before' | 'after') => {
      updateLoadStatus(image, 'error');
      onLoadError?.(
        image === 'before'
          ? 'The Before photo could not be loaded.'
          : 'The After photo could not be loaded.',
      );
    },
    [onLoadError, updateLoadStatus],
  );

  return (
    <View
      ref={ref}
      accessibilityLabel="Before and After social post preview"
      collapsable={false}
      style={[
        styles.composition,
        { aspectRatio: getPostAspectRatio(format) },
        style,
      ]}>
      <View
        style={[
          styles.photoArea,
          sideBySide ? styles.sideBySide : styles.stacked,
        ]}>
        <View style={styles.photoFrame}>
          <Image
            accessibilityLabel="Before photo"
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => reportLoadError('before')}
            onLoad={() => updateLoadStatus('before', 'loaded')}
            onLoadStart={() => updateLoadStatus('before', 'idle')}
            recyclingKey={`before-${beforeUri}`}
            source={{ uri: beforeUri }}
            style={StyleSheet.absoluteFill}
          />
          {labelsEnabled ? (
            <View pointerEvents="none" style={[styles.label, styles.beforeLabel]}>
              <Text allowFontScaling={false} style={styles.labelText}>
                BEFORE
              </Text>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          style={sideBySide ? styles.verticalDivider : styles.horizontalDivider}
        />

        <View style={styles.photoFrame}>
          <Image
            accessibilityLabel="After photo"
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => reportLoadError('after')}
            onLoad={() => updateLoadStatus('after', 'loaded')}
            onLoadStart={() => updateLoadStatus('after', 'idle')}
            recyclingKey={`after-${afterUri}`}
            source={{ uri: afterUri }}
            style={StyleSheet.absoluteFill}
          />
          {labelsEnabled ? (
            <View pointerEvents="none" style={[styles.label, styles.afterLabel]}>
              <Text allowFontScaling={false} style={styles.labelText}>
                AFTER
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {normalizedFooter ? (
        <View pointerEvents="none" style={styles.footer}>
          <Text
            adjustsFontSizeToFit
            allowFontScaling={false}
            minimumFontScale={0.78}
            numberOfLines={1}
            style={styles.footerText}>
            {normalizedFooter}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  composition: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceMuted,
  },
  photoArea: {
    flex: 1,
  },
  sideBySide: {
    flexDirection: 'row',
  },
  stacked: {
    flexDirection: 'column',
  },
  photoFrame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#D9DEE7',
  },
  verticalDivider: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  horizontalDivider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  label: {
    position: 'absolute',
    bottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(11, 18, 32, 0.78)',
  },
  beforeLabel: {
    left: Spacing.md,
  },
  afterLabel: {
    right: Spacing.md,
    backgroundColor: Colors.primary,
  },
  labelText: {
    color: Colors.surface,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  footer: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  footerText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
