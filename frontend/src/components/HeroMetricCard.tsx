import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { RoundCountdown } from './RoundCountdown';

type HeroMetricCardProps = {
  roundTitle: string;
  daysLeft: number;
  endDate?: string | null;
  pointsThisWeek: number;
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact hero banner for current round: title, days left, points this week, CTA.
 * Team identity is shown in a separate "Your Team" card below.
 */
export function HeroMetricCard({
  roundTitle,
  daysLeft,
  endDate,
  pointsThisWeek,
  ctaLabel,
  onCtaPress,
  style,
}: HeroMetricCardProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography } = theme;

  return (
    <View style={[styles.wrap, { borderRadius: r.md, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientEnd] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingHorizontal: s.md, paddingVertical: s.sm }]}
      >
        <Text style={[typography.section, { color: colors.heroText, marginBottom: s.xxs }]} numberOfLines={1}>
          {roundTitle}
        </Text>
        <RoundCountdown daysLeft={daysLeft} endDate={endDate} variant="hero" />
        <View style={[styles.metricRow, { marginTop: s.sm, flexDirection: 'row', alignItems: 'baseline', gap: s.xs }]}>
          <Text style={[typography.hero, { color: colors.heroText, letterSpacing: -0.5 }]}>
            {pointsThisWeek}
          </Text>
          <Text style={[typography.caption, { color: colors.heroTextMuted, fontWeight: '700' }]}>
            pts this week
          </Text>
        </View>
        {ctaLabel && onCtaPress ? (
          <TouchableOpacity
            style={[
              styles.cta,
              {
                marginTop: s.sm,
                paddingVertical: s.xs,
                paddingHorizontal: s.sm,
                borderRadius: r.sm,
                borderWidth: 1.5,
                borderColor: colors.heroTextMuted,
              },
            ]}
            onPress={onCtaPress}
            activeOpacity={0.85}
          >
            <Text style={[typography.label, { color: colors.heroText, fontWeight: '600' }]}>
              {ctaLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  gradient: {},
  metricRow: {},
  cta: { alignSelf: 'flex-start' },
});
