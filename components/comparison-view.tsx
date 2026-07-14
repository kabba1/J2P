import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export type ComparisonMode = 'side-by-side' | 'slider';

type ComparisonViewProps = {
  beforeUri: string;
  afterUri: string;
  mode?: ComparisonMode;
  aspectRatio?: number;
  beforeLabel?: string;
  afterLabel?: string;
  contentFit?: 'contain' | 'cover';
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

type ComparisonImageProps = {
  uri: string;
  label: string;
  contentFit: 'contain' | 'cover';
};

function ComparisonImage({ uri, label, contentFit }: ComparisonImageProps) {
  return (
    <View style={styles.sideImageContainer}>
      <Image
        accessibilityLabel={`${label} photo`}
        cachePolicy="memory-disk"
        contentFit={contentFit}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.badge, label === 'After' && styles.afterBadge]}>
        <Text style={styles.badgeText}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

export function ComparisonView({
  beforeUri,
  afterUri,
  mode = 'slider',
  aspectRatio = 4 / 3,
  beforeLabel = 'Before',
  afterLabel = 'After',
  contentFit = 'cover',
}: ComparisonViewProps) {
  const [frameWidth, setFrameWidth] = useState(0);
  const [split, setSplit] = useState(0.5);
  const widthRef = useRef(frameWidth);
  const splitRef = useRef(split);
  const dragStartRef = useRef(split);

  widthRef.current = frameWidth;
  splitRef.current = split;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (event) => {
          const width = widthRef.current;
          if (width <= 0) return;
          const next = clamp(event.nativeEvent.locationX / width);
          dragStartRef.current = next;
          setSplit(next);
        },
        onPanResponderMove: (_, gestureState) => {
          const width = widthRef.current;
          if (width <= 0) return;
          setSplit(clamp(dragStartRef.current + gestureState.dx / width));
        },
      }),
    [],
  );

  if (mode === 'side-by-side') {
    return (
      <View
        accessibilityLabel="Side-by-side Before and After comparison"
        style={[styles.frame, styles.sideBySide, { aspectRatio }]}>
        <ComparisonImage uri={beforeUri} label={beforeLabel} contentFit={contentFit} />
        <View style={styles.sideDivider} />
        <ComparisonImage uri={afterUri} label={afterLabel} contentFit={contentFit} />
      </View>
    );
  }

  const splitPercentage = Math.round(split * 100);

  return (
    <View
      onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      style={[styles.frame, { aspectRatio }]}>
      <Image
        accessibilityLabel={`${afterLabel} photo`}
        cachePolicy="memory-disk"
        contentFit={contentFit}
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
      />
      {frameWidth > 0 ? (
        <View pointerEvents="none" style={[styles.beforeClip, { width: frameWidth * split }]}>
          <Image
            accessibilityLabel={`${beforeLabel} photo`}
            cachePolicy="memory-disk"
            contentFit={contentFit}
            source={{ uri: beforeUri }}
            style={[styles.fullSizeImage, { width: frameWidth }]}
          />
        </View>
      ) : null}

      <View pointerEvents="none" style={[styles.badge, styles.sliderBeforeBadge]}>
        <Text style={styles.badgeText}>{beforeLabel.toUpperCase()}</Text>
      </View>
      <View pointerEvents="none" style={[styles.badge, styles.afterBadge]}>
        <Text style={styles.badgeText}>{afterLabel.toUpperCase()}</Text>
      </View>

      <View
        {...panResponder.panHandlers}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={`Before and After comparison slider, ${splitPercentage} percent Before`}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: splitPercentage }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            setSplit(clamp(splitRef.current + 0.1));
          } else if (event.nativeEvent.actionName === 'decrement') {
            setSplit(clamp(splitRef.current - 0.1));
          }
        }}
        style={StyleSheet.absoluteFill}>
        <View pointerEvents="none" style={[styles.divider, { left: `${splitPercentage}%` }]} />
        <View pointerEvents="none" style={[styles.handle, { left: `${splitPercentage}%` }]}>
          <Ionicons name="chevron-back" size={19} color={Colors.textMuted} />
          <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.md,
    backgroundColor: '#151515',
  },
  sideBySide: {
    flexDirection: 'row',
  },
  sideImageContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#151515',
  },
  sideDivider: {
    width: 2,
    backgroundColor: Colors.onPrimary,
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  fullSizeImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  badge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(11,18,32,0.76)',
  },
  sliderBeforeBadge: {
    left: Spacing.md,
  },
  afterBadge: {
    right: Spacing.md,
    left: undefined,
    backgroundColor: Colors.primary,
  },
  badgeText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: Colors.onPrimary,
  },
  handle: {
    position: 'absolute',
    top: '50%',
    width: 52,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.onPrimary,
    backgroundColor: Colors.onPrimary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
