import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

const GRADIENT_ID = 'progressRingGradient';
const GLOW_OPACITY = 0.35;
const GLOW_STROKE_BONUS = 4;
const ANIMATION_DURATION = 900;

type CircularProgressRingProps = {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Animate progress on mount and when progress changes */
  animated?: boolean;
  /** Show gradient stroke (accent → primary). Ignored if progressColor is set. */
  gradient?: boolean;
  /** Show subtle glow behind progress stroke */
  glow?: boolean;
  /** Optional solid progress color (e.g. for dark fitness layout). When set, gradient is not used. */
  progressColor?: string;
  /** Optional track (inactive) color */
  trackColor?: string;
};

export function CircularProgressRing({
  progress,
  size = 160,
  strokeWidth = 12,
  animated = true,
  gradient = true,
  glow = true,
  progressColor: progressColorOverride,
  trackColor: trackColorOverride,
}: CircularProgressRingProps) {
  const theme = useTheme();
  const { colors } = theme;
  const progressStrokeColor = progressColorOverride ?? (gradient ? undefined : colors.energy);
  const trackColor = trackColorOverride ?? colors.chartInactive;
  const [animatedProgress, setAnimatedProgress] = useState(animated ? 0 : progress);
  const animValue = useRef(new Animated.Value(animated ? 0 : progress)).current;
  const currentRef = useRef(animated ? 0 : progress);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    if (!animated) {
      setAnimatedProgress(clamped);
      currentRef.current = clamped;
      return;
    }
    animValue.setValue(currentRef.current);
    Animated.timing(animValue, {
      toValue: clamped,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [progress, animated]);

  useEffect(() => {
    currentRef.current = animatedProgress;
  }, [animatedProgress]);

  useEffect(() => {
    if (!animated) return;
    const listener = animValue.addListener(({ value }: { value: number }) => {
      setAnimatedProgress(value);
    });
    return () => animValue.removeListener(listener);
  }, [animated, animValue]);

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - animatedProgress);

  const progressStroke = progressColorOverride ?? (gradient ? `url(#${GRADIENT_ID})` : colors.energy);
  const glowStroke = progressColorOverride ?? colors.energy;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.energy} />
            <Stop offset="100%" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        {/* Track (inactive) */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill={colors.transparent}
        />
        <G rotation={-90} origin={[cx, cx]}>
          {/* Glow layer — same path, thicker stroke, lower opacity */}
          {glow && (
            <Circle
              cx={cx}
              cy={cx}
              r={r}
              stroke={glowStroke}
              strokeWidth={strokeWidth + GLOW_STROKE_BONUS}
              fill={colors.transparent}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              opacity={GLOW_OPACITY}
            />
          )}
          {/* Progress — gradient or solid */}
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={progressStroke}
            strokeWidth={strokeWidth}
            fill={colors.transparent}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
});
