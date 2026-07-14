import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type OpacitySliderProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function OpacitySlider({
  value,
  onChange,
  disabled = false,
  label = 'Ghost opacity',
}: OpacitySliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(clamp(value));
  const widthRef = useRef(trackWidth);
  const disabledRef = useRef(disabled);
  const dragStartRef = useRef(valueRef.current);
  const changeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = clamp(value);
  }, [value]);

  useEffect(() => {
    widthRef.current = trackWidth;
  }, [trackWidth]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  const updateFromLocation = (event: GestureResponderEvent) => {
    const width = widthRef.current;
    if (disabledRef.current || width <= 0) return;
    const next = clamp(event.nativeEvent.locationX / width);
    dragStartRef.current = next;
    changeRef.current(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabledRef.current && Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (event) => updateFromLocation(event),
        onPanResponderMove: (_, gestureState) => {
          const width = widthRef.current;
          if (disabledRef.current || width <= 0) return;
          changeRef.current(clamp(dragStartRef.current + gestureState.dx / width));
        },
      }),
    [],
  );

  const clampedValue = clamp(value);
  const percentage = Math.round(clampedValue * 100);

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <View
        {...panResponder.panHandlers}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={`${label}, ${percentage} percent`}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, max: 100, now: percentage, text: `${percentage}%` }}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') {
            onChange(clamp(clampedValue + 0.1));
          } else if (event.nativeEvent.actionName === 'decrement') {
            onChange(clamp(clampedValue - 0.1));
          }
        }}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={styles.touchTarget}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.42,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  label: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  percentage: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  touchTarget: {
    height: 48,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.onPrimary,
    backgroundColor: Colors.onPrimary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
